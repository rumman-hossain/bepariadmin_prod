// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup, render, screen, fireEvent } from '@testing-library/react';
import {
  useBeautify,
  slotKey,
  beautifySlotFromPurpose,
  type BeautifySlot,
  type SlotState,
} from '../hooks/useBeautify';
import { BeautifyStart, BeautifyStrip } from '../components/BeautifyBar';
import { BeautifyTileState } from '../components/BeautifyTileState';
import type { RunBeautifyInput } from '@/src/api/beautify';

/**
 * BEAUTIFY, FROM THE CONSOLE'S SIDE.
 *
 * The interesting behaviour here is about SPENDING and about WAITING:
 *
 *   - one request per image, so tiles land one at a time instead of the
 *     operator watching a spinner for six minutes on a twelve-image product;
 *   - no more than three in flight, so a run does not open twelve sockets
 *     against an endpoint that holds each one for half a minute;
 *   - the model description reaches fronts and never backs;
 *   - Apply issues one commit and generates nothing.
 */

const runBeautify = vi.hoisted(() => vi.fn());
const commitBeautify = vi.hoisted(() => vi.fn());
const discardBeautify = vi.hoisted(() => vi.fn());

vi.mock('@/src/api/beautify', () => ({
  runBeautify,
  commitBeautify,
  discardBeautify,
}));

/** Resolves like the server would, with a ready job. */
function ok(input: RunBeautifyInput) {
  return {
    ok: true,
    status: 200,
    data: {
      data: {
        id: `job-${input.variationId ?? ''}-${input.side}`,
        variationId: input.variationId,
        side: input.side,
        mode: input.mode,
        status: 'ready',
        previewUrl: `/api/v1/file/preview-${input.side}`,
        beforeUrl: `/api/v1/file/before-${input.side}`,
        model: 'm',
        estCostUsd: 0.067,
        reused: false,
      },
    },
  };
}

const SLOTS: BeautifySlot[] = [
  { variationId: '', side: 'front', label: 'Front' },
  { variationId: '', side: 'back', label: 'Back' },
  { variationId: 'v1', side: 'front', label: 'Red · front' },
  { variationId: 'v1', side: 'back', label: 'Red · back' },
  { variationId: 'v2', side: 'front', label: 'Blue · front' },
  { variationId: 'v2', side: 'back', label: 'Blue · back' },
];

beforeEach(() => {
  runBeautify.mockReset();
  commitBeautify.mockReset();
  discardBeautify.mockReset();
  runBeautify.mockImplementation((input: RunBeautifyInput) => Promise.resolve(ok(input)));
  commitBeautify.mockResolvedValue({ ok: true, status: 200, data: { data: { applied: 6 } } });
  discardBeautify.mockResolvedValue({ ok: true, status: 200, data: { data: { discarded: 6 } } });
});
afterEach(cleanup);

const opts = (mode: 'with_model' | 'without_model', description = 'a woman in her twenties') => ({
  productId: 'p1',
  mode,
  modelDescription: description,
  slots: SLOTS,
});

describe('a run covers every front and back', () => {
  it('sends one request per image, not one per product', async () => {
    const { result } = renderHook(() => useBeautify());

    await act(async () => {
      await result.current.run(opts('with_model'));
    });

    // Six slots, six calls. One call for the whole product would be minutes
    // inside a single request and would tell the console nothing until the end.
    expect(runBeautify).toHaveBeenCalledTimes(SLOTS.length);
    const sides = runBeautify.mock.calls.map((c) => `${c[0].variationId ?? ''}:${c[0].side}`);
    expect(new Set(sides).size).toBe(SLOTS.length);
  });

  it('keeps at most three requests in flight', async () => {
    let inFlight = 0;
    let peak = 0;
    const releases: Array<() => void> = [];

    runBeautify.mockImplementation((input: RunBeautifyInput) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      return new Promise((resolve) => {
        releases.push(() => {
          inFlight -= 1;
          resolve(ok(input));
        });
      });
    });

    const { result } = renderHook(() => useBeautify());
    let done!: Promise<void>;
    await act(async () => {
      done = result.current.run(opts('with_model'));
      // Let the workers start before anything is released.
      await Promise.resolve();
    });

    await act(async () => {
      // Drain, releasing whatever has started, until the pool empties.
      for (let i = 0; i < SLOTS.length * 2 && releases.length > 0; i++) {
        releases.shift()!();
        await Promise.resolve();
        await Promise.resolve();
      }
      await done;
    });

    expect(peak).toBeLessThanOrEqual(3);
    // And it really did use the parallelism it has, rather than going serial.
    expect(peak).toBeGreaterThan(1);
  });
});

