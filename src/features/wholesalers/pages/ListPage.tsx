import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/src/components/layout/primitives';
import { Button } from '@/src/components/controls';
import { SearchFilterBar } from '@/src/components/data/SearchFilterBar';
import { FilterChips, type ActiveFilter } from '@/src/components/data/FilterChips';
import { DataTable, Pagination, Text } from '@/src/components/data';
import { Alert, EmptyState, ErrorState, SkeletonTable } from '@/src/components/feedback';
import { useWholesalersQuery } from '../queries';
import { useWholesalerNavigation } from '../hooks/useWholesalerNavigation';
import { useCategoryOptions } from '@/src/hooks/useCategoryOptions';
import { DISTRICT_OPTIONS } from '@/src/constants/districts';
import { SupplierQueue } from '../components/SupplierQueue';
import { SUPPLIER_STATUS_FILTERS } from '../components/supplierStatusFilters';
import { supplierColumns } from './supplierColumns';
import { Plus, RefreshCw } from 'lucide-react';
import type { SupplierQuery } from '../types';

const PAGE_SIZE = 25;

/**
 * Suppliers — the directory an operator opens to answer two questions: what is
 * waiting on me, and where is the supplier who just phoned.
 *
 * The screen this replaces could answer neither. There was **no status filter
 * at all** — status was a column, never a filter — so the one question the
 * directory exists for could not be asked, and the whole Review → Approve
 * workflow was invisible from the screen meant to lead to it.
 *
 * Three other things changed with it:
 *
 *   - **Filtering happens on the SERVER.** The old screen fetched up to 1000
 *     suppliers and narrowed the array in the browser, so nothing past the
 *     thousandth was reachable and every keystroke re-filtered the lot.
 *   - **Filter state lives in the URL**, so a narrowed view is a link somebody
 *     can send and a reload does not lose it. It used to live in a Zustand
 *     store, which survived neither.
 *   - **Removed suppliers are reachable.** A soft delete was indistinguishable
 *     from a permanent one because nothing could show or undo it.
 *
 * Actions stay on the DETAIL screen. Suspending signs a supplier out of every
 * device immediately; that is a decision to make while looking at who they are,
 * not from a row one mis-click away from the row above.
 */
