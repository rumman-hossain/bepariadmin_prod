import { useState } from 'react';
import { UserPlus, Pencil, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader, Page, Panel, Row } from '@/src/components/layout/primitives';
import { DataTable, Text, StatusBadge, formatDate } from '@/src/components/data';
import type { Column } from '@/src/components/data';
import { EmptyState, ErrorState, SkeletonPage, Alert, ConfirmDialog } from '@/src/components/feedback';
import { Button, SegmentedControl, IconButton } from '@/src/components/controls';
import { hasRole, SUPER_ADMIN_ONLY } from '@/src/auth/roles';
import { useAuth } from '@/src/hooks/useAuth';
import {
  useStaff,
  useSetStaffStatus,
  useDeleteStaff,
} from '../hooks/useSettings';
import { labelForRole, type StaffAccount } from '../api/settingsApi';

/**
 * WHO MAY ACT ON WHOM — the same rule the server enforces.
 *
 * A super admin reaches everyone. An admin reaches everyone except a super
 * admin. Anyone else may read this screen and change nothing on it.
 *
 * Duplicated here ONLY to decide which controls to draw. The refusal that counts
 * is the server's, inside the transaction that locks the target row — a check in
 * a browser is a hint, never a permission.
 */
export function mayManage(actorRole: string | undefined, targetRole: string): boolean {
  if (actorRole === 'super_admin') return true;
  if (actorRole === 'admin') return targetRole !== 'super_admin';
  return false;
}

const TABS = ['access', 'commercial'] as const;
type Tab = (typeof TABS)[number];

type StaffRow = Record<string, unknown> & StaffAccount;


/**
 * Settings — platform administration.
 *
 * **Access is the reason this screen exists.** There was no way to see or revoke
 * a staff account through the API: `create-staff` could make one, and nothing
 * could list, disable or change one. Someone leaving kept their access until a
 * person ran a database query.
 *
 * Two rails are enforced by the server and mirrored here so nobody is offered a
 * control that will be refused:
 *
 *  - **Nobody changes their own role or disables themselves.** Undoing a
 *    self-demotion needs the authority you just gave away.
 *  - **The last active super admin cannot be removed or demoted.** Creating
 *    staff is super-admin-only, so removing the last one locks the console
 *    permanently.
 *
 * The client checks are convenience, not security. The server refuses either
 * way, and its refusal is shown verbatim because each one names something the
 * operator can act on.
 */
