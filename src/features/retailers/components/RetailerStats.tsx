import { cn } from '@/src/design-system/utils/cn';
import { Text } from '@/src/components/data';
import type { RetailerStatusCounts } from '../schemas/retailerSchema';
import { STATUS_RULE } from '../constants/statusRule';

/**
 * The four numbers an operator arrives with a question about.
 *
 * A banner used to sit here saying suspend and document checks were not built.
 * Both worked. What belongs at the top of a directory is not an apology but the
 * shape of it — how many shops, and how many are waiting on you.
 *
 * # Each tile is a filter
 *
 * Reading "7 pending" and then hunting for the filter that shows them is two
 * steps for one intention. The tile IS the control, and pressing the active one
 * again clears it — so the strip is never a dead end.
 *
 * # The rule, not a badge
 *
 * Each tile carries a coloured left rule in the same hue the status badge and
 * the table row use. That thread is the one deliberate signature in these two
 * screens: the same colour means the same state in the strip, the row and the
 * detail header, so the shape of the directory reads before any word does.
 * Everything else here is quiet on purpose.
 */

export interface RetailerStatsProps {
  total: number;
  counts?: RetailerStatusCounts;
  /** The status filter currently applied, if any. */
  activeStatus: string;
  onPick: (status: string) => void;
}

interface Tile {
  key: string;
  label: string;
  value: number;
  /** The "all" tile has no status and clears the filter. */
  status: string;
}

export function RetailerStats({ total, counts, activeStatus, onPick }: RetailerStatsProps) {
  // No counts means the server's count query failed and it served the list
  // anyway — deliberately, so a convenience cannot take the directory down.
  // Rendering an empty strip of zeroes would be worse than rendering nothing:
  // it would look authoritative and be wrong.
  if (!counts) return null;

  const tiles: Tile[] = [
    { key: 'all', label: 'All shops', value: total, status: '' },
    { key: 'pending', label: 'Awaiting approval', value: counts.pending, status: 'pending' },
    { key: 'active', label: 'Active', value: counts.active, status: 'active' },
    { key: 'suspended', label: 'Suspended', value: counts.suspended, status: 'suspended' },
    { key: 'rejected', label: 'Rejected', value: counts.rejected, status: 'rejected' },
  ];

  return (
    <div
      className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-rule bg-rule sm:grid-cols-3 lg:grid-cols-5"
      role="group"
      aria-label="Filter by status"
    >
      {tiles.map((t) => {
        const isActive = t.status === activeStatus;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onPick(t.status)}
            aria-pressed={isActive}
            className={cn(
              'relative flex flex-col gap-1 px-4 py-3 text-left transition-colors',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-rule-focus',
              isActive ? 'bg-sheet-2' : 'bg-sheet hover:bg-sheet-2',
            )}
          >
            {/*
              The rule. Present on every tile so the row heights match; the
              "all" tile's is transparent rather than absent, because a missing
              element would shift the text by three pixels and nothing else on
              the strip would line up.
            */}
            <span
              aria-hidden="true"
              className={cn(
                'absolute inset-y-2 left-0 w-0.5 rounded-full',
                STATUS_RULE[t.status] ?? 'bg-transparent',
              )}
            />
            {/*
              Text variant="label", not a hand-rolled span. The guard exists
              because the micro-label had three spellings across the app and
              they drifted; using the primitive is what keeps it one.
            */}
            <Text variant="label">{t.label}</Text>
            {/*
              Tabular figures: without them the numbers jump sideways as they
              change width, which on a strip that refetches is a row that
              twitches.
            */}
            <span className="font-mono text-lg font-semibold tabular-nums text-ink">
              {t.value}
            </span>
          </button>
        );
      })}
    </div>
  );
}
