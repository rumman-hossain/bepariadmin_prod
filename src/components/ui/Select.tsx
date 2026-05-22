import React, { forwardRef, useId } from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { ChevronDown } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────

interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

// ─── Style Maps ──────────────────────────────────────────

const sizeClasses: Record<string, string> = {
  sm: 'h-9 text-sm rounded-lg pl-3.5 pr-9',
  md: 'h-11 text-[15px] rounded-2xl pl-4 pr-10',
  lg: 'h-[52px] text-[17px] rounded-2xl pl-5 pr-12',
};

const iconSizeMap: Record<string, string> = {
  sm: 'w-4 h-4 right-2.5',
  md: 'w-[18px] h-[18px] right-3',
  lg: 'w-5 h-5 right-4',
};

// ─── Component ───────────────────────────────────────────

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      size = 'md',
      fullWidth = false,
      disabled,
      className,
      id: idProp,
      ...rest
    },
    ref,
  ) => {
    const autoId = useId();
    const id = idProp || autoId;

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full', className)}>
        {label && (
          <label
            htmlFor={id}
            className={cn('text-sm font-medium text-text-default', disabled && 'opacity-40')}
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
            className={cn(
              'w-full appearance-none',
              'bg-surface-secondary',
              'text-text-default',
              'border',
              'outline-none cursor-pointer',
              'transition-all duration-200 ease-out',
              sizeClasses[size],
              error
                ? 'border-semantic-danger focus:ring-[3px] focus:ring-semantic-danger/20'
                : 'border-border-default focus:border-border-focus focus:ring-[3px] focus:ring-accent-primary/20',
              disabled && 'opacity-40 pointer-events-none',
            )}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          <ChevronDown
            className={cn(
              'absolute top-1/2 -translate-y-1/2 pointer-events-none',
              'text-text-muted',
              iconSizeMap[size],
            )}
            aria-hidden="true"
          />
        </div>

        {error && (
          <p id={`${id}-error`} role="alert" className="text-sm text-semantic-danger">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={`${id}-helper`} className="text-sm text-text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';