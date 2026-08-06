import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
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
import { EmptyState, ErrorState, SkeletonPage, Alert, ConfirmDialog } from '@/src/components/feedback';
import { Button, SegmentedControl } from '@/src/components/controls';
import { ExpenseDialog } from '../components/ExpenseDialog';
import { useSummary, useLedger, useExpenses, usePayExpense } from '../hooks/useAccounting';
import { toTaka, type LedgerEntry, type Expense } from '../api/accountingApi';

const TABS = ['overview', 'ledger', 'expenses', 'invoices'] as const;
type Tab = (typeof TABS)[number];

type LedgerRow = Record<string, unknown> & LedgerEntry;
type ExpenseRow = Record<string, unknown> & Expense;

/** Default window: this month to date. */
function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: first.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}

const ledgerColumns: Column<LedgerRow>[] = [
  {
    key: 'entryDate',
    header: 'Date',
    sortBy: (e) => e.entryDate,
    render: (e) => (
      <Text as="span" variant="secondary">
        <time dateTime={e.entryDate}>{formatDate(e.entryDate)}</time>
      </Text>
    ),
  },
  { key: 'description', header: 'Description', render: (e) => <Text>{e.description}</Text> },
  { key: 'category', header: 'Category', render: (e) => <StatusBadge status={e.category} /> },
  {
    key: 'sourceType',
    header: 'Source',
    // 'manual' means a person typed it. Anything else names the record that
    // caused it, so an automatic line can always be traced back.
    render: (e) => <Text variant="caption">{e.sourceType.replace(/_/g, ' ')}</Text>,
  },
  {
    key: 'in',
    header: 'In',
    align: 'right',
    render: (e) => (e.direction === 'in' ? <Money amount={toTaka(e.amountMinor)} /> : <EmptyValue />),
  },
  {
    key: 'out',
    header: 'Out',
    align: 'right',
    render: (e) =>
      e.direction === 'out' ? <Money amount={toTaka(e.amountMinor)} /> : <EmptyValue />,
  },
  {
    key: 'balanceAfterMinor',
    header: 'Balance',
    align: 'right',
    // The stored running balance, rendered. Not recomputed here — a balance
    // derived in the client is a second definition of the book.
    render: (e) => <Money amount={toTaka(e.balanceAfterMinor)} signed />,
  },
];

/**
 * Accounting — the cash book.
 *
 * Money in, money out, running balance. Not double-entry, by decision.
 *
 * **The ledger offers no edit and no delete, anywhere.** Not disabled — absent.
 * A disabled control invites someone to find a way round it; an absent one says
 * the operation does not exist. Corrections are posted as adjustments, which
 * are themselves part of the record.
 *
 * **No arithmetic on money in this file.** Opening, in, out and closing all come
 * from `/accounting/summary`, and the running balance is the stored value. Guard
 * G12 fails the build on money maths in a component, and that guard exists
 * because two screens once each derived "advance" their own way and disagreed.
 */
