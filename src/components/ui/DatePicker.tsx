import React, { forwardRef, useId } from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { Calendar, Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────

type DatePickerSize = 'sm' | 'md' | 'lg';
type DatePickerVariant = 'default' | 'success' | 'error';

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'value' | 'onChange'> {
  /** Controlled value (ISO date string: YYYY-MM-DD) */
  value?: string;
  /** Default uncontrolled value */
  defaultValue?: string;
  /** Change handler */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Size preset */
  size?: DatePickerSize;
  /** Visual variant */
  variant?: DatePickerVariant;
  /** Label above the input */
  label?: string;
  /** Error message (sets variant to 'error') */
  error?: string;
  /** Success message (sets variant to 'success') */
  success?: string;
  /** Helper text below input */
  helperText?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show loading spinner */
  loading?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Minimum selectable date */
  min?: string;
  /** Maximum selectable date */
  max?: string;
  /** Show clear button when value exists */
  allowClear?: boolean;
  /** Clear handler (only works with controlled mode) */
  onClear?: () => void;
}

// ─── Size Maps (static strings, no interpolation) ────────

const sizeHeight: Record<DatePickerSize, string> = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12',
};

const sizeRadius: Record<DatePickerSize, string> = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-xl',
};

const sizePadding: Record<DatePickerSize, string> = {
  sm: 'pl-9 pr-3',
  md: 'pl-10 pr-4',
  lg: 'pl-12 pr-5',
};

const sizeFont: Record<DatePickerSize, string> = {
  sm: 'text-sm',
  md: 'text-[15px]',
  lg: 'text-[17px]',
};

const iconSizeMap: Record<DatePickerSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-[18px] h-[18px]',
  lg: 'w-5 h-5',
};

const iconPositionMap: Record<DatePickerSize, string> = {
  sm: 'left-2.5',
  md: 'left-3',
  lg: 'left-4',
};

const clearPositionMap: Record<DatePickerSize, string> = {
  sm: 'right-2',
  md: 'right-3',
  lg: 'right-4',
};

function getBorderClasses(variant: DatePickerVariant): string {
  switch (variant) {
    case 'success':
      return 'border-semantic-success dark:border-semantic-success focus-within:border-semantic-success focus-within:ring-[3px] focus-within:ring-semantic-success/20';
    case 'error':
      return 'border-semantic-danger dark:border-semantic-danger focus-within:border-semantic-danger focus-within:ring-[3px] focus-within:ring-semantic-danger/20';
    default:
      return 'border-border-input focus-within:border-accent-primary focus-within:ring-[3px] focus-within:ring-accent-primary/20';
  }
}

// ─── Component ────────────────────────────────────────────

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      value,
      defaultValue,
      onChange,
      size = 'md',
      variant: variantProp,
      label,
      error,
      success,
      helperText,
      disabled = false,
      loading = false,
      fullWidth = false,
      min,
      max,
      allowClear = false,
      onClear,
      id: idProp,
      className,
      ...rest
    },
    ref,
  ) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const variant: DatePickerVariant = error ? 'error' : success ? 'success' : variantProp ?? 'default';
    const hasValue = value !== undefined && value !== '';

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'text-sm font-medium text-text-default',
              disabled && 'opacity-50',
            )}
          >
            {label}
          </label>
        )}

        {/* Input wrapper */}
        <div
          className={cn(
            'relative flex items-center',
              'bg-surface-secondary',
            'border shadow-sm',
            'transition-all duration-200 ease-out',
            sizeHeight[size],
            sizeRadius[size],
            getBorderClasses(variant),
            disabled && 'opacity-50 cursor-not-allowed',
            loading && 'opacity-80',
            fullWidth && 'w-full',
            !fullWidth && 'w-[240px]',
            className,
          )}
        >
          {/* Calendar icon */}
          <Calendar
            className={cn(
              'absolute pointer-events-none',
              iconPositionMap[size],
              iconSizeMap[size],
              disabled || loading
                ? 'text-text-placeholder'
                : 'text-text-muted',
              'transition-colors duration-200',
            )}
            aria-hidden="true"
          />

          {/* Native date input */}
          <input
            ref={ref}
            id={id}
            type="date"
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            min={min}
            max={max}
            disabled={disabled || loading}
            className={cn(
              'w-full h-full bg-transparent outline-none',
              'text-text-default',
              'placeholder:text-text-placeholder',
              sizeFont[size],
              sizePadding[size],
              hasValue && allowClear && 'pr-10',
              disabled && 'cursor-not-allowed',
              '[color-scheme:light] dark:[color-scheme:dark]',
              '[&::-webkit-calendar-picker-indicator]:opacity-0',
              '[&::-webkit-calendar-picker-indicator]:absolute',
              '[&::-webkit-calendar-picker-indicator]:inset-0',
              '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
              '[&::-webkit-calendar-picker-indicator]:z-10',
            )}
            aria-invalid={variant === 'error' ? 'true' : undefined}
            aria-describedby={
              error ? `${id}-error` : success ? `${id}-success` : helperText ? `${id}-helper` : undefined
            }
            {...rest}
          />

          {/* Clear button */}
          {allowClear && hasValue && !disabled && !loading && (
            <button
              type="button"
              onClick={() => {
                if (onClear) onClear();
              }}
              className={cn(
                'absolute z-20 p-0.5 rounded-full',
                clearPositionMap[size],
                'text-text-muted',
                'hover:text-text-default',
                'hover:bg-surface-secondary',
                'transition-colors duration-200',
              )}
              aria-label="Clear date"
            >
              <XCircle className={iconSizeMap[size]} />
            </button>
          )}

          {/* Loading spinner */}
          {loading && (
            <div className={cn('absolute z-20', clearPositionMap[size])}>
              <Loader2 className={cn(iconSizeMap[size], 'text-accent-primary animate-spin')} />
            </div>
          )}
        </div>

        {/* Status messages */}
        {error && (
          <p id={`${id}-error`} className="flex items-center gap-1.5 text-[12px] text-semantic-danger" role="alert">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {!error && success && (
          <p id={`${id}-success`} className="flex items-center gap-1.5 text-[12px] text-semantic-success">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{success}</span>
          </p>
        )}

        {!error && !success && helperText && (
          <p id={`${id}-helper`} className="text-[12px] text-text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

DatePicker.displayName = 'DatePicker';