import React from 'react';
import { cn } from '@/src/design-system/utils/cn';

export interface EmptyValueProps {
  /** Say WHY it is empty, if you know. Shown to screen readers only. */
  reason?: string;
  className?: string;
}

/**
 * The absence of a value.
 *
 * `|| '—'` and `?? '—'` were written out eleven times across six files. The
 * problem was not the repetition but what the em dash conveys: sighted users
 * read it as "nothing here", while a screen reader announces "em dash", or
 * often nothing at all, leaving the field sounding like a rendering failure.
 *
 * `reason` is worth passing wherever the distinction matters — "not yet
 * submitted" and "not applicable" look identical on screen but mean opposite
 * things to whoever has to chase the supplier.
 */
export function EmptyValue({ reason, className }: EmptyValueProps) {
  return (
    <span className={cn('text-ink-4', className)}>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{reason ?? 'Not set'}</span>
    </span>
  );
}

export interface IdentifierProps {
  value: string | null | undefined;
  /** Truncate long ids to this many characters, with the full value on hover. */
  truncate?: number;
  className?: string;
}

/**
 * A machine identifier — SKU, supplier code, order id, TIN/VAT/NID.
 *
 * These are data, not prose, and they get the mono face for a practical
 * reason: they are read character by character when someone is comparing one
 * against a paper docket or reading it down a phone. A proportional face makes
 * `WHL-00412` and `WHL-004I2` look alike.
 */
export function Identifier({ value, truncate, className }: IdentifierProps) {
  if (!value) return <EmptyValue />;

  const shown = truncate && value.length > truncate ? `${value.slice(0, truncate)}…` : value;

  return (
    <span
      className={cn('font-mono text-sm tracking-tight text-ink-2', className)}
      title={shown === value ? undefined : value}
    >
      {shown}
    </span>
  );
}

export type BadgeTone = 'neutral' | 'brass' | 'ok' | 'warn' | 'bad' | 'note';

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-mute-wash text-mute border-mute-border',
  brass: 'bg-brass-wash text-brass border-brass/20',
  ok: 'bg-ok-wash text-ok border-ok-border',
  warn: 'bg-warn-wash text-warn border-warn-border',
  bad: 'bg-bad-wash text-bad border-bad-border',
  note: 'bg-note-wash text-note border-note-border',
};

export interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * A non-status label — a category, a flag, a count, a tag.
 *
 * Eight distinct implementations shipped: four flag pills in one file with
 * hardcoded `bg-orange-50`, two visibility pills with different padding, a
 * category chip, and a byte-identical tag chip copy-pasted between two
 * components. Radius alone varied across `rounded-full`, `rounded-md` and
 * `rounded` for the same kind of object.
 *
 * `StatusBadge` stays separate and is still the right choice for anything
 * driven by a state machine — it maps ~35 domain statuses to tones and adds a
 * shape cue so the meaning survives greyscale and colour-vision deficiency.
 * This is for everything that is a label rather than a state.
 */
export function Badge({ children, tone = 'neutral', icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 whitespace-nowrap',
        'text-xs font-medium',
        TONE[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
