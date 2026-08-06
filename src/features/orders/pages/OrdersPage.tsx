import { useState } from 'react';
import { Package } from 'lucide-react';
import { Page, PageHeader, Section, Toolbar, Row } from '@/src/components/layout/primitives';
import { DataTable, Money, Identifier, Badge, StatGrid, Text, formatDate, type Column } from '@/src/components/data';
import { Button, SegmentedControl } from '@/src/components/controls';
import { ErrorState, EmptyState, SkeletonTable, SkeletonStatGrid } from '@/src/components/feedback';
import { useOrdersQuery, useOrderStatsQuery } from '../hooks/useOrders';
import { statusMeta } from '../orderStatus';
import { ORDER_STATUSES, ORDER_STATS_PERIODS, type Order } from '../types';

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { value: 'All', label: 'All' },
  ...ORDER_STATUSES.map((s) => ({ value: s, label: statusMeta(s).label })),
];

/**
 * Columns are a module constant, not built in the render.
 *
 * They close over nothing, so rebuilding them every render would allocate six
 * objects and six closures per keystroke on the filter for no benefit — and,
 * more to the point, a stable array is what lets `DataTable` memoise its sort.
 */
const COLUMNS: Column<Order>[] = [
  {
    key: 'id',
    header: 'Order',
    width: 'w-40',
    render: (o) => <Identifier value={o.id} truncate={10} />,
  },
  {
    key: 'placed',
    header: 'Placed',
    width: 'w-36',
    sortBy: (o) => o.createdAt,
    render: (o) => (
      <Text as="span" variant="secondary">
        <time dateTime={o.createdAt}>
        {formatDate(o.createdAt)}
        </time>
      </Text>
    ),
  },
  {
    key: 'retailer',
    header: 'Retailer',
    render: (o) => <Identifier value={o.retailerId} truncate={12} />,
  },
  {
    key: 'items',
    header: 'Items',
    align: 'right',
    width: 'w-20',
    sortBy: (o) => o.items?.length ?? 0,
    render: (o) => o.items?.length ?? 0,
  },
  {
    key: 'total',
    header: 'Total',
    align: 'right',
    width: 'w-36',
    sortBy: (o) => o.finalAmount,
    render: (o) => <Money amount={o.finalAmount} />,
  },
  {
    key: 'status',
    header: 'Status',
    width: 'w-32',
    sortBy: (o) => o.status,
    render: (o) => {
      const meta = statusMeta(o.status);
      return <Badge tone={meta.tone}>{meta.label}</Badge>;
    },
  },
];

/**
 * Every order on the platform.
 *
 * The first screen built entirely from the kit — no `div` in this file carries
 * a layout class, and the only conditional rendering is the four states a
 * server-backed list can be in. All six columns, the filter, the paging and the
 * summary are named parts.
 */
export function OrdersPage() {
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);

  const params = { page, limit: PAGE_SIZE, status };
  const orders = useOrdersQuery(params);
  const stats = useOrderStatsQuery();

  // The server echoes the window it measured; fall back to its own default
  // rather than asserting a period we did not ask for.
  const statsPeriod = ORDER_STATS_PERIODS[stats.data?.period ?? '7d'] ?? 'recent';

  const total = orders.data?.meta.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = orders.data?.data ?? [];

  /** Changing the filter invalidates the page number along with it. */
  const changeStatus = (next: string) => {
    setStatus(next);
    setPage(1);
  };

  return (
    <Page>
      <PageHeader
        title="Orders"
        subtitle="Every order placed across the platform, newest first."
      />

      {stats.isLoading ? (
        <SkeletonStatGrid count={3} />
      ) : stats.data ? (
        /*
         * Three tiles, not four, and every label names the window.
         *
         * This endpoint is period-scoped — `7d` by default — so calling the
         * count "Total orders" claimed an all-time figure the server never
         * returned. There are no delivered or cancelled counts in the payload at
         * all; a tile for them read empty on every load.
         */
        <StatGrid
          items={[
            { label: `Orders (${statsPeriod})`, value: stats.data.totalOrders },
            { label: `Pending (${statsPeriod})`, value: stats.data.pendingOrders },
            {
              label: `Revenue (${statsPeriod})`,
              value:
                stats.data.totalRevenue === undefined ? undefined : (
                  <Money amount={stats.data.totalRevenue} size="display" />
                ),
              emptyReason: 'No revenue recorded in this window',
            },
          ]}
        />
      ) : null}

      <Section>
        <Toolbar
          actions={
            <Row gap="sm" align="center">
              <Text variant="caption">
                {total > 0 ? `Page ${page} of ${lastPage}` : null}
              </Text>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || orders.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= lastPage || orders.isFetching}
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              >
                Next
              </Button>
            </Row>
          }
        >
          <SegmentedControl
            options={STATUS_FILTERS}
            value={status}
            onChange={changeStatus}
            label="Filter by status"
          />
        </Toolbar>

        {orders.isLoading ? (
          <SkeletonTable rows={8} columns={6} />
        ) : orders.isError ? (
          <ErrorState
            title="Orders could not be loaded"
            message="The order service did not respond. Nothing has changed."
            onRetry={() => void orders.refetch()}
          />
        ) : (
          <DataTable
            columns={COLUMNS}
            data={rows}
            rowKey={(o) => o.id}
            rowHref={(o) => `/orders/${o.id}`}
            rowLabel={(o) => `Order ${o.id}`}
            caption={`Orders, ${status === 'All' ? 'all statuses' : statusMeta(status).label.toLowerCase()}`}
            stickyHeader
            empty={
              <EmptyState
                icon={Package}
                title={status === 'All' ? 'No orders yet' : `No ${statusMeta(status).label.toLowerCase()} orders`}
                message={
                  status === 'All'
                    ? 'Orders placed by retailers will appear here.'
                    : 'Try another status filter.'
                }
              />
            }
          />
        )}
      </Section>
    </Page>
  );
}

export default OrdersPage;
