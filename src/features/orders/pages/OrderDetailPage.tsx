import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Page, PageHeader, Section, Columns, Stack, Panel } from '@/src/components/layout/primitives';
import {
  DataTable,
  DescriptionList,
  Money,
  Identifier,
  Badge,
  Timeline,
  Text,
  formatDate,
  type Column,
} from '@/src/components/data';
import { Select } from '@/src/components/controls';
import { Alert, ErrorState, SkeletonPage, ConfirmDialog } from '@/src/components/feedback';
import { useOrderQuery, useUpdateOrderStatus } from '../hooks/useOrders';
import { statusMeta, allowedTransitions, isTerminal, orderHistory } from '../orderStatus';
import type { OrderItem } from '../types';

const ITEM_COLUMNS: Column<OrderItem>[] = [
  {
    key: 'product',
    header: 'Product',
    render: (i) => (
      <Stack gap="none">
        <Text variant="strong">{i.productName}</Text>
        {i.variationName ? <Text variant="caption">{i.variationName}</Text> : null}
      </Stack>
    ),
  },
  { key: 'sku', header: 'Product ID', width: 'w-32', render: (i) => <Identifier value={i.productId} truncate={10} /> },
  { key: 'qty', header: 'Qty', align: 'right', width: 'w-20', render: (i) => i.quantity },
  /*
   * Paisa shown, deliberately, and only here.
   *
   * These two columns sit beside a quantity, so the operator reads them as an
   * equation: qty x unit should equal subtotal. Rounded to whole taka, a unit
   * price of 4,821.50 renders as 4,822 and 100 of them appear to make 482,200
   * against a stated subtotal of 482,150 — arithmetic that visibly does not
   * work, on the screen where a supplier dispute gets settled. The list
   * screen's Total column stays whole because nothing there is checked against
   * anything.
   */
  { key: 'unit', header: 'Unit price', align: 'right', width: 'w-32', render: (i) => <Money amount={i.unitPrice} decimals /> },
  { key: 'subtotal', header: 'Subtotal', align: 'right', width: 'w-36', render: (i) => <Money amount={i.subtotal} decimals /> },
];

/** A shipping address arrives as free-form JSON; render what is legible. */
function addressLines(address: unknown): string | null {
  if (!address || typeof address !== 'object') return null;
  const parts = ['line1', 'line2', 'area', 'district', 'city', 'postcode']
    .map((k) => (address as Record<string, unknown>)[k])
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '');
  return parts.length ? parts.join(', ') : null;
}

/**
 * One order, in full.
 *
 * The status control is the only thing on the page that writes, and it is
 * deliberately narrow: it offers exactly the transitions the backend accepts
 * from the current state, and confirms before sending, because moving an order
 * to `cancelled` releases committed stock and cannot be undone from here.
 */
export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, isError, refetch } = useOrderQuery(id);
  const transition = useUpdateOrderStatus();

  /*
   * One piece of state for the whole write flow, not three.
   *
   * `pending` is the status awaiting confirmation; `null` means no dialog. The
   * obvious alternative — a `dialogOpen` boolean beside a `chosenStatus` string
   * — admits `open: true, status: null`, which renders a confirm dialog asking
   * the operator to approve nothing.
   */
  const [pending, setPending] = useState<string | null>(null);

  if (isLoading) return <SkeletonPage shape="detail" />;

  if (isError || !order) {
    return (
      <Page>
        <ErrorState
          title="Order could not be loaded"
          message="It may have been removed, or the order service is unavailable."
          onRetry={() => void refetch()}
        />
      </Page>
    );
  }

  const meta = statusMeta(order.status);
  const transitions = allowedTransitions(order.status);
  const address = addressLines(order.shippingAddress);

  const confirm = () => {
    if (!pending || !id) return;
    transition.mutate(
      { id, status: pending },
      { onSettled: () => setPending(null) },
    );
  };

  return (
    <Page>
      <PageHeader
        title={`Order ${order.id.slice(0, 8)}`}
        subtitle={meta.meaning}
        onBack={() => void navigate('/orders')}
        actions={
          isTerminal(order.status) ? (
            <Badge tone={meta.tone}>{meta.label}</Badge>
          ) : (
            <Select
              label="Move to"
              hideLabel
              value=""
              disabled={transition.isPending}
              onChange={(e) => setPending(e.target.value || null)}
              options={[
                { value: '', label: `${meta.label} — move to…` },
                ...transitions.map((s) => ({ value: s, label: statusMeta(s).label })),
              ]}
            />
          )
        }
      />

      {transition.isError ? (
        <Alert tone="bad" title="The status was not changed">
          The order service rejected the change. It is still {meta.label.toLowerCase()}.
        </Alert>
      ) : null}

      <Columns
        aside={
          <Stack gap="lg">
            <Panel title="Payment">
              <DescriptionList
                items={[
                  { label: 'Subtotal', value: <Money amount={order.totalAmount} decimals /> },
                  {
                    label: 'Discount',
                    value: order.discountAmount ? <Money amount={-order.discountAmount} decimals signed /> : undefined,
                    emptyReason: 'No discount applied',
                  },
                  { label: 'Total', value: <Money amount={order.finalAmount} decimals /> },
                  { label: 'Method', value: order.paymentMethod },
                ]}
                layout="inline"
              />
            </Panel>

            <Panel title="Delivery">
              <DescriptionList
                items={[
                  { label: 'Address', value: address, emptyReason: 'No address on the order', wide: true },
                  { label: 'Courier', value: order.shippingMedium },
                  {
                    label: 'Tracking',
                    value: order.trackingId ? <Identifier value={order.trackingId} /> : undefined,
                    emptyReason: 'Not yet dispatched',
                  },
                  {
                    label: 'Estimated',
                    value: order.estimatedDelivery
                      ? formatDate(order.estimatedDelivery)
                      : undefined,
                    emptyReason: 'No estimate given',
                  },
                ]}
                layout="inline"
              />
            </Panel>

            <Panel title="Parties">
              <DescriptionList
                items={[
                  { label: 'Retailer', value: <Identifier value={order.retailerId} /> },
                  {
                    label: 'Supplier',
                    value: order.wholesalerId ? <Identifier value={order.wholesalerId} /> : undefined,
                    emptyReason: 'Not assigned to a supplier',
                  },
                ]}
                layout="inline"
              />
            </Panel>
          </Stack>
        }
      >
        <Stack gap="lg">
          <Section title="Items" description={`${order.items?.length ?? 0} line items`}>
            <DataTable
              columns={ITEM_COLUMNS}
              data={order.items ?? []}
              rowKey={(i) => `${i.productId}:${i.variationId ?? ''}`}
              caption="Line items on this order"
              density="compact"
              empty={<Text variant="caption">No line items were recorded.</Text>}
            />
          </Section>

          <Section title="History">
            <Timeline events={orderHistory(order)} />
          </Section>
        </Stack>

      </Columns>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={confirm}
        tone={pending === 'cancelled' ? 'danger' : 'default'}
        title={pending ? `Move to ${statusMeta(pending).label}?` : ''}
        confirmLabel={pending ? `Move to ${statusMeta(pending).label}` : 'Confirm'}
        loading={transition.isPending}
        message={
          pending === 'cancelled'
            ? 'Cancelling releases the committed stock and notifies the retailer. This cannot be undone from here.'
            : pending
              ? statusMeta(pending).meaning
              : ''
        }
      />
    </Page>
  );
}

export default OrderDetailPage;
