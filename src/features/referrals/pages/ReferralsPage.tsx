import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { PageHeader, Page, Panel, Row } from '@/src/components/layout/primitives';
import { DataTable, StatGrid, Text, StatusBadge, EmptyValue, Pagination, formatDate } from '@/src/components/data';
import type { Column } from '@/src/components/data';
import { EmptyState, ErrorState, SkeletonPage, Alert } from '@/src/components/feedback';
import { Button, SegmentedControl } from '@/src/components/controls';
import { SettingsDialog } from '@/src/features/rewards/components/SettingsDialog';
import { useLoyaltySettings, useLoyaltySummary, useReferrals } from '@/src/features/rewards/hooks/useRewards';
import type { Referral } from '@/src/features/rewards/api/rewardsApi';

type ReferralRow = Record<string, unknown> & Referral;

const points = (n: number) => n.toLocaleString('en-IN');

const columns: Column<ReferralRow>[] = [
  { key: 'referrerName', header: 'Referred by', render: (f) => <Text>{f.referrerName}</Text> },
  { key: 'refereeName', header: 'New retailer', render: (f) => <Text>{f.refereeName}</Text> },
  {
    key: 'createdAt',
    header: 'Signed up',
    sortBy: (f) => f.createdAt,
    render: (f) => (
      <Text as="span" variant="secondary">
        <time dateTime={f.createdAt}>{formatDate(f.createdAt)}</time>
      </Text>
    ),
  },
  { key: 'status', header: 'Status', render: (f) => <StatusBadge status={f.status} /> },
  {
    key: 'rewardPoints',
    header: 'Points paid',
    align: 'right',
    render: (f) =>
      f.rewardPoints ? <span className="tabular-nums">{points(f.rewardPoints)}</span> : <EmptyValue />,
  },
  {
    key: 'rewardedAt',
    header: 'Rewarded',
    // Absent while pending, and absent is the honest rendering — a dash here
    // means "has not qualified yet", which is different from a zero payout.
    render: (f) =>
      f.rewardedAt ? (
        <Text as="span" variant="secondary">
          <time dateTime={f.rewardedAt}>{formatDate(f.rewardedAt)}</time>
        </Text>
      ) : (
        <EmptyValue />
      ),
  },
];

/**
 * Referral Settings.
 *
 * Referrals are part of the loyalty programme rather than a programme of their
 * own — they pay points, from the same ledger, governed by the same settings
 * row. This screen is a view onto that, not a second system.
 *
 * **The referrals data appears here and nowhere else.** It was briefly a tab on
 * Reward Settings as well; two screens showing the same table is how they end up
 * disagreeing, which is the F-01 shape. The nav has a Referral Settings
 * destination, so this is where referrals live.
 *
 * The rules dialog is shared with Reward Settings, deliberately: `referralPoints`
 * sits in the same row as the earning rate, and a separate form editing one
 * field of a shared row would let someone change what a referral is worth
 * without seeing what an order is worth.
 */
export function ReferralsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const [editing, setEditing] = useState(false);

  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(params);
    if (v === null) p.delete(k);
    else p.set(k, v);
    if (k === 'status') p.delete('page');
    setParams(p, { replace: true });
  };

  const settings = useLoyaltySettings();
  const summary = useLoyaltySummary();
  const referrals = useReferrals(status, page);

  if (settings.isPending && summary.isPending) return <SkeletonPage shape="dashboard" />;

  const notConfigured = settings.data === null;
  const paysNothing = settings.data !== null && settings.data !== undefined && settings.data.referralPoints === 0;

  return (
    <Page>
      <PageHeader
        title="Referral Settings"
        subtitle="Retailers who bring other retailers"
        actions={
          <Button variant="primary" iconLeft={Settings2} onClick={() => setEditing(true)}>
            {notConfigured ? 'Set up the programme' : 'Edit rules'}
          </Button>
        }
      />

      {notConfigured && (
        <Alert tone="warn" title="The programme is not running">
          No rules have been saved, so referrals are recorded but nothing is paid for them.
          The counts below are real; the payouts are zero because the programme has never
          run, not because nobody has referred anyone.
        </Alert>
      )}

      {paysNothing && (
        <Alert tone="warn" title="Referrals are set to pay nothing">
          The programme is configured, but the referral reward is zero points. Referrals will
          be recorded and marked rewarded without any points changing hands. If that is not
          intended, set a reward in the rules.
        </Alert>
      )}

      {summary.data && (
        <StatGrid
          items={[
            { label: 'Awaiting a first delivery', value: points(summary.data.referralsPending) },
            { label: 'Rewarded', value: points(summary.data.referralsRewarded) },
            {
              label: 'Points per referral',
              value: settings.data ? points(settings.data.referralPoints) : <EmptyValue />,
            },
          ]}
        />
      )}

      <Alert tone="info" title="A referral pays out on the new retailer's first delivery">
        Not on signup. A signup costs nothing to manufacture, so rewarding one pays for fake
        accounts; a delivered order is real trade. It also matches every other point at which
        this system recognises value — the cash book and the points ledger both wait for
        delivery. A referral sits at <strong>pending</strong> until then, however long that is.
      </Alert>

      <Row justify="between" wrap>
        <SegmentedControl
          label="Status"
          value={status}
          onChange={(v) => setParam('status', v || null)}
          options={[
            { value: '', label: 'All' },
            { value: 'pending', label: 'Pending' },
            { value: 'rewarded', label: 'Rewarded' },
          ]}
        />
      </Row>

      <Panel flush>
        {referrals.isError ? (
          <ErrorState title="Referrals could not be loaded" onRetry={() => void referrals.refetch()} />
        ) : !referrals.data?.data?.length ? (
          <EmptyState
            title={status === 'rewarded' ? 'No referral has been rewarded yet' : 'No referrals yet'}
            message={
              status === 'rewarded'
                ? 'A referral is rewarded when the new retailer takes their first delivery.'
                : 'Retailers who sign up using someone else’s referral code appear here.'
            }
          />
        ) : (
          <DataTable<ReferralRow>
            data={referrals.data.data as ReferralRow[]}
            columns={columns}
            rowKey={(f) => f.id}
            caption="Referrals"
          />
        )}
      </Panel>

      {referrals.data && referrals.data.meta.total > 25 && (
        <Row justify="between">
          <Text variant="caption">{referrals.data.meta.total} referrals</Text>
          <Pagination
            page={page}
            pageSize={25}
            total={referrals.data.meta.total}
            onPageChange={(p) => setParam('page', p <= 1 ? null : String(p))}
          />
        </Row>
      )}

      {/* Keyed so opening it remounts with the saved values rather than an
          effect resetting fields after a render has shown the previous ones. */}
      <SettingsDialog
        key={editing ? 'settings-open' : 'settings-idle'}
        open={editing}
        onClose={() => setEditing(false)}
        current={settings.data ?? null}
      />
    </Page>
  );
}
