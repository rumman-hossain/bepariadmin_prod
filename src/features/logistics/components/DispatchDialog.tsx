import { useState } from 'react';
import { Dialog, Alert } from '@/src/components/feedback';
import { Button, Input, Select } from '@/src/components/controls';
import { Row } from '@/src/components/layout/primitives';
import { useCouriers, useDispatch } from '../hooks/useLogistics';
import type { QueuedOrder } from '../api/logisticsApi';

interface Props {
  /** null when closed. Carrying the row means the dialog can name the parcel. */
  order: (QueuedOrder & Record<string, unknown>) | null;
  onClose: () => void;
}

/**
 * Hands a parcel to a courier.
 *
 * The price is NOT entered here. It is resolved on the server from the courier's
 * rate card in force, by weight, and stored on the shipment. Letting an operator
 * type a cost would put a second definition of the tariff on the busiest screen
 * in the building.
 *
 * The weight IS entered, because nothing upstream knows it — products carry no
 * weight, so the person holding the parcel is the only source. If product
 * weights are ever recorded, the queue can propose one.
 */
export function DispatchDialog({ order, onClose }: Props) {
  /*
   * No effect resets these: the parent keys this component on the order id, so
   * opening it for a different parcel remounts it. Resetting in an effect would
   * render one parcel's weight under another parcel's address, on a screen where
   * that decides what a courier is paid.
   */
  const [courierId, setCourierId] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [weight, setWeight] = useState('');
  const [failure, setFailure] = useState<string | null>(null);

  const couriers = useCouriers();
  const dispatch = useDispatch();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setFailure(null);

    if (!courierId) return setFailure('Choose a courier');
    if (!/^\d+$/.test(weight.trim())) return setFailure('Enter the weight in whole grams');
    const grams = Number(weight.trim());
    if (grams <= 0) return setFailure('A parcel has to weigh something');

    dispatch.mutate(
      { orderId: order.orderId, courierId, trackingId: trackingId.trim(), weightGrams: grams },
      {
        onSuccess: onClose,
        onError: (err) =>
          setFailure(err instanceof Error ? err.message : 'The parcel could not be dispatched'),
      },
    );
  };

  const active = couriers.data?.filter((c) => c.active) ?? [];

  return (
    <Dialog
      open={order !== null}
      onClose={onClose}
      title="Dispatch parcel"
      subtitle={order ? `${order.retailerName} — ${order.address}` : undefined}
      size="md"
      footer={
        <Row justify="end" gap="sm">
          <Button variant="ghost" onClick={onClose} disabled={dispatch.isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="dispatch-form" loading={dispatch.isPending}>
            Hand to courier
          </Button>
        </Row>
      }
    >
      <form id="dispatch-form" onSubmit={submit} className="space-y-4">
        {failure && (
          <Alert tone="bad" title="Not dispatched">
            {failure}
          </Alert>
        )}

        {couriers.data && active.length === 0 && (
          <Alert tone="warn" title="No courier is available">
            Every courier is retired, or none has been added. An administrator adds couriers and
            publishes their rates.
          </Alert>
        )}

        <Select
          label="Courier"
          placeholder="Choose one"
          options={active.map((c) => ({ value: c.id, label: c.name }))}
          value={courierId}
          onChange={(e) => setCourierId(e.target.value)}
          required
        />

        <Input
          label="Weight (grams)"
          inputMode="numeric"
          placeholder="0"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          hint="Grams. The cost comes from this courier's rate card — it is not typed here."
          required
          fullWidth
        />

        <Input
          label="Tracking number"
          placeholder="Optional"
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          hint="Written onto the order, so it shows wherever the order does"
          fullWidth
        />

        <p className="text-xs text-ink-3">
          Dispatching moves the order to <strong>dispatched</strong> and records who did it.
          A parcel can only be dispatched once.
        </p>
      </form>
    </Dialog>
  );
}