describe('the model description', () => {
  it('reaches the fronts', async () => {
    const { result } = renderHook(() => useBeautify());
    await act(async () => {
      await result.current.run(opts('with_model'));
    });

    const fronts = runBeautify.mock.calls
      .map((c) => c[0] as RunBeautifyInput)
      .filter((i) => i.side === 'front');
    expect(fronts).toHaveLength(3);
    for (const f of fronts) {
      expect(f.modelDescription).toBe('a woman in her twenties');
    }
  });

  it('never reaches a back', async () => {
    // A back is white-background-only in BOTH modes, so a description on one
    // is meaningless. The server drops it too, but sending it would make the
    // request say something the feature does not mean.
    const { result } = renderHook(() => useBeautify());
    await act(async () => {
      await result.current.run(opts('with_model'));
    });

    const backs = runBeautify.mock.calls
      .map((c) => c[0] as RunBeautifyInput)
      .filter((i) => i.side === 'back');
    expect(backs).toHaveLength(3);
    for (const b of backs) {
      expect(b.modelDescription).toBeUndefined();
    }
  });

  it('is not sent at all in Without Model', async () => {
    const { result } = renderHook(() => useBeautify());
    await act(async () => {
      await result.current.run(opts('without_model', ''));
    });

    for (const call of runBeautify.mock.calls) {
      expect((call[0] as RunBeautifyInput).modelDescription).toBeUndefined();
    }
  });
});

describe('tiles land one at a time', () => {
  it('reports progress as results arrive rather than only at the end', async () => {
    const { result } = renderHook(() => useBeautify());

    await act(async () => {
      await result.current.run(opts('with_model'));
    });

    expect(result.current.progress).toEqual({ done: 6, total: 6 });
    // Each slot carries its own state, which is what lets a tile change on its
    // own instead of the whole grid changing at once.
    expect(result.current.states[slotKey('v1', 'front')]?.status).toBe('ready');
  });

  it('marks only the failing tile as failed', async () => {
    runBeautify.mockImplementation((input: RunBeautifyInput) =>
      input.side === 'back' && input.variationId === 'v2'
        ? Promise.resolve({ ok: false, status: 502, data: { message: 'The model refused.' } })
        : Promise.resolve(ok(input)),
    );

    const { result } = renderHook(() => useBeautify());
    await act(async () => {
      await result.current.run(opts('with_model'));
    });

    const failed = result.current.states[slotKey('v2', 'back')];
    expect(failed?.status).toBe('failed');
    expect(failed?.status === 'failed' && failed.message).toBe('The model refused.');
    // The rest of the run is unaffected — one bad image must not cost the other
    // five, which have already been generated and paid for.
    expect(result.current.states[slotKey('v1', 'front')]?.status).toBe('ready');
    expect(result.current.readyJobs()).toHaveLength(5);
  });
});

describe('applying the result', () => {
  it('commits every ready job in one call and generates nothing', async () => {
    const { result } = renderHook(() => useBeautify());
    await act(async () => {
      await result.current.run(opts('with_model'));
    });
    const generatedSoFar = runBeautify.mock.calls.length;

    await act(async () => {
      await result.current.commit('p1');
    });

    expect(commitBeautify).toHaveBeenCalledTimes(1);
    expect(commitBeautify.mock.calls[0][1]).toHaveLength(6);
    // Approving must never regenerate. The pictures already exist; commit only
    // moves a pointer.
    expect(runBeautify).toHaveBeenCalledTimes(generatedSoFar);
  });

  it('clears the review state so Apply cannot be pressed twice', async () => {
    const { result } = renderHook(() => useBeautify());
    await act(async () => {
      await result.current.run(opts('with_model'));
    });
    await act(async () => {
      await result.current.commit('p1');
    });

    expect(result.current.readyJobs()).toHaveLength(0);
    expect(result.current.progress.total).toBe(0);
  });

  it('does not call the server when there is nothing ready', async () => {
    const { result } = renderHook(() => useBeautify());
    await act(async () => {
      await result.current.commit('p1');
    });
    expect(commitBeautify).not.toHaveBeenCalled();
  });
});

describe('which tiles are beautified at all', () => {
  it('maps a tile purpose to its slot', () => {
    expect(beautifySlotFromPurpose('product:front')).toEqual({ variationId: '', side: 'front' });
    expect(beautifySlotFromPurpose('product:back')).toEqual({ variationId: '', side: 'back' });
    expect(beautifySlotFromPurpose('variation:abc-123:front')).toEqual({
      variationId: 'abc-123',
      side: 'front',
    });
  });

  it('leaves posters, details and videos alone', () => {
    // The feature's whole rule is about the front/back pair. A poster or a clip
    // getting a sheen would be claiming work that is not happening.
    for (const purpose of [
      'product:poster',
      'product:video',
      'product:more:0',
      'variation:abc:video',
      'variation:abc:more:1',
    ]) {
      expect(beautifySlotFromPurpose(purpose)).toBeNull();
    }
  });
});

