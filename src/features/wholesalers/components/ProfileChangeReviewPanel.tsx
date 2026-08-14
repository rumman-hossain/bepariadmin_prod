import * as React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/src/components/controls';
import { Text } from '@/src/components/data';
import { Panel } from '@/src/components/layout/primitives';
import { reviewWholesalerProfileChange } from '../api/wholesalerApi';

/**
 * A SUPPLIER'S PROPOSED ADDRESS OR PAYOUT CHANGE, AND THE VERDICT ON IT.
 *
 * # Why this has to exist
 *
 * A supplier can now edit their own address and the accounts they are paid into.
 * The edit changes nothing: the server files a `pending` row beside the live one
 * and payouts keep going to the account already approved. Without a control here
 * that is a queue with no consumer — the app would let suppliers submit changes
 * into a void, which is worse than not offering the edit at all.
 *
 * # What it shows, and why both
 *
 * The entry IN FORCE and the entry PROPOSED, side by side. Showing only the
 * proposal would ask an operator to approve a bank account with nothing to
 * compare it against, which is most of the review: a changed final digit is the
 * thing worth catching, and it is invisible without the old value beside it.
 *
 * # Rejecting asks for a reason
 *
 * The note is the only thing the supplier sees — their profile renders it under
 * the entry. "Rejected" with no note is a support call.
 */

type Entry = {
  id?: string;
  status?: string;
  reviewNote?: string;
  [k: string]: unknown;
};

/** The kinds the server accepts, and how each reads on screen. */
const KINDS: {
  kind: 'address' | 'bank' | 'bkash';
  label: string;
  describe: (e: Entry) => string;
}[] = [
  {
    kind: 'address',
    label: 'Address',
    describe: (e) =>
      [e.addressLine, e.district, e.division, e.postalCode]
        .filter(Boolean).join(', ') || '—',
  },
  {
    kind: 'bank',
    label: 'Bank account',
    describe: (e) =>
      [e.bankName, e.accountNumber, e.accountName, e.branch]
        .filter(Boolean).join(' · ') || '—',
  },
  {
    kind: 'bkash',
    label: 'Mobile wallet',
    describe: (e) =>
      [e.walletType, e.accountNumber].filter(Boolean).join(' · ') || '—',
  },
];

