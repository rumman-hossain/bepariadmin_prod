/**
 * Dashboard Page — main landing view.
 *
 * Architecture:
 * - Reads from useDashboardStore via useDashboardStats hook
 * - Zero props — fully self-contained
 * - Sub-components co-located (extractable if they grow past ~30 loc)
 * - Handles: loading, empty, error, success states
 */
import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card } from '@/src/components/ui/Card';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Button } from '@/src/components/ui/Button';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { CHART_COLORS } from '../constants';
import type { Kpi, DashboardAlert, RecentOrder, ChartDataPoint } from '../types';

// ═══════════════════════════════════════════════════════════════
// Internal Sub-Components
// ═══════════════════════════════════════════════════════════════

/** Map KPI keys to Lucide icons */
const KPI_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Total GMV': DollarSign,
  'Total Orders': ShoppingCart,
  'Active Retailers': Users,
  'Active Wholesalers': Package,
  default: TrendingUp,
};

/** Skeleton placeholder while loading */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in" aria-busy="true" aria-label="Loading dashboard">
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="space-y-3 animate-pulse">
              <div className="h-4 w-24 bg-surface-muted rounded" />
              <div className="h-8 w-32 bg-surface-muted rounded" />
              <div className="h-3 w-16 bg-surface-muted rounded" />
            </div>
          </Card>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="space-y-3 animate-pulse">
            <div className="h-5 w-32 bg-surface-muted rounded" />
            <div className="h-[250px] bg-surface-muted rounded" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="space-y-3 animate-pulse">
            <div className="h-5 w-24 bg-surface-muted rounded" />
            <div className="h-[250px] bg-surface-muted rounded" />
          </div>
        </Card>
      </div>

      {/* Alerts + recent orders skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="space-y-2 animate-pulse">
            <div className="h-5 w-24 bg-surface-muted rounded" />
            <div className="h-3 w-full bg-surface-muted rounded" />
            <div className="h-3 w-full bg-surface-muted rounded" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="space-y-2 animate-pulse">
            <div className="h-5 w-28 bg-surface-muted rounded" />
            <div className="h-8 w-full bg-surface-muted rounded" />
            <div className="h-8 w-full bg-surface-muted rounded" />
            <div className="h-8 w-full bg-surface-muted rounded" />
          </div>
        </Card>
      </div>
    </div>
  );
}

/** Error banner with retry button */
function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
      <AlertTriangle className="w-12 h-12 text-semantic-danger" aria-hidden="true" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-text-primary">Failed to load dashboard</h2>
        <p className="text-sm text-text-secondary max-w-md">{message}</p>
      </div>
      <Button variant="outline" size="md" iconLeft={RefreshCw} onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

/** KPI stat card */
function StatCard({ kpi }: { kpi: Kpi }) {
  const Icon = KPI_ICONS[kpi.label] ?? KPI_ICONS.default;
  const isPositive = kpi.trend >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive ? 'text-semantic-success' : 'text-semantic-danger';

  return (
    <Card className="p-5 flex flex-col gap-2 transition-shadow hover:shadow-card-hover">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">{kpi.label}</span>
        <div className="w-9 h-9 rounded-lg bg-accent-mint/10 dark:bg-accent-mint/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-accent-mint" aria-hidden="true" />
        </div>
      </div>
      <div className="text-2xl font-bold text-text-primary tracking-tight">
        {kpi.isCurrency ? `৳${kpi.value}` : kpi.value}
      </div>
      <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
        <TrendIcon className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{isPositive ? '+' : ''}{kpi.trend}%</span>
        <span className="text-text-tertiary ml-1">vs last month</span>
      </div>
    </Card>
  );
}

/** Sales trend area chart */
function SalesChart({ data }: { data: ChartDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-text-tertiary text-sm">
        No sales data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
            <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid var(--color-border-default)',
            background: 'var(--color-surface-elevated)',
            fontSize: '13px',
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={CHART_COLORS[0]}
          strokeWidth={2}
          fill="url(#salesGradient)"
          dot={{ r: 3, strokeWidth: 2, fill: 'var(--color-surface-card)' }}
          activeDot={{ r: 5, strokeWidth: 2, fill: CHART_COLORS[0] }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Order status pie chart */
function StatusPie({ data }: { data: ChartDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-text-tertiary text-sm">
        No status data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid var(--color-border-default)',
            background: 'var(--color-surface-elevated)',
            fontSize: '13px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Alert list */
function AlertList({ alerts }: { alerts: DashboardAlert[] }) {
  if (alerts.length === 0) {
    return <p className="text-sm text-text-tertiary">No alerts</p>;
  }

  const typeStyles: Record<DashboardAlert['type'], string> = {
    info: 'border-l-blue-400 bg-blue-50/50 dark:bg-blue-950/30',
    warning: 'border-l-amber-400 bg-amber-50/50 dark:bg-amber-950/30',
    error: 'border-l-red-400 bg-red-50/50 dark:bg-red-950/30',
    success: 'border-l-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30',
  };

  return (
    <div className="space-y-2" role="list" aria-label="Alerts">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          role="listitem"
          className={`p-3 rounded-lg border-l-4 text-sm ${typeStyles[alert.type]}`}
        >
          <p className="font-semibold text-text-primary">{alert.title}</p>
          <p className="text-text-secondary text-xs mt-0.5">{alert.message}</p>
        </div>
      ))}
    </div>
  );
}

/** Recent orders mini-table */
function RecentOrders({ orders }: { orders: RecentOrder[] }) {
  if (orders.length === 0) {
    return <p className="text-sm text-text-tertiary">No recent orders</p>;
  }

  return (
    <div className="overflow-x-auto" role="table" aria-label="Recent orders">
      <div className="min-w-[400px]">
        {/* Header */}
        <div className="flex items-center gap-4 px-1 pb-2 border-b border-border-default text-xs font-medium text-text-tertiary uppercase tracking-wider">
          <div className="flex-1">Order</div>
          <div className="w-24 text-right">Amount</div>
          <div className="w-24 text-center">Status</div>
        </div>
        {/* Rows */}
        <div className="divide-y divide-border-default">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center gap-4 px-1 py-2.5 text-sm"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary truncate">
                  {order.orderNo ?? `#${order.id.substring(0, 8)}`}
                </p>
                <p className="text-xs text-text-tertiary">
                  {order.customerName ?? '—'}
                </p>
              </div>
              <div className="w-24 text-right font-medium text-text-primary tabular-nums">
                ৳{order.amount.toLocaleString()}
              </div>
              <div className="w-24 flex justify-center">
                <StatusBadge status={order.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Dashboard Page
// ═══════════════════════════════════════════════════════════════

export function DashboardPage() {
  const { stats, isLoading, isRefreshing, error, refresh } = useDashboardStats();

  // ── Loading state ────────────────────────────────────
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // ── Error state ─────────────────────────────────────
  if (error && !stats) {
    return <DashboardError message={error} onRetry={refresh} />;
  }

  // ── Empty state ─────────────────────────────────────
  if (!stats || (stats.kpis.length === 0 && stats.salesChart.length === 0)) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <EmptyState
          icon={<Package className="w-12 h-12" />}
          title="No dashboard data yet"
          description="Start adding retailers, wholesalers, and orders to see your metrics."
          action={
            <Button variant="outline" size="md" iconLeft={RefreshCw} onClick={refresh}>
              Refresh
            </Button>
          }
        />
      </div>
    );
  }

  // ── Success state ───────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Overview of your business metrics
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          iconLeft={RefreshCw}
          onClick={refresh}
          loading={isRefreshing}
          disabled={isRefreshing}
          aria-label="Refresh dashboard data"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Error banner (non-blocking — show stale data) */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 p-3 rounded-lg bg-semantic-danger-light text-sm text-semantic-danger"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
          <button
            onClick={refresh}
            className="ml-auto text-xs font-medium underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.kpis.map((kpi, i) => (
          <StatCard key={i} kpi={kpi} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-text-primary mb-4">
            Sales Trend
          </h2>
          <SalesChart data={stats.salesChart} />
        </Card>
        <Card className="p-5">
          <h2 className="text-base font-semibold text-text-primary mb-4">
            Order Status
          </h2>
          <StatusPie data={stats.statusChart} />
        </Card>
      </div>

      {/* Alerts + Recent orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="text-base font-semibold text-text-primary mb-3">
            Alerts & Notifications
          </h2>
          <AlertList alerts={stats.alerts} />
        </Card>
        <Card className="p-5">
          <h2 className="text-base font-semibold text-text-primary mb-3">
            Recent Orders
          </h2>
          <RecentOrders orders={stats.recentOrders} />
        </Card>
      </div>
    </div>
  );
}