describe('the control that starts a run', () => {
  const start = (props: Partial<React.ComponentProps<typeof BeautifyStart>> = {}) =>
    render(
      <BeautifyStart
        imageCount={6}
        estimatedCost={0.31}
        disabled={false}
        onRun={props.onRun ?? (() => {})}
        {...props}
      />,
    );

  it('shows the price before the button is pressed', () => {
    start();
    // An operator should never learn what a run cost from an invoice.
    expect(screen.getByText(/6 images · about \$0\.31/)).toBeTruthy();
  });

  it('will not run With Model until a model is described', () => {
    const onRun = vi.fn();
    start({ onRun });

    const withModel = screen.getByRole('button', { name: /with model/i });
    fireEvent.click(withModel);
    expect(onRun).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/describe the model/i), {
      target: { value: 'a boy of about eight' },
    });
    fireEvent.click(screen.getByRole('button', { name: /with model/i }));
    expect(onRun).toHaveBeenCalledWith('with_model', 'a boy of about eight');
  });

  it('runs Without Model with no description at all', () => {
    // The box belongs to the model shot. Requiring it for the plain
    // white-background pass would be asking for something never used.
    const onRun = vi.fn();
    start({ onRun });
    fireEvent.click(screen.getByRole('button', { name: /without model/i }));
    expect(onRun).toHaveBeenCalledWith('without_model', '');
  });
});

describe('watching the run without scrolling', () => {
  const SLOT_PAIR: BeautifySlot[] = [
    { variationId: '', side: 'front', label: 'Front', thumbUrl: '/api/v1/file/front-thumb' },
    { variationId: '', side: 'back', label: 'Back', thumbUrl: '/api/v1/file/back-thumb' },
  ];

  const strip = (states: Record<string, SlotState>) =>
    render(<BeautifyStrip slots={SLOT_PAIR} states={states} />);

  it('shows nothing before a run starts', () => {
    // The control should not carry dead chrome. It appears when there is
    // something to watch.
    const { container } = strip({});
    expect(container.firstChild).toBeNull();
  });

  it('sweeps the sheen OVER the photograph, not instead of it', () => {
    // The point of the animation is that it happens to the image the operator
    // recognises. A shimmer on an empty box says "something is loading"; a
    // shimmer across the front shot says "your front shot is being worked on".
    strip({
      ':front': { status: 'working', since: Date.now() },
      ':back': { status: 'working', since: Date.now() },
    });

    const thumb = document.querySelector('img[src="/api/v1/file/front-thumb"]');
    expect(thumb).not.toBeNull();

    const sheen = document.querySelector('.beautify-sheen');
    expect(sheen).not.toBeNull();
    // Both present in the same tile: the image underneath, the sheen over it.
    expect(thumb!.parentElement).toBe(sheen!.parentElement);
  });

  it('says what is happening in words as well as motion', () => {
    // prefers-reduced-motion flattens every animation in this app to 0.01ms,
    // so a state that existed only as movement would vanish for exactly the
    // people who most need it spelled out.
    strip({ ':front': { status: 'working', since: Date.now() }, ':back': { status: 'queued' } });
    expect(screen.getAllByText(/Beautifying/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/In line/i).length).toBeGreaterThan(0);
  });

  it('swaps in the generated image when it lands', () => {
    strip({
      ':front': {
        status: 'ready',
        job: {
          id: 'j1', side: 'front', mode: 'with_model', status: 'ready',
          previewUrl: '/api/v1/file/generated-front', model: 'm', estCostUsd: 0.067, reused: false,
        },
      },
      ':back': { status: 'working', since: Date.now() },
    });
    expect(document.querySelector('img[src="/api/v1/file/generated-front"]')).not.toBeNull();
    // ...and the original is no longer shown for that slot.
    expect(document.querySelector('img[src="/api/v1/file/front-thumb"]')).toBeNull();
  });

  it('marks a failed image without hiding the rest', () => {
    strip({
      ':front': { status: 'failed', message: 'The model refused.' },
      ':back': { status: 'working', since: Date.now() },
    });
    // The working one still shows its sheen; one failure does not blank the run.
    expect(document.querySelector('.beautify-sheen')).not.toBeNull();
    expect(document.querySelectorAll('img').length).toBeGreaterThan(0);
  });
});

