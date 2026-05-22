import React, { forwardRef, useId } from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { Check, Minus } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, disabled, className, id: idProp, checked, ...rest }, ref) => {
    const autoId = useId();
    const id = idProp || autoId;

    return (
      <div className={cn('flex items-start gap-3', className)}>
        <div className="relative flex items-center justify-center shrink-0 mt-0.5">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : description ? `${id}-desc` : undefined}
            className="peer sr-only"
            {...rest}
          />
          <div
            className={cn(
              'w-5 h-5 rounded-md border-2 flex items-center justify-center',
              'transition-all duration-200 ease-out',
              'peer-focus-visible:ring-[3px] peer-focus-visible:ring-accent-primary/30 peer-focus-visible:ring-offset-2',
              error
                ? 'border-semantic-danger'
                : 'border-border-input',
              'peer-checked:bg-accent-primary peer-checked:border-accent-primary',
              'peer-indeterminate:bg-accent-primary peer-indeterminate:border-accent-primary',
              disabled && 'opacity-40 pointer-events-none',
            )}
            aria-hidden="true"
          >
            <Check
              className={cn(
                'w-3.5 h-3.5 text-white',
                'opacity-0 scale-0 transition-all duration-150',
                'peer-checked:opacity-100 peer-checked:scale-100',
              )}
              strokeWidth={3}
            />
            <Minus
              className={cn(
                'w-3.5 h-3.5 text-white absolute',
                'opacity-0 scale-0 transition-all duration-150',
                'peer-indeterminate:opacity-100 peer-indeterminate:scale-100',
              )}
              strokeWidth={3}
            />
          </div>
        </div>

        {(label || description) && (
          <div className="flex flex-col gap-0.5 min-w-0">
            {label && (
              <label
                htmlFor={id}
                className={cn(
                  'text-[15px] font-medium text-text-default cursor-pointer select-none',
                  disabled && 'opacity-40 cursor-not-allowed',
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p id={`${id}-desc`} className="text-sm text-text-muted">
                {description}
              </p>
            )}
          </div>
        )}

        {error && (
          <p id={`${id}-error`} role="alert" className="text-sm text-semantic-danger w-full">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';