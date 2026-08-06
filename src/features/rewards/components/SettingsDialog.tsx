import { useState } from 'react';
import { Dialog, Alert } from '@/src/components/feedback';
import { Button, Input } from '@/src/components/controls';
import { Text } from '@/src/components/data';
import { Row } from '@/src/components/layout/primitives';
import { useSaveSettings } from '../hooks/useRewards';
import { toTaka, type LoyaltySettings } from '../api/rewardsApi';

interface Props {
  open: boolean;
  onClose: () => void;
  /** null when the programme has never been configured. */
  current: LoyaltySettings | null;
}

/*
 * Every field, every time — no partial update.
 *
 * The earn rate and the redeem rate are not inverses of each other; the spread
 * between them is what the programme costs. A form that let one be changed
 * without the other in view is how an earning rate ends up generous against a
 * redemption rate nobody looked at. The API takes a PUT of the whole object for
 * the same reason.
 */
export function SettingsDialog({ open, onClose, current }: Props) {
  const empty = {
    earnTakaPerPoint: '',
    redeemPaisaPerPoint: '',
    minRedeemPoints: '',
    referralPoints: '',
    silverAt: '',
    goldAt: '',
    platinumAt: '',
  };
  /*
   * Initialised once, from `current`, and never resynchronised by an effect.
   * The parent keys this component on whether the dialog is open, so opening it
   * remounts it and the fields load from what is actually saved — a cancel
   * followed by a reopen shows the saved rules, not last time's typing.
   */
  const [form, setForm] = useState<Record<string, string>>(() =>
    current
      ? {
          earnTakaPerPoint: String(current.earnTakaPerPoint),
          // Shown in taka because that is how a person thinks about what a
          // point is worth; converted back to paisa on submit.
          redeemPaisaPerPoint: String(toTaka(current.redeemPaisaPerPoint)),
          minRedeemPoints: String(current.minRedeemPoints),
          referralPoints: String(current.referralPoints),
          silverAt: String(current.silverAt),
          goldAt: String(current.goldAt),
          platinumAt: String(current.platinumAt),
        }
      : empty,
  );
  const [failure, setFailure] = useState<string | null>(null);
  const save = useSaveSettings();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const whole = (s: string): number | null => {
    if (!/^\d+$/.test(s.trim())) return null;
    const n = Number(s.trim());
    return Number.isSafeInteger(n) ? n : null;
  };

  /** Taka typed by a person → paisa. Two decimals at most, integer arithmetic. */
  const takaToPaisa = (s: string): number | null => {
    const t = s.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
    const [w, f = ''] = t.split('.');
    return Number(w) * 100 + Number(f.padEnd(2, '0'));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFailure(null);

    const earn = whole(form.earnTakaPerPoint);
    const value = takaToPaisa(form.redeemPaisaPerPoint);
    const minRedeem = whole(form.minRedeemPoints);
    const referral = whole(form.referralPoints);
    const silver = whole(form.silverAt);
    const gold = whole(form.goldAt);
    const platinum = whole(form.platinumAt);

    if (!earn || earn <= 0) return setFailure('Earning rate must be a whole number of taka above zero');
    if (!value || value <= 0) return setFailure('A point must be worth more than nothing');
    if (minRedeem === null || referral === null) return setFailure('Minimum redemption and referral points must be whole numbers');
    if (!silver || !gold || !platinum) return setFailure('Every tier threshold is required');
    // The database enforces this too. Checking here turns a constraint-name
    // error into a sentence the operator can act on.
    if (!(silver < gold && gold < platinum)) {
      return setFailure('Tier thresholds must rise: silver below gold, gold below platinum');
    }

    save.mutate(
      {
        earnTakaPerPoint: earn,
        redeemPaisaPerPoint: value,
        minRedeemPoints: minRedeem,
        referralPoints: referral,
        silverAt: silver,
        goldAt: gold,
        platinumAt: platinum,
      },
      {
        onSuccess: onClose,
        onError: (err) =>
          setFailure(err instanceof Error ? err.message : 'The settings could not be saved'),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={current ? 'Edit programme rules' : 'Set up the points programme'}
      subtitle={
        current
          ? 'Changes apply to future orders only. Points already awarded are unaffected.'
          : 'Nothing is awarded until these are saved.'
      }
      size="lg"
      footer={
        <Row justify="end" gap="sm">
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="loyalty-settings" loading={save.isPending}>
            {current ? 'Save rules' : 'Start the programme'}
          </Button>
        </Row>
      }
    >
      <form id="loyalty-settings" onSubmit={submit} className="space-y-5">
        {failure && (
          <Alert tone="bad" title="Not saved">
            {failure}
          </Alert>
        )}

        <fieldset className="space-y-4">
          <Text as="legend" variant="label">
            Earning
          </Text>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Taka spent per point"
              inputMode="numeric"
              value={form.earnTakaPerPoint}
              onChange={set('earnTakaPerPoint')}
              hint="100 means one point for every ৳100. Rounded down, always."
              required
            />
            <Input
              label="Points per referral"
              inputMode="numeric"
              value={form.referralPoints}
              onChange={set('referralPoints')}
              hint="Paid when the new retailer's first order is delivered"
              required
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <Text as="legend" variant="label">
            Redemption
          </Text>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="What one point is worth (৳)"
              inputMode="decimal"
              value={form.redeemPaisaPerPoint}
              onChange={set('redeemPaisaPerPoint')}
              hint="Discount value against a future order"
              required
            />
            <Input
              label="Minimum points to redeem"
              inputMode="numeric"
              value={form.minRedeemPoints}
              onChange={set('minRedeemPoints')}
              required
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <Text as="legend" variant="label">
            Tiers, by lifetime points earned
          </Text>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Silver at" inputMode="numeric" value={form.silverAt} onChange={set('silverAt')} required />
            <Input label="Gold at" inputMode="numeric" value={form.goldAt} onChange={set('goldAt')} required />
            <Input
              label="Platinum at"
              inputMode="numeric"
              value={form.platinumAt}
              onChange={set('platinumAt')}
              required
            />
          </div>
          <p className="text-xs text-ink-3">
            Saving recalculates every retailer&rsquo;s tier against these thresholds. Tier follows
            lifetime points earned, so redeeming never moves anyone down.
          </p>
        </fieldset>
      </form>
    </Dialog>
  );
}
