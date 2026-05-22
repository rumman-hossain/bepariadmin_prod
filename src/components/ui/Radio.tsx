import React, { forwardRef, useId } from 'react';
import { cn } from '@/src/design-system/utils/cn';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  error?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, description, error, disabled, className, id: idProp, ...rest }, ref) => {
    const autoId = useId();
    const id = idProp || autoId;

    return (
      <div className={cn('flex items-start gap-3', className)}>
        <div className="relative flex items-center justify-center shrink-0 mt-0.5">
          <input
            ref={ref}
            id={id}
            type="radio"
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : description ? `${id}-desc` : undefined}
            className="peer sr-only"
            {...rest}
          />
          <div
            className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center',
              'transition-all duration-200 ease-out',
              'peer-focus-visible:ring-[3px] peer-focus-visible:ring-accent-primary/30 peer-focus-visible:ring-offset-2',
              error
                ? 'border-semantic-danger'
                : 'border-border-input',
              'peer-checked:border-accent-primary',
              disabled && 'opacity-40 pointer-events-none',
            )}
            aria-hidden="true"
          >
            <div
              className={cn(
                'w-2.5 h-2.5 rounded-full bg-accent-primary',
                'opacity-0 scale-0 transition-all duration-150',
                'peer-checked:opacity-100 peer-checked:scale-100',
              )}
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

Radio.displayName = 'Radio';