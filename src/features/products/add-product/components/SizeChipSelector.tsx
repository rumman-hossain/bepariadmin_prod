import React from 'react';
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
      <p className="text-sm font-medium text-text-primary mb-2">
        {label} <span className="text-semantic-danger">*</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((size) => {
          const isSelected = selectedSizes.includes(size);
          return (
            <button
              key={size}
              type="button"
              onClick={() => (isSelected ? onDeselect(size) : onSelect(size))}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                isSelected
                  ? 'bg-accent-primary text-white border-accent-primary'
                  : hasError && selectedSizes.length === 0
                    ? 'bg-surface-primary text-text-primary border-semantic-danger'
                    : 'bg-surface-muted text-text-primary border-border-default hover:border-accent-primary',
              )}
            >
              {size}
            </button>
          );
        })}
      </div>
      {hasError && selectedSizes.length === 0 && (
        <p className="text-xs text-semantic-danger mt-1.5">Select at least one size</p>
      )}
    </div>
  );
}
