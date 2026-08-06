import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { SegmentedControl, Select, Input } from '@/src/components/controls';
import { useRetailerProfiles, useSegmentCounts, useCampaigns } from '../hooks/useSalesBrain';
import {
  toTaka,
  DEFAULT_WINDOW,
  VALUE_SEGMENTS,
  BEHAVIOUR_SEGMENTS,
  type RetailerProfile,
  type Campaign,
} from '../api/salesBrainApi';

const VIEWS = ['retailers', 'campaigns'] as const;
type View = (typeof VIEWS)[number];

type ProfileRow = Record<string, unknown> & RetailerProfile;
type CampaignRow = Record<string, unknown> & Campaign;

const VALUE_LABEL: Record<string, string> = {
  top: 'Top third',
  middle: 'Middle third',
  small: 'Bottom third',
  none: 'Unranked',
};

const BEHAVIOUR_LABEL: Record<string, string> = {
  active: 'Active',
  churn_risk: 'At risk',
  inactive: 'Lapsed',
  never_ordered: 'Never ordered',
};

/**
 * Sales Brain — who the retailers are, and who to call.
 *
 * **Every figure is counted from delivered orders.** Not from a stored segment,
 * and not from a threshold in the code. Value is a *tercile of real spend*, so
 * "top third" means top third of this business rather than a taka figure
 * somebody guessed. The activity window is a control on this page, sent with
 * every request — the server has no default and refuses a call that omits one,
 * so the number and its definition always travel together.
 *
 * The prototype defaulted every retailer to `'Active Buyer'` and
 * `'Medium Potential'` when unset. A retailer who had never bought anything
 * looked exactly like the best customer on the platform, on the screen the sales
 * team uses to decide who to ring.
 *
 * **"Browsing not buying" is absent, deliberately.** It needs product-view
 * events and nothing records them. An empty bucket would read as "nobody is
 * browsing without buying", which is the opposite of what is true.
 */
