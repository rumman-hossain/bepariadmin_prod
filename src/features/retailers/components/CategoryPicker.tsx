import React from 'react';
import { Text } from '@/src/components/data';
import { Button } from '@/src/components/controls';
import { useCategoryOptions } from '@/src/hooks/useCategoryOptions';

/**
 * What the shop sells — chosen from the platform's own list, and more than one.
 *
 * # Why not a text box
 *
 * It was one, and free text meant "Gents textile", "gents textiles" and "Gents
 * Textile" were three different categories forever. Nothing could group by
 * category without a cleanup pass, and the filter on the list screen could only
 * ever match what somebody had typed exactly.
 *
 * # Why a comma-joined string and not a join table
 *
 * Because the wholesaler side already does exactly this, and a shop's
 * categories and a supplier's categories are the same concept. Two storage
 * shapes for one idea is how the two halves of a report stop agreeing. The cost
 * is real and worth stating: filtering by category is a `LIKE` over the joined
 * string rather than an indexed lookup, so it cannot use an index and "Textile"
 * matches inside "Textiles". That is a fair trade at this size and the wrong
 * trade later; when it hurts, both sides move to a join table TOGETHER.
 */

export interface CategoryPickerProps {
  /** Selected category names. */
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}

export function CategoryPicker({ value, onChange, error }: CategoryPickerProps) {
  const labelId = React.useId();
  const { categories, isLoading, error: loadError, refetch } = useCategoryOptions();

  const toggle = (name: string) => {
    onChange(value.includes(name) ? value.filter((c) => c !== name) : [...value, name]);
  };

  return (
    <div className="flex flex-col gap-2">
      <Text as="div" variant="label" id={labelId}>
        Category
      </Text>

      {isLoading ? (
        <Text variant="caption">Loading categories…</Text>
      ) : loadError ? (
        <div className="flex flex-wrap items-center gap-3">
          <Text as="p" variant="error">
            {loadError}
          </Text>
          {/*
            A retry, because the alternative is re-opening the whole screen and
            losing everything already typed into it.
          */}
          <Button variant="secondary" size="sm" type="button" onClick={refetch}>
            Try again
          </Button>
        </div>
      ) : (
        <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const selected = value.includes(c.name);
            return (
              <button
                key={c.id}
                type="button"
                // aria-pressed and not a checkbox role: these are toggles, and a
                // screen reader should say "pressed" rather than announce a
                // checkbox that has no visible box.
                aria-pressed={selected}
                onClick={() => toggle(c.name)}
                className={[
                  'rounded-full border px-3 py-1.5 text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  selected
                    ? 'border-accent bg-accent text-on-accent'
                    : 'border-rule bg-sheet text-ink-2 hover:border-rule-strong',
                ].join(' ')}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <Text as="p" variant="error">
          {error}
        </Text>
      )}
      <Text variant="caption">Pick every category the shop sells in.</Text>
    </div>
  );
}
