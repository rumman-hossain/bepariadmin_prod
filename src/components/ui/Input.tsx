import React, { forwardRef, useState, useId } from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { Eye, EyeOff, Search, Loader2, CheckCircle2, AlertCircle, type LucideIcon } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────

type InputType = 'text' | 'email' | 'password' | 'number' | 'search';
type InputSize = 'sm' | 'md' | 'lg';
type InputVariant = 'default' | 'success' | 'error';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  type?: InputType;
  size?: InputSize;
  variant?: InputVariant;
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  loading?: boolean;
  prefixIcon?: LucideIcon;
  suffixIcon?: LucideIcon;
  fullWidth?: boolean;
}

// ─── Style Maps ──────────────────────────────────────────

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-9 text-sm rounded-lg',
  md: 'h-11 text-[15px] rounded-2xl',
  lg: 'h-[52px] text-[17px] rounded-2xl',
};

const sizePadding: Record<InputSize, { noIcon: string; hasPrefix: string; hasSuffix: string }> = {
  sm: { noIcon: 'px-3.5', hasPrefix: 'pl-9 pr-3.5', hasSuffix: 'pl-3.5 pr-9' },
  md: { noIcon: 'px-4', hasPrefix: 'pl-10 pr-4', hasSuffix: 'pl-4 pr-10' },
  lg: { noIcon: 'px-5', hasPrefix: 'pl-12 pr-5', hasSuffix: 'pl-5 pr-12' },
};

const iconSizeMap: Record<InputSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-[18px] h-[18px]',
  lg: 'w-5 h-5',
};

const iconPositionMap: Record<InputSize, string> = {
  sm: 'left-2.5',
  md: 'left-3',
  lg: 'left-4',
};

const suffixPositionMap: Record<InputSize, string> = {
  sm: 'right-2.5',
  md: 'right-3',
  lg: 'right-4',
};

const variantBorderClasses: Record<InputVariant, string> = {
  default: cn(
    'border-border-default',
    'focus-within:border-border-focus',
    'focus-within:outline focus-within:outline-[3px] focus-within:outline-accent-primary/20 focus-within:ring-0',
  ),
  success: cn(
    'border-semantic-success',
    'focus-within:outline focus-within:outline-[3px] focus-within:outline-semantic-success/20 focus-within:ring-0',
  ),
  error: cn(
    'border-semantic-danger',
    'focus-within:outline focus-within:outline-[3px] focus-within:outline-semantic-danger/20 focus-within:ring-0',
  ),
};

// ─── Component ───────────────────────────────────────────

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = 'text',
      size = 'md',
      variant: variantProp,
      label,
      error,
      success,
      helperText,
      loading = false,
      prefixIcon: PrefixIcon,
      suffixIcon: SuffixIcon,
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
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const isSearch = type === 'search';
    const actualType = isPassword && showPassword ? 'text' : type;

    const variant: InputVariant = variantProp || (error ? 'error' : success ? 'success' : 'default');

    const prefixIconShown = !isPassword && (isSearch ? true : !!PrefixIcon);
    const suffixIconShown = !isPassword && !!SuffixIcon;
    const paddingKey = prefixIconShown ? 'hasPrefix' : (suffixIconShown || isPassword || loading) ? 'hasSuffix' : 'noIcon';

    const feedbackMessage = error || success;
    const feedbackIcon = error ? AlertCircle : success ? CheckCircle2 : null;
    const FeedbackIcon = feedbackIcon;

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full', className)}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'text-sm font-medium text-text-default',
              disabled && 'opacity-40',
            )}
          >
            {label}
          </label>
        )}

        <div
          className={cn(
            'relative flex items-center',
            'bg-surface-secondary',
            'border',
            'overflow-hidden',
            'transition-all duration-200 ease-out',
            sizeClasses[size],
            variantBorderClasses[variant],
            disabled && 'opacity-40 pointer-events-none',
          )}
        >
          {isSearch && !isPassword && (
            <Search
              className={cn(
                'absolute text-text-muted pointer-events-none',
                iconPositionMap[size],
                iconSizeMap[size],
              )}
              aria-hidden="true"
            />
          )}

          {PrefixIcon && !isSearch && !isPassword && (
            <PrefixIcon
              className={cn(
                'absolute text-text-muted pointer-events-none',
                iconPositionMap[size],
                iconSizeMap[size],
              )}
              aria-hidden="true"
            />
          )}

          <input
            ref={ref}
            id={id}
            type={actualType}
            disabled={disabled || loading}
            aria-invalid={variant === 'error' || undefined}
            aria-describedby={
              feedbackMessage ? `${id}-feedback` : helperText ? `${id}-helper` : undefined
            }
            className={cn(
              'w-full h-full bg-transparent',
              'text-text-default',
              'placeholder-text-muted',
              'outline-none',
              sizePadding[size][paddingKey],
              '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            )}
            {...rest}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className={cn(
                'absolute flex items-center justify-center',
                'text-text-muted hover:text-text-default',
                'transition-colors',
                suffixPositionMap[size],
                size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8',
              )}
            >
              {showPassword ? (
                <EyeOff className={iconSizeMap[size]} aria-hidden="true" />
              ) : (
                <Eye className={iconSizeMap[size]} aria-hidden="true" />
              )}
            </button>
          )}

          {loading && !isPassword && (
            <Loader2
              className={cn(
                'absolute animate-spin text-text-muted',
                suffixPositionMap[size],
                iconSizeMap[size],
              )}
              aria-hidden="true"
            />
          )}

          {SuffixIcon && !isPassword && !loading && (
            <SuffixIcon
              className={cn(
                'absolute text-text-muted pointer-events-none',
                suffixPositionMap[size],
                iconSizeMap[size],
              )}
              aria-hidden="true"
            />
          )}
        </div>

        {feedbackMessage && (
          <div
            id={`${id}-feedback`}
            role="alert"
            className={cn(
              'flex items-center gap-1.5 text-sm',
              error ? 'text-semantic-danger' : 'text-semantic-success',
            )}
          >
            {FeedbackIcon && <FeedbackIcon className="w-4 h-4" aria-hidden="true" />}
            <span>{feedbackMessage}</span>
          </div>
        )}

        {!feedbackMessage && helperText && (
          <p id={`${id}-helper`} className="text-sm text-text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';