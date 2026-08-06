import React from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { EmptyValue } from './Value';

export interface DetailItem {
  label: string;
  /** `undefined`, `null` and `''` all render as EmptyValue. */
  value: React.ReactNode;
  /** Shown to screen readers when the value is empty. */
  emptyReason?: string;
  /** Span both columns in the two-column layout — addresses, notes. */
  wide?: boolean;
}

export interface DescriptionListProps {
  items: DetailItem[];
  /**
   * `rows` stacks label above value — good in a narrow aside.
   * `inline` puts them side by side — good in a wide panel.
   * Default `rows`.
   */
  layout?: 'rows' | 'inline';
  /** Two columns above `sm`. Default false. */
  columns?: boolean;
  className?: string;
}

function isEmpty(value: React.ReactNode): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * Label/value pairs — the substance of every detail screen.
 *
 * Four separate implementations shipped: a horizontal `MetaRow` with an
 * `ml-auto` value, a stacked `DataRow` with bottom borders, a section-driven
 * `EntityDetailsCard`, and ad-hoc `flex justify-between` blocks. Between them
 * the uppercase micro-label appeared 30 times in six different class strings —
 * `text-xs font-medium … tracking-wide`, `text-2xs font-semibold … tracking-wider`,
 * `text-xs font-bold … tracking-wider`, and so on.
 *
 * Renders a real `<dl>`. The previous versions used `div`s, so the
 * label-to-value relationship existed only visually — a screen reader read a
 * detail panel as an undifferentiated run of text.
 */
export function DescriptionList({
  items,
  layout = 'rows',
  columns = false,
  className,
}: DescriptionListProps) {
  return (
    <dl
      className={cn(
        columns ? 'grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2' : 'flex flex-col gap-4',
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            item.wide && columns && 'sm:col-span-2',
            layout === 'inline' && 'flex items-baseline justify-between gap-4',
          )}
        >
          <dt
            className={cn(
              'text-2xs font-semibold uppercase tracking-caps text-ink-3',
              layout === 'inline' ? 'shrink-0' : 'mb-1',
            )}
          >
            {item.label}
          </dt>
          <dd
            className={cn(
              'text-sm text-ink',
              layout === 'inline' && 'min-w-0 text-right',
            )}
          >
            {isEmpty(item.value) ? <EmptyValue reason={item.emptyReason} /> : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export interface StatTileProps {
  label: string;
  /** Pass a `Money` element for amounts; a plain number renders tabular. */
  value: React.ReactNode;
  /** Context under the figure — a comparison, a total, a period. */
  detail?: React.ReactNode;
  icon?: React.ReactNode;
  emptyReason?: string;
}

export interface StatGridProps {
  items: StatTileProps[];
  className?: string;
}

/**
 * A single metric.
 *
 * Five implementations shipped, using three different numeric-alignment
 * mechanisms — `tabular-nums`, the `.cell-numeric` utility, and nothing at
 * all — so figures in adjacent panels did not line up with each other.
 *
 * An absent value renders EmptyValue rather than `0`. That distinction matters
 * more here than anywhere else in the app: on the supplier detail screen four
 * of these rendered permanent em dashes because their endpoints return `null`,
 * and a `0` would have read as "no orders" rather than "not measured".
 */
export function StatTile({ label, value, detail, icon, emptyReason }: StatTileProps) {
  return (
    <div className="bg-sheet p-4">
      <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-caps text-ink-3">
        {icon}
        {label}
      </p>
      <p className="mt-1.5 truncate text-2xl font-semibold tabular-nums tracking-tight text-ink">
        {isEmpty(value) ? <EmptyValue reason={emptyReason} /> : value}
      </p>
      {detail && <p className="mt-0.5 text-xs text-ink-3">{detail}</p>}
    </div>
  );
}

/**
 * A row of metrics.
 *
 * Hairline separation via a 1px gap over a rule-coloured background, rather
 * than four bordered cards. Cards at this density produce a visible ladder of
 * borders — border, gap, border — where a single shared rule reads as one
 * object containing four figures, which is what it is.
 */
/**
 * Wide-viewport column counts, keyed by how many tiles there actually are.
 *
 * The count was hardcoded at four. The Orders screen supplies three — orders,
 * pending, revenue — and the fourth cell rendered as empty background, which
 * reads as a figure that failed to load rather than one that does not exist.
 *
 * Written out rather than interpolated because Tailwind scans for complete
 * class names; `lg:grid-cols-${n}` produces no CSS at all.
 */
const STAT_COLUMNS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
};

export function StatGrid({ items, className }: StatGridProps) {
  // Anything not in the map — none, or more than four — falls back to four
  // columns and wraps onto a second row. Four is the widest that stays readable.
  const columns = STAT_COLUMNS[items.length] ?? STAT_COLUMNS[4];

  return (
    <div
      className={cn(
        'grid gap-px overflow-hidden rounded-lg border border-rule-subtle bg-rule-subtle',
        columns,
        className,
      )}
    >
      {items.map((item) => (
        <StatTile key={item.label} {...item} />
      ))}
    </div>
  );
}
