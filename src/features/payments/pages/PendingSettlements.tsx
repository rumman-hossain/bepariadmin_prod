import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Panel } from '@/src/components/layout/primitives';
import { DataTable, Identifier, Money, Text, EmptyValue, formatDate } from '@/src/components/data';
import type { Column } from '@/src/components/data';
import { EmptyState, ErrorState, Alert, ConfirmDialog } from '@/src/components/feedback';
import { Button } from '@/src/components/controls';
import { useAuth } from '@/src/hooks/useAuth';
import { hasRole, FINANCE } from '@/src/auth/roles';
import {
  listPendingSettlements,
  settleOrder,
  toTaka,
  type PendingSettlement,
} from '../api/paymentsApi';

type Row = Record<string, unknown> & PendingSettlement;

function buildColumns(
  onSettle: (row: Row) => void,
  canSettle: boolean,
): Column<Row>[] {
  const cols: Column<Row>[] = [
  { key: 'orderId', header: 'Order', render: (r) => <Identifier value={r.orderId} /> },
  { key: 'wholesalerId', header: 'Supplier', render: (r) => <Identifier value={r.wholesalerId} /> },
  {
    key: 'deliveredAt',
    header: 'Delivered',
    sortBy: (r) => r.deliveredAt,
    render: (r) => (
      <Text as="span" variant="secondary">
        <time dateTime={r.deliveredAt}>{formatDate(r.deliveredAt)}</time>
      </Text>
    ),
  },
  {
    key: 'grossMinor',
    header: 'Gross',
    align: 'right',
    sortBy: (r) => r.grossMinor,
    render: (r) => <Money amount={toTaka(r.grossMinor)} />,
  },
  {
    key: 'commissionMinor',
    header: 'Commission',
    align: 'right',
    sortBy: (r) => r.commissionMinor,
    /*
     * Absent, not zero, when the order predates commission capture. A zero here
     * would state that the platform took nothing, which is a different claim
     * from "we did not record what was taken".
     */
    render: (r) =>
      r.termsMissing ? <EmptyValue /> : <Money amount={toTaka(r.commissionMinor)} />,
  },
  {
    key: 'supplierNetMinor',
    header: 'Supplier net',
    align: 'right',
    sortBy: (r) => r.supplierNetMinor,
    render: (r) =>
      r.termsMissing ? <EmptyValue /> : <Money amount={toTaka(r.supplierNetMinor)} />,
  },
    {
      key: 'termsMissing',
      header: '',
      render: (r) =>
        r.termsMissing ? (
          <Text as="span" variant="caption" className="text-warn">
            Terms not recorded
          </Text>
        ) : null,
    },
  ];

  // Hidden entirely for anyone who cannot settle. A disabled button with no
  // explanation reads as a broken product; an absent one reads as "not your job".
  if (canSettle) {
    cols.push({
      key: 'action',
      header: '',
      render: (r) =>
        r.termsMissing ? null : (
          <Button variant="primary" size="sm" onClick={() => onSettle(r)}>
            Settle
          </Button>
        ),
    });
  }
  return cols;
}

/**
 * Delivered orders that have not been settled, with the supplier net computed
 * by the server.
 *
 * Read-only, deliberately. There is no Settle action because `POST /settle`
 * still accepts the payout amount from whoever calls it and validates only that
 * it is positive — so a button here would have to send a figure the client
 * chose. Settling becomes possible once that route takes an order id instead of
 * an amount, and carries an idempotency key and a finance gate.
 *
 * Orders whose commission was never captured are listed with their money
 * columns blank rather than zeroed, and flagged. Omitting them would hide money
 * that is owed; showing zero would assert that none is.
 */
export function PendingSettlements() {
  const { user } = useAuth();
  // Mirrors the server's FinanceOnly middleware: super_admin and finance, not
  // admin. The API is the control; this only decides what to render.
  const canSettle = hasRole(user?.role, FINANCE);

  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<Row | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['payments', 'settlements', 'pending'],
    queryFn: () => listPendingSettlements(),
  });

  const settle = useMutation({
    mutationFn: (orderId: string) => settleOrder(orderId),
    onSuccess: () => {
      setConfirming(null);
      setFailure(null);
      void qc.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (err) => {
      // The dialog stays open carrying the server's reason — "already settled",
      // "not delivered", "predates commission capture". Each is a fact the
      // operator can act on, so it is shown rather than replaced with a generic
      // failure.
      setFailure(err instanceof Error ? err.message : 'The settlement could not be completed');
    },
  });

  if (isError) {
    return (
      <ErrorState
        title="Pending settlements could not be loaded"
        onRetry={() => void refetch()}
      />
    );
  }

  const rows = (data ?? []) as Row[];
  const missing = rows.filter((r) => r.termsMissing).length;
  const columns = buildColumns((row) => {
    setFailure(null);
    setConfirming(row);
  }, canSettle);

  return (
    <>
      {missing > 0 && (
        <Alert tone="warn" title={`${missing} order${missing === 1 ? '' : 's'} cannot be settled automatically`}>
          These were placed before the platform recorded what commission applied, so what the
          supplier is owed cannot be computed. Their figures are left blank rather than shown
          as zero, and they carry no Settle action. Settling them needs a decision about which
          rate applies to historical orders.
        </Alert>
      )}

      <Panel title="Awaiting settlement" flush>
        {isPending ? (
          <div className="h-32" aria-busy="true" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nothing awaiting settlement"
            message="Delivered orders appear here until a supplier has been paid for them."
          />
        ) : (
          <DataTable<Row>
            data={rows}
            columns={columns}
            rowKey={(r) => r.orderId}
            caption="Delivered orders not yet settled"
          />
        )}
      </Panel>

      <ConfirmDialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        onConfirm={() => confirming && settle.mutate(confirming.orderId)}
        title="Pay this supplier?"
        tone="default"
        confirmLabel="Settle"
        loading={settle.isPending}
        message={
          confirming && (
            <span className="block space-y-2">
              <span className="block">
                Order <strong>{confirming.orderId}</strong> — the supplier receives{' '}
                <strong>
                  <Money amount={toTaka(confirming.supplierNetMinor)} />
                </strong>
                , after <Money amount={toTaka(confirming.commissionMinor)} /> commission on{' '}
                <Money amount={toTaka(confirming.grossMinor)} />.
              </span>
              <span className="block text-ink-3">
                These figures come from the commission recorded when the order was placed. This
                cannot be undone from the console.
              </span>
              {failure && (
                <span className="block text-bad">{failure}</span>
              )}
            </span>
          )
        }
      />
    </>
  );
}
