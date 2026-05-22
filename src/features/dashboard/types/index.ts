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

/** Processed dashboard stats ready for UI consumption */
export interface DashboardStats {
  /** KPI metrics cards */
  kpis: Array<{
    label: string;
    value: string;
    trend: number;
    isCurrency?: boolean;
  }>;
  /** Sales trend over time */
  salesChart: Array<{
    name: string;
    value: number;
  }>;
  /** Order distribution by status */
  statusChart: Array<{
    name: string;
    value: number;
  }>;
  /** Security / risk alerts */
  alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    createdAt?: string;
  }>;
  /** Latest 5 orders */
  recentOrders: Array<{
    id: string;
    orderNo?: string;
    customerName?: string;
    amount: number;
    status: string;
    date: string;
  }>;
}