import { useMemo, useState } from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { Input } from '@/src/components/controls';
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

  /**
   * The stored `dispatchTime` (e.g. "5D") already encodes both the number and
   * the unit, so both inputs derive from it rather than mirroring it in local
   * state — an effect used to copy one into the other on every change.
   *
   * The one thing it cannot encode is a unit chosen before any number is typed:
   * `formatDispatchTime('', 'D')` is `''`, so pressing "Day" on an empty field
   * would have nowhere to be recorded. That, and only that, is local.
   */
  const [pendingUnit, setPendingUnit] = useState<DispatchUnit>(parsed.unit);

  const isQuick = isQuickDispatchOption(dispatchTime);
  const customValue = isQuick ? '' : parsed.value;
  const unit = customValue ? parsed.unit : pendingUnit;

  const handleQuickSelect = (option: string) => {
    setPendingUnit('H');
    setField('dispatchTime', option);
  };

  const handleCustomChange = (value: string) => {
    const digitsOnly = value.replace(/[^0-9]/g, '');
    // Clearing the field must not also clear the unit the operator picked.
    if (!digitsOnly) setPendingUnit(unit);
    setField('dispatchTime', digitsOnly ? formatDispatchTime(digitsOnly, unit) : '');
  };

  const handleUnitChange = (next: DispatchUnit) => {
    setPendingUnit(next);
    if (customValue) {
      setField('dispatchTime', formatDispatchTime(customValue, next));
    }
  };

  return (
    <div className="space-y-4 sm:col-span-2">
      <div>
        <p className="text-sm font-medium text-ink mb-2">
          Dispatch Time <span className="text-bad">*</span>
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
                    ? 'bg-brass text-white border-brass'
                    : hasError
                      ? 'bg-sheet text-ink border-bad'
                      : 'bg-sheet text-ink border-rule hover:bg-sheet-2',
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
        {hasError && errorText && (
          <p className="text-xs text-bad mt-1.5">{errorText}</p>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-ink mb-2">Custom Dispatch Time (optional)</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Enter number"
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            error={hasError && customValue ? (errorText ?? ' ') : undefined}
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
                    ? 'bg-brass text-white border-brass'
                    : 'bg-sheet text-ink border-rule hover:bg-sheet-2',
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
