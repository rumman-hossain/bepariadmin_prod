import { cn } from '@/src/design-system/utils/cn';
import type { SupplierStatusCounts } from '../api/wholesalerApi';
import { SUPPLIER_STATUS_FILTERS, type SupplierStatusKey } from './supplierStatusFilters';

/**
 * How many suppliers sit in each state, and the primary way to filter by one.
 *
 * # Why this is not five equal tiles
 *
 * Five identical count cards is the obvious layout and it is the wrong one:
 * **only one of the five is a queue.** Review is work with a person's name on
 * it. Active, Suspended, Rejected and Removed are facts about the world. Giving
 * them the same weight tells an operator to treat them the same, and the number
 * they opened this screen for is the one that means somebody is waiting.
 *
 * So Review is set apart and says what it means — "waiting on you" — and the
 * rest are a quiet row of counts. The asymmetry is the design, not decoration.
 *
 * # Why Removed sits slightly apart
 *
 * It is not a state a supplier is IN; it is a row that has been taken out. The
 * dashed edge says so without needing a legend, and without it a soft delete
 * would be indistinguishable from a permanent one — which is what it was.
 */

interface SupplierQueueProps {
  counts: SupplierStatusCounts;
  /** The status currently filtered by, as the server spells it. */
  activeStatus: string;
  onPick: (status: string) => void;
}

const REST: { key: SupplierStatusKey; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'removed', label: 'Removed' },
];

export function SupplierQueue({ counts, activeStatus, onPick }: SupplierQueueProps) {
  const isPicked = (key: SupplierStatusKey) => activeStatus === SUPPLIER_STATUS_FILTERS[key];

  /*
   * Pressing the status already selected clears it. Otherwise the only way back
   * to the full directory is a Clear-all somewhere else on the screen, and an
   * operator who filtered by accident has to go looking for the way out.
   */
  const pick = (key: SupplierStatusKey) =>
    onPick(isPicked(key) ? '' : SUPPLIER_STATUS_FILTERS[key]);

  return (
    <div className="flex flex-wrap items-stretch gap-2.5">
      <button
        type="button"
        onClick={() => pick('review')}
        aria-pressed={isPicked('review')}
        className={cn(
          'flex items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rule-focus',
          isPicked('review')
            ? 'border-brass bg-brass text-brass-content'
            : 'border-brass bg-brass-wash hover:bg-brass-wash/70',
        )}
      >
        <span
          className={cn(
            'cell-numeric text-2xl leading-none font-bold',
            isPicked('review') ? 'text-brass-content' : 'text-brass',
          )}
        >
          {counts.review}
        </span>
        <span className="flex flex-col gap-px">
          <span
            className={cn(
              'text-2xs font-semibold uppercase tracking-wider',
              isPicked('review') ? 'text-brass-content' : 'text-brass',
            )}
          >
            Review
          </span>
          <span className={cn('text-sm', isPicked('review') ? 'text-brass-content' : 'text-ink-2')}>
            waiting on you
          </span>
        </span>
      </button>

      <div className="flex overflow-hidden rounded-lg border border-rule bg-sheet">
        {REST.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => pick(key)}
            aria-pressed={isPicked(key)}
            className={cn(
              'flex flex-col items-start gap-0.5 border-r border-rule-subtle px-4 py-2.5 text-left last:border-r-0',
              'transition-colors hover:bg-sheet-hover',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-rule-focus',
              isPicked(key) && 'bg-sheet-selected',
              key === 'removed' && 'border-l border-l-rule-strong border-dashed',
            )}
          >
            <span
              className={cn(
                'cell-numeric text-lg leading-tight font-semibold',
                key === 'removed' ? 'text-ink-3' : 'text-ink',
              )}
            >
              {counts[key]}
            </span>
            <span
              className={cn(
                'text-2xs font-semibold uppercase tracking-wider',
                isPicked(key) ? 'text-ink' : 'text-ink-3',
              )}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
