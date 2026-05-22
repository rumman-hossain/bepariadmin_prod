/**
 * Dashboard constants.
 * All magic numbers, colors, and intervals centralized here.
 */

/** Chart color palette — Apple-style muted palette */
export const CHART_COLORS = [
  '#0F9D58', // Green (primary)
  '#FFBB28', // Gold
  '#FF8042', // Orange
  '#0088FE', // Blue
  '#AA46BC', // Purple
  '#FF6384', // Pink
  '#36A2EB', // Light blue
  '#9966FF', // Indigo
] as const;

/** Auto-refresh interval in milliseconds (60 seconds) */
export const DASHBOARD_REFRESH_INTERVAL = 60_000;

/** Maximum number of recent orders to display */
export const MAX_RECENT_ORDERS = 5;

/** KPI card definitions — label and icon name for type-safe lookup */
export const KPI_CARD_KEYS = [
  'totalGMV',
  'totalOrders',
  'activeRetailers',
  'activeWholesalers',
] as const;