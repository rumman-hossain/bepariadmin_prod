// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { formatMoney } from '../format';
import { Money } from '../Money';
import { EmptyValue, Identifier, Badge } from '../Value';
import { DescriptionList, StatGrid } from '../DescriptionList';
import { Timeline } from '../Timeline';
import { Text, LABEL_TYPE } from '../Text';

afterEach(cleanup);

// ─── Money ───────────────────────────────────────────────

describe('formatMoney — South Asian grouping', () => {
  it('groups 2-2-3, not 3-3-3', () => {
    /*
     * The whole reason this component exists. Bangladesh uses lakh and crore:
     * four hundred and eighty-two thousand is 4,82,150. Both prior renderings
     * produced 482,150 — `formatCurrency` via an explicit `en-US`, and eight
     * inline `৳{n.toLocaleString()}` sites via the machine default, which is
     * en-US on every dev box and server here.
     *
     * The digits land in different columns, so the magnitude reads wrong at a
     * glance — which for a payout figure is not a cosmetic problem.
     */
    expect(formatMoney(482150)).toBe('৳4,82,150');
    expect(formatMoney(12345678)).toBe('৳1,23,45,678');
  });

  it('uses the ৳ sign, not the ISO code', () => {
    // `style: 'currency'` with BDT prints "BDT 482,150.50".
    expect(formatMoney(1000)).toBe('৳1,000');
    expect(formatMoney(1000)).not.toContain('BDT');
  });

  it('renders Latin digits, not Bengali', () => {
    // bn-BD groups correctly but produces ৪,৮২,১৫০ — wrong in an English UI.
    expect(formatMoney(482150)).not.toMatch(/[০-৯]/);
  });

  it('omits paisa by default and shows exactly two when asked', () => {
    expect(formatMoney(1234.56)).toBe('৳1,235');
    expect(formatMoney(1234.5, { decimals: true })).toBe('৳1,234.50');
    // Prior inline sites used toLocaleString(), so 1234.5 rendered as "1,234.5"
    // and 1234 as "1,234" — ragged decimals down a column.
    expect(formatMoney(1234, { decimals: true })).toBe('৳1,234.00');
  });

  it('can drop the symbol for use inside a labelled column', () => {
    expect(formatMoney(500, { symbol: false })).toBe('500');
  });

  it.each([null, undefined, NaN, Infinity, 'not a number'])(
    'renders an em dash rather than ৳NaN for %s',
    (input) => {
      expect(formatMoney(input as never)).toBe('—');
    },
  );

  it('accepts a numeric string, since the API sends both', () => {
    expect(formatMoney('482150')).toBe('৳4,82,150');
  });

  it('handles zero as a real amount', () => {
    expect(formatMoney(0)).toBe('৳0');
  });

  it('handles negatives', () => {
    expect(formatMoney(-5000)).toBe('-৳5,000');
  });
});

describe('Money', () => {
  it('gives screen readers a spoken currency name', () => {
    // "৳" is announced inconsistently, and often not at all.
    render(<Money amount={4500} />);
    expect(screen.getByLabelText('4,500 taka')).toBeTruthy();
  });

  it('uses tabular figures so a column aligns', () => {
    const { container } = render(<Money amount={1000} />);
    expect(container.querySelector('.tabular-nums')).toBeTruthy();
  });

  it('colours a negative only when told to', () => {
    const plain = render(<Money amount={-100} />).container;
    expect(plain.querySelector('.text-bad')).toBeNull();
    cleanup();
    const signed = render(<Money amount={-100} signed />).container;
    expect(signed.querySelector('.text-bad')).toBeTruthy();
  });
});

// ─── EmptyValue / Identifier / Badge ──────────────────────

describe('EmptyValue', () => {
  it('hides the dash from assistive tech and says something instead', () => {
    // Sighted users read "—" as "nothing here"; a screen reader announces
    // "em dash" or nothing, which sounds like a rendering failure.
    const { container } = render(<EmptyValue />);
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('—');
    expect(screen.getByText('Not set')).toBeTruthy();
  });

  it('carries a reason when the distinction matters', () => {
    render(<EmptyValue reason="Not yet submitted" />);
    expect(screen.getByText('Not yet submitted')).toBeTruthy();
  });
});

describe('Identifier', () => {
  it('renders in the mono face', () => {
    const { container } = render(<Identifier value="WHL-00412" />);
    expect(container.querySelector('.font-mono')).toBeTruthy();
  });

  it('falls back to EmptyValue rather than rendering nothing', () => {
    render(<Identifier value={undefined} />);
    expect(screen.getByText('Not set')).toBeTruthy();
  });

  it('keeps the full value reachable when truncated', () => {
    // Truncating without a title makes the id unusable for the one thing it is
    // for — comparing against a paper docket.
    const { container } = render(<Identifier value="ORD-2026-0000-4871" truncate={8} />);
    const el = container.firstElementChild!;
    expect(el.textContent).toBe('ORD-2026…');
    expect(el.getAttribute('title')).toBe('ORD-2026-0000-4871');
  });

  it('adds no title when nothing was cut', () => {
    const { container } = render(<Identifier value="SHORT" truncate={20} />);
    expect(container.firstElementChild!.getAttribute('title')).toBeNull();
  });
});

