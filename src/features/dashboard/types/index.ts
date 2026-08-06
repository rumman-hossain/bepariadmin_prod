/**
 * Dashboard types — inferred from Zod schema.
 * Single source of truth for all dashboard data shapes.
 */
export type {
  Kpi,
  ChartDataPoint,
  DashboardAlert,
  RecentOrder,
  DashboardStatsRaw,
} from '../schemas/dashboardSchema';

/**
 * Dashboard stats as the screen consumes them.
 *
 * An alias, deliberately — this was a hand-written interface restating every
 * field of `dashboardStatsSchema`, which is one contract maintained in two
 * places. It had already drifted: it declared `trend` as a required number
 * while the API omits it when there is no prior period, and it knew nothing of
 * `key`. Typecheck passed throughout, because the duplicate agreed with itself.
 *
 * The schema is what the payload is actually validated against, so the schema
 * is the definition and this name is kept only because it reads better at call
 * sites than `DashboardStatsRaw`.
 */
export type { DashboardStatsRaw as DashboardStats } from '../schemas/dashboardSchema';