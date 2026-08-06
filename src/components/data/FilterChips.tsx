import { X } from 'lucide-react';
import { Text } from '@/src/components/data/Text';

/**
 * The filters currently narrowing a list, each removable on its own.
 *
 * Without this the only way to tell a filter is on is to read every dropdown,
 * and the only way to undo ONE is to find it and set it back to "All". An
 * operator who has narrowed by four things and wants three of them has to
 * remember which four they picked.
 *
 * Shared rather than built into the supplier screen, because the retailer
 * directory has the same six controls and the same problem.
 *
 * Each chip names its FIELD as well as its value: "Dhaka" alone is ambiguous
 * once district and category can both hold place-like words, and "Status
 * Active" reads as a sentence where "Active" reads as a label.
 */

export interface ActiveFilter {
  key: string;
  /** The field, e.g. "District". */
  label: string;
  /** The value as the operator chose it, e.g. "Dhaka". */
  value: string;
  onRemove: () => void;
}

interface FilterChipsProps {
  filters: ActiveFilter[];
  onClearAll: () => void;
}

export function FilterChips({ filters, onClearAll }: FilterChipsProps) {
  // Nothing is narrowing, so there is nothing to say. An empty bar reserving
  // its height would make the table jump every time the last filter is removed.
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.map((f) => (
        <span
          key={f.key}
          className="inline-flex items-center gap-1.5 rounded-full border border-brass-ring bg-brass-wash py-0.5 pr-1 pl-2.5 text-xs text-ink"
        >
          <span className="text-ink-3">{f.label}</span>
          <span className="font-medium">{f.value}</span>
          <button
            type="button"
            onClick={f.onRemove}
            /*
             * Named in full. "×" alone is announced as "times" or skipped
             * entirely, so somebody using a screen reader is offered a row of
             * unlabelled buttons that each remove something unspecified.
             */
            aria-label={`Remove the ${f.label.toLowerCase()} filter`}
            title={`Remove ${f.label}: ${f.value}`}
            className="rounded-full p-0.5 text-ink-3 hover:bg-brass-ring hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rule-focus"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="ml-auto text-xs text-ink-2 underline hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rule-focus"
      >
        Clear all
      </button>

      <Text variant="caption" className="sr-only">
        {filters.length} filter{filters.length === 1 ? '' : 's'} applied
      </Text>
    </div>
  );
}
