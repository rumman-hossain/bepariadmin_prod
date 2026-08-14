import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader, Panel } from '@/src/components/layout/primitives';
import { Button } from '@/src/components/controls';
import { EntityDetailsCard } from '@/src/components/shared/EntityDetailsCard';
import { StatusBadge } from '@/src/components/data/StatusBadge';
import { ReasonDialog, ConfirmDialog, Alert } from '@/src/components/feedback';
import { SupplierPaperworkPanel } from '../components/SupplierPaperworkPanel';
import { ProfileChangeReviewPanel } from '../components/ProfileChangeReviewPanel';
import { businessProfileSections, financialSections } from './supplierDetailSections';
import { useWholesalerDetail } from '../hooks/useWholesalerDetail';
import {
  useUpdateCommission,
  useWholesalerStatusAction,
  useDeleteWholesaler,
  useRestoreWholesaler,
} from '../queries';
import { supplierLifecycleFor } from '../utils/lifecycle';
import { useAuth } from '@/src/hooks/useAuth';
import { Edit2, Save, Loader2, RefreshCw, Trash2, Undo2, Percent } from 'lucide-react';
import { useToast } from '@/src/components/feedback/useToast';
import { toWholesalerApiError } from '../api/errors';
import { DEFAULT_COMMISSION_RATE } from '../constants';
import { Text } from '@/src/components/data';

type ReasonAction = 'suspend' | 'reject' | 'resubmit' | null;

