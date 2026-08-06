import { useState } from 'react';
import { Dialog, Alert } from '@/src/components/feedback';
import { Button, Input, Textarea, SegmentedControl } from '@/src/components/controls';
import { Row } from '@/src/components/layout/primitives';
import { useAdjustPoints } from '../hooks/useRewards';
import type { RetailerBalance } from '../api/rewardsApi';

interface Props {
  /** null when closed. Carrying the whole row means the dialog can name who it is about. */
  retailer: (RetailerBalance & Record<string, unknown>) | null;
  onClose: () => void;
}

/**
 * Adds or removes points by hand.
 *
 * The only place a person sets a balance directly, and therefore the only place
 * a balance can become wrong in a way nobody can reconstruct. The reason is
 * required — by a database CHECK constraint, not by this form's politeness —
 * and it is stored on the ledger row alongside who did it.
 *
 * A deduction larger than the balance is refused by the server, on the write
 * itself, and the refusal is shown verbatim rather than replaced with something
 * generic: "would take the balance below zero" is a fact the operator can act
 * on.
 */
export function AdjustDialog({ retailer, onClose }: Props) {
  /*
   * No effect resets these. The parent gives this component a `key` of the
   * retailer's id, so opening it for someone else REMOUNTS it and every field
   * starts empty by construction. Resetting in an effect would run a render
   * with the previous retailer's half-typed values still on screen — and on a
   * form that changes someone's balance, showing one person's numbers under
   * another person's name is not a cosmetic problem.
   */
  const [direction, setDirection] = useState<'add' | 'deduct'>('add');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const adjust = useAdjustPoints();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!retailer) return;
    setFailure(null);

    if (!/^\d+$/.test(amount.trim())) {
      return setFailure('Enter a whole number of points');
    }
    const magnitude = Number(amount.trim());
    if (magnitude <= 0) return setFailure('Enter a number of points above zero');
    if (note.trim().length < 3) return setFailure('A reason is required, and it is kept on the record');

    adjust.mutate(
      {
        retailerId: retailer.retailerId,
        // Direction and magnitude are combined into one signed number here, and
        // the API takes only that. Two fields could disagree with each other;
        // one cannot.
        points: direction === 'deduct' ? -magnitude : magnitude,
        note: note.trim(),
      },
      {
        onSuccess: onClose,
        onError: (err) =>
          setFailure(err instanceof Error ? err.message : 'The adjustment could not be applied'),
      },
    );
  };

  return (
    <Dialog
      open={retailer !== null}
      onClose={onClose}
      title="Adjust points"
      subtitle={retailer ? `${retailer.shopName} — ${retailer.balance.toLocaleString('en-IN')} points` : undefined}
      size="md"
      footer={
        <Row justify="end" gap="sm">
          <Button variant="ghost" onClick={onClose} disabled={adjust.isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="adjust-points" loading={adjust.isPending}>
            Apply adjustment
          </Button>
        </Row>
      }
    >
      <form id="adjust-points" onSubmit={submit} className="space-y-4">
        {failure && (
          <Alert tone="bad" title="Not applied">
            {failure}
          </Alert>
        )}

        <SegmentedControl<'add' | 'deduct'>
          label="Direction"
          value={direction}
          onChange={setDirection}
          options={[
            { value: 'add', label: 'Add points' },
            { value: 'deduct', label: 'Deduct points' },
          ]}
        />

        <Input
          label="Points"
          inputMode="numeric"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          fullWidth
        />

        <Textarea
          label="Reason"
          placeholder="Why this adjustment is being made"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          hint="Kept on the ledger with your name against it"
          required
        />

        {direction === 'add' && (
          <p className="text-xs text-ink-3">
            Added points count towards lifetime earnings, so this may move the retailer up a
            tier. Deducted points never reduce lifetime earnings, so a deduction cannot move
            anyone down.
          </p>
        )}
      </form>
    </Dialog>
  );
}