describe('Badge', () => {
  it('renders its content', () => {
    render(<Badge tone="ok">Verified</Badge>);
    expect(screen.getByText('Verified')).toBeTruthy();
  });

  it.each(['neutral', 'brass', 'ok', 'warn', 'bad', 'note'] as const)(
    'supports the %s tone',
    (tone) => {
      const { container } = render(<Badge tone={tone}>x</Badge>);
      expect(container.firstElementChild!.className).toContain('border');
    },
  );
});

// ─── DescriptionList ─────────────────────────────────────

const ITEMS = [
  { label: 'Company', value: 'Karim Traders' },
  { label: 'District', value: null },
];

describe('DescriptionList', () => {
  it('renders a real dl/dt/dd, not divs', () => {
    /*
     * The four implementations this replaces all used divs, so the
     * label-to-value relationship existed only visually and a detail panel read
     * as an undifferentiated run of text.
     */
    const { container } = render(<DescriptionList items={ITEMS} />);
    const dl = container.querySelector('dl')!;
    expect(dl).toBeTruthy();
    expect(within(dl).getAllByRole('term')).toHaveLength(2);
    expect(within(dl).getAllByRole('definition')).toHaveLength(2);
  });

  it('substitutes EmptyValue for an absent value', () => {
    render(<DescriptionList items={ITEMS} />);
    expect(screen.getByText('Not set')).toBeTruthy();
  });

  it.each([null, undefined, ''])('treats %s as empty', (value) => {
    render(<DescriptionList items={[{ label: 'X', value }]} />);
    expect(screen.getByText('Not set')).toBeTruthy();
  });

  it('does NOT treat 0 or false as empty', () => {
    // A zero commission rate is a real arrangement, not a missing one.
    render(<DescriptionList items={[{ label: 'Rate', value: 0 }]} />);
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.queryByText('Not set')).toBeNull();
  });
});

// ─── StatGrid ────────────────────────────────────────────

