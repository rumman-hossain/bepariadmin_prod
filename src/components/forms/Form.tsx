import React from 'react';
import { AlertTriangle, type LucideIcon } from 'lucide-react';
import { cn } from '@/src/design-system/utils/cn';
import { Button } from '@/src/components/controls';

export interface FormProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  onSubmit: () => void;
  children: React.ReactNode;
}

/**
 * A form.
 *
 * Takes a plain `onSubmit` and does the `preventDefault` itself, because every
 * caller wrote the same two lines and one of them forgot — producing a full
 * page reload that looked like the app had crashed.
 *
 * `noValidate` disables the browser's own bubbles: they cannot be styled, they
 * vanish on blur, and they announce differently from the inline errors used
 * everywhere else. Validation is the app's job, and `required` still marks
 * fields for assistive tech.
 */
export function Form({ onSubmit, children, className, ...rest }: FormProps) {
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={cn('flex flex-col gap-6', className)}
      {...rest}
    >
      {children}
    </form>
  );
}

export interface FormSectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  /** Optional — the previous FormSection required one on every section. */
  icon?: LucideIcon;
  className?: string;
}

/**
 * A titled group of fields.
 *
 * `icon` is optional here. The previous version made it **required**, so every
 * section carried a decorative icon whether or not one meant anything — seven
 * call sites, seven icons chosen to fill the slot.
 */
export function FormSection({ children, title, description, icon: Icon, className }: FormSectionProps) {
  return (
    <section className={cn('flex flex-col gap-4', className)}>
      {title && (
        <div className="flex items-start gap-2 border-b border-rule-subtle pb-2">
          {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-ink-3">{description}</p>}
          </div>
        </div>
      )}
      {children}
    </section>
  );
}

export interface FormRowProps {
  children: React.ReactNode;
  /** Fields per row above `sm`. Default 2. */
  columns?: 1 | 2 | 3;
  className?: string;
}

const COLUMNS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
} as const;

/**
 * Fields side by side.
 *
 * Always stacks to one column below `sm`. Every hand-rolled form grid in the
 * app did too, but each spelled it differently — `grid-cols-1 sm:grid-cols-2
 * gap-3`, `md:grid-cols-2 gap-5`, `md:grid-cols-2 gap-6` — so the gutters
 * varied between adjacent sections of the same form.
 */
export function FormRow({ children, columns = 2, className }: FormRowProps) {
  return <div className={cn('grid gap-4', COLUMNS[columns], className)}>{children}</div>;
}

export interface FormActionsProps {
  children: React.ReactNode;
  /** Secondary content on the left — a delete link, an autosave note. */
  aside?: React.ReactNode;
  className?: string;
}

/**
 * The submit row.
 *
 * Four different recipes shipped for this — `flex justify-end gap-4 pt-4
 * border-t`, `flex gap-3` with no border, `flex gap-2 w-full sm:w-auto`, and a
 * wizard footer with `flex-1` — and two of them put the destructive or primary
 * action first. Primary goes last, so it sits nearest the thumb and nearest the
 * reading end of the row.
 */
export function FormActions({ children, aside, className }: FormActionsProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-rule-subtle pt-4',
        className,
      )}
    >
      <div className="min-w-0">{aside}</div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export interface FormErrorSummaryProps {
  /** Field label → message. Empty or absent renders nothing. */
  errors: Record<string, string>;
  title?: string;
  onDismiss?: () => void;
  className?: string;
}

/**
 * The "fix these before submitting" banner.
 *
 * Two implementations existed: a bulleted list, and a flat joined string that
 * ran every error together into one sentence. Neither linked to the fields, so
 * on a long form the user was told six things were wrong and left to hunt for
 * them.
 *
 * Each entry here is a link to its field. `role="alert"` announces the summary
 * on appearance, which is the WCAG 3.3.1 expectation for an error summary.
 */
export function FormErrorSummary({
  errors,
  title = 'Fix these before saving',
  onDismiss,
  className,
}: FormErrorSummaryProps) {
  const entries = Object.entries(errors).filter(([, message]) => Boolean(message));
  if (entries.length === 0) return null;

  return (
    <div
      role="alert"
      className={cn('rounded-lg border border-bad-border bg-bad-wash p-3.5', className)}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-bad">{title}</p>
          <ul className="mt-1 flex list-inside list-disc flex-col gap-0.5">
            {entries.map(([field, message]) => (
              <li key={field} className="text-xs text-ink-2">
                {message}
              </li>
            ))}
          </ul>
        </div>
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}