export function DetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const { wholesaler, isLoading, error, goBack, goToEdit, refetch } = useWholesalerDetail(id ?? null);

  // Five near-identical store actions replaced by one mutation over a
  // discriminated union, plus a separate one for the commission. They used to
  // share a single global `isMutating`, so approving one wholesaler put every
  // button on the page into a loading state.
  const statusAction = useWholesalerStatusAction();
  const commission = useUpdateCommission();
  const isMutating = statusAction.isPending || commission.isPending;

  const [reasonAction, setReasonAction] = useState<ReasonAction>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const remove = useDeleteWholesaler();
  const restore = useRestoreWholesaler();

  /*
   * The commission input is an override on top of the server value, null until
   * the operator types. An effect used to copy the server value into state
   * instead — which meant any refetch landing mid-edit (a window refocus is
   * enough) silently discarded what had been typed.
   */
  const [commissionDraft, setCommissionDraft] = useState<number | null>(null);
  const commissionRate = commissionDraft ?? wholesaler?.commissionRate ?? DEFAULT_COMMISSION_RATE;
  const setCommissionRate = setCommissionDraft;

  const runMutation = async (fn: () => Promise<void>, successMsg: string) => {
    try {
      await fn();
      toast.success('Updated', successMsg);
      await refetch();
    } catch (err) {
      toast.error('Action failed', toWholesalerApiError(err).message);
    }
  };

  const reviewerId = user?.id ?? '';

  if (isLoading && !wholesaler) {
    return (
      <div
        className="flex h-64 flex-col items-center justify-center gap-3"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-7 w-7 animate-spin text-brass" aria-hidden="true" />
        <Text as="p" variant="secondary">Loading supplier…</Text>
      </div>
    );
  }

  if (!wholesaler) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-ink-3">
        <p>{error ?? 'Supplier not found.'}</p>
        <Button variant="ghost" onClick={goBack}>
          Back to list
        </Button>
        {id && (
          <Button variant="outline" size="sm" iconLeft={RefreshCw} onClick={() => refetch()}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  const w = wholesaler;

  /*
   * A removed supplier is reachable — the directory's Removed filter lists it
   * and every row is a link. Until the detail endpoint returned one, all of
   * them landed on "Resource not found".
   *
   * `isRemoved` is what the screen turns on, not the status: the row keeps
   * whatever status it carried when it was deleted, so reading the status alone
   * would put a removed supplier back in the Suspended bucket to the eye.
   */
  const isRemoved = Boolean(w.deletedAt);

  /*
   * Which controls this supplier earns — decided in one place, tested on its
   * own. The header renders what this returns and decides nothing itself.
   * Spreading the rule across JSX conditions is how "delete permanently" ends
   * up on a screen it was never meant to appear on.
   */
  const can = supplierLifecycleFor(w.status, isRemoved);

  const doDelete = async () => {
    try {
      const mode = await remove.mutateAsync(w.id);
      setDeleteOpen(false);
      /*
       * The SERVER decides which kind of delete happened, and the two are not
       * the same event. Saying "deleted" for both would hide that one keeps the
       * trading history and the other destroyed everything — the difference an
       * operator cannot undo.
       */
      if (mode === 'hard') {
        toast.success('Deleted permanently', 'Nothing about this supplier remains.');
      } else {
        toast.success('Removed', 'Hidden from the directory. Its orders and records are kept.');
      }
      goBack();
    } catch (err) {
      toast.error('Could not delete', toWholesalerApiError(err).message);
    }
  };

  const doRestore = async () => {
    try {
      await restore.mutateAsync(w.id);
      /*
       * NOT "and can sign in" — which is what this said, and it was wrong for
       * most restores. MEASURED: restoring QA Verify Store, a REJECTED
       * supplier, announced that it could sign in; rejected and suspended
       * accounts are both denied at the door (`signin_decision.go`).
       *
       * Restoring undoes the REMOVAL and nothing else. The status comes back
       * exactly as it was, so what happens next is whatever that status
       * already meant.
       */
      toast.success(
        'Restored',
        `${w.companyName} is back in the directory, with the status it had when it was removed.`,
      );
      /*
       * Refetch rather than trust the cache: the banner, the action bar and the
       * status badge all key off `deletedAt`, and a stale copy would leave the
       * screen showing "Removed" over a supplier that is no longer removed.
       */
      await refetch();
    } catch (err) {
      toast.error('Could not restore', toWholesalerApiError(err).message);
    }
  };

  const handleReasonConfirm = async (reason: string) => {
    if (!reasonAction || !id) return;
    const action = reasonAction;
    setReasonAction(null);
    await runMutation(async () => {
      if (action === 'suspend') await statusAction.mutateAsync({ kind: 'suspend', id, reviewedBy: reviewerId, reason });
      if (action === 'reject') await statusAction.mutateAsync({ kind: 'reject', id, reviewedBy: reviewerId, reason });
      if (action === 'resubmit') await statusAction.mutateAsync({ kind: 'request-resubmit', id, reviewedBy: reviewerId, reason });
    }, 'Supplier status updated.');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <ReasonDialog
        open={reasonAction === 'suspend'}
        onClose={() => setReasonAction(null)}
        onConfirm={handleReasonConfirm}
        title={`Suspend ${w.companyName}?`}
        message="This signs the supplier out of every device immediately and stops it selling. Approved products disappear from the Retailer Portal. A reason is required."
        confirmLabel="Confirm Suspension"
        loading={isMutating}
      />
      <ReasonDialog
        open={reasonAction === 'reject'}
        onClose={() => setReasonAction(null)}
        onConfirm={handleReasonConfirm}
        title={`Reject ${w.companyName}?`}
        message="Reject this supplier application. A reason is required."
        confirmLabel="Reject Supplier"
        loading={isMutating}
      />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={doDelete}
        tone="danger"
        title={
          can.deleteIsPermanent
            ? `Delete ${w.companyName} permanently?`
            : `Remove ${w.companyName}?`
        }
        /*
          Two different sentences for two different acts, and both say what
          SURVIVES. "Are you sure?" tells nobody anything; what an operator
          needs before pressing is whether the orders go with it.
        */
        message={
          can.deleteIsPermanent
            ? 'This removes the supplier and everything about it from the database. It cannot be undone. If the supplier has any order, payment or product on record, the deletion will be refused.'
            : 'This hides the supplier from the directory and signs it out. Its orders, payments and documents are kept.'
        }
        confirmLabel={can.deleteIsPermanent ? 'Delete permanently' : 'Remove'}
        loading={remove.isPending}
      />

      <ReasonDialog
        open={reasonAction === 'resubmit'}
        onClose={() => setReasonAction(null)}
        onConfirm={handleReasonConfirm}
        title="Request resubmission"
        message="Ask the supplier to update their profile and resubmit."
        confirmLabel="Request Resubmit"
        variant="warning"
        loading={isMutating}
      />

      <PageHeader
        title={w.companyName}
        /*
         * The status is a BADGE, not part of the name.
         *
         * This read `Mayer Doa Store (Active)`, which makes the name of the
         * business change when it is suspended and sets a state machine in the
         * same weight as a proper noun. `StatusBadge` is what every other
         * surface uses, including the list column this screen is opened from.
         *
         * Removed overrides the status: a soft-deleted supplier keeps whatever
         * it carried when it went, so showing that would put it back in the
         * Suspended bucket to the eye.
         */
        badge={isRemoved ? <StatusBadge status="Removed" /> : <StatusBadge status={w.status} />}
        /*
         * An absent code is OMITTED here, not shown as an em dash.
         *
         * A dash earns its place in a table CELL, where a blank would read as a
         * rendering fault. Joined into a sentence it just reads as a typo —
         * this rendered "— · Mayer Doa Wholesaler".
         */
        subtitle={[w.code?.trim(), w.location, w.ownerName].filter(Boolean).join(' · ')}
        onBack={goBack}
        actions={
          isRemoved ? (
            /*
             * ONE action, and it is the only one the server would accept.
             *
             * Every lifecycle write requires `deleted_at IS NULL`, so Edit,
             * Suspend, Approve and Delete could each only produce an error on a
             * removed supplier. Rendering them would teach an operator that the
             * screen does not know its own rules.
             */
            <Button
              variant="primary"
              size="md"
              iconLeft={Undo2}
              loading={restore.isPending}
              onClick={doRestore}
            >
              Restore supplier
            </Button>
          ) : (
          <>
            <Button
              variant="secondary"
              size="md"
              iconLeft={Edit2}
              onClick={() => goToEdit(w.id)}
            >
              Edit Profile
            </Button>
            {w.status === 'Review' && (
              <>
                <Button
                  variant="primary"
                  size="md"
                  loading={isMutating}
                  onClick={() =>
                    runMutation(
                      () => statusAction.mutateAsync({ kind: 'approve', id: w.id, reviewedBy: reviewerId }).then(() => undefined),
                      'Supplier approved.',
                    )
                  }
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => setReasonAction('reject')}
                  disabled={isMutating}
                >
                  Reject
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setReasonAction('resubmit')}
                  disabled={isMutating}
                >
                  Request Resubmit
                </Button>
              </>
            )}
            {w.status === 'Suspended' && (
              <Button
                variant="primary"
                size="md"
                loading={isMutating}
                onClick={() =>
                  runMutation(
                    () => statusAction.mutateAsync({ kind: 'unsuspend', id: w.id, reviewedBy: reviewerId }).then(() => undefined),
                    'Supplier activated.',
                  )
                }
              >
                Activate Account
              </Button>
            )}
            {w.status === 'Active' && (
              <Button
                variant="danger"
                size="md"
                onClick={() => setReasonAction('suspend')}
                disabled={isMutating}
              >
                Suspend Account
              </Button>
            )}
            {/*
              Delete is offered ONLY where the server would allow it — suspended
              or rejected. Rendering it on an active supplier would give an
              operator a button whose only possible outcome is a 409 telling
              them to suspend first, which teaches them the screen does not know
              its own rules. `supplierLifecycleFor` is the retailer's rule,
              translated rather than reimplemented.
            */}
            {can.canDelete && (
              <Button
                variant="danger"
                size="md"
                iconLeft={Trash2}
                onClick={() => setDeleteOpen(true)}
                disabled={isMutating || remove.isPending}
              >
                {can.deleteIsPermanent ? 'Delete permanently' : 'Delete'}
              </Button>
            )}
          </>
          )
        }
      />

      {/*
        Said once, at the top, before anything below it.
        A removed supplier's paperwork, profile and products all still render —
        they are real, and keeping them is the whole point of a soft delete —
        but read without this banner they describe a supplier the directory
        does not have.
      */}
      {isRemoved && (
        <Alert tone="warn" title={`Removed on ${w.deletedAt?.slice(0, 10)}`}>
          This supplier is hidden from the directory and cannot sign in. Its orders, payments
          and documents are kept. Restoring puts it back with the status it had.
        </Alert>
      )}

      {/*
        TWO EQUAL COLUMNS, matching the retailer detail screen.

        It was `lg:grid-cols-3` with `col-span-2` given to Assigned orders,
        Payout history and Decision history — three panels whose four data
        sources in `api/stubs.ts` returned `[]` and `null` unconditionally. Two
        thirds of the screen could not ever hold anything, and apologised for it
        five times, while the paperwork an operator approves a supplier ON was a
        row inside Business Profile in the remaining third.
      */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Paperwork leads. Reviewing it is why this screen is opened. */}
        <SupplierPaperworkPanel
          supplier={w}
          /*
           * Refetch after a verdict. Approving a REPLACEMENT retires the older
           * row server-side, so without this the panel keeps showing both — the
           * superseded certificate and its successor — and the reviewer cannot
           * tell whether their click landed.
           */
          onReviewed={() => void refetch()}
        />

        {/*
          Requested changes sit directly under the paperwork, and above the
          record itself. A supplier's proposed bank account is a decision
          waiting on this operator — the same class of work as a pending
          certificate — and it renders nothing at all when there is none, so it
          costs no space on the suppliers who have not asked for anything.
        */}
        <ProfileChangeReviewPanel
          wholesalerId={w.id}
          addresses={w.addresses ?? []}
          bankAccounts={w.bankDetailsList ?? []}
          wallets={w.digitalWallets ?? []}
          onReviewed={() => void refetch()}
        />

        <EntityDetailsCard title="Business profile" sections={businessProfileSections(w)} />

        <Panel title="Commission">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={commissionRate}
              onChange={(e) => setCommissionRate(Math.max(0, Number(e.target.value)))}
              /*
               * Read-only once removed. Saving is a write, and every write
               * requires `deleted_at IS NULL` — so an editable field here could
               * only ever end in a refusal. The number still SHOWS, because it
               * is part of what an operator is deciding whether to bring back.
               */
              disabled={isMutating || isRemoved}
              readOnly={isRemoved}
              aria-label="Commission rate, percent"
              className="cell-numeric w-28 rounded-md border border-rule-input bg-sheet px-3 py-2 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rule-focus"
            />
            <Percent className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
            <Button
              variant="primary"
              size="md"
              iconLeft={Save}
              loading={isMutating}
              disabled={isRemoved}
              aria-label="Save commission rate"
              onClick={() =>
                runMutation(
                  () =>
                    commission
                      .mutateAsync({ id: w.id, rate: commissionRate })
                      // Drop the override so the field follows the server again.
                      .then(() => setCommissionDraft(null)),
                  'Commission rate saved.',
                )
              }
            />
          </div>
          <Text as="p" variant="caption" className="mt-2">
            {isRemoved
              ? 'Read-only while removed. Restore the supplier to change it.'
              : `Taken from each order at the time of sale. The standard rate is ${DEFAULT_COMMISSION_RATE}%.`}
          </Text>
        </Panel>

        <EntityDetailsCard title="Bank & mobile wallets" sections={financialSections(w)} />
      </div>
    </div>
  );
}