describe('the operator never presses Try again', () => {
  it('re-requests once, silently, when the transport drops', async () => {
    /*
     * This is free, and that is the whole point. The server keys each job on
     * what changes the picture, so a second identical request generates
     * nothing — it returns the row the first attempt already produced.
     *
     * Which is exactly why "Try again" appeared to work: the image had been
     * finished all along and the click was collecting it. Doing it here
     * removes the click.
     */
    let attempts = 0;
    runBeautify.mockImplementation((input: RunBeautifyInput) => {
      attempts += 1;
      if (attempts === 1) return Promise.reject(new DOMException('Aborted', 'AbortError'));
      return Promise.resolve(ok(input));
    });

    const { result } = renderHook(() => useBeautify());
    await act(async () => {
      await result.current.run({ ...opts('with_model'), slots: [SLOTS[0]] });
    });

    expect(attempts).toBe(2);
    expect(result.current.states[slotKey('', 'front')]?.status).toBe('ready');
  });

  it('does not re-request an answer the server actually gave', async () => {
    // A 502 is a reply. Asking the identical question again gets the identical
    // reply and is billed for it.
    let attempts = 0;
    runBeautify.mockImplementation(() => {
      attempts += 1;
      return Promise.resolve({ ok: false, status: 502, data: { message: 'The model declined.' } });
    });

    const { result } = renderHook(() => useBeautify());
    await act(async () => {
      await result.current.run({ ...opts('with_model'), slots: [SLOTS[0]] });
    });

    expect(attempts).toBe(1);
    const st = result.current.states[slotKey('', 'front')];
    expect(st?.status).toBe('failed');
    expect(st?.status === 'failed' && st.message).toBe('The model declined.');
  });

  it('gives up after the second transport failure rather than looping', async () => {
    let attempts = 0;
    runBeautify.mockImplementation(() => {
      attempts += 1;
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });

    const { result } = renderHook(() => useBeautify());
    await act(async () => {
      await result.current.run({ ...opts('with_model'), slots: [SLOTS[0]] });
    });

    expect(attempts).toBe(2);
    expect(result.current.states[slotKey('', 'front')]?.status).toBe('failed');
  });

  it('offers no Try again button on a failed tile', () => {
    // The control is gone on purpose and must not creep back: it never
    // recovered from anything, it collected a result that was already done.
    render(
      <BeautifyTileState
        state={{ status: 'failed', message: 'The model declined: no under-18s.' }}
      />,
    );
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
    // The model's own explanation is what the operator gets instead.
    expect(screen.getByText(/no under-18s/i)).toBeTruthy();
  });

  /*
   * THE FAILED TILE MUST NOT SWALLOW THE CLICK THAT RESCUES IT.
   *
   * The overlay covers the whole tile, and the tile is the button that opens
   * the menu holding "Correct this image". While it captured pointer events
   * there was no way out of a failure on a variant tile at all — the corner
   * Correct button was clipped outside the tile's 75px, so BOTH routes were
   * shut. Layers that draw over the picture stay transparent to clicks.
   */
  it('lets a click through every layer it draws over the picture', () => {
    /* The positioned layers only. `pointer-events` is an inherited property,
       so a caption nested inside a transparent overlay is already transparent
       and does not need to say so itself. */
    // `classList`, not `className` — an SVG's is an SVGAnimatedString.
    const layers = (el: HTMLElement) =>
      (Array.from(el.querySelectorAll('*')) as HTMLElement[]).filter((n) =>
        n.classList.contains('absolute'),
      );

    for (const state of [
      { status: 'queued' as const },
      { status: 'failed' as const, message: 'The model declined.' },
      { status: 'ready' as const, job: { previewUrl: 'blob:after' } },
    ] as const) {
      const { container, unmount } = render(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <BeautifyTileState state={state as any} />,
      );
      const found = layers(container);
      expect(found.length).toBeGreaterThan(0); // or the loop below proves nothing
      for (const el of found) {
        expect(el.classList.contains('pointer-events-none')).toBe(true);
      }
      unmount();
    }
  });
});

describe('beautifying one image on its own', () => {
  it('touches only the slot that was asked for', async () => {
    /*
     * The bar runs every front and back, which is right the first time a
     * product is prepared and wrong afterwards: redoing one bad shot must not
     * regenerate — or re-bill — the eleven that were already fine.
     */
    const { result } = renderHook(() => useBeautify());
    const target = SLOTS[3]; // Red · back

    await act(async () => {
      await result.current.redo(opts('with_model'), target);
    });

    expect(runBeautify).toHaveBeenCalledTimes(1);
    const sent = runBeautify.mock.calls[0][0] as RunBeautifyInput;
    expect(sent.variationId).toBe('v1');
    expect(sent.side).toBe('back');
    // ...and every other slot is untouched.
    expect(result.current.states[slotKey('v1', 'front')]).toBeUndefined();
    expect(result.current.states[slotKey('', 'front')]).toBeUndefined();
  });

  it('still refuses to put a description on a back', async () => {
    const { result } = renderHook(() => useBeautify());
    await act(async () => {
      await result.current.redo(opts('with_model'), SLOTS[1]); // product back
    });
    expect((runBeautify.mock.calls[0][0] as RunBeautifyInput).modelDescription).toBeUndefined();
  });
});