export function AccountingPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : 'overview';
  const range = useMemo(() => defaultRange(), []);
  const from = params.get('from') ?? range.from;
  const to = params.get('to') ?? range.to;
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const setParam = (key: string, value: string | null) => {
    const p = new URLSearchParams(params);
    if (value === null) p.delete(key);
    else p.set(key, value);
    if (key === 'tab') p.delete('page');
    setParams(p, { replace: true });
  };

  const summary = useSummary(from, to);
  const ledger = useLedger(from, to, page);
  const expenses = useExpenses('');
  const pay = usePayExpense();

  const [paying, setPaying] = useState<ExpenseRow | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  const expenseColumns: Column<ExpenseRow>[] = useMemo(
    () => [
      {
        key: 'incurredOn',
        header: 'Incurred',
        sortBy: (e) => e.incurredOn,
        render: (e) => (
          <Text as="span" variant="secondary">
            <time dateTime={e.incurredOn}>{formatDate(e.incurredOn)}</time>
          </Text>
        ),
      },
      { key: 'description', header: 'Description', render: (e) => <Text>{e.description}</Text> },
      { key: 'category', header: 'Category', render: (e) => <StatusBadge status={e.category} /> },
      {
        key: 'vendorName',
        header: 'Paid to',
        render: (e) => (e.vendorName ? <Text>{e.vendorName}</Text> : <EmptyValue />),
      },
      {
        key: 'amountMinor',
        header: 'Amount',
        align: 'right',
        sortBy: (e) => e.amountMinor,
        render: (e) => <Money amount={toTaka(e.amountMinor)} />,
      },
      { key: 'status', header: 'Status', render: (e) => <StatusBadge status={e.status} /> },
      {
        key: 'action',
        header: '',
        render: (e) =>
          e.status === 'pending' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setPayError(null);
                setPaying(e);
              }}
            >
              Mark paid
            </Button>
          ) : null,
      },
    ],
    [],
  );

  if (summary.isPending && ledger.isPending) return <SkeletonPage shape="dashboard" />;

  return (
    <Page>
      <PageHeader
        title="Accounting"
        subtitle={`Cash book · ${formatDate(from)} to ${formatDate(to)}`}
        actions={
          <Row gap="sm" wrap>
            {tab === 'expenses' && (
              <Button variant="primary" iconLeft={Plus} onClick={() => setRecording(true)}>
                Record expense
              </Button>
            )}
            <SegmentedControl<Tab>
              label="View"
              value={tab}
              onChange={(t) => setParam('tab', t)}
              options={[
                { value: 'overview', label: 'Overview' },
                { value: 'ledger', label: 'Ledger' },
                { value: 'expenses', label: 'Expenses' },
                { value: 'invoices', label: 'Invoices' },
              ]}
            />
          </Row>
        }
      />

      {tab === 'overview' &&
        (summary.isError ? (
          <ErrorState title="The summary could not be loaded" onRetry={() => void summary.refetch()} />
        ) : summary.data ? (
          <>
            <StatGrid
              items={[
                { label: 'Opening balance', value: <Money amount={toTaka(summary.data.openingMinor)} signed /> },
                { label: 'Money in', value: <Money amount={toTaka(summary.data.inMinor)} /> },
                { label: 'Money out', value: <Money amount={toTaka(summary.data.outMinor)} /> },
                {
                  label: 'Closing balance',
                  value: <Money amount={toTaka(summary.data.closingMinor)} size="display" signed />,
                },
              ]}
            />

            <Alert tone="info" title="Courier costs are not in this book yet">
              Nothing records what couriers were actually paid, so that line is absent rather
              than estimated. The prototype multiplied an order count by a fixed ৳120 and fed
              the result into net cash flow — a figure nobody paid.
            </Alert>

            <Panel title="By category">
              {summary.data.byCategory.length === 0 ? (
                <EmptyState
                  title="Nothing recorded in this period"
                  message="Entries appear here as expenses are paid and orders settle."
                />
              ) : (
                <table className="w-full text-sm">
                  {/* responsive-table-reviewed: three columns (Category · Direction · Total) of short values. Measured at 375px it renders 317px wide with every cell on one line, so card mode would only add height. */}
                  <caption className="sr-only">Totals by category</caption>
                  <thead>
                    <tr className="border-b border-rule text-left">
                      <th className="py-1.5 font-medium text-ink-2">Category</th>
                      <th className="py-1.5 font-medium text-ink-2">Direction</th>
                      <th className="py-1.5 text-right font-medium text-ink-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.data.byCategory.map((c) => (
                      <tr key={`${c.category}-${c.direction}`} className="border-b border-rule-subtle">
                        <td className="py-1.5">{c.category}</td>
                        <td className="py-1.5">{c.direction === 'in' ? 'In' : 'Out'}</td>
                        <td className="cell-numeric py-1.5">
                          <Money amount={toTaka(c.amountMinor)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </>
        ) : null)}

      {tab === 'ledger' && (
        <>
          <Alert tone="info" title="This book is append-only">
            Entries cannot be edited or deleted. A mistake is corrected by posting an
            adjustment, which appears in the ledger as its own entry — so the correction is
            part of the record rather than hiding what it replaced.
          </Alert>
          <Panel flush>
            {ledger.isError ? (
              <ErrorState title="The ledger could not be loaded" onRetry={() => void ledger.refetch()} />
            ) : !ledger.data || ledger.data.data.length === 0 ? (
              <EmptyState
                title="No entries in this period"
                message="The book fills as expenses are paid and orders settle."
              />
            ) : (
              <DataTable<LedgerRow>
                data={ledger.data.data as LedgerRow[]}
                columns={ledgerColumns}
                rowKey={(e) => e.id}
                caption={`Cash book — ${formatDate(from)} to ${formatDate(to)}`}
              />
            )}
          </Panel>
          {ledger.data && ledger.data.meta.total > 25 && (
            <Row justify="between">
              <Text variant="caption">{ledger.data.meta.total} entries</Text>
              <Pagination
                page={page}
                pageSize={25}
                total={ledger.data.meta.total}
                onPageChange={(p) => setParam('page', p <= 1 ? null : String(p))}
                disabled={ledger.isFetching}
              />
            </Row>
          )}
        </>
      )}

      {tab === 'expenses' && (
        <Panel flush>
          {expenses.isError ? (
            <ErrorState title="Expenses could not be loaded" onRetry={() => void expenses.refetch()} />
          ) : !expenses.data || expenses.data.data.length === 0 ? (
            <EmptyState
              title="No expenses recorded"
              message="Rent, salaries, marketing and courier bills are entered here."
              action={
                <Button variant="primary" iconLeft={Plus} onClick={() => setRecording(true)}>
                  Record expense
                </Button>
              }
            />
          ) : (
            <DataTable<ExpenseRow>
              data={expenses.data.data as ExpenseRow[]}
              columns={expenseColumns}
              rowKey={(e) => e.id}
              caption="Expenses"
            />
          )}
        </Panel>
      )}

      {tab === 'invoices' && (
        <Panel>
          <EmptyState
            variant="not-built"
            title="Invoices are not issued yet"
            message="The table and its numbering exist so that invoice numbers are gapless from the very first one — a sequence beginning partway through a business's life is not one an auditor accepts. Nothing issues invoices today."
          />
        </Panel>
      )}

      <ExpenseDialog open={recording} onClose={() => setRecording(false)} />

      <ConfirmDialog
        open={paying !== null}
        onClose={() => setPaying(null)}
        onConfirm={() =>
          paying &&
          pay.mutate(
            { id: paying.id, paidOn: new Date().toISOString().slice(0, 10) },
            {
              onSuccess: () => setPaying(null),
              onError: (e) =>
                setPayError(e instanceof Error ? e.message : 'Could not mark this expense paid'),
            },
          )
        }
        title="Mark this expense paid?"
        tone="default"
        confirmLabel="Mark paid"
        loading={pay.isPending}
        message={
          paying && (
            <span className="block space-y-2">
              <span className="block">
                <strong>{paying.description}</strong> — <Money amount={toTaka(paying.amountMinor)} />
              </span>
              <span className="block text-ink-3">
                This posts the amount to the cash book as money out. The entry cannot be edited
                or deleted afterwards; correcting it means posting an adjustment.
              </span>
              {payError && <span className="block text-bad">{payError}</span>}
            </span>
          )
        }
      />
    </Page>
  );
}
