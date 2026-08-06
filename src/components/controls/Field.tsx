import React, { useId } from 'react';
import { cn } from '@/src/design-system/utils/cn';
import type { ControlSize } from './Button';
import { CONTROL_SURFACE } from './surface';

const SIZE: Record<ControlSize, string> = {
  sm: 'h-8 text-sm rounded-sm',
  md: 'h-9 text-base rounded-md',
  lg: 'h-10 text-md rounded-md',
};

interface FieldShellProps {
  id: string;
  label?: string;
  /** Hidden visually, still announced. For fields whose column header labels them. */
  hideLabel?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  errorId: string;
  hintId: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Label, hint and error around a control.
 *
 * The id is generated here and handed to both the label and the control, so
 * they cannot come apart. The `FormField` this replaces took `htmlFor` as an
 * *optional* prop and generated nothing — so the association was caller-managed
 * across 18 call sites, and any one of them omitting it produced a label that
 * looked right and did nothing.
 */
function FieldShell({
  id,
  label,
  hideLabel,
  required,
  error,
  hint,
  errorId,
  hintId,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      {label && (
        <label htmlFor={id} className={cn('text-sm font-medium text-ink-2', hideLabel && 'sr-only')}>
          {label}
          {required && (
            <span className="ml-0.5 text-bad" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {/*
        Hint before error in the DOM, but the error takes the live region: when
        both are present the error is the new information and the hint is
        context the user has already had.
      */}
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hideLabel?: boolean;
  error?: string;
  hint?: string;
  size?: ControlSize;
  /** Mono face for SKUs, codes, TIN/VAT/NID. */
  identifier?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hideLabel,
    error,
    hint,
    size = 'md',
    identifier = false,
    fullWidth = true,
    required,
    className,
    id: idProp,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <FieldShell
      id={id}
      label={label}
      hideLabel={hideLabel}
      required={required}
      error={error}
      hint={hint}
      errorId={errorId}
      hintId={hintId}
      className={cn(!fullWidth && 'w-auto', className)}
    >
      <input
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          CONTROL_SURFACE,
          SIZE[size],
          identifier && 'font-mono tracking-tight',
          error ? 'border-bad' : 'border-rule-input',
        )}
        {...rest}
      />
    </FieldShell>
  );
});

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hideLabel?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hideLabel, error, hint, rows = 4, required, className, id: idProp, ...rest },
  ref,
) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <FieldShell
      id={id}
      label={label}
      hideLabel={hideLabel}
      required={required}
      error={error}
      hint={hint}
      errorId={errorId}
      hintId={hintId}
      className={className}
    >
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          CONTROL_SURFACE,
          'resize-y rounded-md py-2 text-base',
          error ? 'border-bad' : 'border-rule-input',
        )}
        {...rest}
      />
    </FieldShell>
  );
});

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  label?: string;
  hideLabel?: boolean;
  error?: string;
  hint?: string;
  /** Shown as a disabled first option, so "nothing chosen" is a real state. */
  placeholder?: string;
  size?: ControlSize;
  className?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    options, label, hideLabel, error, hint, placeholder,
    size = 'md', required, className, id: idProp, ...rest
  },
  ref,
) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <FieldShell
      id={id}
      label={label}
      hideLabel={hideLabel}
      required={required}
      error={error}
      hint={hint}
      errorId={errorId}
      hintId={hintId}
      className={className}
    >
      <select
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          CONTROL_SURFACE,
          SIZE[size],
          'appearance-none pr-8',
          error ? 'border-bad' : 'border-rule-input',
        )}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});
