import React from 'react';
import { cn } from '@/src/design-system/utils/cn';

/**
 * Typography as named roles.
 *
 * The kit closed the drift in layout, controls, data display and feedback, and
 * the Orders screens then showed where the last of it was hiding: 137 inline
 * `className="text-sm text-ink-2"`-style strings across the app, in 40-odd
 * spellings. Several are the same intent written two ways — the uppercase
 * micro-label appears as both `text-xs text-ink-3 uppercase tracking-wide` and
 * `text-xs text-ink-3 uppercase font-semibold`, so two labels side by side on
 * one screen do not match.
 *
 * The variants below are not invented; they are the roles that string set
 * actually contains, collapsed to one spelling each.
 */

export type TextVariant =
  /** Default running text. */
  | 'body'
  /** Supporting text under a heading or beside a value. */
  | 'secondary'
  /** Metadata — timestamps, counts, hints. */
  | 'caption'
  /** The uppercase micro-label above a value. */
  | 'label'
  /** A short emphasised run inside otherwise plain text. */
  | 'strong'
  /** Something is wrong with the adjacent field or row. */
  | 'error';

/**
 * The uppercase micro-label, defined once.
 *
 * Exported because `DataTable` renders the same role for its column headers, and
 * two copies of a type recipe is precisely the drift this file exists to end —
 * which is not hypothetical: the first version of `label` here was
 * `text-xs ... tracking-wide` while DataTable, DESIGN_SYSTEM.md and the
 * published preview all said `text-2xs ... tracking-caps`. The component built
 * to stop the divergence had quietly joined it.
 *
 * Colour is applied by the caller, because the table header and a field label
 * sit on different surfaces.
 */
export const LABEL_TYPE = 'text-2xs font-semibold uppercase tracking-caps';

const VARIANT: Record<TextVariant, string> = {
  body: 'text-base text-ink',
  secondary: 'text-sm text-ink-2',
  caption: 'text-xs text-ink-3',
  label: `${LABEL_TYPE} text-ink-3`,
  strong: 'text-sm font-semibold text-ink',
  error: 'text-sm text-bad',
};

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  /**
   * The element to render. Defaults to `span`, which is safe anywhere —
   * a `<p>` inside a `<p>` is invalid and React will not warn about it here.
   */
  as?: 'span' | 'p' | 'div' | 'dt' | 'dd' | 'small' | 'legend';
  /** Truncate to one line, with the full text available on hover. */
  truncate?: boolean;
  children: React.ReactNode;
}

export function Text({
  variant = 'body',
  as: Tag = 'span',
  truncate = false,
  className,
  children,
  ...rest
}: TextProps) {
  return (
    <Tag
      className={cn(VARIANT[variant], truncate && 'block truncate', className)}
      // A truncated run needs its full value reachable, or the information is
      // simply gone for anyone who cannot widen the window.
      title={truncate && typeof children === 'string' ? children : rest.title}
      {...rest}
    >
      {children}
    </Tag>
  );
}
