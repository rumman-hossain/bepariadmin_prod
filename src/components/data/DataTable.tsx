import React, { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/src/design-system/utils/cn';
import { LABEL_TYPE } from './Text';

export interface Column<T> {
  key: string;
  header: string;
  /**
   * Numeric columns are right-aligned with tabular figures, so magnitudes are
   * comparable straight down the column.
   */
  align?: 'left' | 'right' | 'center';
  /** A width class, e.g. `w-32`. */
  width?: string;
  /** Omit to make the column unsortable. */
  sortBy?: (row: T) => string | number | null | undefined;
  render: (row: T) => React.ReactNode;
  className?: string;

  /**
   * Below `md` the table becomes a stack of cards (see `.table-cards` in
   * index.css). These two control what that card looks like. Both are optional,
   * so every existing call site keeps working untouched.
   */

  /**
   * This column is the card's heading: rendered full width with no label.
   * Defaults to the first column, which is the identifying one in every table
   * in this app.
   */
  primary?: boolean;
  /**
   * Drop this column from the card. It stays in the table at `md` and up.
   * For columns that are genuinely secondary — not for ones that are merely
   * inconvenient, since a hidden column is invisible rather than compressed.
   */
  hideOnMobile?: boolean;
}

export type SortDirection = 'asc' | 'desc';
export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Stable row identity — a function, so composite keys are expressible. */
  rowKey: (row: T) => string;

  /**
   * Where a row goes when activated. Renders a real link, so the row supports
   * keyboard focus, Enter, middle-click and open-in-new-tab. Prefer this over
   * `onRowClick` for anything that navigates.
   */
  rowHref?: (row: T) => string;
  /** Accessible name for the row link. Defaults to the first column's text. */
  rowLabel?: (row: T) => string;

  /** Non-navigating row activation. Gets keyboard support; `rowHref` is better. */
  onRowClick?: (row: T) => void;

  /** Controlled selection. Omit both to disable selection entirely. */
  selectedKeys?: ReadonlySet<string>;
  onSelectionChange?: (keys: Set<string>) => void;

  /**
   * Hand sorting to the server. When provided the table stops sorting locally
   * and simply reports the requested order.
   */
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;

  density?: 'comfortable' | 'compact';
  stickyHeader?: boolean;
  className?: string;
  caption?: string;
  /** Rendered in place of the body when `data` is empty. */
  empty?: React.ReactNode;
}

/**
 * The header's type treatment, applied to whichever element carries the text.
 *
 * Shared with `<Text variant="label">` — a column header and a field label are
 * the same role, and keeping two spellings of it is how they stop matching.
 */
const HEADER_TYPE = LABEL_TYPE;

const ALIGN: Record<NonNullable<Column<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right tabular-nums',
  center: 'text-center',
};

