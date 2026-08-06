import React from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { GAP, type Gap } from './spacing';

/**
 * Column counts, as responsive recipes rather than free-form class strings.
 *
 * Thirty-three grid wrappers shipped across roughly fourteen distinct
 * column/gap combinations — `grid-cols-1 sm:grid-cols-2 gap-3`,
 * `md:grid-cols-2 gap-5`, `md:grid-cols-2 gap-6`, and so on, differing for no
 * reason anyone could name. Each entry below stacks to one column on small
 * screens, because on an admin console every grid did.
 */
const COLS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
} as const;

export type GridCols = keyof typeof COLS;

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: GridCols;
  gap?: Gap;
  as?: React.ElementType;
}

export const Grid = React.forwardRef<HTMLDivElement, GridProps>(function Grid(
  { cols = 2, gap = 'md', as: Tag = 'div', className, ...rest },
  ref,
) {
  return <Tag ref={ref} className={cn('grid', COLS[cols], GAP[gap], className)} {...rest} />;
});

export interface ColumnsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Main content. */
  children: React.ReactNode;
  /** The narrower column. Omit and the main column takes the full width. */
  aside?: React.ReactNode;
  /** Which side the aside sits on. Default `end`. */
  asidePosition?: 'start' | 'end';
  gap?: Gap;
}

/**
 * The detail-screen layout: one wide column and one narrow one.
 *
 * `grid grid-cols-1 lg:grid-cols-3 gap-6` appeared verbatim in four files, each
 * followed by hand-written `lg:col-span-2` / `lg:col-span-1` children — so the
 * split was re-derived every time and the aside landed on a different side in
 * two of them.
 *
 * Collapses to a single column below `lg`, with the aside after the main
 * content in DOM order regardless of visual position, so a screen reader and a
 * keyboard both meet the primary content first.
 */
export function Columns({
  children,
  aside,
  asidePosition = 'end',
  gap = 'lg',
  className,
  ...rest
}: ColumnsProps) {
  if (!aside) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-3', GAP[gap], className)} {...rest}>
      <div className={cn('lg:col-span-2', asidePosition === 'start' && 'lg:order-2')}>
        {children}
      </div>
      <div className={cn('lg:col-span-1', asidePosition === 'start' && 'lg:order-1')}>{aside}</div>
    </div>
  );
}
