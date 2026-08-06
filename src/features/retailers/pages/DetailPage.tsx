import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Store, MapPin, Landmark, ClipboardList, KeyRound } from 'lucide-react';
import { PageHeader } from '@/src/components/layout/primitives';
import { Button } from '@/src/components/controls';
import { Text, StatusBadge, formatDate } from '@/src/components/data';
import { Alert, ReasonDialog, ConfirmDialog } from '@/src/components/feedback';
import { useToast } from '@/src/components/feedback/useToast';
import { EntityDetailsCard } from '@/src/components/shared/EntityDetailsCard';
import { PasswordField } from '@/src/components/auth/PasswordField';
import { DocumentVault } from '@/src/components/documents/DocumentVault';
import { RETAILER_DOC_TYPES } from '../schemas/retailerSchema';
import { getRetailerDocumentUrl } from '../api/retailersApi';

/**
 * A stored doc_type turned into the words on screen.
 *
 * Lived inside the vault when the vault was retailer-only. It moved out with the
 * component: "nid" means "Owner NID" to a shop and could mean something else to
 * another kind of account, so the label belongs to the screen that knows which
 * it is showing. An unrecognised type still gets a row and its raw code —
 * dropping it would lose a document somebody uploaded.
 */
function retailerDocLabel(docType: string): string {
  return RETAILER_DOC_TYPES.find((d) => d.value === docType)?.label ?? docType;
}
import {
  assessmentLabel,
  LOCATION_RANKING,
  MONTHLY_SALE,
  SHOP_TYPE,
  SHOP_DECOR,
} from '../constants/assessment';
import { useRetailerDetail, useRetailerActions } from '../hooks/useRetailers';
import { lifecycleFor } from '../utils/deleteAffordance';
import { useRetailerNavigation } from '../hooks/useRetailerNavigation';
import { splitCategories } from '../components/RetailerForm';

/**
 * One shop, everything known about it, and the three things staff can do to it.
 *
 * # Why the actions live here and not on the list
 *
 * Suspending a shop signs it out immediately and stops it ordering. That is a
 * decision to make while looking at who the shop is, what it has on file and
 * why it is in the state it is — not from a row menu one mis-click away.
 */

/** A labelled row. Absent values say so rather than rendering an empty gap. */
function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <Text variant="caption">{label}</Text>
      {value ? <Text>{value}</Text> : <Text variant="secondary">Not provided</Text>}
    </div>
  );
}

