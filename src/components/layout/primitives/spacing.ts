/**
 * Spacing steps a layout primitive will accept.
 *
 * Deliberately not the full Tailwind scale. Nine grid recipes and five page
 * rhythms shipped because every screen could pick any value; six named steps
 * is enough to build with and few enough to stay consistent.
 *
 * In its own module so the primitives files export only components — a mixed
 * module breaks Fast Refresh, which is what `react-refresh/only-export-components`
 * is warning about.
 */
export type Gap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const GAP_Y: Record<Gap, string> = {
  none: 'gap-y-0', xs: 'gap-y-1', sm: 'gap-y-2', md: 'gap-y-4', lg: 'gap-y-6', xl: 'gap-y-8',
};

export const GAP_X: Record<Gap, string> = {
  none: 'gap-x-0', xs: 'gap-x-1', sm: 'gap-x-2', md: 'gap-x-4', lg: 'gap-x-6', xl: 'gap-x-8',
};

export const GAP: Record<Gap, string> = {
  none: 'gap-0', xs: 'gap-1', sm: 'gap-2', md: 'gap-4', lg: 'gap-6', xl: 'gap-8',
};
