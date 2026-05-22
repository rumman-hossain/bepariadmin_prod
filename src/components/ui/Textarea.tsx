import React, { forwardRef, useId } from 'react';
import { cn } from '@/src/design-system/utils/cn';

// ─── Types ───────────────────────────────────────────────

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

// ─── Component ───────────────────────────────────────────

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, fullWidth = false, disabled, className, id: idProp, ...rest }, ref) => {
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

        <textarea
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          className={cn(
            'w-full min-h-[100px] px-4 py-3',
            'text-[15px] text-text-default',
            'placeholder-text-muted',
            'bg-surface-secondary',
            'rounded-2xl border',
            'transition-all duration-200 ease-out',
            'outline-none resize-y',
            error
              ? 'border-semantic-danger focus:ring-[3px] focus:ring-semantic-danger/20'
              : 'border-border-input focus:border-border-focus focus:ring-[3px] focus:ring-accent-primary/20',
            disabled && 'opacity-40 pointer-events-none',
          )}
          {...rest}
        />

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

Textarea.displayName = 'Textarea';