export function DetailPage() {
  const { id = '' } = useParams();
  const { goToList, goToEdit } = useRetailerNavigation();
  const { data: retailer, isPending, error } = useRetailerDetail(id || null);
  const { suspend, unsuspend, resetPassword, reject, remove } = useRetailerActions(id);
  const toast = useToast();

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetOpen, setResetOpen] = useState(false);

  if (isPending) return <Text variant="secondary">Loading…</Text>;
  if (error || !retailer) {
    return (
      <Alert tone="bad" title="This retailer could not be loaded">
        {error instanceof Error ? error.message : 'Try again, or go back to the list.'}
      </Alert>
    );
  }

  const isPendingApproval = retailer.status === 'pending';
  const isRejected = retailer.status === 'rejected';

  /*
   * Which controls this status earns — decided in one place, tested on its own.
   *
   * The header renders what this returns and decides nothing itself. Spreading
   * the rule across six JSX conditions is how "delete" ends up on a screen it
   * was never meant to appear on.
   */
  const can = lifecycleFor(retailer.status);

  const doSuspend = async (reason: string) => {
    try {
      await suspend.mutateAsync(reason);
      setSuspendOpen(false);
      toast.success('Suspended', 'They have been signed out and cannot sign in again.');
    } catch (err) {
      toast.error(
        'Could not suspend',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  };

  const doActivate = async () => {
    try {
      await unsuspend.mutateAsync();
      // Two different jobs, two different sentences. Clearing a new shop and
      // restoring a suspended one both call /unsuspend, but they are not the
      // same event to the person doing them.
      toast.success(
        isPendingApproval ? 'Approved' : 'Access restored',
        isPendingApproval
          ? 'This shop can now place orders.'
          : 'They can sign in and order again.',
      );
    } catch (err) {
      toast.error('Could not activate', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const doReject = async (reason: string) => {
    try {
      await reject.mutateAsync(reason);
      setRejectOpen(false);
      toast.success('Rejected', 'They have been signed out and cannot sign in again.');
    } catch (err) {
      toast.error('Could not reject', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const doDelete = async () => {
    try {
      const mode = await remove.mutateAsync();
      setDeleteOpen(false);
      // The server decides which kind of delete happened, and the two are not
      // the same event. Saying "deleted" for both would hide that one keeps the
      // trading history and the other destroyed everything.
      if (mode === 'hard') {
        toast.success('Deleted permanently', 'Nothing about this shop remains.');
      } else {
        toast.success('Removed', 'Hidden from the directory. Its orders and records are kept.');
      }
      goToList();
    } catch (err) {
      toast.error('Could not delete', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const doResetPassword = async () => {
    if (!newPassword) return;
    try {
      await resetPassword.mutateAsync(newPassword);
      setResetOpen(false);
      setNewPassword('');
      toast.success('Password reset', 'Every session they had has been ended.');
    } catch (err) {
      toast.error('Could not reset', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      <ReasonDialog
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        onConfirm={doSuspend}
        title={`Suspend ${retailer.shopName}?`}
        /*
          Says what happens NOW, not what the flag means. "Sets status to
          suspended" is what the row does; being signed out mid-order is what
          the shop experiences, and the operator should know that before
          pressing it.
        */
        message="They are signed out immediately and cannot sign in again until you restore access. A reason is required."
        confirmLabel="Suspend"
        loading={suspend.isPending}
      />

      <ReasonDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={doReject}
        title={`Reject ${retailer.shopName}?`}
        /*
          Says what rejecting UNLOCKS, because that is the part an operator
          cannot guess: it is the only status a permanent delete is reachable
          from, and it is not reversible through this screen.
        */
        message="They are signed out immediately and cannot sign in again. A rejected application can then be deleted permanently. A reason is required."
        confirmLabel="Reject"
        loading={reject.isPending}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={doDelete}
        tone="danger"
        title={isRejected ? `Delete ${retailer.shopName} permanently?` : `Remove ${retailer.shopName}?`}
        /*
          Two different sentences for two different acts, and both say what
          SURVIVES. "Are you sure?" tells nobody anything; what an operator
          needs to know before pressing is whether the orders go with it.
        */
        message={
          isRejected
            ? 'This removes the shop and everything about it from the database. It cannot be undone. If the shop has any order or payment on record, the deletion will be refused.'
            : 'This hides the shop from the directory and signs it out. Its orders, payments and documents are kept.'
        }
        confirmLabel={isRejected ? 'Delete permanently' : 'Remove'}
        loading={remove.isPending}
      />

      <PageHeader
        title={retailer.shopName}
        subtitle={retailer.name}
        onBack={goToList}
        actions={
          /*
           * One primary action per status; everything else quieter.
           *
           * This was four buttons of equal weight in a wrap container, and
           * reject plus delete would have made it six — the point at which a
           * header stops looking considered and starts looking accumulated.
           *
           * So: the decision the status is waiting for is the filled button,
           * the routine tools are secondary, and destructive actions sit after
           * a divider so the eye has to cross something to reach them.
           */
          <div className="flex flex-wrap items-center gap-2">
            {can.primary ? (
              <Button onClick={doActivate} loading={unsuspend.isPending}>
                {/*
                  "Approve" for a shop that has never been active, "Restore
                  access" for one that was suspended. Same endpoint — it sets
                  active — but they are different decisions, and an operator
                  should see which one they are making.
                */}
                {can.primary === 'approve' ? 'Approve' : 'Restore access'}
              </Button>
            ) : null}

            <Button variant="secondary" onClick={() => goToEdit(id)}>
              Edit
            </Button>
            <Button variant="secondary" onClick={() => setResetOpen((v) => !v)}>
              Reset password
            </Button>

            {/*
              The divider. Destructive actions are not in the same run as Edit:
              Suspend signs a shop out mid-order and Delete permanently is
              exactly what it says, and neither should sit a pixel away from a
              button somebody presses without thinking.
            */}
            {(can.canReject || can.canSuspend || can.canDelete) && (
              <span aria-hidden="true" className="mx-1 h-5 w-px bg-rule" />
            )}

            {can.canReject && (
              <Button variant="secondary" onClick={() => setRejectOpen(true)}>
                Reject
              </Button>
            )}

            {can.canSuspend && (
              <Button variant="danger" onClick={() => setSuspendOpen(true)}>
                Suspend
              </Button>
            )}

            {can.canDelete && (
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                {/*
                  The label says which delete this is. A suspended shop is
                  hidden and keeps its history; a rejected application is
                  destroyed. Calling both "Delete" would hide that one is
                  reversible and the other is not.
                */}
                {can.deleteIsPermanent ? 'Delete permanently' : 'Delete'}
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={retailer.status} />
        {isPendingApproval && (
          <Text variant="caption">
            {/*
              The one thing about `pending` that is not guessable: they CAN sign
              in. Without this an operator reads "pending" as "locked out" and
              wastes a call telling the shop to wait for access it already has.
            */}
            They can sign in and browse, but cannot place orders until activated.
          </Text>
        )}
      </div>

      {resetOpen && (
        <div className="flex max-w-form flex-col gap-3 rounded-lg border border-rule bg-sheet p-4">
          <Text variant="label">Set a new password</Text>
          <PasswordField
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            showStrength
            allowGenerate
          />
          <Text variant="caption">
            Hashed in this browser before it is sent. Every session they have will end, so they must
            sign in again with the new password.
          </Text>
          <div className="flex flex-wrap gap-2">
            <Button onClick={doResetPassword} loading={resetPassword.isPending} disabled={!newPassword}>
              Reset password
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setResetOpen(false);
                setNewPassword('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EntityDetailsCard
          title="Shop"
          sections={[
            {
              icon: Store,
              title: 'Identity',
              content: (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Owner" value={retailer.name} />
                  <Field label="Phone" value={retailer.phone} />
                  <Field label="Email" value={retailer.email} />
                  <Field label="Referral code" value={retailer.referralCode} />
                  <Field
                    label="Added by"
                    value={
                      retailer.createdBy === 'SELF'
                        ? 'Self-registered'
                        : retailer.createdByName || 'Staff (not recorded)'
                    }
                  />
                  <Field label="Joined" value={formatDate(retailer.createdAt)} />
                </div>
              ),
            },
            {
              icon: MapPin,
              title: 'Where it is',
              content: (
                <div className="flex flex-col gap-3">
                  <Field label="District" value={retailer.district} />
                  <div className="flex flex-col gap-1">
                    <Text variant="caption">Categories</Text>
                    {splitCategories(retailer.category ?? '').length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {splitCategories(retailer.category ?? '').map((c) => (
                          <span
                            key={c}
                            className="rounded-full border border-rule bg-canvas px-2.5 py-0.5 text-sm text-ink-2"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <Text variant="secondary">Not provided</Text>
                    )}
                  </div>
                </div>
              ),
            },
          ]}
        />

        <EntityDetailsCard
          title="Assessment"
          sections={[
            {
              icon: ClipboardList,
              title: 'Recorded on a visit',
              content: retailer.locationRanking ||
                retailer.estimatedMonthlySale ||
                retailer.shopType ||
                retailer.shopDecorType ||
                retailer.yearsInBusiness != null ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label="Location ranking"
                    value={assessmentLabel(LOCATION_RANKING, retailer.locationRanking)}
                  />
                  <Field
                    label="Estimated monthly sale"
                    value={assessmentLabel(MONTHLY_SALE, retailer.estimatedMonthlySale)}
                  />
                  <Field label="Shop type" value={assessmentLabel(SHOP_TYPE, retailer.shopType)} />
                  <Field
                    label="Décor"
                    value={assessmentLabel(SHOP_DECOR, retailer.shopDecorType)}
                  />
                  <Field
                    label="Years in business"
                    value={
                      retailer.yearsInBusiness != null ? String(retailer.yearsInBusiness) : undefined
                    }
                  />
                  <Field
                    label="Location"
                    value={
                      retailer.latitude != null && retailer.longitude != null
                        ? `${retailer.latitude.toFixed(5)}, ${retailer.longitude.toFixed(5)}`
                        : undefined
                    }
                  />
                </div>
              ) : (
                /*
                  "Not assessed" and not a grid of dashes. A row of empty fields
                  reads as a form that failed to load; this says nobody has been
                  yet, which is a different and true thing.
                */
                <Text variant="secondary">Nobody has assessed this shop yet.</Text>
              ),
            },
            {
              icon: Landmark,
              title: 'Where refunds go',
              content: (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Text variant="caption">Bank accounts</Text>
                    {retailer.bankDetails?.length ? (
                      retailer.bankDetails.map((b) => (
                        <div key={b.id ?? b.accountNumber} className="flex flex-col gap-0.5">
                          <Text>
                            {b.bankName} · {b.accountNumber}
                            {b.isDefault && (
                              <span className="ml-2 text-sm text-ink-3">(default)</span>
                            )}
                          </Text>
                          <Text variant="caption">
                            {[b.accountName, b.branch].filter(Boolean).join(' · ')}
                          </Text>
                        </div>
                      ))
                    ) : (
                      <Text variant="secondary">None on file</Text>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Text variant="caption">Mobile wallets</Text>
                    {retailer.mobileWallets?.length ? (
                      retailer.mobileWallets.map((w) => (
                        <Text key={w.id ?? w.accountNumber}>
                          {w.walletType} · {w.accountNumber}
                          {w.isDefault && <span className="ml-2 text-sm text-ink-3">(default)</span>}
                        </Text>
                      ))
                    ) : (
                      <Text variant="secondary">None on file</Text>
                    )}
                  </div>
                </div>
              ),
            },
            {
              icon: KeyRound,
              title: 'Documents',
              content: (
                <DocumentVault
                  subjectId={id}
                  documents={retailer.documents ?? []}
                  fetchUrl={getRetailerDocumentUrl}
                  labelFor={retailerDocLabel}
                  emptyLabel="No documents on file for this shop yet."
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
