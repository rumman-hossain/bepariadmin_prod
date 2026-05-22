import React, { forwardRef } from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { Loader2, type LucideIcon } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Show loading spinner and disable interaction */
  loading?: boolean;
  /** Full width on mobile and desktop */
  fullWidth?: boolean;
  /** Icon to render before children */
  iconLeft?: LucideIcon;
  /** Icon to render after children */
  iconRight?: LucideIcon;
  /** When true, renders as a child wrapper (for links-as-buttons, etc.) */
  asChild?: boolean;
}

// ─── Size Classes (static — NEVER template-literal for Tailwind JIT) ──

/** sm=36px h, md=44px h, lg=52px h */
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 text-sm rounded-lg px-3.5 gap-1.5',
  md: 'h-11 text-[15px] font-medium rounded-2xl px-5 gap-2',
  lg: 'h-[52px] text-[17px] font-semibold rounded-2xl px-7 gap-2.5',
};

const ICON_CLASS: Record<ButtonSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-[18px] h-[18px]',
  lg: 'w-5 h-5',
};

const LOADING_ICON_CLASS: Record<ButtonSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-[18px] h-[18px]',
};

// ─── Variant Styles (using token values) ─────────────────

const variantClasses: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-accent-primary text-accent-primary-content',
    'hover:bg-accent-primary-hover',
    'active:bg-accent-primary-active active:scale-[0.97]',
    'shadow-sm shadow-accent-primary/20',
  ),
  secondary: cn(
    'bg-surface-secondary text-text-default',
    'hover:bg-surface-tertiary',
    'active:bg-surface-muted active:scale-[0.97]',
  ),
  ghost: cn(
    'bg-transparent text-text-default',
    'hover:bg-surface-secondary',
    'active:bg-surface-tertiary active:scale-[0.97]',
  ),
  danger: cn(
    'bg-semantic-danger text-white',
    'hover:bg-semantic-danger-hover',
    'active:bg-semantic-danger-active active:scale-[0.97]',
    'shadow-sm shadow-semantic-danger/20',
  ),
  outline: cn(
    'bg-transparent text-accent-primary',
    'border border-accent-primary/30',
    'hover:bg-accent-primary/6',
    'active:bg-accent-primary/12 active:scale-[0.97]',
  ),
};

// ─── Component ───────────────────────────────────────────

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      iconLeft: IconLeft,
      iconRight: IconRight,
      asChild = false,
      disabled,
      className,
      children,
      type = 'button',
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    const baseClass = cn(
      'inline-flex items-center justify-center',
      'font-sans',
      'select-none',
      'transition-all duration-200 ease-out',
      'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-primary-ring/50 focus-visible:ring-offset-2',
      'disabled:opacity-40 disabled:pointer-events-none',
      variantClasses[variant],
      sizeClasses[size],
      fullWidth && 'w-full',
      className,
    );

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ className?: string }>, {
        className: cn(baseClass, (children.props as { className?: string }).className),
      });
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        className={baseClass}
        {...rest}
      >
        {loading ? (
          <Loader2
            className={cn('animate-spin', LOADING_ICON_CLASS[size])}
            aria-hidden="true"
          />
        ) : (
          IconLeft && (
            <IconLeft
              className={cn(ICON_CLASS[size], 'shrink-0')}
              aria-hidden="true"
            />
          )
        )}
        {children && <span className="truncate">{children}</span>}
        {!loading && IconRight && (
          <IconRight
            className={cn(ICON_CLASS[size], 'shrink-0')}
            aria-hidden="true"
          />
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
