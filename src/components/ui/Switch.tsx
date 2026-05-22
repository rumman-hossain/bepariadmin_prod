import React, { forwardRef, useId } from 'react';
import { cn } from '@/src/design-system/utils/cn';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, disabled, className, id: idProp, ...rest }, ref) => {
    const autoId = useId();
    const id = idProp || autoId;

    return (
      <div className={cn('flex items-start gap-3', className)}>
        <div className="relative shrink-0 mt-0.5">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            role="switch"
            disabled={disabled}
            aria-describedby={description ? `${id}-desc` : undefined}
            className="peer sr-only"
            {...rest}
          />
          <label
            htmlFor={id}
            className={cn(
              'relative block w-11 h-6 rounded-full cursor-pointer',
              'transition-all duration-200 ease-out',
              'peer-focus-visible:ring-[3px] peer-focus-visible:ring-accent-primary/30 peer-focus-visible:ring-offset-2',
              disabled && 'opacity-40 cursor-not-allowed',
            )}
          >
            <span
              className={cn(
                'block w-full h-full rounded-full',
                'bg-switch-track peer-checked:bg-switch-track-checked',
                'transition-colors duration-200',
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm',
                'transition-transform duration-200 ease-out',
                'peer-checked:translate-x-5',
                'flex items-center justify-center',
              )}
              aria-hidden="true"
            />
          </label>
        </div>

        {(label || description) && (
          <div className="flex flex-col gap-0.5 min-w-0">
            {label && (
              <span className="text-[15px] font-medium text-text-default select-none">
                {label}
              </span>
            )}
            {description && (
              <p id={`${id}-desc`} className="text-sm text-text-muted">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  },
);

Switch.displayName = 'Switch';