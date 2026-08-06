import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, Page, Panel, Row } from '@/src/components/layout/primitives';
import { DataTable, Text, StatusBadge, formatDate } from '@/src/components/data';
import type { Column } from '@/src/components/data';
import { EmptyState, ErrorState, SkeletonPage, Alert, ConfirmDialog } from '@/src/components/feedback';
import { Button, SegmentedControl, Select, Input } from '@/src/components/controls';
import { hasRole, SUPER_ADMIN_ONLY } from '@/src/auth/roles';
import { useAuth } from '@/src/hooks/useAuth';
import {
  useStaff,
  usePlatformMargin,
  useSetStaffRole,
  useSetStaffStatus,
  useSetPlatformMargin,
} from '../hooks/useSettings';
import { STAFF_ROLES, type StaffAccount } from '../api/settingsApi';

const TABS = ['access', 'commercial'] as const;
type Tab = (typeof TABS)[number];

type StaffRow = Record<string, unknown> & StaffAccount;

const roleLabel = (role: string) =>
  STAFF_ROLES.find((r) => r.value === role)?.label ?? role;

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
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : 'access';
  const { user } = useAuth();
  const canChange = hasRole(user?.role, SUPER_ADMIN_ONLY);

  const staff = useStaff();
  const margin = usePlatformMargin();
  const setRole = useSetStaffRole();
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
      render: (a) => {
        const isSelf = a.id === user?.id;
        const locked = !canChange || isSelf || isLastSuperAdmin(a);
        if (locked) {
          return (
            <div className="flex flex-col">
              <Text>{roleLabel(a.role)}</Text>
              {/* Say WHY it cannot be changed. A control that is simply absent
                  reads as an oversight; a reason reads as a rule. */}
              {canChange && (
                <Text variant="caption">
                  {isSelf ? 'Your own account' : 'The last super admin'}
                </Text>
              )}
            </div>
          );
        }
        return (
          <Select
            label="Role"
            hideLabel
            options={STAFF_ROLES.map((r) => ({ value: r.value, label: r.label }))}
            value={a.role}
            disabled={setRole.isPending}
            onChange={(e) => {
              setFailure(null);
              setRole.mutate(
                { id: a.id, role: e.target.value },
                { onError: (err) => setFailure(err instanceof Error ? err.message : 'Not changed') },
              );
            }}
          />
        );
      },
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
      header: '',
      render: (a) => {
        if (!canChange) return null;
        if (a.status === 'inactive') {
          return (
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
          );
        }
        if (a.id === user?.id || isLastSuperAdmin(a)) return null;
        return (
          <Button variant="ghost" size="sm" onClick={() => { setFailure(null); setDisabling(a); }}>
            Revoke access
          </Button>
        );
      },
    },
  ];

  if (staff.isPending && margin.isPending) return <SkeletonPage shape="dashboard" />;

  return (
    <Page>
      <PageHeader
        title="Settings"
        subtitle="Who has access, and the levers that are not owned by another screen"
        actions={
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
              { value: 'commercial', label: 'Commercial' },
            ]}
          />
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

      {tab === 'commercial' && <CommercialTab canChange={canChange} />}

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
                <strong>{disabling.name}</strong> ({roleLabel(disabling.role)}) will no longer
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

/**
 * The platform margin.
 *
 * Separated out because it is one field with a long explanation, and inlining it
 * would have made the page component about two unrelated things.
 */
function CommercialTab({ canChange }: { canChange: boolean }) {
  const margin = usePlatformMargin();
  const save = useSetPlatformMargin();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const current = margin.data;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    // At most two decimals — the column is numeric(5,2), so anything finer is
    // silently rounded by the database and the operator never learns.
    if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) {
      return setError('Enter a percentage with at most two decimal places');
    }
    const pct = Number(value.trim());
    if (pct <= 0 || pct >= 100) return setError('A margin must be above 0 and below 100');

    save.mutate(pct, {
      onSuccess: () => {
        setSaved(true);
        setValue('');
      },
      onError: (err) => setError(err instanceof Error ? err.message : 'Not saved'),
    });
  };

  return (
    <Panel title="Platform margin">
      {margin.isError ? (
        <ErrorState title="The margin could not be loaded" onRetry={() => void margin.refetch()} />
      ) : (
        <div className="space-y-4">
          <dl>
            <dt className="text-xs text-ink-3">Currently</dt>
            <dd className="text-lg tabular-nums text-ink">
              {current === undefined ? '—' : `${current}%`}
            </dd>
          </dl>

          <Alert tone="info" title="Changing this does not re-price anything already sold">
            Every order records its own commission rate at the moment of sale, so past orders
            and pending settlements keep the terms they were agreed on. Only products listed
            after the change use the new figure.
          </Alert>

          {saved && (
            <Alert tone="ok" title="Saved">
              New listings will use this margin.
            </Alert>
          )}

          {canChange ? (
            <form onSubmit={submit} className="space-y-3">
              {error && (
                <Alert tone="bad" title="Not saved">
                  {error}
                </Alert>
              )}
              <Input
                label="New margin (%)"
                inputMode="decimal"
                placeholder={current === undefined ? '' : String(current)}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                hint="Two decimal places at most"
              />
              <Row justify="end">
                <Button variant="primary" type="submit" loading={save.isPending} disabled={!value}>
                  Save margin
                </Button>
              </Row>
            </form>
          ) : (
            <Text variant="caption">
              Only a super admin can change the platform margin.
            </Text>
          )}
        </div>
      )}
    </Panel>
  );
}
