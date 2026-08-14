/**
 * Dashboard — the landing screen.
 *
 * Rebuilt on the kit. It was ~70% presentation markup: a 52-line bespoke
 * skeleton, a hand-rolled error block, a `StatCard`, an `AlertList` built from
 * raw `border-l-blue-400` / `amber-400` / `red-400` / `emerald-400`, and a
 * "table" of `div`s with a fake header row. All five are now components, and
 * the file is roughly half its previous length.
 *
 * Two more undefined tokens turned up while migrating: `accent-mint` on the KPI
 * icon chip and `surface-card` on the chart dots. Both resolved to nothing, so
 * the icon chip had no background and the dots no fill.
 */
import { TrendingUp, TrendingDown, RefreshCw, Package, type LucideIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, CHART_HEIGHT_PX } from '../components/ChartContainer';
import { Users, DollarSign, ShoppingCart } from 'lucide-react';

import { Page, Panel, Grid, Columns } from '@/src/components/layout/primitives';
import { PageHeader } from '@/src/components/layout/primitives';
import { Button } from '@/src/components/controls';
import { Alert, ErrorState, EmptyState, SkeletonPage } from '@/src/components/feedback';
import { StatGrid, Money, DataTable, Identifier, formatTime, type Column, Text } from '@/src/components/data';
import { StatusBadge } from '@/src/components/data/StatusBadge';
import { cn } from '@/src/design-system/utils/cn';

import { useDashboardStats } from '../hooks/useDashboardStats';
import { CHART_COLORS, CHART_GRID_COLOR } from '../constants';
import type { Kpi, DashboardAlert, RecentOrder, ChartDataPoint } from '../types';
import { SmsBalanceCard } from '../components/SmsBalanceCard';

/**
 * Keyed on the KPI's stable `key`, never its label.
 *
 * It was keyed on display text — 'Total GMV', 'Active Retailers' — none of
 * which the API emits ('GMV (30 days)', 'Active retailers'). Every tile fell
 * through to the same fallback icon. It would have broken on the casing alone.
 * Matching a human-readable string is fragile by construction: it breaks on
 * rewording, on capitalisation, and on the first translation.
 */
const KPI_ICONS: Record<string, LucideIcon> = {
  gmv: DollarSign,
  orders: ShoppingCart,
  retailers: Users,
  wholesalers: Package,
};

/** Tooltip chrome, shared by both charts so they cannot drift apart. */
const TOOLTIP_STYLE = {
  borderRadius: '7px',
  border: '1px solid var(--color-rule)',
  background: 'var(--color-sheet)',
  color: 'var(--color-ink)',
  fontSize: '13px',
} as const;

const AXIS_TICK = { fontSize: 12, fill: 'var(--color-ink-3)' } as const;

function ChartEmpty({ message }: { message: string }) {
  return (
    <div
      className="flex items-center justify-center text-sm text-ink-3"
      style={{ height: CHART_HEIGHT_PX }}
    >
      {message}
    </div>
  );
}

