import React from 'react';
import { cn } from '@/src/design-system/utils/cn';
import type { BadgeTone } from './Value';
import { formatDateTime } from './format';

export interface TimelineEvent {
  id: string;
  /** What happened. Keep it to one line. */
  title: string;
  /** ISO 8601. Rendered in the operator's locale, machine-readable in `datetime`. */
  at: string;
  /** Who did it. Omit for system events. */
  actor?: string;
  /** Longer explanation, a reason, a diff. */
  detail?: React.ReactNode;
  tone?: BadgeTone;
}

export interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const DOT: Record<BadgeTone, string> = {
  neutral: 'bg-mute-border',
  brass: 'bg-brass',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
  note: 'bg-note',
};

function formatWhen(iso: string): { label: string; machine: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { label: iso, machine: '' };
  return {
    label: formatDateTime(date),
    machine: date.toISOString(),
  };
}

/**
 * A chronological event stream — approvals, status changes, audit entries.
 *
 * An archetype the app has none of today, which is why the audit-log and
 * supplier-activity screens were never built: there was nothing to build them
 * from.
 *
 * Rendered as an ordered list. The connecting rule is drawn on the list item
 * rather than as a separate element so it cannot desynchronise from the row
 * heights, and the last item's rule is trimmed rather than left dangling into
 * empty space.
 */
export function Timeline({ events, className }: TimelineProps) {
  return (
    <ol className={cn('flex flex-col', className)}>
      {events.map((event, index) => {
        const when = formatWhen(event.at);
        const last = index === events.length - 1;

        return (
          <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
            {/* The spine. Absent on the final row so the line stops at the
                last event rather than trailing off. */}
            {!last && (
              <span
                aria-hidden="true"
                className="absolute top-3 bottom-0 left-[3.5px] w-px bg-rule"
              />
            )}

            <span
              aria-hidden="true"
              className={cn('relative mt-1.5 h-2 w-2 shrink-0 rounded-full', DOT[event.tone ?? 'neutral'])}
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-sm font-medium text-ink">{event.title}</p>
                <time
                  dateTime={when.machine || undefined}
                  className="font-mono text-2xs tabular-nums text-ink-3"
                >
                  {when.label}
                </time>
              </div>
              {event.actor && <p className="mt-0.5 text-xs text-ink-3">by {event.actor}</p>}
              {event.detail && <div className="mt-1.5 text-sm text-ink-2">{event.detail}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
