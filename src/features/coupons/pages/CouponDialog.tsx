import { useState } from 'react';
import { Dialog, Alert } from '@/src/components/feedback';
import { Button, Input, Select } from '@/src/components/controls';
import { Stack } from '@/src/components/layout/primitives';
import { couponInputSchema, COUPON_TYPES, type CouponInput } from '../schemas/couponSchema';

interface CouponDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CouponInput) => Promise<void>;
  submitting: boolean;
  error: string | null;
}

/** Thirty days out — long enough to be useful, short enough to be deliberate. */
function defaultExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

const EMPTY = (): CouponInput => ({
  code: '',
  type: 'percent',
  value: 10,
  minOrder: 0,
  maxUsesPerUser: 1,
  expiresAt: defaultExpiry(),
});

/**
 * Create a coupon.
 *
 * Create only — there is no PATCH route, so a coupon cannot be edited after it
 * exists. That makes getting it right at this dialog the whole game, which is
 * why the value rules are enforced here rather than left to the server's
 * generic 422.
 */
export function CouponDialog({ open, onClose, onSubmit, submitting, error }: CouponDialogProps) {
  const [values, setValues] = useState<CouponInput>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [wasOpen, setWasOpen] = useState(false);

  // Reset on open, during render — an effect would show the previous coupon's
  // values for one frame.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValues(EMPTY());
      setFieldErrors({});
    }
  }

  const set = <K extends keyof CouponInput>(field: K, value: CouponInput[K]) =>
    setValues((v) => ({ ...v, [field]: value }));

  const handleSubmit = async () => {
    const parsed = couponInputSchema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (typeof path === 'string' && !next[path]) next[path] = issue.message;
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    await onSubmit(parsed.data);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create coupon"
      subtitle="A coupon cannot be edited or withdrawn once created."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            Create coupon
          </Button>
        </>
      }
    >
      <Stack gap="md">
        {error && (
          <Alert tone="bad" title="Could not create">
            {error}
          </Alert>
        )}

        <Input
          label="Code"
          value={values.code}
          onChange={(e) => set('code', e.target.value.toUpperCase())}
          error={fieldErrors.code}
          hint="Capitals, digits and hyphens. Shown to the buyer exactly as typed."
          required
        />
        <Select
          label="Discount type"
          value={values.type}
          onChange={(e) => set('type', e.target.value as CouponInput['type'])}
          options={COUPON_TYPES.map((t) => ({
            value: t,
            label: t === 'percent' ? 'Percentage off' : 'Fixed amount off',
          }))}
        />
        <Input
          label={values.type === 'percent' ? 'Percentage off' : 'Amount off (৳)'}
          type="number"
          inputMode="decimal"
          min={0}
          value={String(values.value)}
          onChange={(e) => set('value', e.target.value === '' ? NaN : Number(e.target.value))}
          error={fieldErrors.value}
          required
        />
        <Input
          label="Minimum order (৳)"
          type="number"
          inputMode="decimal"
          min={0}
          value={String(values.minOrder)}
          onChange={(e) => set('minOrder', e.target.value === '' ? NaN : Number(e.target.value))}
          error={fieldErrors.minOrder}
          hint="Zero means the coupon applies to any order."
        />
        <Input
          label="Uses per buyer"
          type="number"
          inputMode="numeric"
          min={1}
          value={String(values.maxUsesPerUser)}
          onChange={(e) =>
            set('maxUsesPerUser', e.target.value === '' ? NaN : Number(e.target.value))
          }
          error={fieldErrors.maxUsesPerUser}
          hint="Recorded, but not currently enforced — nothing tracks who has redeemed what."
        />
        <Input
          label="Expires"
          type="date"
          value={values.expiresAt}
          onChange={(e) => set('expiresAt', e.target.value)}
          error={fieldErrors.expiresAt}
          hint="Expiry is the only way to stop a coupon, since there is no delete."
          required
        />
      </Stack>
    </Dialog>
  );
}
