import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(process.cwd(), 'index.css'), 'utf8');

/** Pulls `--name: value;` out of a named block. */
function tokensIn(block: 'theme' | 'dark'): Map<string, string> {
  const start =
    block === 'theme' ? css.indexOf('@theme {') : css.indexOf('.dark {');
  const body = css.slice(start, css.indexOf('\n}', start));
  const out = new Map<string, string>();
  for (const [, name, value] of body.matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);/gim)) {
    out.set(name, value.trim());
  }
  return out;
}

const theme = tokensIn('theme');
const dark = tokensIn('dark');

// ─── Contrast ────────────────────────────────────────────

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const channel = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/**
 * The palette's accessibility is asserted from the stylesheet itself, not from
 * a table in a comment. A comment claiming 6.2:1 stays convincing forever after
 * someone nudges the hex.
 */
describe('Khata — contrast', () => {
  const TEXT_ON_PAPER = [
    'ink',
    'ink-2',
    'ink-3',
    'ink-4',
    'brass',
    'brass-lift',
    'ok',
    'warn',
    'bad',
    'note',
    'mute',
  ];

  describe.each([
    ['light', theme, '--color-paper'] as const,
    ['dark', dark, '--color-paper'] as const,
  ])('%s theme', (_name, tokens, groundKey) => {
    const ground = tokens.get(groundKey)!;

    it('defines a ground', () => {
      expect(ground).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it.each(TEXT_ON_PAPER)('--color-%s meets AA (4.5:1) for text', (name) => {
      const value = tokens.get(`--color-${name}`);
      expect(value, `--color-${name} is not defined`).toBeDefined();
      expect(contrast(value!, ground)).toBeGreaterThanOrEqual(4.5);
    });

    it('control borders meet SC 1.4.11 (3:1)', () => {
      // Non-text contrast: an input the user cannot find is unusable even
      // though no letter is involved.
      const sheet = tokens.get('--color-sheet')!;
      expect(contrast(tokens.get('--color-rule-input')!, sheet)).toBeGreaterThanOrEqual(3);
    });

    it('button labels are legible on their fills', () => {
      expect(
        contrast(tokens.get('--color-brass-content')!, tokens.get('--color-brass')!),
      ).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('keeps the ink ramp ordered, so ink-4 is never darker than ink-3', () => {
    /*
     * The first Khata draft had ink-3 at 3.78:1 and ink-4 at 4.23:1 — both
     * failing AA, and inverted relative to each other, so "tertiary" was
     * lighter than "placeholder". Both were written from a spec that asserted
     * a 4.6:1 floor nobody had measured.
     *
     * This pins the ordering as well as the floor: a ramp that inverts is a
     * ramp where picking the "quieter" token makes text louder.
     */
    const ground = theme.get('--color-paper')!;
    const r = (n: string) => contrast(theme.get(`--color-${n}`)!, ground);
    expect(r('ink')).toBeGreaterThan(r('ink-2'));
    expect(r('ink-2')).toBeGreaterThan(r('ink-3'));
    expect(r('ink-3')).toBeGreaterThan(r('ink-4'));
    expect(r('ink-4')).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps brass the only accent', () => {
    /*
     * The design has exactly one accent. If a second structural colour appears
     * — a `--color-teal`, a second brand hue — this fails, because "one accent
     * used once per region" is the rule that keeps a dense screen calm, and it
     * is the first thing to erode.
     */
    const accents = [...theme.keys()].filter(
      (k) =>
        k.startsWith('--color-') &&
        !/^--color-(ink|paper|sheet|rule|ok|warn|bad|note|mute|chart|brass)/.test(k),
    );
    expect(accents).toEqual([]);
  });
});

// ─── Completeness ────────────────────────────────────────

describe('Khata — light/dark parity', () => {
  it('overrides every colour token in dark', () => {
    // A token defined in @theme but absent from .dark keeps its light value on
    // a dark ground — which is how a white panel ends up on a near-black page.
    const lightColours = [...theme.keys()].filter((k) => k.startsWith('--color-'));
    const newSet = lightColours.filter(
      (k) =>
        /^--color-(ink|brass|paper|sheet|rule|ok|warn|bad|note|mute)/.test(k),
    );
    const missing = newSet.filter((k) => !dark.has(k));
    expect(missing).toEqual([]);
  });
});

describe('token categories that were missing', () => {
  it.each([
    ['spacing', '--spacing-6'],
    ['z-index', '--z-modal'],
    ['font weight', '--font-weight-semibold'],
    ['tracking', '--tracking-caps'],
    ['opacity', '--opacity-disabled'],
    ['container', '--container-form'],
  ])('defines a %s scale', (_label, token) => {
    expect(theme.has(token)).toBe(true);
  });

  it('does NOT define --duration-* tokens', () => {
    /*
     * Tailwind v4 has no `--duration-*` theme namespace, so such tokens emit
     * no CSS whatsoever. Four of them were written, then removed on discovering
     * that — the same silent-failure class as the eight undefined tokens this
     * pass fixed. `--default-transition-duration` is the real knob.
     */
    expect([...theme.keys()].filter((k) => k.startsWith('--duration-'))).toEqual([]);
    expect(theme.has('--default-transition-duration')).toBe(true);
  });

  it('orders the stacking scale so overlays cannot sit under their triggers', () => {
    const z = (n: string) => Number(theme.get(`--z-${n}`));
    expect(z('raised')).toBeLessThan(z('sticky'));
    expect(z('sticky')).toBeLessThan(z('nav'));
    expect(z('nav')).toBeLessThan(z('overlay'));
    expect(z('overlay')).toBeLessThan(z('modal'));
    expect(z('modal')).toBeLessThan(z('toast'));
  });

  it('puts dropdown ABOVE modal, not below it', () => {
    /*
     * The ordering looks wrong and is not. A menu, popover or combobox is
     * always opened by a control the user just operated — so if that control
     * sits inside a dialog, the surface has to clear the dialog.
     *
     * This was got wrong on the first attempt (dropdown 40, modal 60) and the
     * browser check caught it: the popover correctly escaped its clipping
     * ancestor via the portal, then rendered underneath the modal containing
     * its own trigger — reproducing the exact bug the scale exists to fix.
     * jsdom has no stacking contexts, so no unit test could have found it.
     */
    const z = (n: string) => Number(theme.get(`--z-${n}`));
    expect(z('dropdown')).toBeGreaterThan(z('modal'));
    expect(z('dropdown')).toBeLessThan(z('toast'));
  });
});

describe('no token is referenced without being defined', () => {
  it('every var(--color-*) in index.css resolves', () => {
    // Eight tokens were referenced-but-undefined before this pass and failed
    // silently — EntityDetailsCard rendered transparent in production.
    const referenced = new Set(
      [...css.matchAll(/var\((--color-[a-z0-9-]+)\)/gi)].map((m) => m[1]!),
    );
    const defined = new Set([...theme.keys(), ...dark.keys()]);
    expect([...referenced].filter((r) => !defined.has(r))).toEqual([]);
  });
});

// ─── Stacking, as it is actually used ────────────────────

describe('the z-scale in practice', () => {
  /** Resolves `z-(--z-foo)` in a class string to its number from index.css. */
  function zStep(className: string): number | null {
    const match = /z-\(--(z-[a-z]+)\)/.exec(className);
    if (!match) return null;
    const value = theme.get(`--${match[1]}`);
    return value === undefined ? null : Number(value);
  }

  const dialogSource = readFileSync(
    resolve(process.cwd(), 'src/components/feedback/Dialog.tsx'),
    'utf8',
  );

  it('keeps the dialog panel above its own backdrop', () => {
    /*
     * The bug this pins, which was live in every confirm dialog in the app:
     * the backdrop carried `--z-overlay` (40), a *page-level* rank, while the
     * panel was `relative` at `z-index: auto`. Both sit inside one container at
     * `--z-modal`, and within a stacking context a positive z-index paints
     * above auto — so the backdrop covered the panel and no button in it could
     * be clicked. Cancel included.
     *
     * No jsdom test could see it: there is no stylesheet and no hit testing,
     * and `fireEvent.click` dispatches straight at the node. It took
     * `elementFromPoint` in a real browser. What IS checkable here is the
     * invariant that failed — the two siblings' steps, in order.
     */
    /*
     * Matched on the class string, not on `className="…`.
     *
     * The backdrop moved into a `cn()` call when it gained an exit animation,
     * and this regex — which required the attribute syntax — silently stopped
     * matching it and locked on to the next `absolute inset-0 z-(…)` in the
     * file instead. It then compared that element against the panel and failed
     * on an invariant that was still perfectly intact. A source-shape assertion
     * has to be anchored to something the source is actually about.
     */
    const backdrop = /'?absolute inset-0 z-\(--z-[a-z]+\)/.exec(dialogSource)?.[0];
    const panel = /'relative z-\(--z-[a-z]+\)/.exec(dialogSource)?.[0];

    expect(backdrop, 'dialog backdrop should declare a z step').toBeTruthy();
    expect(panel, 'dialog panel should declare a z step').toBeTruthy();

    const backdropZ = zStep(backdrop!);
    const panelZ = zStep(panel!);
    expect(backdropZ).not.toBeNull();
    expect(panelZ).not.toBeNull();
    expect(panelZ!).toBeGreaterThan(backdropZ!);
  });

  it('is a strictly increasing scale, so two steps never tie', () => {
    // A tie means paint order falls back to tree order, which is exactly the
    // kind of accident the scale exists to prevent.
    const order = ['base', 'raised', 'sticky', 'nav', 'overlay', 'modal', 'dropdown', 'toast'];
    const values = order.map((name) => Number(theme.get(`--z-${name}`)));
    expect(values.every(Number.isFinite)).toBe(true);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]!).toBeGreaterThan(values[i - 1]!);
    }
  });
});