function ChangeRow({
  wholesalerId, kind, label, current, proposed, describe, isAddition, onReviewed,
}: {
  wholesalerId: string;
  kind: 'address' | 'bank' | 'bkash';
  label: string;
  current: Entry | undefined;
  proposed: Entry;
  describe: (e: Entry) => string;
  /** No entry is being replaced — approving this one retires nothing. */
  isAddition: boolean;
  onReviewed: () => void;
}) {
  const [busy, setBusy] = React.useState<'approved' | 'rejected' | null>(null);
  const [asking, setAsking] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (next: 'approved' | 'rejected') => {
    if (next === 'rejected' && !note.trim()) {
      setError('Say what is wrong with it — the supplier sees only this.');
      return;
    }
    if (!proposed.id) {
      setError('This change has no id and cannot be settled.');
      return;
    }
    setError(null);
    setBusy(next);
    try {
      await reviewWholesalerProfileChange(wholesalerId, kind, proposed.id, next, note.trim());
      setAsking(false);
      setNote('');
      onReviewed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not save.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-2 border-b border-rule py-3 last:border-b-0">
      <Text variant="caption">{label}</Text>

      {/*
        WHAT IT REPLACES, or a plain statement that it replaces nothing.
        
        An addition and a replacement need different things said about them:
        approving an addition leaves every existing account exactly as it is,
        and an operator who read "Currently —" as "there is nothing on file"
        might approve it believing it was the only account.
      */}
      <div className="flex flex-col gap-0.5">
        <Text variant="caption">{isAddition ? 'Replaces' : 'Currently'}</Text>
        <span className="text-sm">
          {isAddition
            ? 'Nothing — this is a new entry, added alongside the existing ones.'
            : (current ? describe(current) : '— the entry it named is no longer on file —')}
        </span>
      </div>

      {/* What the supplier is asking for. */}
      <div className="flex flex-col gap-0.5">
        <Text variant="caption">{isAddition ? 'To add' : 'Proposed'}</Text>
        <span className="text-sm font-medium">{describe(proposed)}</span>
      </div>

      {asking ? (
        <div className="flex w-full flex-col gap-2 pt-1">
          <textarea
            value={note}
            onChange={(e) => { setNote(e.target.value); setError(null); }}
            rows={2}
            autoFocus
            placeholder="What is wrong with it?"
            className="w-full rounded-lg border border-rule bg-sheet px-3 py-2 text-sm"
          />
          {error && <Text variant="caption">{error}</Text>}
          <div className="flex gap-2">
            <Button size="sm" variant="danger" loading={busy === 'rejected'} onClick={() => submit('rejected')}>
              Reject
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => { setAsking(false); setNote(''); setError(null); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1 pt-1">
          <Button
            size="sm"
            variant="secondary"
            iconLeft={Check}
            loading={busy === 'approved'}
            disabled={busy !== null}
            onClick={() => submit('approved')}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            iconLeft={X}
            disabled={busy !== null}
            onClick={() => setAsking(true)}
          >
            Reject
          </Button>
          {error && <Text variant="caption">{error}</Text>}
        </div>
      )}
    </div>
  );
}

export function ProfileChangeReviewPanel({
  wholesalerId, addresses, bankAccounts, wallets, onReviewed,
}: {
  wholesalerId: string;
  addresses: Entry[];
  bankAccounts: Entry[];
  wallets: Entry[];
  onReviewed: () => void;
}) {
  const sets: Record<string, Entry[]> = {
    address: addresses ?? [],
    bank: bankAccounts ?? [],
    bkash: wallets ?? [],
  };

  /*
   * EVERY waiting change, each paired with the entry IT names.
   *
   * This took the single pending row per kind and paired it with "the approved
   * one". That was right while a supplier could hold one account of each kind,
   * and became actively misleading the moment they could hold several: with two
   * bank accounts on file it would show whichever came first as "Currently",
   * beside a change to the other — and an operator compares those two numbers
   * before deciding where money goes.
   *
   * `supersedesId` is what the supplier's app actually sent:
   *
   *   set     → a replacement of exactly that entry
   *   absent  → an ADDITION, which replaces nothing at all
   *
   * A `removed` row is never shown as "Currently" — it is the audit trail of a
   * change settled earlier, and showing it would tell an operator money is
   * going somewhere it stopped going.
   */
  const rows = KINDS.flatMap(({ kind, label, describe }) => {
    const all = sets[kind] ?? [];
    const live = (e: Entry) => e.status === 'approved' || !e.status;
    return all
      .filter((e) => e.status === 'pending')
      .map((proposed) => ({
        kind,
        label,
        describe,
        proposed,
        // Only ever the entry this change names. An addition has none, and
        // guessing one would invent a replacement the supplier never asked for.
        current: proposed.supersedesId
          ? all.find((e) => e.id === proposed.supersedesId && live(e))
          : undefined,
        isAddition: !proposed.supersedesId,
      }));
  });

  /*
   * Nothing waiting means no panel at all, rather than an empty card saying so.
   * This screen already carries the supplier's whole record; a permanent "no
   * pending changes" box is noise on every supplier who has never submitted one.
   */
  if (rows.length === 0) return null;

  return (
    <Panel title={`Requested changes (${rows.length})`}>
      <div className="flex flex-col">
        {rows.map((r) => (
          <ChangeRow
            key={`${r.kind}:${r.proposed.id ?? ''}`}
            wholesalerId={wholesalerId}
            kind={r.kind}
            label={r.label}
            describe={r.describe}
            proposed={r.proposed}
            current={r.current}
            isAddition={r.isAddition}
            onReviewed={onReviewed}
          />
        ))}
      </div>
    </Panel>
  );
}
