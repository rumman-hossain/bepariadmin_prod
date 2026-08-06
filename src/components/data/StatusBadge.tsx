import { cn } from '@/src/design-system/utils/cn';
import { type StatusTone, statusTone, humanise } from './status';

const toneStyles: Record<StatusTone, string> = {
  success: 'bg-ok-wash text-ok border-ok-border',
  danger: 'bg-bad-wash text-bad border-bad-border',
  warning: 'bg-warn-wash text-warn border-warn-border',
  info: 'bg-note-wash text-note border-note-border',
  neutral: 'bg-mute-wash text-mute border-mute-border',
};

const dotStyles: Record<StatusTone, string> = {
  success: 'bg-ok',
  danger: 'bg-bad',
  warning: 'bg-warn',
  info: 'bg-note',
  neutral: 'bg-mute',
};

const sizeStyles = {
  sm: 'h-5 px-1.5 gap-1 text-2xs',
  md: 'h-6 px-2 gap-1.5 text-xs',
} as const;

export interface StatusBadgeProps {
  status: string;
  /** Override the inferred tone when a caller knows better. */
  tone?: StatusTone;
  /** Override the displayed text. Defaults to a humanised `status`. */
  label?: string;
  size?: keyof typeof sizeStyles;
  className?: string;
}

export function StatusBadge({ status, tone, label, size = 'md', className }: StatusBadgeProps) {
  const resolved = tone ?? statusTone(status);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium whitespace-nowrap',
        toneStyles[resolved],
        sizeStyles[size],
        className,
      )}
    >
      {/* A shape as well as a colour, so status survives greyscale printing and
          the ~8% of men with a colour vision deficiency. */}
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotStyles[resolved])} aria-hidden="true" />
      {label ?? humanise(status)}
    </span>
  );
}
