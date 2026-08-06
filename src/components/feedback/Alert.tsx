import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/src/design-system/utils/cn';
import { IconButton } from '@/src/components/controls';

export type AlertTone = 'info' | 'ok' | 'warn' | 'bad';

const TONE: Record<AlertTone, { wrap: string; icon: LucideIcon; ink: string }> = {
  info: { wrap: 'border-note-border bg-note-wash', icon: Info, ink: 'text-note' },
  ok: { wrap: 'border-ok-border bg-ok-wash', icon: CheckCircle2, ink: 'text-ok' },
  warn: { wrap: 'border-warn-border bg-warn-wash', icon: AlertTriangle, ink: 'text-warn' },
  bad: { wrap: 'border-bad-border bg-bad-wash', icon: XCircle, ink: 'text-bad' },
};

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children?: React.ReactNode;
  /** One action. More than one and it is a dialog, not an alert. */
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

/**
 * An inline message about the state of the screen.
 *
 * Seven hand-rolled banners shipped alongside the existing `Alert`, in two
 * different colour systems — some on `semantic-*` tokens, some on raw
 * `bg-amber-50 border-amber-200`. Several were a bare `<div role="alert">` with
 * a retry link stuffed in via `ml-auto`.
 *
 * `bad` and `warn` take `role="alert"`, which interrupts a screen reader
 * immediately; `info` and `ok` take `role="status"`, which waits for a pause.
 * Getting that backwards means either a failure nobody hears or a confirmation
 * that talks over the user mid-sentence.
 */
export function Alert({ tone = 'info', title, children, action, onDismiss, className }: AlertProps) {
  const { wrap, icon: Icon, ink } = TONE[tone];
  const urgent = tone === 'bad' || tone === 'warn';

  return (
    <div
      role={urgent ? 'alert' : 'status'}
      className={cn('flex items-start gap-2.5 rounded-lg border p-3', wrap, className)}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', ink)} aria-hidden="true" />

      <div className="min-w-0 flex-1">
        {title && <p className={cn('text-sm font-semibold', ink)}>{title}</p>}
        {children && (
          <div className={cn('text-sm text-ink-2', title && 'mt-0.5')}>{children}</div>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>

      {onDismiss && (
        <IconButton icon={X} label="Dismiss" size="sm" onClick={onDismiss} className="-mt-1 -mr-1" />
      )}
    </div>
  );
}
