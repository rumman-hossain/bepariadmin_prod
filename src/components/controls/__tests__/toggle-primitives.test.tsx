// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, cleanup } from '@testing-library/react';
import { Checkbox } from '../Checkbox';
import { Switch } from '../Switch';
import { Radio, RadioGroup } from '@/src/components/controls';

/**
 * Structural guard for Checkbox / Radio / Switch.
 *
 * These three shipped visually broken for a long time and nothing caught it,
 * because the components rendered, the classes were present in the markup, and
 * the CSS rules existed in the bundle. The only thing wrong was the DOM shape.
 *
 * Tailwind compiles `peer-checked:` to a GENERAL SIBLING selector —
 * `:is(:where(.peer):checked ~ *)`. So a `peer-checked:` class only ever
 * applies to an element that is a following SIBLING of the `.peer` input. When
 * the tick / dot / thumb were nested one level deeper, the selector silently
 * matched nothing: a checked checkbox was a blank blue square, a selected radio
 * a blank blue circle, and the switch never moved at all.
 *
 * Asserting "the class is in the markup" would have passed on the broken code.
 * These tests assert the *relationship* instead, which is the thing that broke.
 */

afterEach(cleanup);

/** Every element carrying a `peer-*:` class must be a sibling of the `.peer`. */
function assertPeerTargetsAreSiblings(root: HTMLElement) {
  const peers = Array.from(root.querySelectorAll('.peer'));
  expect(peers.length, 'expected a .peer input').toBeGreaterThan(0);

  const targets = Array.from(root.querySelectorAll('*')).filter((el) =>
    Array.from(el.classList).some((c) => c.startsWith('peer-')),
  );
  expect(targets.length, 'expected at least one peer-* target').toBeGreaterThan(0);

  for (const target of targets) {
    const sharesParentWithAPeer = peers.some((peer) => peer.parentElement === target.parentElement);
    expect(
      sharesParentWithAPeer,
      `<${target.tagName.toLowerCase()} class="${target.className}"> is not a sibling of the .peer input, ` +
        `so its peer-* classes can never apply`,
    ).toBe(true);
  }
}

/** The peer must also precede its targets — `~` only matches forwards. */
function assertPeerComesFirst(root: HTMLElement) {
  const peer = root.querySelector('.peer')!;
  const targets = Array.from(peer.parentElement!.children).filter((el) =>
    Array.from(el.classList).some((c) => c.startsWith('peer-')),
  );
  for (const target of targets) {
    const position = peer.compareDocumentPosition(target);
    expect(
      Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING),
      `${target.className} precedes the .peer input; the sibling combinator only matches forwards`,
    ).toBe(true);
  }
}

describe('the guard itself', () => {
  it('rejects the old nested shape', () => {
    // This is the exact structure Switch.tsx shipped with: the peer input is a
    // sibling of the <label>, but the track and thumb are the label's children.
    // If this canary ever passes, the checks below have stopped guarding.
    const { container } = render(
      <div>
        <span>
          <input className="peer sr-only" type="checkbox" readOnly />
          <label>
            <span className="peer-checked:bg-brass" />
            <span className="peer-checked:translate-x-4" />
          </label>
        </span>
      </div>,
    );
    expect(() => assertPeerTargetsAreSiblings(container)).toThrow();
  });
});

describe('Checkbox', () => {
  it('places every peer-* target as a following sibling of the input', () => {
    const { container } = render(<Checkbox label="Active" defaultChecked />);
    assertPeerTargetsAreSiblings(container);
    assertPeerComesFirst(container);
  });

  it('renders a tick element that the checked state can reach', () => {
    const { container } = render(<Checkbox label="Active" defaultChecked />);
    const tick = container.querySelector('.peer-checked\\:opacity-100');
    expect(tick, 'no element carries peer-checked:opacity-100').not.toBeNull();
    expect(tick!.parentElement).toBe(container.querySelector('.peer')!.parentElement);
  });

  it('drives the box fill from the checked state', () => {
    const { container } = render(<Checkbox label="Active" />);
    const box = container.querySelector('.peer-checked\\:bg-brass');
    expect(box).not.toBeNull();
    expect(box!.parentElement).toBe(container.querySelector('.peer')!.parentElement);
  });

  it('wires label, error and description to the input', () => {
    const { container } = render(<Checkbox label="Active" error="Required" id="cb" />);
    const input = container.querySelector('#cb')!;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('cb-error');
    expect(container.querySelector('label[for="cb"]')).not.toBeNull();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Required');
  });
});

