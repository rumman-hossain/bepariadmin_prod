import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader, Page, Panel, Toolbar } from '@/src/components/layout/primitives';
import { DataTable, Identifier, Money, StatusBadge, Text, formatDate } from '@/src/components/data';
import type { Column } from '@/src/components/data';
import { EmptyState, ErrorState, SkeletonPage, Alert } from '@/src/components/feedback';
import { Button, SegmentedControl } from '@/src/components/controls';
import { useCouponList, useCreateCoupon } from '../hooks/useCoupons';
import { CouponDialog } from './CouponDialog';
import { isExpired, type Coupon, type CouponInput } from '../schemas/couponSchema';

type CouponRow = Record<string, unknown> & Coupon;
const FILTERS = ['all', 'active', 'expired'] as const;
type Filter = (typeof FILTERS)[number];

const columns: Column<CouponRow>[] = [
  { key: 'code', header: 'Code', sortBy: (c) => c.code, render: (c) => <Identifier value={c.code} /> },
  {
    key: 'discount',
    header: 'Discount',
    render: (c) =>
      c.type === 'percent' ? (
        <Text>{c.value}% off</Text>
      ) : (
        <Text>
          <Money amount={c.value} /> off
        </Text>
      ),
  },
  {
    key: 'minOrder',
    header: 'Minimum order',
    align: 'right',
    sortBy: (c) => c.minOrder,
    render: (c) => (c.minOrder > 0 ? <Money amount={c.minOrder} /> : <Text variant="caption">Any</Text>),
  },
  {
    key: 'maxUsesPerUser',
    header: 'Uses / buyer',
    align: 'right',
    sortBy: (c) => c.maxUsesPerUser,
    render: (c) => <span className="cell-numeric">{c.maxUsesPerUser}</span>,
  },
  {
    key: 'expiresAt',
    header: 'Expires',
    sortBy: (c) => c.expiresAt,
    render: (c) => (
      <Text as="span" variant="secondary">
        <time dateTime={c.expiresAt}>{formatDate(c.expiresAt)}</time>
      </Text>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    // Derived from the clock. The server has no status field.
    render: (c) => <StatusBadge status={isExpired(c) ? 'archived' : 'active'} />,
  },
];

/**
 * Coupon Settings.
 *
 * Everything shown is real — `GET /coupons/` returns live rows.
 *
 * Three absences are stated on the screen rather than hidden:
 *
 *   - **No edit, no delete.** Only GET and POST exist. Expiry is the only way
 *     to stop a coupon.
 *   - **Uses-per-buyer is not enforced.** The field is stored, but nothing
 *     records who redeemed what, so the limit cannot be checked (F-07).
 *   - **No redemption reporting**, for the same reason. There is no usage count
 *     to show, so none is shown — rather than a zero that would read as "nobody
 *     used it".
 */
export function CouponsPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('show');
  const filter: Filter = FILTERS.includes(raw as Filter) ? (raw as Filter) : 'all';

  const { data, isPending, isError, refetch } = useCouponList();
  const create = useCreateCoupon();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const rows = useMemo<CouponRow[]>(() => {
    const all = (data ?? []) as CouponRow[];
    if (filter === 'active') return all.filter((c) => !isExpired(c));
    if (filter === 'expired') return all.filter((c) => isExpired(c));
    return all;
  }, [data, filter]);

  const setFilter = (next: Filter) => {
    const p = new URLSearchParams(params);
    if (next === 'all') p.delete('show');
    else p.set('show', next);
    setParams(p, { replace: true });
  };

  const handleCreate = async (input: CouponInput) => {
    setSaveError(null);
    try {
      await create.mutateAsync(input);
      setDialogOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not create the coupon.');
    }
  };

  if (isPending) return <SkeletonPage shape="list" />;
  if (isError) {
    return (
      <ErrorState
        title="Coupons could not be loaded"
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <Page>
      <PageHeader
        title="Coupon Settings"
        subtitle="Discount codes for retailers"
        actions={
          <Button
            variant="primary"
            iconLeft={Plus}
            onClick={() => {
              setSaveError(null);
              setDialogOpen(true);
            }}
          >
            Create coupon
          </Button>
        }
      />

      <Alert tone="warn" title="Uses per buyer is recorded but not enforced">
        Nothing records which buyer redeemed which coupon, so a per-buyer limit cannot be
        checked and redemption counts cannot be reported. A coupon set to one use per buyer
        can currently be used repeatedly.
      </Alert>

      <Toolbar
        actions={
          <SegmentedControl<Filter>
            label="Show"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'expired', label: 'Expired' },
            ]}
          />
        }
      >
        <Text variant="caption">
          {rows.length} of {data.length} coupons
        </Text>
      </Toolbar>

      <Panel flush>
        {rows.length === 0 ? (
          filter === 'all' ? (
            <EmptyState
              title="No coupons yet"
              message="Create a code retailers can use at checkout."
              action={
                <Button variant="primary" iconLeft={Plus} onClick={() => setDialogOpen(true)}>
                  Create coupon
                </Button>
              }
            />
          ) : (
            <EmptyState
              title={`No ${filter} coupons`}
              message="Switch the filter to see the rest."
              action={
                <Button variant="secondary" onClick={() => setFilter('all')}>
                  Show all
                </Button>
              }
            />
          )
        ) : (
          <DataTable<CouponRow>
            data={rows}
            columns={columns}
            rowKey={(c) => c.id}
            caption={`Coupons — ${filter}`}
          />
        )}
      </Panel>

      <CouponDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
        submitting={create.isPending}
        error={saveError}
      />
    </Page>
  );
}
