import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { PageHeader, Page, Panel, Row } from '@/src/components/layout/primitives';
import {
  DataTable,
  StatGrid,
  Money,
  Text,
  StatusBadge,
  EmptyValue,
  Pagination,
  formatDate,
} from '@/src/components/data';
import type { Column } from '@/src/components/data';
import { EmptyState, ErrorState, SkeletonPage, Alert } from '@/src/components/feedback';
import { Button, SegmentedControl } from '@/src/components/controls';
import { hasRole, FINANCE } from '@/src/auth/roles';
import { useAuth } from '@/src/hooks/useAuth';
import { SettingsDialog } from '../components/SettingsDialog';
import { AdjustDialog } from '../components/AdjustDialog';
import {
  useLoyaltySettings,
  useLoyaltySummary,
  useBalances,
  usePoints,
} from '../hooks/useRewards';
import { toTaka, type RetailerBalance, type PointsEntry } from '../api/rewardsApi';

const TABS = ['overview', 'retailers', 'ledger'] as const;
type Tab = (typeof TABS)[number];

type BalanceRow = Record<string, unknown> & RetailerBalance;
type PointsRow = Record<string, unknown> & PointsEntry;

/** Points are a count, not money — grouped, but never given a currency mark. */
const points = (n: number) => n.toLocaleString('en-IN');

const balanceColumns: Column<BalanceRow>[] = [
  {
    key: 'retailerName',
    header: 'Retailer',
    render: (b) => (
      <div>
        <Text>{b.shopName}</Text>
        <Text variant="caption">{b.retailerName}</Text>
      </div>
    ),
  },
  { key: 'tier', header: 'Tier', render: (b) => <StatusBadge status={b.tier} /> },
  {
    key: 'balance',
    header: 'Balance',
    align: 'right',
    sortBy: (b) => b.balance,
    render: (b) => <span className="tabular-nums">{points(b.balance)}</span>,
  },
  {
    key: 'totalEarned',
    header: 'Earned',
    align: 'right',
    sortBy: (b) => b.totalEarned,
    // Lifetime, and the figure the tier is derived from. It never falls, which
    // is why redeeming cannot demote anyone.
    render: (b) => <span className="tabular-nums text-ink-3">{points(b.totalEarned)}</span>,
  },
  {
    key: 'totalRedeemed',
    header: 'Redeemed',
    align: 'right',
    sortBy: (b) => b.totalRedeemed,
    render: (b) =>
      b.totalRedeemed > 0 ? (
        <span className="tabular-nums text-ink-3">{points(b.totalRedeemed)}</span>
      ) : (
        <EmptyValue />
      ),
  },
];

const pointsColumns: Column<PointsRow>[] = [
  {
    key: 'createdAt',
    header: 'When',
    sortBy: (e) => e.createdAt,
    render: (e) => (
      <Text as="span" variant="secondary">
        <time dateTime={e.createdAt}>{formatDate(e.createdAt)}</time>
      </Text>
    ),
  },
  { key: 'event', header: 'Event', render: (e) => <StatusBadge status={e.event} /> },
  {
    key: 'points',
    header: 'Points',
    align: 'right',
    sortBy: (e) => e.points,
    // Signed, and the sign is the whole meaning of the row. Rendered with an
    // explicit + so an award never reads as ambiguous next to a deduction.
    render: (e) => (
      <span className={`tabular-nums ${e.points < 0 ? 'text-bad' : 'text-ok'}`}>
        {e.points > 0 ? '+' : ''}
        {points(e.points)}
      </span>
    ),
  },
  {
    key: 'note',
    header: 'Reason',
    // Required on adjustments by a database constraint, absent on automatic
    // events — there is nothing to say about an order award beyond the order.
    render: (e) => (e.note ? <Text>{e.note}</Text> : <EmptyValue />),
  },
];

