import React from 'react';
import { AlertTriangle, Inbox, RefreshCw, Wrench, type LucideIcon } from 'lucide-react';
import { cn } from '@/src/design-system/utils/cn';
import { Button } from '@/src/components/controls';

/** Shared height so a state swap does not jump the page. */
const PANEL = 'flex min-h-56 flex-col items-center justify-center gap-3 px-6 py-10 text-center';

export interface ErrorStateProps {
  /** What failed, in the user's terms. */
  title?: string;
  /** Already-safe message. Never pass raw server text. */
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /**
   * A second way out, shown beside Retry — usually "Go back".
   *
   * A detail screen needs one: retrying a product that does not exist just
   * fails again, and without an exit the operator's only move is the browser
   * back button.
   */
  action?: React.ReactNode;
  className?: string;
}

/**
 * A failed load.
 *
 * Five near-identical copies shipped across four files, with three different
 * min-heights (`min-h-[40vh]`, `min-h-[50vh]`, `h-64`) — so switching between
 * screens made the page jump. "Retry" appeared 17 times.
 *
 * `message` must already be safe: the backend emits raw Postgres text in some
 * handlers, and `friendlyError` is what filters it. This component does not,
 * because it has no way to tell a redacted message from an un-redacted one.
 */
export function ErrorState({
  title = 'Could not load this',
  message,
  onRetry,
  retryLabel = 'Try again',
  action,
  className,
}: ErrorStateProps) {
  return (
    <div role="alert" className={cn(PANEL, className)}>
      <AlertTriangle className="h-7 w-7 text-bad" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-md font-semibold text-ink">{title}</p>
        {message && <p className="mx-auto max-w-(--container-prose) text-sm text-ink-2">{message}</p>}
      </div>
      {(action || onRetry) && (
        <div className="flex items-center gap-3">
          {action}
          {onRetry && (
            <Button variant="secondary" size="md" iconLeft={RefreshCw} onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export type EmptyVariant = 'empty' | 'not-built' | 'not-running';

const EMPTY_ICON: Record<EmptyVariant, LucideIcon> = {
  empty: Inbox,
  'not-built': Wrench,
  'not-running': AlertTriangle,
};

export interface EmptyStateProps {
  title?: string;
  /** Say what to do next, not just what is missing. */
  message?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  variant?: EmptyVariant;
  className?: string;
}

/**
 * Nothing to show.
 *
 * Three variants, because they mean genuinely different things and conflating
 * them misleads:
 *
 *   - `empty`        — the query ran and returned nothing.
 *   - `not-built`    — no screen exists yet. Nothing is claimed.
 *   - `not-running`  — the endpoints answer and the tables exist, but nothing
 *                      populates them. This is the dangerous one: a fraud
 *                      screen showing zero flags reads as "no fraud detected"
 *                      when the truth is "detection is not running", and that
 *                      is worse than an empty state because it looks like a
 *                      negative result.
 */
export function EmptyState({
  title = 'Nothing here yet',
  message,
  icon,
  action,
  variant = 'empty',
  className,
}: EmptyStateProps) {
  const Icon = icon ?? EMPTY_ICON[variant];
  return (
    <div className={cn(PANEL, className)}>
      <Icon
        className={cn('h-7 w-7', variant === 'not-running' ? 'text-warn' : 'text-ink-4')}
        aria-hidden="true"
      />
      <div className="space-y-1">
        <p className="text-md font-semibold text-ink">{title}</p>
        {message && <p className="mx-auto max-w-(--container-prose) text-sm text-ink-2">{message}</p>}
      </div>
      {action}
    </div>
  );
}

export interface SkeletonProps {
  className?: string;
}

/**
 * A loading placeholder.
 *
 * `animate-pulse` is suppressed under `prefers-reduced-motion` by the global
 * rule in index.css, so the shape still communicates "loading" without the
 * pulsing that triggers vestibular symptoms.
 */
export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded bg-sheet-2', className)} />;
}

export interface SkeletonBlockProps {
  /** Rough shape of what is coming. */
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonBlockProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        // Last line short, so the block reads as a paragraph rather than a bar.
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="bg-sheet p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2 h-7 w-28" />
    </div>
  );
}

/*
 * Every `Skeleton` bar is `aria-hidden`, which is right — a grey rectangle is
 * not information. But that leaves the composites below announcing *nothing*
 * while a whole region loads: a screen-reader user hears silence and cannot
 * tell a slow table from an empty one.
 *
 * So the composites that stand in for a region carry the live-region markup and
 * the atomic `Skeleton` stays hidden. `SkeletonPage` already did this; the two
 * region-level composites did not, and the Orders screen is what surfaced it.
 */
function loadingRegion(label: string | null) {
  // `null` means an ancestor already announces — nesting live regions makes a
  // screen reader announce the same load twice.
  return label === null ? {} : { role: 'status', 'aria-busy': true, 'aria-label': label };
}

export interface SkeletonStatGridProps {
  count?: number;
  /** Names what is loading. Pass `null` when nested inside another one. */
  label?: string | null;
}

export function SkeletonStatGrid({ count = 4, label = 'Loading summary' }: SkeletonStatGridProps) {
  return (
    <div
      {...loadingRegion(label)}
      className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule-subtle bg-rule-subtle lg:grid-cols-4"
    >
      {Array.from({ length: count }, (_, i) => (
        <SkeletonStat key={i} />
      ))}
    </div>
  );
}

export interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  /** Names what is loading. Pass `null` when nested inside another one. */
  label?: string | null;
}

export function SkeletonTable({ rows = 6, columns = 4, label = 'Loading table' }: SkeletonTableProps) {
  return (
    <div
      {...loadingRegion(label)}
      className="overflow-hidden rounded-lg border border-rule bg-sheet"
    >
      <div className="flex gap-4 border-b border-rule bg-sheet-2 px-4 py-2.5">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-rule-subtle">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex gap-4 px-4 py-3">
            {Array.from({ length: columns }, (_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface SkeletonPageProps {
  /** Match the real screen's shape so the swap is not a jolt. */
  shape?: 'list' | 'detail' | 'dashboard';
}

/**
 * A whole screen's loading state.
 *
 * Three bespoke skeletons were hand-written across three files — roughly 90
 * lines of grey bars, including one 52-line dashboard version with twelve
 * hand-placed rectangles. They also disagreed with each other about spacing, so
 * the page shifted when real content arrived.
 */
export function SkeletonPage({ shape = 'list' }: SkeletonPageProps) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" role="status" aria-label="Loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-3.5 w-80" />
      </div>

      {shape === 'dashboard' && (
        <>
          <SkeletonStatGrid label={null} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Skeleton className="h-64 lg:col-span-2" />
            <Skeleton className="h-64" />
          </div>
        </>
      )}

      {shape === 'list' && <SkeletonTable label={null} />}

      {shape === 'detail' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-56" />
          </div>
          <Skeleton className="h-72" />
        </div>
      )}
    </div>
  );
}