function SalesChart({ data }: { data: ChartDataPoint[] }) {
  if (data.length === 0) return <ChartEmpty message="No sales recorded yet" />;

  return (
    <ChartContainer>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.28} />
            <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
        <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={CHART_COLORS[0]}
          strokeWidth={2}
          fill="url(#salesGradient)"
          // `--color-surface-card` was referenced here and never defined, so the
          // dots rendered with no fill at all.
          dot={{ r: 3, strokeWidth: 2, fill: 'var(--color-sheet)' }}
          activeDot={{ r: 5, strokeWidth: 2, fill: CHART_COLORS[0] }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function StatusPie({ data }: { data: ChartDataPoint[] }) {
  if (data.length === 0) return <ChartEmpty message="No orders to break down yet" />;

  return (
    <ChartContainer>
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
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
      </PieChart>
    </ChartContainer>
  );
}

function KpiIcon({ kpiKey }: { kpiKey: string }) {
  const Icon = KPI_ICONS[kpiKey] ?? TrendingUp;
  return <Icon className="h-3.5 w-3.5" aria-hidden="true" />;
}

/**
 * Period-over-period growth.
 *
 * Rendered only when a comparison exists — see the call site. The figure itself
 * is rounded on the server so the same number cannot read differently on two
 * screens; a raw float64 here printed "+12.345678901%".
 */
function Trend({ value }: { value: number }) {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={cn('inline-flex items-center gap-1', up ? 'text-ok' : 'text-bad')}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {up ? '+' : ''}
      {/*
        The explicit space matters. Written as `{value}%<span>vs last month`, JSX
        emits no whitespace between the two and the tile reads "+12.3%vs last
        month" — which is what my own refactor did when it collapsed the original
        multi-line expression onto one line.
      */}
      {value}% <span className="text-ink-3">vs last month</span>
    </span>
  );
}

const ALERT_TONE = { info: 'info', warning: 'warn', error: 'bad', success: 'ok' } as const;

function AlertList({ alerts }: { alerts: DashboardAlert[] }) {
  if (alerts.length === 0) {
    return <p className="text-sm text-ink-3">Nothing needs attention.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {alerts.map((alert) => (
        <li key={alert.id}>
          {/*
            Was four raw palette colours on a left border — blue-400, amber-400,
            red-400, emerald-400 — none of them from the token system, and none
            carrying a role or an icon. Alert supplies both, so the meaning
            survives greyscale.
          */}
          <Alert tone={ALERT_TONE[alert.type]} title={alert.title}>
            {alert.message}
          </Alert>
        </li>
      ))}
    </ul>
  );
}

const ORDER_COLUMNS: Column<RecentOrder>[] = [
  {
    key: 'order',
    header: 'Order',
    render: (order) => (
      <span className="flex flex-col">
        <Identifier value={order.orderNo ?? order.id} truncate={12} />
        <Text variant="caption">{order.customerName ?? 'Unknown retailer'}</Text>
      </span>
    ),
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    width: 'w-32',
    render: (order) => <Money amount={order.amount} />,
  },
  {
    key: 'status',
    header: 'Status',
    align: 'center',
    width: 'w-28',
    render: (order) => <StatusBadge status={order.status} />,
  },
];

export function DashboardPage() {
  const { stats, isLoading, isRefreshing, error, refreshError, lastUpdatedAt, refresh, clearError } =
    useDashboardStats();

  if (isLoading) return <SkeletonPage shape="dashboard" />;

  if (error && !stats) {
    return <ErrorState title="Could not load the dashboard" message={error} onRetry={refresh} />;
  }

  if (!stats || (stats.kpis.length === 0 && stats.salesChart.length === 0)) {
    return (
      <EmptyState
        icon={Package}
        title="No dashboard data yet"
        message="Figures appear here once retailers, suppliers and orders exist."
        action={
          <Button variant="secondary" iconLeft={RefreshCw} onClick={refresh}>
            Refresh
          </Button>
        }
      />
    );
  }

  return (
    <Page>
      <PageHeader
        title="Dashboard"
        subtitle="Marketplace activity at a glance"
        actions={
          <Button
            variant="secondary"
            size="sm"
            iconLeft={RefreshCw}
            onClick={refresh}
            loading={isRefreshing}
          >
            Refresh
          </Button>
        }
      />

      {/*
        A failed background refresh keeps the numbers on screen and says so.
        Every refresh failure used to be swallowed, so behind the 60-second poll
        the dashboard could show hours-old figures with no sign anything was
        wrong — on the one screen whose whole job is to be trusted at a glance.
      */}
      {refreshError && !error && (
        <Alert
          tone="warn"
          title="These figures may be out of date"
          onDismiss={clearError}
          action={
            <Button variant="secondary" size="sm" iconLeft={RefreshCw} onClick={refresh}>
              Try again
            </Button>
          }
        >
          {refreshError}
          {lastUpdatedAt
            ? ` Last updated ${formatTime(lastUpdatedAt)}.`
            : ''}
        </Alert>
      )}

      {error && (
        <Alert
          tone="bad"
          title="Could not refresh the dashboard"
          action={
            <Button variant="secondary" size="sm" iconLeft={RefreshCw} onClick={refresh}>
              Try again
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <StatGrid
        items={stats.kpis.map((kpi: Kpi) => ({
          label: kpi.label,
          icon: <KpiIcon kpiKey={kpi.key} />,
          value: kpi.isCurrency ? <Money amount={kpi.value} size="display" /> : kpi.value,
          /*
           * No trend, no row. `trend` is absent when there is no prior period
           * to compare against, and the head-count KPIs never have one.
           *
           * The previous code read `kpi.trend >= 0`, which is true for the
           * missing case once it arrives as 0 — so a marketplace in its first
           * month showed "+0% vs last month" beside a green growth arrow. That
           * is a claim about a comparison nobody made.
           */
          detail: kpi.trend == null ? undefined : <Trend value={kpi.trend} />,
        }))}
      />

      {/*
        Directly under the KPIs, because it is read the same way — a number
        checked at a glance — and because a low balance needs to be seen before
        anything else on this screen matters. It loads on its own request, so a
        slow or unreachable gateway never holds up the figures above it.
      */}
      <SmsBalanceCard />

      <Columns
        aside={
          <Panel title="Order status">
            <StatusPie data={stats.statusChart} />
          </Panel>
        }
      >
        <Panel title="Sales trend">
          <SalesChart data={stats.salesChart} />
        </Panel>
      </Columns>

      <Grid cols={2} gap="lg">
        <Panel title="Needs attention">
          <AlertList alerts={stats.alerts} />
        </Panel>

        <Panel title="Recent orders" flush>
          <DataTable
            columns={ORDER_COLUMNS}
            data={stats.recentOrders}
            rowKey={(order) => order.id}
            density="compact"
            caption="The most recent orders across the marketplace"
            className="rounded-none border-0"
            empty={<p className="px-4 py-6 text-sm text-ink-3">No orders yet.</p>}
          />
        </Panel>
      </Grid>
    </Page>
  );
}