/**
 * Reward Settings — the points programme.
 *
 * **The programme can be off, and saying so is this screen's first job.** Until
 * someone saves an earning rate there is no settings row, nothing is awarded,
 * and every figure below is zero for that reason rather than because trade is
 * slow. A screen that showed those zeros without explanation would read as a
 * working programme with no activity, which is the same failure as a fraud
 * screen showing no flags when detection is not running.
 *
 * **Referrals are NOT here.** They pay from this same ledger, but they have
 * their own nav destination and their own screen. Showing the same table in two
 * places is how two screens end up disagreeing — the F-01 shape — so the
 * referrals view lives at `/referrals` and only there.
 *
 * **Points are a count, never money.** They are grouped for readability but
 * carry no currency mark. The one genuinely monetary figure — what the
 * outstanding balance would cost if it were all redeemed — is a server field,
 * in paisa, converted once at the render boundary. No arithmetic on money
 * happens here; guard G12 fails the build on it.
 */
export function RewardsPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : 'overview';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const event = params.get('event') ?? '';
  const { user } = useAuth();

  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(params);
    if (v === null) p.delete(k);
    else p.set(k, v);
    if (k === 'tab') p.delete('page');
    setParams(p, { replace: true });
  };

  const settings = useLoyaltySettings();
  const summary = useLoyaltySummary();
  const balances = useBalances(page);
  const ledger = usePoints('', event, page);

  const [editing, setEditing] = useState(false);
  const [adjusting, setAdjusting] = useState<BalanceRow | null>(null);

  // Adjustment mints points out of nothing, which is the same authority as
  // paying a supplier — the server gates it on FinanceOnly. Hiding rather than
  // disabling, so nobody is shown a control that will answer 403.
  const canAdjust = hasRole(user?.role, FINANCE);

  const balanceCols: Column<BalanceRow>[] = useMemo(
    () =>
      canAdjust
        ? [
            ...balanceColumns,
            {
              key: 'action',
              header: '',
              render: (b) => (
                <Button variant="ghost" size="sm" onClick={() => setAdjusting(b)}>
                  Adjust
                </Button>
              ),
            },
          ]
        : balanceColumns,
    [canAdjust],
  );

  if (settings.isPending && summary.isPending) return <SkeletonPage shape="dashboard" />;

  const notConfigured = settings.data === null;

  return (
    <Page>
      <PageHeader
        title="Reward Settings"
        subtitle="Points earned on delivery, redeemed against a future order"
        actions={
          <Row gap="sm" wrap>
            <Button variant="primary" iconLeft={Settings2} onClick={() => setEditing(true)}>
              {notConfigured ? 'Set up the programme' : 'Edit rules'}
            </Button>
            <SegmentedControl<Tab>
              label="View"
              value={tab}
              onChange={(t) => setParam('tab', t)}
              options={[
                { value: 'overview', label: 'Overview' },
                { value: 'retailers', label: 'Retailers' },
                { value: 'ledger', label: 'Points ledger' },
              ]}
            />
          </Row>
        }
      />

      {notConfigured && (
        <Alert tone="warn" title="The programme is not running">
          No earning rate has been set, so no points are being awarded on any order. The
          figures below are zero for that reason — not because retailers are inactive.
          Nothing starts until the rules are saved.
        </Alert>
      )}

      {tab === 'overview' &&
        (summary.isError ? (
          <ErrorState title="The summary could not be loaded" onRetry={() => void summary.refetch()} />
        ) : summary.data ? (
          <>
            <StatGrid
              items={[
                { label: 'Retailers with points', value: points(summary.data.membersWithPoints) },
                { label: 'Points outstanding', value: points(summary.data.outstandingPoints) },
                {
                  label: 'What they are worth',
                  // The programme's liability: what every unspent point would
                  // cost if redeemed tomorrow. Absent rather than zero when no
                  // redemption rate exists — a rate nobody has set cannot value
                  // anything.
                  value: summary.data.configured ? (
                    <Money amount={toTaka(summary.data.outstandingValueMinor)} />
                  ) : (
                    <EmptyValue />
                  ),
                },
                { label: 'Referrals rewarded', value: points(summary.data.referralsRewarded) },
              ]}
            />

            {settings.data && (
              <Panel title="Current rules">
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ['Earning', `1 point per ৳${settings.data.earnTakaPerPoint}`],
                    ['Point value', `৳${toTaka(settings.data.redeemPaisaPerPoint)} each`],
                    ['Minimum redemption', `${points(settings.data.minRedeemPoints)} points`],
                    ['Per referral', `${points(settings.data.referralPoints)} points`],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-ink-3">{label}</dt>
                      <dd className="text-sm text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>
            )}

            <Panel title="By tier">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {['Bronze', 'Silver', 'Gold', 'Platinum'].map((name, i) => (
                  <div key={name}>
                    <dt className="text-xs text-ink-3">{name}</dt>
                    <dd className="text-lg tabular-nums text-ink">
                      {points(summary.data.byTier[i] ?? 0)}
                    </dd>
                  </div>
                ))}
              </dl>
              <Text variant="caption">
                Tier follows lifetime points earned, so spending points never moves a retailer
                down.
              </Text>
            </Panel>
          </>
        ) : null)}

      {tab === 'retailers' && (
        <Panel flush>
          {balances.isError ? (
            <ErrorState title="Balances could not be loaded" onRetry={() => void balances.refetch()} />
          ) : !balances.data?.data?.length ? (
            <EmptyState
              title="No retailer has earned points yet"
              message={
                notConfigured
                  ? 'Nothing is being awarded until the programme rules are saved.'
                  : 'Balances appear here as orders are delivered.'
              }
            />
          ) : (
            <DataTable<BalanceRow>
              data={balances.data.data as BalanceRow[]}
              columns={balanceCols}
              rowKey={(b) => b.retailerId}
              caption="Retailer point balances"
            />
          )}
        </Panel>
      )}

      {tab === 'ledger' && (
        <>
          <Row justify="between" wrap>
            <SegmentedControl
              label="Event"
              value={event}
              onChange={(v) => setParam('event', v || null)}
              options={[
                { value: '', label: 'All' },
                { value: 'order', label: 'Orders' },
                { value: 'referral', label: 'Referrals' },
                { value: 'adjustment', label: 'Adjustments' },
                { value: 'redemption', label: 'Redemptions' },
              ]}
            />
          </Row>
          <Panel flush>
            {ledger.isError ? (
              <ErrorState title="The ledger could not be loaded" onRetry={() => void ledger.refetch()} />
            ) : !ledger.data?.data?.length ? (
              <EmptyState
                title="Nothing recorded yet"
                message="Every award, adjustment and redemption appears here, with its reason."
              />
            ) : (
              <DataTable<PointsRow>
                data={ledger.data.data as PointsRow[]}
                columns={pointsColumns}
                rowKey={(e) => e.id}
                caption="Points ledger"
              />
            )}
          </Panel>
        </>
      )}

      {(() => {
        const active =
          tab === 'retailers' ? balances.data : tab === 'ledger' ? ledger.data : null;
        if (!active || active.meta.total <= 25) return null;
        return (
          <Row justify="between">
            <Text variant="caption">{active.meta.total} rows</Text>
            <Pagination
              page={page}
              pageSize={25}
              total={active.meta.total}
              onPageChange={(p) => setParam('page', p <= 1 ? null : String(p))}
            />
          </Row>
        );
      })()}

      {/*
        Both dialogs are keyed so that opening one REMOUNTS it with fresh state,
        rather than an effect resetting fields after a render has already shown
        the previous values. On forms that change money and balances, that stale
        frame is a correctness problem, not a flicker.
      */}
      <SettingsDialog
        key={editing ? 'settings-open' : 'settings-idle'}
        open={editing}
        onClose={() => setEditing(false)}
        current={settings.data ?? null}
      />
      <AdjustDialog
        key={adjusting?.retailerId ?? 'adjust-idle'}
        retailer={adjusting}
        onClose={() => setAdjusting(null)}
      />
    </Page>
  );
}
