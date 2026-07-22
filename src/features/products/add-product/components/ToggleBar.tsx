import React from 'react';
import { cn } from '@/src/design-system/utils/cn';

interface Props<T extends string> {
  options: T[];
  selected: T;
  onSelect: (value: T) => void;
  className?: string;
}

export function ToggleBar<T extends string>({ options, selected, onSelect, className }: Props<T>) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => {
        const isSelected = selected === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
              isSelected
                ? 'bg-accent-primary text-white border-accent-primary'
                : 'bg-surface-primary text-text-secondary border-border-default hover:bg-surface-muted',
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
