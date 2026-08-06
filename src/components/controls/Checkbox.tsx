import React, { forwardRef, useId } from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { Check, Minus } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  error?: string;
}

/**
 * Checkbox.
 *
 * Structure note, because this component shipped broken for a long time:
 * Tailwind compiles `peer-checked:` to a GENERAL SIBLING selector —
 * `:is(:where(.peer):checked ~ *)`. The previous version nested the tick
 * inside the box, so `~` never reached it and a checked box rendered as a
 * solid blue square with no tick at all.
 *
 * Every `peer-*:` target below is therefore a direct SIBLING of the input,
 * stacked with absolute positioning. The input itself covers the control at
 * `opacity-0` rather than being `sr-only`, so clicking the box still toggles it.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, disabled, className, id: idProp, ...rest }, ref) => {
    const autoId = useId();
    const id = idProp || autoId;
    const describedBy = error ? `${id}-error` : description ? `${id}-desc` : undefined;

    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <div className="flex items-start gap-2.5">
          <span className={cn('relative inline-flex h-4.5 w-4.5 shrink-0 mt-0.5', disabled && 'opacity-40')}>
            <input
              ref={ref}
              id={id}
              type="checkbox"
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              className={cn(
                'peer absolute inset-0 z-10 m-0 h-full w-full appearance-none rounded-sm',
                disabled ? 'cursor-not-allowed' : 'cursor-pointer',
              )}
              {...rest}
            />
            {/* sibling 1 — the box */}
            <span
              aria-hidden="true"
              className={cn(
                'absolute inset-0 rounded-sm border transition-colors duration-150',
                'bg-sheet',
                error ? 'border-bad' : 'border-rule-input',
                'peer-checked:border-brass peer-checked:bg-brass',
                'peer-indeterminate:border-brass peer-indeterminate:bg-brass',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-rule-focus',
              )}
            />
            {/* sibling 2 — the tick */}
            <Check
              aria-hidden="true"
              strokeWidth={3.5}
              className={cn(
                'pointer-events-none absolute inset-0 m-auto h-3 w-3 text-brass-content',
                'opacity-0 transition-opacity duration-100 peer-checked:opacity-100',
                'peer-indeterminate:opacity-0',
              )}
            />
            {/* sibling 3 — the mixed-state dash */}
            <Minus
              aria-hidden="true"
              strokeWidth={3.5}
              className={cn(
                'pointer-events-none absolute inset-0 m-auto h-3 w-3 text-brass-content',
                'opacity-0 transition-opacity duration-100 peer-indeterminate:opacity-100',
              )}
            />
          </span>

          {(label || description) && (
            <div className="flex min-w-0 flex-col gap-0.5">
              {label && (
                <label
                  htmlFor={id}
                  className={cn(
                    'text-base font-medium text-ink select-none',
                    disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
                  )}
                >
                  {label}
                </label>
              )}
              {description && (
                <p id={`${id}-desc`} className="text-sm text-ink-3">
                  {description}
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <p id={`${id}-error`} role="alert" className="text-sm text-bad">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';
