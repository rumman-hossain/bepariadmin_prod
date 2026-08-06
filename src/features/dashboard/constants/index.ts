/**
 * Dashboard constants.
 */

/**
 * Chart series colours.
 *
 * These are `var()` references, not literals, so series re-colour with the
 * theme. The previous palette was eight fixed hex values — a saturated green,
 * gold, orange and pink picked for a light background — which stayed exactly
 * the same in dark mode and vibrated against it.
 *
 * Ordered by how far apart they read, so a two-series chart gets navy and green
 * rather than two blues. Recharts writes these straight into SVG `fill` and
 * `stroke` attributes, where custom properties resolve normally.
 */
/**
 * Five series, and the count is deliberate.
 *
 * The Khata chart palette spreads its series across luminance as well as hue,
 * so a chart survives greyscale printing and colour-vision deficiency. Six
 * rungs cannot be spread far enough to stay separable without pushing the
 * lightest below 3:1 against the sheet, where a thin line stops being visible
 * — measured at 2.10:1 before this was cut back to five.
 *
 * A chart that genuinely needs a sixth series is a chart that should be a
 * table. Adding `--color-chart-6` back would fail `guard:undefined-token`.
 */
export const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
] as const;

/** Grid lines and axes. Deliberately the quietest token in the set. */
export const CHART_GRID_COLOR = 'var(--color-chart-grid)';

/** Auto-refresh interval in milliseconds (60 seconds) */
export const DASHBOARD_REFRESH_INTERVAL = 60_000;