export function ListPage() {
  const { goToCreate, goToDetail } = useWholesalerNavigation();
  const [params, setParams] = useSearchParams();
  const { categories } = useCategoryOptions();

  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const get = (k: string) => params.get(k) ?? '';

  /*
   * Changing a filter resets to page 1.
   *
   * Without it, somebody on page 4 who narrows to twelve results lands on a page
   * that no longer exists and sees an empty table — which reads as "no matches"
   * rather than "you are past the end". The retailer screen learned this first.
   */
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next, { replace: true });
  };

  const query: SupplierQuery = {
    search: get('search'),
    status: get('status'),
    district: get('district'),
    category: get('category'),
    commission: get('commission'),
    joinedWithinDays: Number(get('joinedWithinDays')) || undefined,
    paperwork: get('paperwork'),
    products: get('products'),
    registeredBy: get('registeredBy'),
    page,
    limit: PAGE_SIZE,
  };

  const { data, isPending, isFetching, error, refetch } = useWholesalersQuery(query);

  const suppliers = data?.suppliers ?? [];
  const total = data?.total ?? 0;
  const counts = data?.statusCounts;

  const columns = useMemo(() => supplierColumns, []);

  /*
   * The chips are DERIVED from the URL, not tracked alongside it.
   *
   * Two sources would drift: a filter cleared in one place and still shown in
   * the other is exactly the confusion this component exists to remove.
   */
  const chips: ActiveFilter[] = useMemo(() => {
    const labels: Record<string, string> = {
      status: 'Status',
      district: 'District',
      category: 'Category',
      commission: 'Commission',
      joinedWithinDays: 'Joined',
      paperwork: 'Paperwork',
      products: 'Products',
      registeredBy: 'Registered by',
    };
    const pretty: Record<string, string> = {
      PENDING_REVIEW: 'Review',
      APPROVED: 'Active',
      SUSPENDED: 'Suspended',
      REJECTED: 'Rejected',
      REMOVED: 'Removed',
      standard: 'Standard 9.5%',
      negotiated: 'Negotiated',
      complete: 'All four on file',
      incomplete: 'Something missing',
      listing: 'Listing products',
      none: 'Never listed',
      SELF: 'Self-registered',
      ADMIN: 'Added by an admin',
      '7': 'Last 7 days',
      '30': 'Last 30 days',
      '90': 'Last 90 days',
    };

    return Object.keys(labels)
      .filter((k) => get(k))
      .map((k) => ({
        key: k,
        label: labels[k],
        value: pretty[get(k)] ?? get(k),
        onRemove: () => setFilter(k, ''),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });

  const showError = Boolean(error) && suppliers.length === 0;
  const isFiltered = chips.length > 0 || Boolean(get('search'));

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <PageHeader
        title="Suppliers"
        subtitle={
          counts
            ? `${total} ${total === 1 ? 'supplier' : 'suppliers'}${
                counts.review > 0 ? ` · ${counts.review} waiting on you` : ''
              }`
            : 'Supplier directory'
        }
        actions={
          <>
            <Button
              variant="ghost"
              size="md"
              iconLeft={RefreshCw}
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              Refresh
            </Button>
            <Button variant="primary" size="md" iconLeft={Plus} onClick={() => goToCreate()}>
              Onboard supplier
            </Button>
          </>
        }
      />

      {counts && (
        <SupplierQueue
          counts={counts}
          activeStatus={get('status')}
          onPick={(status) => setFilter('status', status)}
        />
      )}

      <div className="flex flex-col gap-2.5">
        <SearchFilterBar
          searchTerm={get('search')}
          onSearchChange={(v) => setFilter('search', v)}
          searchPlaceholder="Search company, code, owner or phone…"
          filters={[
            {
              key: 'category',
              label: 'Category',
              allLabel: 'All categories',
              value: get('category'),
              // The same source the onboarding form's picker uses, so a filter
              // can never offer a category nothing could have been saved with.
              options: categories.map((c) => ({ label: c.name, value: c.name })),
              onChange: (v) => setFilter('category', v),
            },
            {
              key: 'district',
              label: 'District',
              allLabel: 'All districts',
              value: get('district'),
              options: DISTRICT_OPTIONS.map((d) => ({ label: d, value: d })),
              onChange: (v) => setFilter('district', v),
            },
            {
              key: 'commission',
              label: 'Commission',
              allLabel: 'Any commission',
              value: get('commission'),
              options: [
                { label: 'Standard 9.5%', value: 'standard' },
                { label: 'Negotiated', value: 'negotiated' },
              ],
              onChange: (v) => setFilter('commission', v),
            },
            {
              key: 'joinedWithinDays',
              label: 'Joined',
              allLabel: 'Joined any time',
              value: get('joinedWithinDays'),
              // Windows that name themselves. This replaces a "Recently added"
              // toggle that never said it meant 30 days.
              options: [
                { label: 'Last 7 days', value: '7' },
                { label: 'Last 30 days', value: '30' },
                { label: 'Last 90 days', value: '90' },
              ],
              onChange: (v) => setFilter('joinedWithinDays', v),
            },
            {
              key: 'paperwork',
              label: 'Paperwork',
              allLabel: 'Any paperwork',
              value: get('paperwork'),
              options: [
                { label: 'All four on file', value: 'complete' },
                { label: 'Something missing', value: 'incomplete' },
              ],
              onChange: (v) => setFilter('paperwork', v),
            },
            {
              key: 'products',
              label: 'Products',
              allLabel: 'Listed or not',
              value: get('products'),
              options: [
                { label: 'Listing products', value: 'listing' },
                { label: 'Never listed', value: 'none' },
              ],
              onChange: (v) => setFilter('products', v),
            },
            {
              key: 'registeredBy',
              label: 'Registered by',
              allLabel: 'Anyone registered',
              value: get('registeredBy'),
              // Two rows deserve different amounts of trust: a supplier who
              // signed themselves up typed their own trade licence number; one
              // an operator created was transcribed from a phone call.
              options: [
                { label: 'Self-registered', value: 'SELF' },
                { label: 'Added by an admin', value: 'ADMIN' },
              ],
              onChange: (v) => setFilter('registeredBy', v),
            },
          ]}
          onClearAll={clearAll}
        />

        <FilterChips filters={chips} onClearAll={clearAll} />
      </div>

      {/* A partial failure keeps the stale rows visible and says so, rather
          than replacing the whole screen with an error. */}
      {error && suppliers.length > 0 && (
        <Alert tone="warn" title="Showing the last loaded list">
          {error instanceof Error ? error.message : 'The directory did not respond.'}
        </Alert>
      )}

      {isPending && suppliers.length === 0 ? (
        <SkeletonTable rows={8} columns={columns.length} />
      ) : showError ? (
        <ErrorState
          title="Suppliers could not be loaded"
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      ) : suppliers.length === 0 ? (
        /*
         * An empty RESULT is not an empty DIRECTORY, and must not borrow its
         * words. "No suppliers yet" over a filtered view tells an operator the
         * business has no suppliers.
         */
        isFiltered ? (
          <EmptyState
            title="No suppliers match these filters"
            message="Try removing one, or clear them all to see the whole directory."
            action={
              <Button variant="secondary" onClick={clearAll}>
                Clear all filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No suppliers yet"
            message="Onboard one, or wait for a supplier to register through the app."
            action={
              <Button variant="primary" iconLeft={Plus} onClick={() => goToCreate()}>
                Onboard supplier
              </Button>
            }
          />
        )
      ) : (
        <DataTable
          columns={columns}
          data={suppliers}
          rowKey={(w) => w.id}
          rowHref={(w) => `/wholesalers/${w.id}`}
          rowLabel={(w) => w.companyName}
          onRowClick={(w) => goToDetail(w.id)}
          caption={`Suppliers — page ${page} of ${Math.max(1, Math.ceil(total / PAGE_SIZE))}`}
        />
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <Text variant="caption">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </Text>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={(next) => {
              const p = new URLSearchParams(params);
              if (next <= 1) p.delete('page');
              else p.set('page', String(next));
              setParams(p, { replace: true });
            }}
            // Held while a page is in flight, so a second click cannot step over
            // a page of suppliers nobody saw.
            disabled={isFetching}
          />
        </div>
      )}
    </div>
  );
}

export { SUPPLIER_STATUS_FILTERS };
