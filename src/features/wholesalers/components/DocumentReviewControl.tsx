import * as React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/src/components/controls';
import { Text } from '@/src/components/data';
import { reviewWholesalerDocument } from '../api/wholesalerApi';

/**
 * A VERDICT ON ONE CERTIFICATE.
 *
 * The columns for this have existed since the baseline migration and nothing
 * ever wrote to them, so every document in the system sat at 'pending'
 * permanently — an admin could look at a trade licence and do nothing about it.
 * The endpoint now exists; this is the console's half.
 *
 * # Why it matters more than it used to
 *
 * A supplier can now submit a REPLACEMENT from the app. It arrives as a second
 * pending row while their current certificate stays valid, and approving it
 * retires the old one. Without a control here those submissions would queue up
 * with nobody able to act on them — the app would let suppliers post files into
 * a void.
 *
 * # Rejecting asks for a reason
 *
 * The reason is the only thing the supplier sees, and it is what tells them what
 * to fix — their profile renders it under the document. "Rejected" with no note
 * is a support call, so the note is required on the way down and pointless on
 * the way up.
 */
export function DocumentReviewControl({
  wholesalerId,
  documentId,
  status,
  onReviewed,
}: {
  wholesalerId: string;
  documentId: string;
  /**
   * pending | approved | rejected | removed.
   *
   * Optional because `VaultDocument.status` is — the shared vault also serves
   * retailers, who have no per-document review endpoint. An absent status is
   * NOT treated as pending: offering Approve on a document whose state we do
   * not know would let one click write a verdict nobody chose.
   */
  status?: string;
  onReviewed: () => void;
}) {
  const [busy, setBusy] = React.useState<'approved' | 'rejected' | null>(null);
  const [asking, setAsking] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  /*
   * Only a PENDING document offers a decision.
   *
   * A settled one keeps its verdict and its badge. Re-deciding is deliberately
   * not offered here: the supplier's route to changing an approved certificate
   * is to submit a replacement, which arrives as its own pending row and gets
   * its own decision. Letting an admin flip a verdict in place would leave the
   * app showing a status with no matching file change.
   */
  if (status !== 'pending') return null;

  const submit = async (next: 'approved' | 'rejected') => {
    if (next === 'rejected' && !note.trim()) {
      setError('Say what needs fixing — the supplier sees only this.');
      return;
    }
    setError(null);
    setBusy(next);
    try {
      await reviewWholesalerDocument(wholesalerId, documentId, next, note.trim());
      setAsking(false);
      setNote('');
      onReviewed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not save.');
    } finally {
      setBusy(null);
    }
  };

  if (asking) {
    return (
      <div className="flex w-full flex-col gap-2 pt-2">
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setError(null);
          }}
          rows={2}
          autoFocus
          placeholder="What does the supplier need to fix?"
          className="w-full rounded-lg border border-rule bg-sheet px-3 py-2 text-sm"
        />
        {error && <Text variant="caption">{error}</Text>}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="danger"
            loading={busy === 'rejected'}
            onClick={() => submit('rejected')}
          >
            Reject
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setAsking(false);
              setNote('');
              setError(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
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
  );
}
