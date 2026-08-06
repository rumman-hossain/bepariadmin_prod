import React from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { Stack } from './Stack';

type Width = 'full' | 'wide' | 'form' | 'prose';

const WIDTH: Record<Width, string> = {
  full: '',
  wide: 'max-w-(--container-wide)',
  form: 'max-w-(--container-form)',
  prose: 'max-w-(--container-prose)',
};

export interface PageProps {
  children: React.ReactNode;
  /**
   * `full` for data screens, `form` for single-column forms, `prose` for
   * mostly-text screens. Default `full` — most admin screens are tables and
   * want every pixel.
   */
  width?: Width;
  className?: string;
}

/**
 * The root of every screen.
 *
 * Nine screens each picked their own vertical rhythm and their own bottom
 * padding — `space-y-4`, `space-y-6`, `space-y-8 pb-8`, `space-y-6 pb-10`,
 * `space-y-6 pb-12`, `flex flex-col gap-5`. There is now one answer, and the
 * bottom padding exists so the last control on a long form is not flush
 * against the viewport edge, which made it feel cut off mid-scroll.
 */
export function Page({ children, width = 'full', className }: PageProps) {
  return (
    <Stack gap="lg" className={cn('pb-10', WIDTH[width], width !== 'full' && 'mx-auto', className)}>
      {children}
    </Stack>
  );
}

export interface SectionProps {
  children: React.ReactNode;
  /** Omit for an unlabelled group. */
  title?: string;
  description?: string;
  /** Sits opposite the title — a link, a small button, a count. */
  action?: React.ReactNode;
  /** Rule above the section, for separating peers within one screen. */
  className?: string;
}

/**
 * A titled group within a screen.
 *
 * Eleven hand-rolled `<h3 className="text-sm font-semibold …">` headings
 * shipped across two files, in two different sizes, plus four bare
 * `<div className="border-t …" />` dividers used as separators. Both are here.
 *
 * The heading is `h2` because `PageTitle` owns the `h1`; nesting screens
 * deeper than that has not been needed and would want a real heading-level
 * context rather than a prop.
 */
export function Section({
  children,
  title,
  description,
  action,
  className,
}: SectionProps) {
  return (
    <section className={cn(className)}>
      {(title || action) && (
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && <h2 className="text-md font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export interface ToolbarProps {
  /** Left cluster — filters, search, counts. */
  children?: React.ReactNode;
  /** Right cluster — actions. */
  actions?: React.ReactNode;
  /** Keep visible while the content below scrolls. */
  className?: string;
}

/**
 * The strip above a table or list.
 *
 * Two screens solved this differently and a third had no toolbar at all.
 *
 * There was a `sticky` prop here using the `--z-sticky` step. No screen ever
 * passed it, so the branch never rendered. If a long table wants a pinned
 * toolbar, add it back against that screen — and note that `position: sticky`
 * resolves against the nearest SCROLLING ancestor, which is why the earlier
 * hand-rolled attempts sat still.
 */
export function Toolbar({ children, actions, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3',
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface SeparatorProps {
  /** Default horizontal. */
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/**
 * A rule.
 *
 * `aria-hidden` and `role="presentation"`: a divider is a visual grouping cue,
 * and announcing it interrupts a screen reader without conveying anything the
 * heading structure does not already carry.
 */
export function Separator({ orientation = 'horizontal', className }: SeparatorProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn(
        'bg-rule-subtle',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px self-stretch',
        className,
      )}
    />
  );
}
