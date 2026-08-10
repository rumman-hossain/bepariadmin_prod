// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { Button, IconButton, Spinner } from '../Button';
import { Tabs } from '../Tabs';
import { Popover } from '../Popover';
import { SegmentedControl, RadioGroup, Radio } from '../Choice';
import { Check } from 'lucide-react';

afterEach(cleanup);

// ─── Button / IconButton / Spinner ────────────────────────

describe('Button', () => {
  it('defaults to type="button"', () => {
    /*
     * An unspecified type inside a form is `submit` — which is how a Cancel
     * button ends up submitting the form it was meant to abandon.
     */
    render(<Button>Cancel</Button>);
    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });

  it('still allows an explicit submit', () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole('button').getAttribute('type')).toBe('submit');
  });

  it('disables and announces itself while loading', () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveProperty('disabled', true);
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('does not fire while loading', () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('IconButton', () => {
  it('requires and applies an accessible name', () => {
    /*
     * The gap this fills: `<Button iconLeft={X}>{''}</Button>` was used to get
     * an icon-only control, which kept its horizontal padding and rendered as a
     * wide lozenge — and elsewhere the same need produced 42 raw <button>s,
     * most with no name at all. An icon-only control without a name is
     * announced as "button".
     */
    render(<IconButton icon={Check} label="Approve supplier" />);
    expect(screen.getByRole('button', { name: 'Approve supplier' })).toBeTruthy();
  });

  it('is square, not a padded lozenge', () => {
    render(<IconButton icon={Check} label="Approve" size="md" />);
    const cls = screen.getByRole('button').className;
    expect(cls).toContain('h-9');
    expect(cls).toContain('w-9');
    expect(cls).not.toMatch(/\bpx-/);
  });
});

describe('Spinner', () => {
  it('announces itself by default', () => {
    // Six inline `<Loader2 className="animate-spin">` sites announced nothing,
    // so a screen-reader user got silence during every load.
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('Loading')).toBeTruthy();
  });

  it('can be silent when something else owns the live region', () => {
    render(<Spinner label={null} />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});

// ─── Tabs ────────────────────────────────────────────────

const TAB_ITEMS = [
  { id: 'all', label: 'All', count: 12 },
  { id: 'pending', label: 'Pending' },
  { id: 'done', label: 'Done', disabled: true },
];

function TabsHarness({ initial = 'all' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <Tabs items={TAB_ITEMS} value={value} onChange={setValue}>
      <Tabs.Panel id="all">All content</Tabs.Panel>
      <Tabs.Panel id="pending">Pending content</Tabs.Panel>
      <Tabs.Panel id="done">Done content</Tabs.Panel>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('wires aria-controls to a panel that actually exists', () => {
    /*
     * The bug this rebuild fixes. The old version generated `baseId` internally
     * with useId() and never exposed it, while TabPanel *required* baseId as a
     * prop — so there was no value a caller could pass and the ARIA references
     * pointed at nothing. Zero call sites, unsurprisingly.
     */
    render(<TabsHarness />);
    const tab = screen.getByRole('tab', { name: /all/i });
    const panelId = tab.getAttribute('aria-controls')!;

    const panel = document.getElementById(panelId);
    expect(panel).not.toBeNull();
    expect(panel!.getAttribute('role')).toBe('tabpanel');
    expect(panel!.getAttribute('aria-labelledby')).toBe(tab.id);
  });

  it('renders only the selected panel', () => {
    render(<TabsHarness />);
    expect(screen.getByText('All content')).toBeTruthy();
    expect(screen.queryByText('Pending content')).toBeNull();
  });

  it('keeps only the selected tab in the page tab order', () => {
    // So Tab moves out to the panel rather than through every tab in turn.
    render(<TabsHarness />);
    expect(screen.getByRole('tab', { name: /all/i }).getAttribute('tabindex')).toBe('0');
    expect(screen.getByRole('tab', { name: /pending/i }).getAttribute('tabindex')).toBe('-1');
  });

  it('moves with arrow keys, skipping disabled tabs', () => {
    render(<TabsHarness />);
    const list = screen.getByRole('tablist');

    fireEvent.keyDown(list, { key: 'ArrowRight' });
    expect(screen.getByText('Pending content')).toBeTruthy();

    // 'done' is disabled, so the next right wraps to 'all'.
    fireEvent.keyDown(list, { key: 'ArrowRight' });
    expect(screen.getByText('All content')).toBeTruthy();
  });

  it('supports Home and End', () => {
    render(<TabsHarness initial="pending" />);
    const list = screen.getByRole('tablist');
    fireEvent.keyDown(list, { key: 'Home' });
    expect(screen.getByText('All content')).toBeTruthy();
  });

  it('does not divide by zero when every tab is disabled', () => {
    // Reachable: a filtered tab set can empty out.
    render(
      <Tabs items={[{ id: 'a', label: 'A', disabled: true }]} value="a" onChange={vi.fn()} />,
    );
    expect(() => fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' })).not.toThrow();
  });

  it('fails loudly if a Panel is used outside Tabs', () => {
    // Silently rendering nothing would look like a data problem.
    expect(() => render(<Tabs.Panel id="x">y</Tabs.Panel>)).toThrow(/inside <Tabs>/);
  });
});

// ─── Popover ─────────────────────────────────────────────

describe('Popover', () => {
  const open = () => fireEvent.click(screen.getByRole('button', { name: 'Open' }));

  function harness() {
    return render(
      // An overflow-hidden ancestor is the exact situation that clipped the old
      // DropdownMenu: every Card and every scrolling table container is one.
      <div style={{ overflow: 'hidden' }} data-testid="clipper">
        <Popover trigger={<button>Open</button>} label="Menu">
          <p>Surface content</p>
        </Popover>
      </div>,
    );
  }

  it('renders into document.body, not inside the clipping ancestor', () => {
    /*
     * The reason DropdownMenu was never adopted. Rendered `absolute z-40` in
     * place, it was clipped by any overflow-hidden ancestor and sat below a
     * Modal at z-50 — invisible when opened inside a dialog.
     */
    const { getByTestId } = harness();
    open();

    const surface = screen.getByRole('dialog', { name: 'Menu' });
    expect(getByTestId('clipper').contains(surface)).toBe(false);
    expect(document.body.contains(surface)).toBe(true);
  });

  it('sits on the dropdown step of the z-scale', () => {
    harness();
    open();
    expect(screen.getByRole('dialog').className).toContain('z-(--z-dropdown)');
  });

  it('reports its state on the trigger', () => {
    harness();
    const trigger = screen.getByRole('button', { name: 'Open' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    open();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes on Escape and returns focus to the trigger', () => {
    harness();
    open();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open' }));
  });

  it('closes on an outside click without stealing focus back', () => {
    // The pointer has already moved the user's attention elsewhere.
    harness();
    open();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('stays open when the surface itself is clicked', () => {
    harness();
    open();
    fireEvent.mouseDown(screen.getByText('Surface content'));
    expect(screen.queryByRole('dialog')).not.toBeNull();
  });

  it('preserves the trigger’s own onClick', () => {
    const onClick = vi.fn();
    render(
      <Popover trigger={<button onClick={onClick}>Open</button>} label="Menu">
        <p>x</p>
      </Popover>,
    );
    open();
    expect(onClick).toHaveBeenCalled();
  });

  /*
   * THE ANCHOR IS THE WRAPPER, AND SOMETIMES IT IS NOT THE TRIGGER'S OWN BOX.
   *
   * A product media tile hands this `absolute inset-0`, so the menu is
   * positioned against the tile rather than against the invisible full-bleed
   * button inside it. The default has to stay `inline-flex` or every existing
   * caller silently moves.
   */
  it('wraps the trigger in inline-flex unless told otherwise', () => {
    harness();
    const anchor = screen.getByRole('button', { name: 'Open' }).parentElement!;
    expect(anchor.className).toBe('inline-flex');
  });

  it('anchors to the box it is given', () => {
    render(
      <Popover trigger={<button>Open</button>} label="Menu" anchorClassName="absolute inset-0">
        <p>x</p>
      </Popover>,
    );
    const anchor = screen.getByRole('button', { name: 'Open' }).parentElement!;
    expect(anchor.className).toBe('absolute inset-0');
    expect(anchor.className).not.toContain('inline-flex');
  });

  /*
   * OPENING UPWARD WHEN THERE IS NO ROOM BELOW.
   *
   * The surface used to be pinned under the trigger unconditionally, with
   * maxHeight absorbing whatever was left — so a trigger near the foot of the
   * window got a menu a few pixels tall that scrolled internally. That is
   * exactly where the media tiles are: the variant cards are the last section
   * on Step 4 and their menus have five items.
   */
  function atViewportY(top: number, height = 40) {
    return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      top,
      bottom: top + height,
      left: 10,
      right: 90,
      width: 80,
      height,
      x: 10,
      y: top,
      toJSON: () => ({}),
    } as DOMRect);
  }

  it('flips above the trigger when the surface cannot fit below it', () => {
    /*
     * 128px of room below, and a surface that wants 300.
     *
     * The geometry has to leave REAL room below, or the test proves nothing
     * about the measurement: an earlier version put the trigger past the
     * bottom edge, which made the room negative and therefore flipped for any
     * height at all — a mutant that always measured zero survived it.
     */
    const rect = atViewportY(window.innerHeight - 168);
    const tall = vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(300);

    harness();
    open();
    const surface = screen.getByRole('dialog');

    // Pinned to the trigger's TOP edge, growing upward, with the room above it.
    expect(surface.style.bottom).toBe(`${168 + 6}px`);
    expect(surface.style.top).toBe('');
    expect(surface.style.maxHeight).toBe(`${window.innerHeight - 168 - 12}px`);

    rect.mockRestore();
    tall.mockRestore();
  });

  it('stays below when the content is short enough to fit in the same gap', () => {
    // Same trigger position as the flip above — only the height differs, which
    // is what makes the pair prove the measurement is doing the work.
    const rect = atViewportY(window.innerHeight - 168);
    const short = vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(60);

    harness();
    open();
    expect(screen.getByRole('dialog').style.bottom).toBe('');

    rect.mockRestore();
    short.mockRestore();
  });

  it('stays below the trigger when it fits there', () => {
    const rect = atViewportY(10);
    const short = vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(80);

    harness();
    open();
    const surface = screen.getByRole('dialog');

    expect(surface.style.top).toBe('56px'); // 10 + 40 + 6
    expect(surface.style.bottom).toBe('');

    rect.mockRestore();
    short.mockRestore();
  });

  /*
   * NEITHER EDGE MAY LEAVE THE WINDOW.
   *
   * `align: 'end'` pins the surface's right edge to the trigger's, which pushes
   * its LEFT edge off screen when the trigger sits near the left. Seen on dev
   * on a variant media tile: a 224px menu anchored 196px from the edge hung
   * 28px into nowhere with the first characters of every label cut off — the
   * same "control you cannot properly see" this whole change is about.
   */
  it('keeps the whole surface on screen when the trigger is near the left edge', () => {
    const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 100, bottom: 140, left: 120, right: 196, width: 76, height: 40, x: 120, y: 100,
      toJSON: () => ({}),
    } as DOMRect);
    const wide = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(224);

    harness();
    open();
    const surface = screen.getByRole('dialog');

    // Unclamped this would be `innerWidth - 196`, putting the left edge at -28.
    const right = parseFloat(surface.style.right);
    expect(window.innerWidth - right - 224).toBeGreaterThanOrEqual(0);

    rect.mockRestore();
    wide.mockRestore();
  });

  /*
   * A MENU ITEM IS A CLICK INSIDE THE SURFACE, which is precisely what does
   * NOT dismiss it. Without a close handle the menu stands open behind
   * whatever the item just opened.
   */
  it('hands its children a close that dismisses it and restores focus', () => {
    render(
      <Popover trigger={<button>Open</button>} label="Menu">
        {(close) => (
          <button type="button" onClick={close}>
            Choose
          </button>
        )}
      </Popover>,
    );
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open' }));
  });
});

// ─── SegmentedControl ────────────────────────────────────

const SEGMENTS = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'archived', label: 'Archived' },
] as const;

describe('SegmentedControl', () => {
  function harness(initial = 'all') {
    function H() {
      const [v, setV] = useState<string>(initial);
      return (
        <SegmentedControl
          options={SEGMENTS as never}
          value={v as never}
          onChange={(x) => setV(x)}
          label="Status filter"
        />
      );
    }
    return render(<H />);
  }

  it('is a radiogroup, not a tablist', () => {
    /*
     * These choose a value; they do not switch a view. Announcing them as tabs
     * tells a screen-reader user to expect panelled content that is not there.
     */
    harness();
    expect(screen.getByRole('radiogroup', { name: 'Status filter' })).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('marks exactly one option checked', () => {
    harness();
    const checked = screen.getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(1);
  });

  it('moves with arrows and wraps', () => {
    harness('archived');
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: 'All' }).getAttribute('aria-checked')).toBe('true');
  });
});

// ─── RadioGroup ──────────────────────────────────────────

describe('RadioGroup', () => {
  function harness(props: Partial<React.ComponentProps<typeof RadioGroup>> = {}) {
    function H() {
      const [v, setV] = useState<string | undefined>(undefined);
      return (
        <RadioGroup label="Payout method" value={v} onChange={setV} {...props}>
          <Radio value="bank" label="Bank transfer" />
          <Radio value="wallet" label="Mobile wallet" />
        </RadioGroup>
      );
    }
    return render(<H />);
  }

  it('renders a fieldset so the question is announced before the options', () => {
    const { container } = harness();
    expect(container.querySelector('fieldset')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Payout method' })).toBeTruthy();
  });

  it('gives every radio the same name, which is what makes them one control', () => {
    /*
     * Radio shipped with no group wrapper, so callers wired `name` by hand — and
     * without a shared name the browser does not treat them as a group: arrows
     * do not move between them and more than one can be checked. Zero call
     * sites outside its own test, which is what an unusable primitive looks
     * like.
     */
    harness();
    const names = screen.getAllByRole('radio').map((r) => r.getAttribute('name'));
    expect(new Set(names).size).toBe(1);
    expect(names[0]).toBeTruthy();
  });

  it('selects one at a time', () => {
    harness();
    fireEvent.click(screen.getByRole('radio', { name: /bank transfer/i }));
    expect(screen.getByRole('radio', { name: /bank transfer/i })).toHaveProperty('checked', true);
    fireEvent.click(screen.getByRole('radio', { name: /mobile wallet/i }));
    expect(screen.getByRole('radio', { name: /bank transfer/i })).toHaveProperty('checked', false);
  });

  it('disables every option from the group', () => {
    harness({ disabled: true });
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toHaveProperty('disabled', true);
    }
  });

  it('associates an error with the group', () => {
    harness({ error: 'Choose a payout method' });
    const group = screen.getByRole('group');
    expect(group.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('Choose a payout method');
  });

  it('fails loudly if a Radio is used outside a group', () => {
    expect(() => render(<Radio value="x" label="X" />)).toThrow(/inside <RadioGroup>/);
  });
});
