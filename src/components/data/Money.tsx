import { cn } from '@/src/design-system/utils/cn';
import { formatMoney, type FormatMoneyOptions } from './format';

/**
 * Bangladeshi money, grouped the way Bangladeshi operators read it.
 *
 * Both existing renderings were wrong, in different ways:
 *
 *   `formatCurrency()`      → "BDT 482,150.50"
 *   inline `৳{n.toLocaleString()}` (8 screens) → "৳482,150.5"
 *
 * The first emits the ISO code instead of the symbol and groups in thousands.
 * The second gets the symbol right but leans on the machine's default locale —
 * en-US on essentially every dev and server — so it also groups in thousands,
 * and its decimal places vary with the value.
 *
 * Bangladesh uses the South Asian numbering system: lakh and crore, grouped
 * 2-2-3 rather than 3-3-3. Four hundred and eighty-two thousand is written
 * **4,82,150**, not 482,150, and to someone reading a payout figure the
 * difference is not cosmetic — the digits sit in different columns, so the
 * magnitude reads wrong at a glance.
 *
 * There is no usable `en-BD`: Intl resolves it to plain `en` and gives Western
 * grouping. `bn-BD` groups correctly but renders Bengali digits (৪,৮২,১৫০),
 * which is wrong in an English-language console. So the grouping comes from
 * `en-IN` — the same South Asian system — and the ৳ is prefixed here rather
 * than left to `style: 'currency'`, which would print "BDT".
 */

export interface MoneyProps extends FormatMoneyOptions {
  amount: number | string | null | undefined;
  /** Larger, heavier treatment for KPI figures. Default `inline`. */
  size?: 'inline' | 'display';
  /** Colour negatives. Off by default — most amounts here cannot be negative. */
  signed?: boolean;
  className?: string;
}

/**
 * Renders an amount.
 *
 * Tabular figures in the BODY face, not a mono face. Alignment down a column
 * was the only property that mattered, and `tabular-nums` delivers it on its
 * own — while a mono face additionally changes the *texture* of the number
 * relative to its label, so a table of money reads as two typefaces arguing
 * with each other. Identifiers still get mono (see `Identifier`), because a SKU
 * is transcribed character by character and 1-vs-l genuinely matters there.
 *
 * `tabular-nums` is declared explicitly rather than inherited from the base
 * layer, because that layer resets `font-variant-numeric` on `p`, `label` and
 * the headings — so an amount rendered inside a paragraph would silently fall
 * back to proportional figures and stop lining up.
 */
export function Money({
  amount,
  size = 'inline',
  signed = false,
  decimals = false,
  symbol = true,
  className,
}: MoneyProps) {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  const negative = signed && typeof value === 'number' && Number.isFinite(value) && value < 0;
  const text = formatMoney(amount, { decimals, symbol });

  return (
    <span
      // The accessible name spells out the currency, because "৳" is announced
      // inconsistently by screen readers and "taka" is what it means.
      aria-label={
        Number.isFinite(value as number) ? `${formatMoney(amount, { decimals, symbol: false })} taka` : undefined
      }
      className={cn(
        'tabular-nums whitespace-nowrap',
        size === 'display'
          ? 'text-2xl font-semibold tracking-tight text-ink'
          : 'text-sm text-ink',
        negative && 'text-bad',
        className,
      )}
    >
      {text}
    </span>
  );
}
