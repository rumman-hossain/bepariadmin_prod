import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, Page, Panel, Row } from '@/src/components/layout/primitives';
import { DataTable, Money, Text, StatusBadge, EmptyValue, Pagination, formatDate } from '@/src/components/data';
import type { Column } from '@/src/components/data';
import { EmptyState, ErrorState, SkeletonPage, Alert } from '@/src/components/feedback';
import { Button, SegmentedControl } from '@/src/components/controls';
import { hasRole, ADMIN_WRITE } from '@/src/auth/roles';
import { useAuth } from '@/src/hooks/useAuth';
import { usePurchaseOrders, useUpdatePurchaseOrder } from '../hooks/useManufacturing';
import { NEXT_STATUS, type PurchaseOrder, type Status } from '../api/manufacturingApi';

type PORow = Record<string, unknown> & PurchaseOrder;

const FILTERS = ['', 'pending', 'in_production', 'ready', 'dispatched'] as const;

const label = (s: string) => s.replace(/_/g, ' ');

/**
 * Manufacturing — purchase orders placed with suppliers for production.
 *
 * **The pipeline only runs forwards**: pending → in production → ready →
 * dispatched. These statuses describe physical reality — goods are either being
 * made or they are not, and they have either left the factory or they have not.
 * The screen offers exactly one next step per row, and the server refuses
 * anything else.
 *
 * There is no cancel. The database's status list does not include one, and
 * recording a cancellation properly needs a decision about goods already in
 * production — so it is absent rather than approximated with a status that
 * means something else.
 */
export function ManufacturingPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('status') ?? '';
  const status = (FILTERS as readonly string[]).includes(raw) ? raw : '';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const { user } = useAuth();
  const canWrite = hasRole(user?.role, ADMIN_WRITE);

  const orders = usePurchaseOrders(status, page);
  const update = useUpdatePurchaseOrder();
  const [failure, setFailure] = useState<string | null>(null);

  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(params);
    if (v === null) p.delete(k);
    else p.set(k, v);
    if (k === 'status') p.delete('page');
    setParams(p, { replace: true });
  };

  const advance = (po: PurchaseOrder, next: Status) => {
    setFailure(null);
    update.mutate(
      { id: po.id, status: next },
      {
        onError: (err) =>
          setFailure(err instanceof Error ? err.message : 'The order could not be updated'),
      },
    );
  };

  const columns: Column<PORow>[] = [
    {
      key: 'wholesalerName',
      header: 'Supplier',
      render: (po) => (
        <div>
          <Text>{po.wholesalerName}</Text>
          {po.productName ? (
            <Text variant="caption">{po.productName}</Text>
          ) : (
            // A purchase order need not name a product — product_id is
            // nullable, for a run against a spec rather than a catalogue item.
            <Text variant="caption">No product named</Text>
          )}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'right',
      sortBy: (po) => po.quantity,
      render: (po) => <span className="tabular-nums">{po.quantity.toLocaleString('en-IN')}</span>,
    },
    {
      key: 'unitCost',
      header: 'Unit cost',
      align: 'right',
      sortBy: (po) => po.unitCost,
      render: (po) => <Money amount={po.unitCost} />,
    },
    {
      key: 'totalCost',
      header: 'Total',
      align: 'right',
      sortBy: (po) => po.totalCost,
      // Computed by Postgres as a GENERATED column, never here. The screen
      // renders it; multiplying quantity by unit cost in a component would be
      // a second definition of the same figure.
      render: (po) => <Money amount={po.totalCost} />,
    },
    { key: 'status', header: 'Status', render: (po) => <StatusBadge status={po.status} /> },
    {
      key: 'expectedDate',
      header: 'Expected',
      render: (po) =>
        po.expectedDate ? (
          <Text as="span" variant="secondary">
            <time dateTime={po.expectedDate}>{formatDate(po.expectedDate)}</time>
          </Text>
        ) : (
          <EmptyValue />
        ),
    },
    {
      key: 'action',
      header: '',
      render: (po) => {
        if (!canWrite) return null;
        const next = NEXT_STATUS[po.status as Status];
        // A dispatched order is finished. No control, rather than a disabled
        // one — there is no next step to disable.
        if (!next) return null;
        return (
          <Button
            variant="ghost"
            size="sm"
            disabled={update.isPending}
            onClick={() => advance(po, next)}
          >
            Mark {label(next)}
          </Button>
        );
      },
    },
  ];

  if (orders.isPending) return <SkeletonPage shape="list" />;

  return (
    <Page>
      <PageHeader
        title="Manufacturing"
        subtitle="Purchase orders in production"
        actions={
          <SegmentedControl
            label="Stage"
            value={status}
            onChange={(v) => setParam('status', v || null)}
            options={[
              { value: '', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'in_production', label: 'In production' },
              { value: 'ready', label: 'Ready' },
              { value: 'dispatched', label: 'Dispatched' },
            ]}
          />
        }
      />

      {failure && (
        <Alert tone="warn" title="Not updated">
          {failure}
        </Alert>
      )}

      <Panel flush>
        {orders.isError ? (
          <ErrorState title="Purchase orders could not be loaded" onRetry={() => void orders.refetch()} />
        ) : !orders.data?.data.length ? (
          <EmptyState
            title={status ? `Nothing at the ${label(status)} stage` : 'No purchase orders'}
            message={
              status
                ? 'Orders appear here as they reach this stage.'
                : 'Placing a purchase order was impossible until now — the create route wrote an invalid value into a required column and failed on every attempt. It works; nothing has used it yet.'
            }
          />
        ) : (
          <DataTable<PORow>
            data={orders.data.data as PORow[]}
            columns={columns}
            rowKey={(po) => po.id}
            caption="Purchase orders"
          />
        )}
      </Panel>

      {orders.data && orders.data.meta.total > 25 && (
        <Row justify="between">
          <Text variant="caption">{orders.data.meta.total} orders</Text>
          <Pagination
            page={page}
            pageSize={25}
            total={orders.data.meta.total}
            onPageChange={(p) => setParam('page', p <= 1 ? null : String(p))}
          />
        </Row>
      )}
    </Page>
  );
}
