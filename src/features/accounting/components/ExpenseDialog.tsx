import { useState } from 'react';
import { Dialog, Alert } from '@/src/components/feedback';
import { Button, Input, Select, Textarea } from '@/src/components/controls';
import { Row } from '@/src/components/layout/primitives';
import { parseTakaToPaisa } from '../api/accountingApi';
import { useCreateExpense } from '../hooks/useAccounting';

/*
 * These two lists mirror the CHECK constraints on accounting.expenses in
 * migration 000086. They are the labels for a set the database owns — if the
 * select and the constraint ever disagree, the database wins and the operator
 * sees a 422, rather than the value being silently accepted.
 */
const CATEGORIES = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' },
  { value: 'salary', label: 'Salary' },
  { value: 'rent', label: 'Rent' },
  { value: 'software', label: 'Software' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'office', label: 'Office' },
  { value: 'other', label: 'Other' },
];

const METHODS = [
  { value: 'bank', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'mobile', label: 'Mobile money' },
  { value: 'card', label: 'Card' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Records an expense.
 *
 * Recording is not paying. This writes a `pending` row and nothing reaches the
 * cash book — the money moves when someone marks it paid, which is a separate,
 * confirmed action. Keeping the two apart is what lets a bill be entered when
 * it arrives rather than when it clears.
 */
export function ExpenseDialog({ open, onClose }: Props) {
  const [category, setCategory] = useState('');
  const [method, setMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [incurredOn, setIncurredOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const create = useCreateExpense();

  const reset = () => {
    setCategory('');
    setMethod('');
    setAmount('');
    setIncurredOn(new Date().toISOString().slice(0, 10));
    setDescription('');
    setVendorName('');
    setAmountError(null);
    setFailure(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFailure(null);

    const amountMinor = parseTakaToPaisa(amount);
    if (amountMinor === null || amountMinor === 0) {
      setAmountError('Enter an amount in taka, with at most two decimal places');
      return;
    }
    setAmountError(null);

    create.mutate(
      {
        category,
        method,
        amountMinor,
        incurredOn,
        description: description.trim(),
        vendorName: vendorName.trim() || undefined,
      },
      {
        onSuccess: close,
        onError: (err) =>
          setFailure(err instanceof Error ? err.message : 'The expense could not be recorded'),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Record expense"
      subtitle="Entered as pending. Nothing posts to the cash book until it is marked paid."
      size="md"
      footer={
        <Row justify="end" gap="sm">
          <Button variant="ghost" onClick={close} disabled={create.isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="expense-form" loading={create.isPending}>
            Record expense
          </Button>
        </Row>
      }
    >
      <form id="expense-form" onSubmit={submit} className="space-y-4">
        {failure && (
          <Alert tone="bad" title="Not recorded">
            {failure}
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Category"
            placeholder="Choose one"
            options={CATEGORIES}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          />
          <Select
            label="Paid by"
            placeholder="Choose one"
            options={METHODS}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Amount (৳)"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (amountError) setAmountError(null);
            }}
            error={amountError ?? undefined}
            required
          />
          <Input
            label="Date incurred"
            type="date"
            value={incurredOn}
            onChange={(e) => setIncurredOn(e.target.value)}
            // The date the cost arose, which is not the date it is paid. An
            // invoice dated last month belongs in last month's figures.
            hint="When the cost arose, not when it clears"
            required
          />
        </div>

        <Input
          label="Paid to"
          placeholder="Optional"
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
          hint="The vendor, landlord or employee, if there is one"
          fullWidth
        />

        <Textarea
          label="Description"
          placeholder="What this expense was for"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          required
        />
      </form>
    </Dialog>
  );
}
