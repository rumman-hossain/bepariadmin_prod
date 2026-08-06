import type React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { PageHeader, Page, Panel, Stack } from '@/src/components/layout/primitives';
import { StatGrid, Money, Text, formatDate, formatDateTime } from '@/src/components/data';
import { EmptyState, ErrorState, SkeletonPage, SkeletonStatGrid } from '@/src/components/feedback';
import { SegmentedControl } from '@/src/components/controls';
import {
  useAnalyticsSummary,
  useSales,
  useTopRetailers,
  useTopProducts,
  useFraudFlags,
} from '../hooks/useAnalytics';
import { SALES_PERIODS, type SalesPeriod } from '../api/analyticsApi';

const CHART_HEIGHT = 300;

/**
 * A small ranked table with its own loading, error and empty states.
 *
 * One component for three panels that differ only in their columns. Written as
 * a generic rather than copied three times — the prototype's habit of
 * re-implementing a table per section is how one of its search boxes ended up
 * unwired.
 */
function RankPanel<T>({
  title,
  subtitle,
  query,
  empty,
  head,
  row,
  rowKey,
}: {
  title: string;
  subtitle: string;
  query: { data?: T[]; isPending: boolean; isError: boolean; refetch: () => unknown };
  empty: string;
  head: string[];
  row: (item: T) => React.ReactNode[];
  rowKey: (item: T) => string;
}) {
  return (
    <Panel title={title}>
      <Text variant="caption" className="mb-3 block">
        {subtitle}
      </Text>
      {query.isPending ? (
        <div className="h-24" aria-busy="true" />
      ) : query.isError ? (
        <ErrorState title={`${title} could not be loaded`} onRetry={() => void query.refetch()} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState title="Nothing to show" message={empty} />
      ) : (
        <table className="w-full text-sm">
          {/* responsive-table-reviewed: driven by `head`, two or three short columns at every call site. Fits 375px without card mode. */}
          <caption className="sr-only">{`${title} — ${subtitle}`}</caption>
          <thead>
            <tr className="border-b border-rule text-left">
              {head.map((h, i) => (
                <th
                  key={h}
                  className={`py-1.5 font-medium text-ink-2 ${i === 0 ? '' : 'text-right'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {query.data.map((item) => (
              <tr key={rowKey(item)} className="border-b border-rule-subtle">
                {row(item).map((cell, i) => (
                  <td key={i} className={`py-1.5 ${i === 0 ? '' : 'cell-numeric'}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

function isPeriod(v: string | null): v is SalesPeriod {
  return SALES_PERIODS.includes(v as SalesPeriod);
}

/**
 * Analytics.
 *
 * All five analytics endpoints are now real. Three of them — retailers,
 * products and fraud — returned a hardcoded `200 {"data": []}` with no query
 * behind them until F-17 was fixed, which meant this screen previously had to
 * render them as "not built" rather than as empty tables. An empty array that
 * is indistinguishable from a real answer is worse than a 404, because nothing
 * on the client can tell the difference.
 *
 * One caveat still holds, and the fraud panel says it out loud: the flags table
 * is queried honestly, but nothing scores orders for risk. An empty list there
 * means "not scored", not "clean" — a distinction that matters more on a fraud
 * screen than anywhere else in the console.
 */
export function AnalyticsPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('period');
  const period: SalesPeriod = isPeriod(raw) ? raw : '30d';

  const summary = useAnalyticsSummary();
  const sales = useSales(period);
  const topRetailers = useTopRetailers();
  const topProducts = useTopProducts();
  const fraudFlags = useFraudFlags();

  const setPeriod = (next: SalesPeriod) => {
    const p = new URLSearchParams(params);
    if (next === '30d') p.delete('period');
    else p.set('period', next);
    setParams(p, { replace: true });
  };

  if (summary.isPending && sales.isPending) return <SkeletonPage shape="dashboard" />;

  return (
    <Page>
      <PageHeader
        title="Analytics"
        subtitle={
          summary.data
            ? `Figures as at ${formatDateTime(summary.data.lastUpdated)}`
            : 'Platform performance'
        }
        actions={
          <SegmentedControl<SalesPeriod>
            label="Sales period"
            value={period}
            onChange={setPeriod}
            options={SALES_PERIODS.map((p) => ({ value: p, label: p.replace('d', ' days') }))}
          />
        }
      />

      {/* ── Summary ─────────────────────────────────────────── */}
      {summary.isPending ? (
        <SkeletonStatGrid count={3} />
      ) : summary.isError ? (
        <ErrorState
          title="Summary figures could not be loaded"
          onRetry={() => void summary.refetch()}
        />
      ) : (
        <StatGrid
          items={[
            {
              label: 'Gross merchandise value',
              value: <Money amount={summary.data.gmv} size="display" />,
            },
            { label: 'Orders', value: summary.data.orderCount },
            { label: 'Active retailers', value: summary.data.activeRetailers },
          ]}
        />
      )}

      {/* ── Sales over time ─────────────────────────────────── */}
      <Panel title="Sales over time">
        {sales.isPending ? (
          <div style={{ height: CHART_HEIGHT }} aria-busy="true" />
        ) : sales.isError ? (
          <ErrorState title="Sales could not be loaded" onRetry={() => void sales.refetch()} />
        ) : sales.data.length === 0 ? (
          <EmptyState
            title="No sales in this period"
            message="Try a longer period, or check back once orders start landing."
          />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <LineChart data={sales.data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-chart-grid)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={(d: string) => formatDate(d)}
                  tick={{ fontSize: 12, fill: 'var(--color-ink-3)' }}
                  stroke="var(--color-chart-grid)"
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--color-ink-3)' }}
                  stroke="var(--color-chart-grid)"
                  width={72}
                />
                <Tooltip
                  labelFormatter={(d) => formatDate(String(d))}
                  contentStyle={{
                    background: 'var(--color-sheet)',
                    border: '1px solid var(--color-rule)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 13,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  name="Orders"
                  stroke="var(--color-chart-3)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>

            {/*
              Every chart has a reachable table behind it. A chart nobody can
              read the numbers off is decoration, and it is also the only form
              this data takes for anyone using a screen reader.
            */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-brass-lift">
                Show these figures as a table
              </summary>
              <table className="mt-3 w-full text-sm">
                {/* responsive-table-reviewed: Day · Orders · Revenue — three short columns. */}
                <caption className="sr-only">Sales over the last {period}</caption>
                <thead>
                  <tr className="border-b border-rule text-left">
                    <th className="py-1.5 font-medium text-ink-2">Day</th>
                    <th className="py-1.5 text-right font-medium text-ink-2">Orders</th>
                    <th className="py-1.5 text-right font-medium text-ink-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.data.map((point) => (
                    <tr key={point.day} className="border-b border-rule-subtle">
                      <td className="py-1.5">
                        <time dateTime={point.day}>{formatDate(point.day)}</time>
                      </td>
                      <td className="cell-numeric py-1.5">{point.orders}</td>
                      <td className="cell-numeric py-1.5">
                        <Money amount={point.revenue} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </Panel>

      {/* ── Top retailers · Top products · Fraud ─────────────── */}
      <Stack gap="md">
        <RankPanel
          title="Top retailers"
          subtitle="By revenue, last 30 days"
          query={topRetailers}
          empty="No retailer activity in the last 30 days."
          head={['Shop', 'District', 'Orders', 'Revenue']}
          row={(r) => [
            r.shopName,
            r.district ?? '—',
            String(r.orderCount),
            <Money key="rev" amount={r.revenue} />,
          ]}
          rowKey={(r) => r.retailerId}
        />

        <RankPanel
          title="Best-selling products"
          subtitle="By units sold, last 30 days"
          query={topProducts}
          empty="No products sold in the last 30 days."
          head={['Product', 'Units', 'Revenue']}
          row={(p) => [p.productName, String(p.unitsSold), <Money key="rev" amount={p.revenue} />]}
          rowKey={(p) => p.productId}
        />

        <RankPanel
          title="Fraud signals"
          subtitle="Open flags, highest risk first"
          query={fraudFlags}
          /*
           * Not "no fraud detected". Nothing scores orders for risk, so an empty
           * table here means the flags table is empty — which is what "not
           * scored" looks like, and is a different fact from "clean".
           */
          empty="No open flags. Note that nothing currently scores orders for risk, so this is not a clean result — it is no measurement."
          head={['Retailer', 'Rule', 'Risk', 'Raised']}
          row={(f) => [
            f.retailerId,
            f.rule,
            f.riskScore.toFixed(1),
            formatDateTime(f.createdAt),
          ]}
          rowKey={(f) => f.id}
        />
      </Stack>

    </Page>
  );
}
