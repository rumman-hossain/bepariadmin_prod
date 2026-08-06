import React from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/src/design-system/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ControlSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-brass text-brass-content hover:bg-brass-hover active:bg-brass-active',
  secondary: 'bg-sheet text-ink border border-rule hover:bg-sheet-hover',
  ghost: 'bg-transparent text-ink-2 hover:bg-sheet-hover hover:text-ink',
  danger: 'bg-bad text-brass-content hover:bg-bad-hover',
  outline: 'bg-transparent text-brass border border-brass hover:bg-brass-wash',
};

const SIZE: Record<ControlSize, string> = {
  sm: 'h-8 px-2.5 text-sm gap-1.5 rounded-sm',
  md: 'h-9 px-3.5 text-base gap-2 rounded-md',
  lg: 'h-10 px-5 text-md gap-2 rounded-md',
};

/** Square, so an icon-only control is not a lozenge with dead space either side. */
const ICON_SIZE: Record<ControlSize, string> = {
  sm: 'h-8 w-8 rounded-sm',
  md: 'h-9 w-9 rounded-md',
  lg: 'h-10 w-10 rounded-md',
};

const BASE = cn(
  'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap',
  'transition-colors',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rule-focus',
  'disabled:pointer-events-none disabled:opacity-disabled',
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ControlSize;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: LucideIcon;
  iconRight?: LucideIcon;
}

/**
 * Heights are 32 / 36 / 40 — deliberately below the 44px touch-target
 * guideline, because this is a dense desktop tool worked with a mouse and
 * keyboard all day, not a phone.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    iconLeft: IconLeft,
    iconRight: IconRight,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      // Defaulting to `button`: an unspecified type inside a form is `submit`,
      // which is how a Cancel button ends up submitting the form.
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BASE, VARIANT[variant], SIZE[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        IconLeft && <IconLeft className="h-4 w-4" aria-hidden="true" />
      )}
      {children}
      {IconRight && !loading && <IconRight className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonProps, 'iconLeft' | 'iconRight' | 'children'> {
  icon: LucideIcon;
  /** Required — an icon alone has no accessible name. */
  label: string;
}

/**
 * A button that is only an icon.
 *
 * Its absence is why `<Button iconLeft={X}>{''}</Button>` appeared in the
 * product list — passing an empty string as children to get an icon-only
 * control, which kept the horizontal padding and rendered as a wide lozenge
 * with dead space. Elsewhere the same need produced 42 raw `<button>` elements
 * with hand-written classes and, in most cases, no accessible name at all.
 *
 * `label` is required rather than optional. An icon-only control with no name
 * is announced as "button" and is unusable without sight.
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, variant = 'ghost', size = 'md', loading = false, disabled, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-label={label}
      title={label}
      aria-busy={loading || undefined}
      className={cn(BASE, VARIANT[variant], ICON_SIZE[size], className)}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
});

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  /** Announced while busy. Pass null for a purely decorative spinner. */
  label?: string | null;
  className?: string;
}

const SPINNER_SIZE = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' } as const;

/**
 * A standalone busy indicator.
 *
 * `<Loader2 className="animate-spin">` was written inline in six places, none
 * of which announced anything — so a screen-reader user got silence during
 * every load. The default `label` fixes that; pass `null` only when a sibling
 * element already carries the live region.
 */
export function Spinner({ size = 'md', label = 'Loading', className }: SpinnerProps) {
  return (
    <span role={label ? 'status' : undefined} aria-live={label ? 'polite' : undefined}>
      <Loader2
        className={cn('animate-spin text-brass', SPINNER_SIZE[size], className)}
        aria-hidden="true"
      />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
