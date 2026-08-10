import { cn } from '@/src/design-system/utils/cn';

interface Props<T extends string> {
  options: T[];
  selected: T;
  onSelect: (value: T) => void;
  className?: string;
}

/*
 * WHICH ONE IS CHOSEN WAS SAID IN COLOUR AND NOWHERE ELSE.
 *
 * Selection was carried entirely by `bg-brass` — no `aria-pressed`, no role, no
 * text. A screen reader read "AUTO, LETTER, NUMBER, UNIQUE" as four ordinary
 * buttons with nothing to distinguish the active one, and so did anyone who
 * cannot separate the brass from the sheet colour. Size Type and Dispatch Time
 * are both REQUIRED, so the one piece of state the operator had to get right was
 * the one piece never announced.
 *
 * `aria-pressed` rather than a radiogroup: these are toggle buttons that already
 * behave like buttons, and role="radio" would also oblige arrow-key navigation
 * that this component does not implement. Claiming a pattern and not honouring
 * it is worse than the plain one.
 */
export function ToggleBar<T extends string>({ options, selected, onSelect, className }: Props<T>) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => {
        const isSelected = selected === opt;
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(opt)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
              isSelected
                ? 'bg-brass text-white border-brass'
                : 'bg-sheet text-ink-2 border-rule hover:bg-sheet-2',
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
