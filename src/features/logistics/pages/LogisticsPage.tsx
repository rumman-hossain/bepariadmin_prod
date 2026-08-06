import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, Page, Panel, Row } from '@/src/components/layout/primitives';
import {
  DataTable,
  StatGrid,
  Money,
  Text,
  StatusBadge,
  EmptyValue,
  Pagination,
  formatDate,
} from '@/src/components/data';
import type { Column } from '@/src/components/data';
import { EmptyState, ErrorState, SkeletonPage, Alert } from '@/src/components/feedback';
import { Button, SegmentedControl } from '@/src/components/controls';
import { DispatchDialog } from '../components/DispatchDialog';
import {
  useLogisticsSummary,
  useQueue,
  useShipments,
  useRates,
} from '../hooks/useLogistics';
import { toTaka, formatWeight, type QueuedOrder, type Shipment } from '../api/logisticsApi';

const VIEWS = ['dashboard', 'queue', 'transit', 'history', 'rates'] as const;
type View = (typeof VIEWS)[number];

type QueueRow = Record<string, unknown> & QueuedOrder;
type ShipmentRow = Record<string, unknown> & Shipment;

/**
 * Logistics — the shipping department.
 *
 * **This is the only screen a `logistics` account can reach.** Not a filtered
 * console: one department, one destination. The rail shows nothing else, and
 * every other address renders a refusal that says which role it needs. The
 * server refuses the calls regardless — see `pkg/middleware/roles.go`, where
 * `IsAdminRole` and `IsStaffRole` had to become two questions so that a
 * department role could exist without inheriting admin access.
 *
 * **Costs are what couriers charge us**, resolved from the rate card in force at
 * dispatch and stored on the shipment. Nothing here computes money — a cost is
 * a server field, and guard G12 fails the build on the arithmetic.
 *
 * There is no customer shipping tariff, because orders carry no shipping charge:
 * nothing bills a retailer for delivery today, and showing a figure nobody is
 * charged would be the fabricated ৳120 in reverse.
 */