export function SalesBrainPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('view');
  const view: View = VIEWS.includes(raw as View) ? (raw as View) : 'retailers';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const value = params.get('value') ?? '';
  const behaviour = params.get('behaviour') ?? '';

  // The window lives in the URL so a shared link carries the definition of
  // "active" that the sender was looking at.
  const activeWithinDays =
    Number(params.get('activeDays') ?? '') || DEFAULT_WINDOW.activeWithinDays;
  const churnAfterDays = Number(params.get('churnDays') ?? '') || DEFAULT_WINDOW.churnAfterDays;
  const window = { activeWithinDays, churnAfterDays };

  const [windowDraft, setWindowDraft] = useState(String(activeWithinDays));

  const counts = useSegmentCounts(window);
  const profiles = useRetailerProfiles(window, { valueSegment: value, behaviourSegment: behaviour }, page);
  const campaigns = useCampaigns();

  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(params);
    if (v === null || v === '') p.delete(k);
    else p.set(k, v);
    if (k !== 'page') p.delete('page');
    setParams(p, { replace: true });
  };

  const profileColumns: Column<ProfileRow>[] = [
    {
      key: 'shopName',
      header: 'Retailer',
      render: (p) => (
        <div>
          <Text>{p.shopName}</Text>
          <Text variant="caption">
            {p.district} · {p.phone}
          </Text>
        </div>
      ),
    },
    {
      key: 'orderCount',
      header: 'Orders',
      align: 'right',
      sortBy: (p) => p.orderCount,
      // Delivered orders only. A cancelled order is not a purchase.
      render: (p) =>
        p.orderCount > 0 ? (
          <span className="tabular-nums">{p.orderCount}</span>
        ) : (
          <EmptyValue />
        ),
    },
    {
      key: 'totalSpentMinor',
      header: 'Spent',
      align: 'right',
      sortBy: (p) => p.totalSpentMinor,
      render: (p) =>
        p.orderCount > 0 ? <Money amount={toTaka(p.totalSpentMinor)} /> : <EmptyValue />,
    },
    {
      key: 'avgOrderMinor',
      header: 'Average order',
      align: 'right',
      sortBy: (p) => p.avgOrderMinor,
      // Server-computed. Dividing spend by orders here would be a second
      // definition of the same figure — guard G12 forbids the arithmetic.
      render: (p) =>
        p.orderCount > 0 ? <Money amount={toTaka(p.avgOrderMinor)} /> : <EmptyValue />,
    },
    {
      key: 'valueSegment',
      header: 'Value',
      render: (p) => <Text variant="caption">{VALUE_LABEL[p.valueSegment] ?? p.valueSegment}</Text>,
    },
    {
      key: 'behaviourSegment',
      header: 'Activity',
      render: (p) => (
        <StatusBadge status={BEHAVIOUR_LABEL[p.behaviourSegment] ?? p.behaviourSegment} />
      ),
    },
    {
      key: 'lastOrderAt',
      header: 'Last order',
      sortBy: (p) => p.lastOrderAt ?? '',
      render: (p) =>
        p.lastOrderAt ? (
          <div>
            <Text as="span" variant="secondary">
              <time dateTime={p.lastOrderAt}>{formatDate(p.lastOrderAt)}</time>
            </Text>
            {p.daysSinceOrder != null && (
              <Text variant="caption">{p.daysSinceOrder} days ago</Text>
            )}
          </div>
        ) : (
          // Never ordered. Absent, not a zero date — those read differently.
          <EmptyValue />
        ),
    },
  ];

  const campaignColumns: Column<CampaignRow>[] = [
    {
      key: 'name',
      header: 'Campaign',
      render: (c) => (
        <div>
          <Text>{c.name}</Text>
          {c.segmentName && <Text variant="caption">{c.segmentName}</Text>}
        </div>
      ),
    },
    { key: 'type', header: 'Kind', render: (c) => <StatusBadge status={c.type} /> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'startDate',
      header: 'Runs',
      render: (c) => (
        <Text as="span" variant="secondary">
          {formatDate(c.startDate)} — {formatDate(c.endDate)}
        </Text>
      ),
    },
  ];

  if (counts.isPending && profiles.isPending) return <SkeletonPage shape="dashboard" />;

  return (
    <Page>
      <PageHeader
        title="Sales Brain"
        subtitle="Who is buying, who has stopped, and who to call"
        actions={
          <SegmentedControl<View>
            label="View"
            value={view}
            onChange={(v) => setParam('view', v)}
            options={[
              { value: 'retailers', label: 'Retailers' },
              { value: 'campaigns', label: 'Campaigns' },
            ]}
          />
        }
      />

      {view === 'retailers' && (
        <>
          {counts.data && (
            <StatGrid
              items={[
                { label: 'Active', value: String(counts.data.active) },
                { label: 'At risk', value: String(counts.data.churn_risk) },
                { label: 'Lapsed', value: String(counts.data.inactive) },
                { label: 'Never ordered', value: String(counts.data.never_ordered) },
              ]}
            />
          )}

          <Alert tone="info" title={`"Active" means an order in the last ${activeWithinDays} days`}>
            That window is a setting on this page, not a rule in the code — change it and every
            figure above moves with it. Value is a third of this business by spend, so &ldquo;top
            third&rdquo; is relative to your own retailers rather than a taka figure anyone
            guessed. Only delivered orders count: a cancelled order is not a purchase.
          </Alert>

          <Alert tone="warn" title="&ldquo;Browsing not buying&rdquo; is not available">
            Identifying retailers who look but do not order needs product-view events, and
            nothing records them. Showing that segment empty would read as &ldquo;nobody browses
            without buying&rdquo;, which is not something anyone knows.
          </Alert>

          <Row justify="between" wrap>
            <Row gap="sm" wrap>
              <Select
                label="Value"
                options={VALUE_SEGMENTS}
                value={value}
                onChange={(e) => setParam('value', e.target.value)}
              />
              <Select
                label="Activity"
                options={BEHAVIOUR_SEGMENTS}
                value={behaviour}
                onChange={(e) => setParam('behaviour', e.target.value)}
              />
            </Row>
            <Input
              label="Active within (days)"
              inputMode="numeric"
              value={windowDraft}
              onChange={(e) => setWindowDraft(e.target.value)}
              onBlur={() => {
                const n = Number(windowDraft);
                if (Number.isInteger(n) && n > 0) setParam('activeDays', String(n));
                else setWindowDraft(String(activeWithinDays));
              }}
              hint={`Lapsed after ${churnAfterDays}`}
            />
          </Row>

          <Panel flush>
            {profiles.isError ? (
              <ErrorState
                title="Retailer profiles could not be loaded"
                onRetry={() => void profiles.refetch()}
              />
            ) : !profiles.data?.data.length ? (
              <EmptyState
                title="No retailer matches"
                message="Widen the filters, or the activity window, to see more."
              />
            ) : (
              <DataTable<ProfileRow>
                data={profiles.data.data as ProfileRow[]}
                columns={profileColumns}
                rowKey={(p) => p.retailerId}
                caption="Retailer profiles"
              />
            )}
          </Panel>

          {profiles.data && profiles.data.meta.total > 25 && (
            <Row justify="between">
              <Text variant="caption">{profiles.data.meta.total} retailers</Text>
              <Pagination
                page={page}
                pageSize={25}
                total={profiles.data.meta.total}
                onPageChange={(p) => setParam('page', p <= 1 ? null : String(p))}
              />
            </Row>
          )}
        </>
      )}

      {view === 'campaigns' && (
        <>
          <Alert tone="info" title="A campaign is recorded here, not sent">
            Defining a campaign records who it targets and what it offers. Nothing is delivered
            — no push, no SMS, no email — because no delivery channel is connected. A campaign
            that half-sends is worse than one that has not sent, so this says which it is.
          </Alert>
          <Panel flush>
            {campaigns.isError ? (
              <ErrorState
                title="Campaigns could not be loaded"
                onRetry={() => void campaigns.refetch()}
              />
            ) : !campaigns.data?.length ? (
              <EmptyState
                title="No campaigns yet"
                message="Creating one was impossible until now — the route omitted two required dates and failed on every attempt. It works; nothing has used it yet."
              />
            ) : (
              <DataTable<CampaignRow>
                data={campaigns.data as CampaignRow[]}
                columns={campaignColumns}
                rowKey={(c) => c.id}
                caption="Campaigns"
              />
            )}
          </Panel>
        </>
      )}
    </Page>
  );
}
