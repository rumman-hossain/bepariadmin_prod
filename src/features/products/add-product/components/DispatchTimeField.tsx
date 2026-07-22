import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { Input } from '@/src/components/ui/Input';
import { useAddProductStore } from '../store/useAddProductStore';
import {
  DISPATCH_QUICK_OPTIONS,
  formatDispatchTime,
  isQuickDispatchOption,
  parseDispatchTime,
  type DispatchUnit,
} from '@/src/features/products/utils/dispatchTime';

interface Props {
  hasError?: boolean;
  errorText?: string;
}

export function DispatchTimeField({ hasError, errorText }: Props) {
  const dispatchTime = useAddProductStore((s) => s.dispatchTime);
  const setField = useAddProductStore((s) => s.setField);

  const parsed = useMemo(() => parseDispatchTime(dispatchTime), [dispatchTime]);
  const [customValue, setCustomValue] = useState(parsed.value);
  const [unit, setUnit] = useState<DispatchUnit>(parsed.unit);

  useEffect(() => {
    if (isQuickDispatchOption(dispatchTime)) {
      setCustomValue('');
      setUnit('H');
      return;
    }
    if (parsed.value !== customValue) setCustomValue(parsed.value);
    if (parsed.unit !== unit) setUnit(parsed.unit);
  }, [dispatchTime, parsed.value, parsed.unit]);

  const handleQuickSelect = (option: string) => {
    setCustomValue('');
    setUnit('H');
    setField('dispatchTime', option);
  };

  const handleCustomChange = (value: string) => {
    const digitsOnly = value.replace(/[^0-9]/g, '');
    setCustomValue(digitsOnly);
    setField('dispatchTime', digitsOnly ? formatDispatchTime(digitsOnly, unit) : '');
  };

  const handleUnitChange = (next: DispatchUnit) => {
    setUnit(next);
    if (customValue) {
      setField('dispatchTime', formatDispatchTime(customValue, next));
    }
  };

  return (
    <div className="space-y-4 sm:col-span-2">
      <div>
        <p className="text-sm font-medium text-text-primary mb-2">
          Dispatch Time <span className="text-semantic-danger">*</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {DISPATCH_QUICK_OPTIONS.map((option) => {
            const selected = dispatchTime === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleQuickSelect(option)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
                  selected
                    ? 'bg-accent-primary text-white border-accent-primary'
                    : hasError
                      ? 'bg-surface-primary text-text-primary border-semantic-danger'
                      : 'bg-surface-primary text-text-primary border-border-default hover:bg-surface-muted',
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
        {hasError && errorText && (
          <p className="text-xs text-semantic-danger mt-1.5">{errorText}</p>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-text-primary mb-2">Custom Dispatch Time (optional)</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Enter number"
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            variant={hasError && customValue ? 'error' : undefined}
            fullWidth
            className="flex-1"
          />
          <div className="flex gap-2 sm:pt-6">
            {(
              [
                { key: 'H' as const, label: 'Hour' },
                { key: 'D' as const, label: 'Day' },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleUnitChange(key)}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-medium border min-w-[72px] transition-colors',
                  unit === key
                    ? 'bg-accent-primary text-white border-accent-primary'
                    : 'bg-surface-primary text-text-primary border-border-default hover:bg-surface-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