describe('StatGrid', () => {

  it('sizes the grid to the number of tiles', () => {
    /*
     * The column count was fixed at four. The Orders screen supplies three —
     * orders, pending, revenue — so it rendered a fourth tile containing
     * nothing, which reads as a figure that failed to load rather than a figure
     * that does not exist.
     */
    const { container, rerender } = render(
      <StatGrid
        items={[
          { label: 'Orders', value: '0' },
          { label: 'Pending', value: '0' },
          { label: 'Revenue', value: '0' },
        ]}
      />,
    );
    const grid = () => container.firstElementChild!.className;
    expect(grid()).toContain('lg:grid-cols-3');
    expect(grid()).not.toContain('lg:grid-cols-4');

    // Four still lays out as four — the dashboard must not change.
    rerender(
      <StatGrid
        items={[
          { label: 'A', value: '1' },
          { label: 'B', value: '2' },
          { label: 'C', value: '3' },
          { label: 'D', value: '4' },
        ]}
      />,
    );
    expect(grid()).toContain('lg:grid-cols-4');
  });

  it('never exceeds four columns, however many tiles', () => {
    const { container } = render(
      <StatGrid
        items={Array.from({ length: 7 }, (_, i) => ({ label: `S${i}`, value: String(i) }))}
      />,
    );
    expect(container.firstElementChild!.className).toContain('lg:grid-cols-4');
  });
  it('renders every tile', () => {
    render(
      <StatGrid
        items={[
          { label: 'Orders', value: 42 },
          { label: 'Payout', value: <Money amount={100000} /> },
        ]}
      />,
    );
    expect(screen.getByText('Orders')).toBeTruthy();
    expect(screen.getByText('৳1,00,000')).toBeTruthy();
  });

  it('shows EmptyValue rather than 0 for an unmeasured metric', () => {
    /*
     * On the supplier detail screen four of these render permanently empty
     * because their endpoints return null. A `0` would read as "no orders"
     * rather than "not measured" — the difference between a negative result
     * and no result.
     */
    render(<StatGrid items={[{ label: 'Rating', value: null, emptyReason: 'Not measured' }]} />);
    expect(screen.getByText('Not measured')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
  });
});

// ─── Timeline ────────────────────────────────────────────

const EVENTS = [
  { id: '1', title: 'Submitted for review', at: '2026-07-30T09:15:00Z', actor: 'Karim Rahman' },
  { id: '2', title: 'Approved', at: '2026-07-31T14:02:00Z', tone: 'ok' as const },
];

describe('Timeline', () => {
  it('renders an ordered list', () => {
    // Chronology is structure, not styling — `ol` conveys it without sight.
    const { container } = render(<Timeline events={EVENTS} />);
    expect(container.querySelector('ol')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('emits a machine-readable time', () => {
    const { container } = render(<Timeline events={EVENTS} />);
    const time = container.querySelector('time')!;
    expect(time.getAttribute('dateTime') ?? time.getAttribute('datetime')).toContain('2026-07-30');
  });

  it('shows an unparseable timestamp verbatim rather than "Invalid Date"', () => {
    render(<Timeline events={[{ id: '1', title: 'x', at: 'sometime' }]} />);
    expect(screen.getByText('sometime')).toBeTruthy();
  });

  it('omits the actor line for system events', () => {
    render(<Timeline events={EVENTS} />);
    expect(screen.getByText('by Karim Rahman')).toBeTruthy();
    expect(screen.queryByText(/^by $/)).toBeNull();
  });

  it('does not trail the spine past the last event', () => {
    // A line running into empty space reads as "more below" and invites a
    // scroll that finds nothing.
    const { container } = render(<Timeline events={EVENTS} />);
    const spines = container.querySelectorAll('span.absolute');
    expect(spines).toHaveLength(EVENTS.length - 1);
  });
});

// ─── Text ────────────────────────────────────────────────

describe('Text', () => {
  it('renders a span by default, which is legal anywhere', () => {
    // A <p> default would nest invalidly inside the many places this is used
    // in running text, and React does not warn about it.
    const { container } = render(<Text>hello</Text>);
    expect(container.firstElementChild!.tagName).toBe('SPAN');
  });

  it('spells one intent one way', () => {
    /*
     * The drift this closes: the uppercase micro-label shipped as both
     * `text-xs text-ink-3 uppercase tracking-wide` and
     * `text-xs text-ink-3 uppercase font-semibold`, so two labels on one screen
     * did not match each other.
     */
    const { container } = render(<Text variant="label">Status</Text>);
    const cls = container.firstElementChild!.className;
    expect(cls).toContain('uppercase');
    // The 11px step with caps tracking, matching DESIGN_SYSTEM.md and the
    // published preview. The first version of this variant used text-xs with
    // tracking-wide and disagreed with both — and with DataTable's own headers,
    // which render the identical role.
    expect(cls).toContain('text-2xs');
    expect(cls).toContain('tracking-caps');
  });

  it('shares one definition with the table header', () => {
    // Not a style assertion for its own sake: a field label and a column header
    // sitting on the same screen must match, and they did not.
    const { container } = render(<Text variant="label">Status</Text>);
    expect(container.firstElementChild!.className).toContain(LABEL_TYPE);
  });

  it('keeps truncated text reachable', () => {
    // Truncation without a title deletes the information for anyone who cannot
    // widen the window.
    render(<Text truncate>Elegant Apparel Manufacturing Limited</Text>);
    expect(screen.getByTitle('Elegant Apparel Manufacturing Limited')).toBeTruthy();
  });

  it('does not invent a title for non-string children', () => {
    const { container } = render(
      <Text truncate>
        <em>markup</em>
      </Text>,
    );
    expect(container.firstElementChild!.hasAttribute('title')).toBe(false);
  });

  it('renders as the requested element for description lists', () => {
    const { container } = render(<Text as="dt" variant="label">Total</Text>);
    expect(container.firstElementChild!.tagName).toBe('DT');
  });
});

describe('money has exactly one rendering', () => {
  it('never emits a currency code where a symbol belongs', () => {
    /*
     * The regression this pins. `src/utils/formatCurrency` used an en-US locale
     * with `currency: 'BDT'` and produced "BDT 482,150.00" — Western 3-3
     * grouping and a code instead of ৳. It outlived the component that replaced
     * it and was still live on the product detail page and on the final step of
     * the add-product wizard, which is where an operator confirms prices before
     * publishing. The file is gone and `guard:one-money-formatter` stops it
     * returning.
     */
    for (const amount of [482150, 4821.5, 41093650]) {
      for (const decimals of [false, true]) {
        const out = formatMoney(amount, { decimals });
        expect(out).not.toContain('BDT');
        expect(out.startsWith('৳')).toBe(true);
      }
    }
  });

  it('groups in lakh and crore at every magnitude', () => {
    // en-US would give 482,150 / 41,093,650 — the digit counts an operator
    // would have to stop and count.
    expect(formatMoney(482150)).toBe('৳4,82,150');
    expect(formatMoney(41093650)).toBe('৳4,10,93,650');
    expect(formatMoney(4821.5, { decimals: true })).toBe('৳4,821.50');
  });
});