/** The rebuilt Radio requires its group; the old one was standalone. */
function renderRadio() {
  return render(
    <RadioGroup label="Choice" value="a" onChange={() => {}}>
      <Radio value="a" label="A" />
    </RadioGroup>,
  );
}

describe('Radio', () => {
  it('places every peer-* target as a following sibling of the input', () => {
    const { container } = renderRadio();
    assertPeerTargetsAreSiblings(container);
    assertPeerComesFirst(container);
  });

  it('renders a dot the checked state can reach', () => {
    const { container } = renderRadio();
    const dot = container.querySelector('.peer-checked\\:scale-100');
    expect(dot, 'no element carries peer-checked:scale-100').not.toBeNull();
    expect(dot!.parentElement).toBe(container.querySelector('.peer')!.parentElement);
  });
});

describe('Switch', () => {
  it('places every peer-* target as a following sibling of the input', () => {
    const { container } = render(<Switch label="Enabled" defaultChecked />);
    assertPeerTargetsAreSiblings(container);
    assertPeerComesFirst(container);
  });

  it('has a track whose checked colour can apply', () => {
    const { container } = render(<Switch label="Enabled" />);
    const track = container.querySelector('.peer-checked\\:bg-brass');
    expect(track, 'no element carries peer-checked:bg-brass').not.toBeNull();
    expect(track!.parentElement).toBe(container.querySelector('.peer')!.parentElement);
  });

  it('paints its track and thumb with tokens that exist', () => {
    /*
     * This test exists because the sibling assertions above passed for months
     * against a switch that rendered with NO track and NO thumb.
     *
     * The classes were `bg-switch-track`, `peer-checked:bg-switch-track-checked`
     * and `bg-switch-thumb`, and none of those tokens was ever defined in
     * index.css — so Tailwind emitted no rule for any of them. Asserting that a
     * class is written is not the same as asserting it resolves, and jsdom
     * cannot tell the difference because it loads no stylesheet.
     *
     * Reading index.css is the only way to check this from a unit test, so that
     * is what this does.
     */
    const css = readFileSync(resolve(process.cwd(), 'index.css'), 'utf8');
    const { container } = render(<Switch label="Enabled" />);

    const colourClasses = [...container.querySelectorAll('span')]
      .flatMap((el) => [...el.classList])
      .map((c) => /^(?:peer-checked:)?bg-([a-z][a-z0-9-]*)$/.exec(c)?.[1])
      .filter((name): name is string => Boolean(name));

    expect(colourClasses.length).toBeGreaterThan(0);
    for (const name of colourClasses) {
      expect(css, `bg-${name} has no --color-${name} in index.css`).toContain(`--color-${name}:`);
    }
  });

  it('has a thumb whose checked translation can apply', () => {
    const { container } = render(<Switch label="Enabled" />);
    const thumb = container.querySelector('.peer-checked\\:translate-x-4');
    expect(thumb, 'no element carries peer-checked:translate-x-4').not.toBeNull();
    expect(thumb!.parentElement).toBe(container.querySelector('.peer')!.parentElement);
  });

  it('exposes the switch role and stays operable', () => {
    const { container } = render(<Switch label="Enabled" defaultChecked />);
    const input = container.querySelector('input[role="switch"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.checked).toBe(true);
    // sr-only would make the control unclickable now that the input sits on top
    expect(input.classList.contains('sr-only')).toBe(false);
  });
});
