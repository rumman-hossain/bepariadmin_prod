import { cn } from '@/src/design-system/utils/cn';

interface Props {
  label: string;
  options: string[];
  selectedSizes: string[];
  onSelect: (size: string) => void;
  onDeselect: (size: string) => void;
  hasError?: boolean;
}

export function SizeChipSelector({
  label,
  options,
  selectedSizes,
  onSelect,
  onDeselect,
  hasError,
}: Props) {
  if (options.length === 0) return null;

  return (
    <div className="sm:col-span-2">
      <p className="text-sm font-medium text-ink mb-2">
        {label} <span className="text-bad">*</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((size) => {
          const isSelected = selectedSizes.includes(size);
          return (
            <button
              key={size}
              type="button"
              // Selection was conveyed by `bg-brass` alone, so which sizes a
              // product came in was invisible to a screen reader — on a field
              // marked required. See the note in ToggleBar.
              aria-pressed={isSelected}
              onClick={() => (isSelected ? onDeselect(size) : onSelect(size))}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                isSelected
                  ? 'bg-brass text-white border-brass'
                  : hasError && selectedSizes.length === 0
                    ? 'bg-sheet text-ink border-bad'
                    : 'bg-sheet-2 text-ink border-rule hover:border-brass',
              )}
            >
              {size}
            </button>
          );
        })}
      </div>
      {hasError && selectedSizes.length === 0 && (
        <p className="text-xs text-bad mt-1.5">Select at least one size</p>
      )}
    </div>
  );
}
