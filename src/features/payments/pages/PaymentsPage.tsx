import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { PageHeader, Page, Panel, Row } from '@/src/components/layout/primitives';
import {
  DataTable,
  Identifier,
  Money,
  StatusBadge,
  Text,
  formatDateTime,
  EmptyValue,
} from '@/src/components/data';
import type { Column } from '@/src/components/data';
import { EmptyState, ErrorState, SkeletonPage, Alert } from '@/src/components/feedback';
import { Pagination } from '@/src/components/data';
import { listPayments, type PaymentRecord } from '../api/paymentsApi';
import { PendingSettlements } from './PendingSettlements';

const PAGE_SIZE = 25;

type PaymentRow = Record<string, unknown> & PaymentRecord;

const columns: Column<PaymentRow>[] = [
  { key: 'id', header: 'Payment', render: (p) => <Identifier value={p.id} /> },
  { key: 'orderId', header: 'Order', render: (p) => <Identifier value={p.orderId} /> },
  { key: 'retailerId', header: 'Retailer', render: (p) => <Identifier value={p.retailerId} /> },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    sortBy: (p) => p.amount,
    // A server field, rendered. No commission or net column exists, because no
    // such field exists — see the banner below and F-18.
    render: (p) => <Money amount={p.amount} />,
  },
  { key: 'provider', header: 'Provider', sortBy: (p) => p.provider, render: (p) => <Text>{p.provider}</Text> },
  {
    key: 'transactionId',
    header: 'Reference',
    // `omitempty` server-side — absent, not blank.
    render: (p) => (p.transactionId ? <Identifier value={p.transactionId} /> : <EmptyValue />),
  },
  {
    key: 'status',
    header: 'Status',
    sortBy: (p) => p.status,
    render: (p) => <StatusBadge status={p.status} />,
  },
  {
    key: 'createdAt',
    header: 'Received',
    sortBy: (p) => p.createdAt,
    render: (p) => (
      <Text as="span" variant="secondary">
        <time dateTime={p.createdAt}>{formatDateTime(p.createdAt)}</time>
      </Text>
    ),
  },
];

/**
 * Payments — money received.
 *
 * **What is here is real.** `GET /payments/records` is admin-gated, paginated
 * server-side and returns live rows.
 *
 * **What each supplier is owed is now computed by the server** and shown above
 * the ledger, from commission rates captured on each order line at the time of
 * sale. That figure is a field, never an expression on this side.
 *
 * **Paying them is still not available**, and the distinction matters.
 * `POST /payments/settle` accepts the payout amount *from its caller* and
 * validates only that it is positive, so a Settle button here would send a
 * number the client chose — the defect that made the prototype's Payments and
 * Accounting screens disagree about money, promoted into the API contract. The
 * route also has no idempotency key (a double-click pays twice) and is gated on
 * `AdminOnly` rather than finance, so whoever onboards a supplier can also pay
 * them.
 *
 * Settling becomes available when that route takes an order id instead of an
 * amount. See F-18.
 */
export function PaymentsPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ['payments', 'list', page, PAGE_SIZE],
    queryFn: () => listPayments(page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  const rows = useMemo<PaymentRow[]>(() => (data?.data ?? []) as PaymentRow[], [data]);
  const total = data?.total ?? 0;

  const goToPage = (next: number) => {
    const p = new URLSearchParams(params);
    if (next <= 1) p.delete('page');
    else p.set('page', String(next));
    setParams(p, { replace: true });
  };

  if (isPending) return <SkeletonPage shape="list" />;
  if (isError) {
    return <ErrorState title="Payments could not be loaded" onRetry={() => void refetch()} />;
  }

  return (
    <Page>
      <PageHeader title="Payments" subtitle="Money received from retailers" />

      <PendingSettlements />

      <Alert tone="warn" title="Settling is not available here yet">
        What each supplier is owed is now computed by the server, above. Paying them is not:
        the settle endpoint still accepts the payout amount from whoever calls it, so a button
        here would have to send a figure the client chose. It becomes available once that
        route takes an order id rather than an amount.
      </Alert>

      <Panel flush>
        {rows.length === 0 ? (
          <EmptyState
            title="No payments yet"
            message="Payments appear here once retailers start paying for orders."
          />
        ) : (
          <DataTable<PaymentRow>
            data={rows}
            columns={columns}
            rowKey={(p) => p.id}
            caption={`Payments — page ${page} of ${Math.max(1, Math.ceil(total / PAGE_SIZE))}`}
          />
        )}
      </Panel>

      {total > PAGE_SIZE && (
        <Row justify="between">
          <Text variant="caption">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </Text>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={goToPage}
            disabled={isFetching}
          />
        </Row>
      )}
    </Page>
  );
}
