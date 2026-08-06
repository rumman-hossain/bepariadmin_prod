import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, Page, Panel, Row } from '@/src/components/layout/primitives';
import { DataTable, Pagination, Text } from '@/src/components/data';
import { EmptyState, ErrorState, SkeletonPage } from '@/src/components/feedback';
import { Button } from '@/src/components/controls';
import { UserPlus } from 'lucide-react';
import { useRetailerList } from '../hooks/useRetailers';
import { useCategoryOptions } from '@/src/hooks/useCategoryOptions';
import { SearchFilterBar } from '@/src/components/data/SearchFilterBar';
import { DISTRICT_OPTIONS } from '@/src/constants/districts';
import { useRetailerNavigation } from '../hooks/useRetailerNavigation';
import { retailerColumns, type RetailerRow } from './retailerColumns';
import { RetailerStats } from '../components/RetailerStats';

const PAGE_SIZE = 25;

/**
 * Retailers — the shops that buy.
 *
 * **Everything here is real.** `GET /admin/retailers` is paginated server-side
 * and returns `meta.total`; every row and every figure comes from the database.
 *
 * **Actions live on the DETAIL screen, not here.** Suspend, activate and
 * reset-password all exist now — this docstring used to say they did not, which
 * was true when it was written and stopped being true several rounds ago.
 * Keeping them off the list is deliberate: suspending a shop signs it out
 * immediately, and that is a decision to make while looking at who the shop is,
 * not from a row menu one mis-click away.
 *
 * Paging AND filter state live in the URL, so a filtered view is linkable and
 * survives a refresh. Filtering happens on the SERVER: the endpoint returns up
 * to 1000 rows, and narrowing in the browser would keep fetching all of them
 * while making the total that drives the pager describe a different set.
 */
export function RetailersPage() {
  const { goToCreate, goToDetail } = useRetailerNavigation();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const search = params.get('search') ?? '';
  const status = params.get('status') ?? '';
  const district = params.get('district') ?? '';
  const category = params.get('category') ?? '';

  const { categories } = useCategoryOptions();

  /*
   * Changing a filter resets to page 1.
   *
   * Without it, someone on page 4 who narrows to twelve results lands on a page
   * that no longer exists and sees an empty table — which reads as "no matches"
   * rather than "you are past the end".
   */
  const setFilter = (key: string, value: string) => {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    p.delete('page');
    setParams(p, { replace: true });
  };

  const { data, isPending, isError, isFetching, refetch } = useRetailerList({
    page,
    limit: PAGE_SIZE,
    search,
    status,
    district,
    category,
  });

  const rows = useMemo<RetailerRow[]>(() => (data?.data ?? []) as RetailerRow[], [data]);
  const total = data?.total ?? 0;

  const goToPage = (next: number) => {
    const p = new URLSearchParams(params);
    if (next <= 1) p.delete('page');
    else p.set('page', String(next));
    setParams(p, { replace: true });
  };

  if (isPending) return <SkeletonPage shape="list" />;

  if (isError) {
    return (
      <ErrorState
        title="Retailers could not be loaded"
        message="The retailer directory did not respond."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <Page>
      <PageHeader
        title="Retailers"
        subtitle="Shops buying on the platform"
        actions={
          <Button iconLeft={UserPlus} onClick={goToCreate}>
            Onboard retailer
          </Button>
        }
      />

      {/*
        A banner used to sit here saying suspending and document checks were not
        built. Both work — suspend for several rounds, documents since the link
        endpoint was registered — and the docstring above this component already
        said so. It was the first thing an operator read, and it was false.

        Nothing replaces it. The stat strip below is the useful thing to put at
        the top of a directory: how many shops, and how many are waiting on you.
      */}
      <RetailerStats
        total={total}
        counts={data?.statusCounts}
        activeStatus={status}
        onPick={(next: string) => setFilter('status', next === status ? '' : next)}
      />

      <SearchFilterBar
        searchTerm={search}
        onSearchChange={(v) => setFilter('search', v)}
        searchPlaceholder="Search shop, owner or phone…"
        filters={[
          {
            key: 'status',
            label: 'Status',
            allLabel: 'Any status',
            value: status,
            // Only the three a retailer can actually be. Offering more would
            // produce filters that always return nothing.
            options: [
              { label: 'Active', value: 'active' },
              { label: 'Pending', value: 'pending' },
              { label: 'Suspended', value: 'suspended' },
              // Rejected applications are still rows, and the only way to reach
              // one to delete it permanently is to filter for it.
              { label: 'Rejected', value: 'rejected' },
            ],
            onChange: (v) => setFilter('status', v),
          },
          {
            key: 'district',
            label: 'District',
            allLabel: 'All districts',
            value: district,
            options: DISTRICT_OPTIONS.map((d) => ({ label: d, value: d })),
            onChange: (v) => setFilter('district', v),
          },
          {
            key: 'category',
            label: 'Category',
            allLabel: 'All categories',
            value: category,
            // The same source the form's picker uses, so a filter can never
            // offer a category nothing could have been saved with.
            options: categories.map((c) => ({ label: c.name, value: c.name })),
            onChange: (v) => setFilter('category', v),
          },
        ]}
        onClearAll={() => setParams(new URLSearchParams(), { replace: true })}
      />

      <Panel flush>
        {rows.length === 0 ? (
          <EmptyState
            title="No retailers yet"
            message="Shops appear here once they register through the buyer app."
          />
        ) : (
          <DataTable<RetailerRow>
            data={rows}
            columns={retailerColumns}
            rowKey={(r) => r.id}
            /*
              The way in to everything else. Suspend, activate, reset password,
              the financials and the document vault all live on the detail
              screen, and until this existed there was no route to any of them
              from the console — the endpoints were built and unreachable.

              DataTable puts onRowClick on a focusable row with key handling, so
              this is reachable without a mouse.
            */
            onRowClick={(r) => goToDetail(r.id)}
            caption={`Retailers — page ${page} of ${Math.max(1, Math.ceil(total / PAGE_SIZE))}`}
          />
        )}
      </Panel>

      {total > PAGE_SIZE && (
        <Row justify="between">
          <Text variant="caption">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </Text>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={goToPage}
            // Held while a page is in flight, so a second click cannot step over
            // a page of retailers the operator never saw.
            disabled={isFetching}
          />
        </Row>
      )}
    </Page>
  );
}