export function LogisticsPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('view');
  const view: View = VIEWS.includes(raw as View) ? (raw as View) : 'dashboard';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const summary = useLogisticsSummary();
  const queue = useQueue(page);
  const shipments = useShipments(view === 'history' ? 'delivered' : 'in_transit', page);
  const rates = useRates();

  const [dispatching, setDispatching] = useState<QueueRow | null>(null);

  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(params);
    if (v === null) p.delete(k);
    else p.set(k, v);
    if (k === 'view') p.delete('page');
    setParams(p, { replace: true });
  };

  const queueColumns: Column<QueueRow>[] = [
    {
      key: 'retailerName',
      header: 'Deliver to',
      render: (q) => (
        <div>
          <Text>{q.retailerName}</Text>
          <Text variant="caption" truncate>
            {q.address}
          </Text>
        </div>
      ),
    },
    {
      key: 'itemCount',
      header: 'Items',
      align: 'right',
      sortBy: (q) => q.itemCount,
      render: (q) => <span className="tabular-nums">{q.itemCount}</span>,
    },
    {
      key: 'paymentKind',
      header: 'Payment',
      // COD matters to the person handing the parcel over: the courier collects.
      render: (q) => <StatusBadge status={q.paymentKind} />,
    },
    {
      key: 'createdAt',
      header: 'Ordered',
      sortBy: (q) => q.createdAt,
      render: (q) => (
        <Text as="span" variant="secondary">
          <time dateTime={q.createdAt}>{formatDate(q.createdAt)}</time>
        </Text>
      ),
    },
    {
      key: 'action',
      header: '',
      render: (q) => (
        <Button variant="primary" size="sm" onClick={() => setDispatching(q)}>
          Dispatch
        </Button>
      ),
    },
  ];

  const shipmentColumns: Column<ShipmentRow>[] = [
    {
      key: 'retailerName',
      header: 'To',
      render: (s) => (
        <div>
          <Text>{s.retailerName}</Text>
          <Text variant="caption">{s.courierName}</Text>
        </div>
      ),
    },
    {
      key: 'trackingId',
      header: 'Tracking',
      render: (s) =>
        s.trackingId ? <span className="font-mono text-sm text-ink">{s.trackingId}</span> : <EmptyValue />,
    },
    {
      key: 'weightGrams',
      header: 'Weight',
      align: 'right',
      sortBy: (s) => s.weightGrams,
      render: (s) => <span className="tabular-nums">{formatWeight(s.weightGrams)}</span>,
    },
    {
      key: 'costMinor',
      header: 'Courier cost',
      align: 'right',
      sortBy: (s) => s.costMinor,
      // Resolved from the rate card at dispatch and stored. Never recomputed —
      // a tariff change must not re-price a parcel that has already gone.
      render: (s) => <Money amount={toTaka(s.costMinor)} />,
    },
    {
      key: 'dispatchedAt',
      header: 'Dispatched',
      sortBy: (s) => s.dispatchedAt,
      render: (s) => (
        <Text as="span" variant="secondary">
          <time dateTime={s.dispatchedAt}>{formatDate(s.dispatchedAt)}</time>
        </Text>
      ),
    },
    {
      key: 'deliveredAt',
      header: 'Delivered',
      render: (s) =>
        s.deliveredAt ? (
          <Text as="span" variant="secondary">
            <time dateTime={s.deliveredAt}>{formatDate(s.deliveredAt)}</time>
          </Text>
        ) : (
          // Absent means in transit. There is no status column on a shipment —
          // two facts that can disagree is worse than one that cannot.
          <EmptyValue />
        ),
    },
  ];

  if (summary.isPending) return <SkeletonPage shape="dashboard" />;

  const list = view === 'queue' ? queue.data : shipments.data;

  return (
    <Page>
      <PageHeader
        title="Logistics"
        subtitle="Parcels out the door"
        actions={
          <SegmentedControl<View>
            label="View"
            value={view}
            onChange={(v) => setParam('view', v)}
            options={[
              { value: 'dashboard', label: 'Overview' },
              {
                value: 'queue',
                label: summary.data
                  ? `To dispatch (${summary.data.awaitingDispatch})`
                  : 'To dispatch',
              },
              { value: 'transit', label: 'In transit' },
              { value: 'history', label: 'Delivered' },
              { value: 'rates', label: 'Rates' },
            ]}
          />
        }
      />

      {view === 'dashboard' &&
        (summary.isError ? (
          <ErrorState title="The summary could not be loaded" onRetry={() => void summary.refetch()} />
        ) : summary.data ? (
          <>
            <StatGrid
              items={[
                { label: 'Awaiting dispatch', value: String(summary.data.awaitingDispatch) },
                { label: 'In transit', value: String(summary.data.inTransit) },
                { label: 'Delivered today', value: String(summary.data.deliveredToday) },
                {
                  label: 'Courier cost today',
                  value: <Money amount={toTaka(summary.data.costTodayMinor)} />,
                },
              ]}
            />

            <Alert tone="info" title="Courier cost is what we owe, not what we have paid">
              Every dispatch records what that courier charges for that parcel, from the rate
              card in force at the time. It is an accrual — the cash book records money that
              has actually moved, and couriers are paid later, so this does not appear in the
              ledger. It is still the first real figure for a line Accounting used to fill with
              a flat ৳120 per shipment.
            </Alert>
          </>
        ) : null)}

      {view === 'queue' && (
        <Panel flush>
          {queue.isError ? (
            <ErrorState title="The queue could not be loaded" onRetry={() => void queue.refetch()} />
          ) : !queue.data?.data.length ? (
            <EmptyState
              title="Nothing waiting to go out"
              message="Orders appear here once they reach processing. An order that has been dispatched leaves the queue."
            />
          ) : (
            <DataTable<QueueRow>
              data={queue.data.data as QueueRow[]}
              columns={queueColumns}
              rowKey={(q) => q.orderId}
              caption="Parcels ready for a courier"
            />
          )}
        </Panel>
      )}

      {(view === 'transit' || view === 'history') && (
        <Panel flush>
          {shipments.isError ? (
            <ErrorState title="Shipments could not be loaded" onRetry={() => void shipments.refetch()} />
          ) : !shipments.data?.data.length ? (
            <EmptyState
              title={view === 'transit' ? 'Nothing in transit' : 'Nothing delivered yet'}
              message={
                view === 'transit'
                  ? 'A parcel appears here from the moment it is handed to a courier until the order is marked delivered.'
                  : 'A shipment moves here when its order is marked delivered.'
              }
            />
          ) : (
            <DataTable<ShipmentRow>
              data={shipments.data.data as ShipmentRow[]}
              columns={shipmentColumns}
              rowKey={(s) => s.id}
              caption={view === 'transit' ? 'In transit' : 'Delivered'}
            />
          )}
        </Panel>
      )}

      {view === 'rates' && (
        <>
          <Alert tone="info" title="Tariffs are published, not edited">
            Changing a courier's rates creates a new card and retires the old one. A parcel
            already shipped keeps the price it was actually costed at, however many times the
            tariff changes afterwards. Rates are set by an administrator.
          </Alert>
          {rates.isError ? (
            <ErrorState title="Rates could not be loaded" onRetry={() => void rates.refetch()} />
          ) : !rates.data?.length ? (
            <EmptyState
              title="No courier has a rate card"
              message="A courier cannot carry a parcel until someone publishes its tariff — dispatch refuses rather than guessing a price."
            />
          ) : (
            rates.data.map((card) => (
              <Panel key={card.id} title={card.courierName}>
                <Text variant="caption">In force from {formatDate(card.effectiveFrom)}</Text>
                <table className="w-full text-sm">
                  {/* responsive-table-reviewed: two columns. A label/value pair is what card mode would turn it into, so it is already that. */}
                  <caption className="sr-only">{card.courierName} rate bands</caption>
                  <thead>
                    <tr className="border-b border-rule text-left">
                      <th className="py-1.5 font-medium text-ink-2">Up to and including</th>
                      <th className="py-1.5 text-right font-medium text-ink-2">Costs us</th>
                    </tr>
                  </thead>
                  <tbody>
                    {card.bands.map((b) => (
                      <tr key={b.maxWeightGrams} className="border-b border-rule-subtle">
                        <td className="py-1.5 tabular-nums">{formatWeight(b.maxWeightGrams)}</td>
                        <td className="cell-numeric py-1.5">
                          <Money amount={toTaka(b.costMinor)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            ))
          )}
        </>
      )}

      {list && list.meta.total > 25 && (
        <Row justify="between">
          <Text variant="caption">{list.meta.total} rows</Text>
          <Pagination
            page={page}
            pageSize={25}
            total={list.meta.total}
            onPageChange={(p) => setParam('page', p <= 1 ? null : String(p))}
          />
        </Row>
      )}

      <DispatchDialog
        key={dispatching?.orderId ?? 'idle'}
        order={dispatching}
        onClose={() => setDispatching(null)}
      />
    </Page>
  );
}