export function SettingsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : 'access';
  const { user } = useAuth();
  const [removing, setRemoving] = useState<StaffAccount | null>(null);
  const deleteStaffM = useDeleteStaff();
  const canChange = hasRole(user?.role, SUPER_ADMIN_ONLY);

  const staff = useStaff();
  const setStatus = useSetStaffStatus();

  const [disabling, setDisabling] = useState<StaffRow | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // Mirrors the server's last-super-admin rail. Counted from the list already
  // loaded, so no extra request — and if the count is somehow wrong, the server
  // still refuses.
  const activeSuperAdmins =
    staff.data?.filter((a) => a.role === 'super_admin' && a.status === 'active').length ?? 0;

  const isLastSuperAdmin = (a: StaffAccount) =>
    a.role === 'super_admin' && a.status === 'active' && activeSuperAdmins <= 1;

  const columns: Column<StaffRow>[] = [
    {
      key: 'name',
      header: 'Person',
      // flex-col, not a bare div. `Text` renders a `<span>`, so two of them in a
      // plain block run together on one line — this cell read
      // "Tarek Moshaarraftarek@example.com" on the live screen.
      render: (a) => (
        <div className="flex flex-col">
          <Text>{a.name}</Text>
          <Text variant="caption">{a.email}</Text>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      /*
       * DISPLAYED, NEVER CHOSEN.
       *
       * This was a <select> of every role the database allows. There is now one
       * live super admin and one live admin, enforced by a unique index, and the
       * server refuses both the creation and the granting of a super admin — so
       * every option a picker could offer is one the server would reject.
       *
       * To move a role: delete the account holding it, which revokes access
       * immediately, and create the replacement.
       */
      render: (a) => <Text>{labelForRole(a.role)}</Text>,
    },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    {
      key: 'createdAt',
      header: 'Added',
      sortBy: (a) => a.createdAt,
      render: (a) => (
        <Text as="span" variant="secondary">
          <time dateTime={a.createdAt}>{formatDate(a.createdAt)}</time>
        </Text>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      /*
       * EVERY ACTION IN ONE PLACE, AT THE END OF THE ROW.
       *
       * These were split — edit and remove sat mid-table, revoke sat here — so
       * an operator scanned past the controls to reach a control. One column
       * after Added, read left to right in order of severity: change access,
       * change details, remove entirely.
       *
       * Revoke keeps its words because it is the ambiguous one — an icon for
       * "revoke" and an icon for "delete" would look alike and mean very
       * different things. Edit and remove are icons: their meanings are settled,
       * and each carries a label for a screen reader and a tooltip for everyone
       * else.
       *
       * WHAT IS OFFERED MIRRORS WHAT THE SERVER ALLOWS: a super admin acts on
       * anyone, an admin on anyone but a super admin, nobody removes themselves,
       * and the last active super admin is protected. The mirror is a courtesy —
       * every call is checked again server-side, inside the transaction that
       * locks the row — so its job is to avoid offering a button whose only
       * outcome is a refusal.
       */
      render: (a) => {
        const reach = mayManage(user?.role, a.role);
        if (!reach) {
          return <Text variant="caption">Super admin only</Text>;
        }

        const isSelf = a.id === user?.id;
        const protectedRow = isSelf || isLastSuperAdmin(a);

        return (
          <div className="flex items-center justify-end gap-1">
            {a.status === 'inactive' ? (
              <Button
                variant="ghost"
                size="sm"
                loading={setStatus.isPending}
                onClick={() => {
                  setFailure(null);
                  setStatus.mutate(
                    { id: a.id, status: 'active' },
                    { onError: (err) => setFailure(err instanceof Error ? err.message : 'Not changed') },
                  );
                }}
              >
                Restore access
              </Button>
            ) : protectedRow ? (
              /* Say WHY rather than leaving a gap. An absent control reads as an
                 oversight; a reason reads as a rule. */
              <Text variant="caption">{isSelf ? 'Your own account' : 'Last super admin'}</Text>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => { setFailure(null); setDisabling(a); }}>
                Revoke access
              </Button>
            )}

            <IconButton
              icon={Pencil}
              size="sm"
              label={`Edit ${a.name}`}
              onClick={() => navigate(`/settings/staff/${a.id}/edit`)}
            />
            {/* Removal is withheld on the same rows revoke is: you cannot remove
                yourself, and the last super admin must remain. */}
            {!protectedRow && (
              <IconButton
                icon={Trash2}
                size="sm"
                variant="danger"
                label={`Remove ${a.name}`}
                onClick={() => setRemoving(a)}
              />
            )}
          </div>
        );
      },
    },
  ];

  if (staff.isPending) return <SkeletonPage shape="dashboard" />;

  return (
    <Page>
      <PageHeader
        title="Settings"
        subtitle="Who has access, and the levers that are not owned by another screen"
        actions={
          <Row gap="sm" className="items-center">
            {/*
              The control that was missing entirely. `POST
              /auth/admin/create-staff` has existed all along with nothing on
              any screen calling it, so every colleague on this console was
              added with curl or by hand in SQL.

              Only on the tab it belongs to, and only for the role the server
              admits — SuperAdminOnly, mirrored here so nobody is offered a
              button that answers 403.
            */}
            {tab === 'access' && canChange && (
              <Button
                variant="primary"
                size="sm"
                iconLeft={UserPlus}
                onClick={() => navigate('/settings/staff/new')}
              >
                New staff
              </Button>
            )}
            <SegmentedControl<Tab>
              label="View"
              value={tab}
              onChange={(t) => {
                const p = new URLSearchParams(params);
                p.set('tab', t);
                setParams(p, { replace: true });
              }}
              options={[
                { value: 'access', label: 'Access' },
              ]}
            />
          </Row>
        }
      />

      {failure && (
        <Alert tone="bad" title="Not changed">
          {failure}
        </Alert>
      )}

      {tab === 'access' && (
        <>
          {!canChange && (
            <Alert tone="info" title="You can see who has access, but not change it">
              Changing a role or revoking access is restricted to super admins — a role that
              could edit roles could grant itself anything, which would make the restriction
              decoration.
            </Alert>
          )}

          <Panel flush>
            {staff.isError ? (
              <ErrorState title="Staff accounts could not be loaded" onRetry={() => void staff.refetch()} />
            ) : !staff.data?.length ? (
              <EmptyState title="No staff accounts" message="Nobody has console access." />
            ) : (
              <DataTable<StaffRow>
                data={staff.data as StaffRow[]}
                columns={columns}
                rowKey={(a) => a.id}
                caption="Console access"
              />
            )}
          </Panel>

          <Text variant="caption">
            Revoked accounts stay listed. Removing them would make &ldquo;access was taken
            away&rdquo; indistinguishable from &ldquo;this person never had access&rdquo;, which
            is the question an audit asks.
          </Text>
        </>
      )}




      <ConfirmDialog
        open={removing !== null}
        title="Remove this account?"
        /* Says what actually happens, both halves of it. "Delete" alone would
           imply the history goes too, and would not mention that access stops
           the moment this is confirmed. */
        message={
          removing
            ? `${removing.name} will lose access immediately, on every device. ` +
              `Their record is kept so past approvals stay attributable, but the ` +
              `account will no longer appear here.`
            : ''
        }
        confirmLabel="Remove"
        loading={deleteStaffM.isPending}
        onConfirm={() => {
          if (!removing) return;
          deleteStaffM.mutate({ id: removing.id }, {
            onSuccess: () => setRemoving(null),
            onError: (err) => setFailure(err instanceof Error ? err.message : 'Not removed'),
          });
        }}
        onClose={() => setRemoving(null)}
      />

      <ConfirmDialog
        open={disabling !== null}
        onClose={() => setDisabling(null)}
        onConfirm={() =>
          disabling &&
          setStatus.mutate(
            { id: disabling.id, status: 'inactive' },
            {
              onSuccess: () => setDisabling(null),
              onError: (err) => {
                setFailure(err instanceof Error ? err.message : 'Not changed');
                setDisabling(null);
              },
            },
          )
        }
        title="Revoke console access?"
        tone="danger"
        confirmLabel="Revoke access"
        loading={setStatus.isPending}
        message={
          disabling && (
            <span className="block space-y-2">
              <span className="block">
                <strong>{disabling.name}</strong> ({labelForRole(disabling.role)}) will no longer
                be able to sign in.
              </span>
              <span className="block text-ink-3">
                The account is kept, not deleted — what they approved and authorised stays on
                the record. Access can be restored later.
              </span>
            </span>
          )
        }
      />
    </Page>
  );
}

