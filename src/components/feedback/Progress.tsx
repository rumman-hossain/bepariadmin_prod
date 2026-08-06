import { cn } from '@/src/design-system/utils/cn';

export type ProgressTone = 'brass' | 'ok' | 'warn' | 'bad';

const TONE: Record<ProgressTone, string> = {
  brass: 'bg-brass',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
};

export interface ProgressProps {
  /** 0–100. Values outside are clamped rather than overflowing the track. */
  value: number;
  /** Required: a bar with no name announces only a number. */
  label: string;
  hideLabel?: boolean;
  /** Shown next to the label — "3 of 6", "42%", "1.2 MB of 4 MB". */
  detail?: string;
  tone?: ProgressTone;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * A determinate progress bar.
 *
 * `PasswordStrengthMeter` hand-rolled its own segmented version, and the upload
 * flow had none at all — a file uploaded with no indication of how far along it
 * was, which on a slow Bangladeshi mobile connection is the difference between
 * waiting and giving up.
 *
 * `role="progressbar"` with the aria-value trio, so a screen reader announces
 * the position rather than just the label. `aria-valuetext` carries `detail`
 * when present, because "3 of 6 documents" is more useful than "50".
 */
export function Progress({
  value,
  label,
  hideLabel = false,
  detail,
  tone = 'brass',
  size = 'md',
  className,
}: ProgressProps) {
  // Clamped, not trusted: an upload reporting 104% would otherwise render a bar
  // wider than its own track.
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className={cn('flex items-baseline justify-between gap-2', hideLabel && 'sr-only')}>
        <span className="text-xs font-medium text-ink-2">{label}</span>
        {detail && <span className="font-mono text-2xs tabular-nums text-ink-3">{detail}</span>}
      </div>

      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={detail}
        aria-label={label}
        className={cn(
          'w-full overflow-hidden rounded-full bg-sheet-2',
          size === 'sm' ? 'h-1' : 'h-1.5',
        )}
      >
        <div
          className={cn('h-full rounded-full transition-[width]', TONE[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
