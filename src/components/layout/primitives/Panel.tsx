import React from 'react';
import { cn } from '@/src/design-system/utils/cn';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Heading inside the panel. Omit for an unlabelled container. */
  title?: string;
  /** Sits opposite the title — a link, a count, a small control. */
  action?: React.ReactNode;
  /** Drop the body padding, for a table or list that runs edge to edge. */
  flush?: boolean;
  pad?: 'sm' | 'md' | 'lg';
}

const PAD = { sm: 'p-3', md: 'p-4', lg: 'p-5' } as const;

/**
 * A bordered surface.
 *
 * The workhorse container, and the thing 52 hand-rolled `rounded-* border
 * bg-*` blocks were each reinventing across nine different radius/padding
 * combinations — against only 25 uses of the `Card` that already existed.
 *
 * A hairline border rather than a shadow. At this density a page of shadowed
 * cards produces a visible haze; a rule states the boundary and stops.
 *
 * The title is an `h2` because `PageHeader` owns the `h1`. Panels holding a
 * table pass `flush`, so the table's own header row meets the border rather
 * than floating inside a padded box.
 */
export function Panel({
  children,
  title,
  action,
  flush = false,
  pad = 'md',
  className,
  ...rest
}: PanelProps) {
  return (
    <div
      className={cn('overflow-hidden rounded-lg border border-rule bg-sheet', className)}
      {...rest}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-rule-subtle px-4 py-2.5">
          {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(!flush && PAD[pad])}>{children}</div>
    </div>
  );
}
