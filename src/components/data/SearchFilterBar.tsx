/**
 * SearchFilterBar — Reusable search input + dropdown filters.
 */

import { Search, Filter, X } from 'lucide-react';

interface FilterControl {
  key: string;
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  /**
   * What the dropdown reads when nothing is filtered. Defaults to the label,
   * which is the one wording that stays grammatical for every field: derived
   * text produced "All joined" and "All registered by".
   */
  allLabel?: string;
}

/**
 * A `<select>` must always contain an option equal to its `value`. When it does
 * not, the browser falls back to displaying the FIRST option — and two things
 * go wrong at once:
 *
 *   - the control shows a filter the screen is not applying. Measured on dev:
 *     the supplier list read "Gents Textile · Dhaka · Standard 9.5%" over an
 *     unfiltered table containing a supplier with no district at all;
 *   - that first option becomes unreachable, because choosing what is already
 *     selected fires no `change` event. Category "Gents Textile", district
 *     "Dhaka" and every other list's first entry simply could not be picked.
 *
 * Screens differ on how they spell "no filter": the product screen uses the
 * string `All` and carries an option for it. The retailer and supplier screens
 * use the empty string and carried none. Rather than force one spelling on all
 * three — the product sentinel runs through its types, its query mapping and
 * its tests — the neutral option is supplied only to a list that has none.
 *
 * It is supplied ALWAYS, not only when the current value is unmatched. Adding
 * it just to repair the display would leave a dropdown you can enter and not
 * leave: pick a category and the only route back to the whole directory is
 * Clear, which discards every other filter too.
 */
const NEUTRAL_VALUES = ['', 'All'];

function withNeutralOption(filter: FilterControl) {
  if (filter.options.some((o) => NEUTRAL_VALUES.includes(o.value))) return filter.options;
  return [{ label: filter.allLabel ?? filter.label, value: '' }, ...filter.options];
}

/** Neither unset nor a screen's "everything" sentinel. */
function isActive(filter: FilterControl) {
  return !NEUTRAL_VALUES.includes(filter.value);
}

interface SearchFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterControl[];
  onClearAll?: () => void;
  className?: string;
}

export function SearchFilterBar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  onClearAll,
  className = '',
}: SearchFilterBarProps) {
  const hasActiveFilters = filters?.some(isActive);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          className="w-full pl-10 pr-4 py-2 bg-sheet text-ink border border-rule rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brass focus:border-transparent transition-shadow"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {filters && filters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 bg-sheet rounded-lg px-3 py-1.5 border border-rule-subtle">
            <Filter className="w-3.5 h-3.5 text-ink-3" />
            <span className="text-xs font-medium text-ink-3">Filters:</span>
          </div>

          {filters.map((filter) => (
            <select
              key={filter.key}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              // The visible "Filters:" chip is decorative and shared by all of
              // them, so without this a screen reader announces seven selects
              // that are each called nothing.
              aria-label={filter.label}
              className={`text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brass ${
                isActive(filter)
                  ? 'bg-brass-wash text-ink border border-brass font-medium'
                  : 'bg-sheet text-ink border border-rule'
              }`}
            >
              {withNeutralOption(filter).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ))}

          {hasActiveFilters && onClearAll && (
            <button
              onClick={onClearAll}
              className="text-xs text-bad hover:opacity-80 font-bold inline-flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
