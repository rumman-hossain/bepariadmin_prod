import React from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { GAP, GAP_Y, type Gap } from './spacing';

type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type Justify = 'start' | 'center' | 'end' | 'between';

const ALIGN: Record<Align, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const JUSTIFY: Record<Justify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Vertical rhythm between children. Default `md` (16px). */
  gap?: Gap;
  align?: Align;
  justify?: Justify;
  /** Render as a different element — `section`, `ul`, `form`. Default `div`. */
  as?: React.ElementType;
}

/**
 * Vertical layout.
 *
 * `gap` on a flex column rather than `space-y-*`, because `space-y` applies
 * margins to every child but the first — so it breaks the moment a child is
 * conditionally rendered, and it fights anything that needs its own margin.
 * The 76 `space-y-*` usages this replaces include several where exactly that
 * happened and was patched with a wrapper div.
 */
export const Stack = React.forwardRef<HTMLDivElement, StackProps>(function Stack(
  { gap = 'md', align, justify, as: Tag = 'div', className, ...rest },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={cn(
        'flex flex-col',
        GAP_Y[gap],
        align && ALIGN[align],
        justify && JUSTIFY[justify],
        className,
      )}
      {...rest}
    />
  );
});

export interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: Gap;
  align?: Align;
  justify?: Justify;
  /** Allow children onto a second line. Default true — toolbars overflow. */
  wrap?: boolean;
  as?: React.ElementType;
}

/**
 * Horizontal layout.
 *
 * Wraps by default. The 35 hand-rolled `flex items-center gap-2` clusters this
 * replaces mostly did not, which is why action rows collapsed awkwardly on a
 * narrow viewport instead of stacking.
 */
export const Row = React.forwardRef<HTMLDivElement, RowProps>(function Row(
  { gap = 'sm', align = 'center', justify, wrap = true, as: Tag = 'div', className, ...rest },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={cn(
        'flex',
        wrap && 'flex-wrap',
        GAP[gap],
        ALIGN[align],
        justify && JUSTIFY[justify],
        className,
      )}
      {...rest}
    />
  );
});