/**
 * The shared table, on the Indigo & Jute tokens.
 *
 * Three things changed beyond the palette.
 *
 * **Rows are reachable.** `onRowClick` sat on a bare `<tr>` with no `tabIndex`,
 * no `role` and no key handler, so on the two list screens that used it the
 * only way to open a record was a mouse. `rowHref` renders a real link
 * stretched across the row — which also gives middle-click and open-in-new-tab,
 * both of which operators working a queue actually use.
 *
 * **Selection exists.** There was no way to act on more than one record, which
 * is why no bulk action shipped anywhere in the app.
 *
 * **Sorting can be delegated.** Client-side sort silently sorts one page of a
 * server-paginated list, which looks like it worked and is wrong. Passing
 * `sort`/`onSortChange` moves the decision to the caller.
 *
 * Loading, error and empty presentation are deliberately NOT built in: they are
 * `Skeleton`, `ErrorState` and `EmptyState`, and a table that renders its own
 * is a table that disagrees with the rest of the screen.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  rowHref,
  rowLabel,
  onRowClick,
  selectedKeys,
  onSelectionChange,
  sort: controlledSort,
  onSortChange,
  density = 'comfortable',
  stickyHeader = false,
  className,
  caption,
  empty,
}: DataTableProps<T>) {
  const [localSort, setLocalSort] = useState<SortState | null>(null);
  const selectAllId = useId();

  const serverSorted = onSortChange !== undefined;
  const sort = serverSorted ? (controlledSort ?? null) : localSort;

  const selectable = selectedKeys !== undefined && onSelectionChange !== undefined;
  const selected = selectedKeys ?? new Set<string>();

  const sorted = useMemo(() => {
    // The server already ordered these; re-sorting would fight it.
    if (serverSorted || !sort) return data;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortBy) return data;

    // Copy first — sorting the prop array in place would mutate caller state.
    return [...data].sort((a, b) => {
      const av = column.sortBy!(a);
      const bv = column.sortBy!(b);

      // Absent values sort last in both directions; they are not "smallest".
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      const result =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'en', { numeric: true, sensitivity: 'base' });

      return sort.direction === 'asc' ? result : -result;
    });
  }, [data, sort, columns, serverSorted]);

  function toggleSort(column: Column<T>) {
    if (!column.sortBy) return;
    const next: SortState | null =
      sort?.key !== column.key
        ? { key: column.key, direction: 'asc' }
        : sort.direction === 'asc'
          ? { key: column.key, direction: 'desc' }
          : null; // third press clears, rather than trapping the user in a sort

    if (serverSorted) onSortChange!(next);
    else setLocalSort(next);
  }

  const allKeys = sorted.map(rowKey);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k));
  const someSelected = allKeys.some((k) => selected.has(k));

  function toggleAll() {
    if (!selectable) return;
    // "Select all" means the rows currently shown. Selecting rows the operator
    // cannot see is how a bulk action hits records nobody reviewed.
    onSelectionChange!(allSelected ? new Set() : new Set(allKeys));
  }

  function toggleRow(key: string) {
    if (!selectable) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange!(next);
  }

  const cellPad = density === 'compact' ? 'px-3 py-1.5' : 'px-4 py-2.5';

  /*
   * Which column heads the card below `md`.
   *
   * The default — "the first column" — must only apply when no column has
   * claimed the role, otherwise a table that declares `primary` on column 2
   * gets two headings: its own and the implicit one. Resolving it to a single
   * key here makes that impossible to express.
   */
  const primaryKey = (columns.find((c) => c.primary) ?? columns[0])?.key;

  if (data.length === 0 && empty) {
    return <div className={cn('rounded-lg border border-rule', className)}>{empty}</div>;
  }

  return (
    <div
      className={cn(
        'table-cards-wrap overflow-auto rounded-lg border border-rule bg-sheet',
        /*
         * A sticky header needs something to stick to.
         *
         * `position: sticky` resolves against the nearest scrolling ancestor,
         * which is this wrapper because of `overflow-auto`. Unbounded, the
         * wrapper is exactly as tall as the table and so never scrolls — the
         * header stuck to a box that does not move, and rode off the top of the
         * page with everything else. Bounding the height turns the wrapper into
         * a real scroll region and makes the prop mean what it says.
         */
        stickyHeader && 'max-h-(--table-viewport)',
        className,
      )}
    >
      {/*
        `role` is spelled out because `.table-cards` sets `display: block` on
        these elements below `md`, and that drops the implicit ARIA table roles
        in several engines. The layout stops being a table; the semantics must
        not.
      */}
      <table role="table" className="table-cards w-full border-collapse text-base">
        {caption && <caption className="sr-only">{caption}</caption>}

        <thead className={cn('bg-sheet-2', stickyHeader && 'sticky top-0 z-(--z-raised)')}>
          <tr role="row" className="border-b border-rule">
            {selectable && (
              <th scope="col" className={cn(cellPad, 'w-10')}>
                <input
                  id={selectAllId}
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    // Indeterminate is a property, not an attribute — it cannot
                    // be expressed in JSX and has to be set on the node.
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={toggleAll}
                  aria-label={allSelected ? 'Clear selection' : 'Select all rows shown'}
                  className="h-4 w-4 accent-brass"
                />
              </th>
            )}

            {columns.map((col) => {
              const isSorted = sort?.key === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={
                    isSorted ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                  className={cn(
                    cellPad,
                    ALIGN[col.align ?? 'left'],
                    col.width,
                    HEADER_TYPE,
                    'text-ink-3',
                  )}
                >
                  {col.sortBy ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col)}
                      className={cn(
                        // Repeated from the `th`, not inherited.
                        //
                        // The UA stylesheet resets `text-transform` on form
                        // controls and the reset wins over inheritance, so a
                        // sortable header rendered title case while the plain
                        // header beside it rendered uppercase — in the same row.
                        // Invisible to jsdom, which does not apply UA styles,
                        // and invisible in a table where every column happens to
                        // be sortable. The Orders list is the first that mixes
                        // both, which is how it finally showed up.
                        HEADER_TYPE,
                        'inline-flex items-center gap-1 rounded-xs hover:text-ink',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rule-focus',
                        col.align === 'right' && 'flex-row-reverse',
                        isSorted && 'text-ink',
                      )}
                    >
                      {col.header}
                      {isSorted ? (
                        sort!.direction === 'asc' ? (
                          <ArrowUp className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="h-3 w-3" aria-hidden="true" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-muted" aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="divide-y divide-rule-subtle">
          {sorted.map((row) => {
            const key = rowKey(row);
            const href = rowHref?.(row);
            const isSelected = selected.has(key);

            return (
              <tr
                key={key}
                role="row"
                aria-selected={selectable ? isSelected : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick && !href
                    ? (e) => {
                        // Only when there is no link to do it properly.
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick && !href ? 0 : undefined}
                className={cn(
                  'relative transition-colors',
                  isSelected ? 'bg-sheet-selected' : 'hover:bg-sheet-hover',
                  (href || onRowClick) && 'cursor-pointer',
                  'focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-rule-focus',
                )}
              >
                {selectable && (
                  <td className={cn(cellPad, 'w-10')}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(key)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${rowLabel?.(row) ?? key}`}
                      className="h-4 w-4 accent-brass"
                    />
                  </td>
                )}

                {columns.map((col, index) => (
                  <td
                    key={col.key}
                    role="cell"
                    /*
                      Read by `.table-cards td::before` to label the value once
                      the header row is hidden on a phone. Without it a card is
                      a column of bare values with nothing saying what they are.
                    */
                    data-label={col.header}
                    /*
                      Attribute presence, not `={true}` — React omits a false
                      boolean attribute entirely, which is exactly what the
                      `[data-primary]` selector tests for.
                    */
                    data-primary={col.key === primaryKey || undefined}
                    data-hide-mobile={col.hideOnMobile || undefined}
                    className={cn(cellPad, ALIGN[col.align ?? 'left'], 'text-ink', col.className)}
                  >
                    {/*
                      The link lives in the first cell and is stretched over the
                      whole row by `after:inset-0`. One link per row, so the row
                      is a single tab stop rather than one per cell.

                      THE CONTENT IS INSIDE THE LINK, and that is the fix rather
                      than a tidy-up. It used to be a sibling: an absolutely
                      positioned link, with the cell's content in a `relative`
                      span so it would paint on top. It did — and being on top,
                      it swallowed every click aimed at it. Measured with
                      `elementFromPoint` on the supplier list: Category,
                      Location, Status and Commission all landed on the link;
                      the company name, the one thing anybody actually aims at,
                      landed on a bare `<div>` with no link above or below it.

                      Nesting also makes the behaviour reachable from a test.
                      An overlay only covers a cell once a browser has laid the
                      page out, so jsdom could never see the defect; an ancestor
                      is an ancestor, and a click on the name bubbles to it.

                      Safe because neither list with `rowHref` puts anything
                      interactive in its first cell — a nested control would
                      need `stopPropagation`, and would be a link inside a link.
                    */}
                    {href && index === 0 ? (
                      <Link
                        to={href}
                        aria-label={rowLabel?.(row)}
                        /*
                          NOT `relative`. The pseudo-element stretches to the
                          nearest positioned ancestor, which is the `<tr>` — so
                          positioning the link would shrink its reach back to
                          this one cell and lose the other five columns.
                        */
                        className="block rounded-sm text-inherit no-underline after:absolute after:inset-0 focus:outline-none"
                      >
                        {col.render(row)}
                      </Link>
                    ) : (
                      col.render(row)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
