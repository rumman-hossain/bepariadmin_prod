/**
 * The six states, as tabs carrying live counts.
 *
 * This replaces two dropdowns — Status and Visibility — that could not express
 * the model between them. APPROVED and PUBLIC share a `status` column and
 * differ only in visibility, so "cleared but not yet live" required an operator
 * to know that and compose it by hand; and neither dropdown could be counted,
 * because a count needs one axis.
 *
 * The counts come from `meta.statusCounts`, computed by the server with the
 * state filter REMOVED. That is what makes the strip navigable: picking Pending
 * does not zero the other five, so the operator can always see where the work
 * is from wherever they are standing.
 */
import { cn } from '@/src/design-system/utils/cn';
import {
  PRODUCT_STATES,
  PRODUCT_STATE_LABEL,
  PRODUCT_STATE_MEANING,
  COUNT_KEY_BY_STATE,
  type ProductStateCounts,
} from '../types/adminProduct';

interface Props {
  /** '' is the All tab. */
  value: string;
  onChange: (state: string) => void;
  counts?: ProductStateCounts;
  total: number;
}

export function ProductStateTabs({ value, onChange, counts, total }: Props) {
  const tabs = [
    { state: '', label: 'All', count: total, meaning: 'Every product, in any state.' },
    ...PRODUCT_STATES.map((s) => ({
      state: s as string,
      label: PRODUCT_STATE_LABEL[s],
      count: counts?.[COUNT_KEY_BY_STATE[s]],
      meaning: PRODUCT_STATE_MEANING[s],
    })),
  ];

  return (
    <div role="tablist" aria-label="Product state" className="flex gap-0.5 overflow-x-auto border-b border-rule">
      {tabs.map((tab) => {
        const selected = tab.state === value;
        // PENDING is the only state where the number means somebody is waiting
        // on us, so it is the only one that gets a mark.
        const needsAttention = tab.state === 'PENDING' && (tab.count ?? 0) > 0;

        return (
          <button
            key={tab.state || 'all'}
            type="button"
            role="tab"
            aria-selected={selected}
            title={tab.meaning}
            onClick={() => onChange(tab.state)}
            className={cn(
              'flex shrink-0 flex-col items-start gap-0.5 border-b-2 px-3.5 py-2 text-left transition-colors',
              selected
                ? 'border-brass text-ink'
                : 'border-transparent text-ink-2 hover:bg-sheet-hover hover:text-ink',
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium">
              {needsAttention && (
                <span className="h-1.5 w-1.5 rounded-full bg-warn" aria-hidden="true" />
              )}
              {tab.label}
            </span>
            <span
              className={cn(
                'text-lg font-semibold leading-none tracking-tight',
                selected ? 'text-brass' : 'text-ink',
              )}
            >
              {/*
                An em dash rather than 0 when counts are absent. The server
                serves the list even when the count query fails — the list is
                the point — and printing 0 there would state something false
                about an unknown.
              */}
              {tab.count === undefined ? '—' : tab.count.toLocaleString('en-IN')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
