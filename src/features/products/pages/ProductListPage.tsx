/**
 * Product List — the review queue.
 *
 * WHAT CHANGED, AND WHY IT WAS NOT COSMETIC
 *
 * This screen used to call the CATALOGUE route, which is shared with retailers
 * and defaults to approved+public. So its "All Statuses" filter meant "approved
 * only", the Pending tab it defaulted to was reliably empty, and the page
 * carried a banner explaining that — and telling operators to approve products
 * via `PATCH /products/:id/status`, a route that answers 410 Gone.
 *
 * The banner is gone because the defect is. Six state tabs replace the Status
 * and Visibility dropdowns, which could not express a model where APPROVED and
 * PUBLIC share a status column.
 */
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, AlertTriangle, Check, X } from 'lucide-react';
import { Button } from '@/src/components/controls';
import { DataTable, Text } from '@/src/components/data';
import { Pagination } from '@/src/components/data/Pagination';
import { SearchFilterBar } from '@/src/components/data/SearchFilterBar';
import { EmptyState, SkeletonPage, ErrorState, ReasonDialog, useToast } from '@/src/components/feedback';
import { useProductList } from '../hooks/useProductList';
import { useApproveProduct, useRejectProduct, useCategoryNamesQuery } from '../queries';
import { PRODUCT_ROUTES } from '../routes';
import { buildColumns } from './productColumns';
import { ProductStateTabs } from '../components/ProductStateTabs';
import { ProductVariantRows } from '../components/ProductVariantRows';
import { PRODUCT_STATE_MEANING, isProductState } from '../types/adminProduct';
import type { AdminProductRow } from '../types/adminProduct';

export function ProductListPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const {
    products,
    counts,
    filters,
    pagination,
    categoryOptions,
    wholesalerOptions,
    isLoading,
    isFetching,
    error,
    refetch,
    setFilter,
    clearFilters,
    setPage,
  } = useProductList();

  const { data: categoryNames = {} } = useCategoryNamesQuery();

  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectOpen, setRejectOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const approve = useApproveProduct();
  const reject = useRejectProduct();

  const toggleVariants = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const columns = useMemo(
    () => buildColumns({ categoryNames, expandedIds, onToggleVariants: toggleVariants }),
    [categoryNames, expandedIds, toggleVariants],
  );

  const selectedRows = useMemo(
    () => products.filter((p) => selectedIds.has(p.id)),
    [products, selectedIds],
  );

  /*
   * Bulk actions fan out.
   *
   * The verbs are per-product on the server — there is no bulk endpoint, and
   * inventing one in the client by ignoring failures would be worse than not
   * offering the action. So every result is collected and reported: a partial
   * success says which products did not move and why, because "34 approved"
   * over a set of 37 is the kind of summary that loses three products quietly.
   */
  const runBulk = useCallback(
    async (
      verb: 'approve' | 'reject',
      rows: AdminProductRow[],
      reason?: string,
    ) => {
      setBulkBusy(true);
      const results = await Promise.allSettled(
        rows.map((row) =>
          verb === 'approve'
            ? approve.mutateAsync({ id: row.id })
            : reject.mutateAsync({ id: row.id, reason: reason ?? '' }),
        ),
      );
      setBulkBusy(false);

      const failed = results
        .map((r, i) => ({ r, row: rows[i] }))
        .filter(({ r }) => r.status === 'rejected');
      const done = results.length - failed.length;

      if (failed.length === 0) {
        toast.success(`${done} product${done === 1 ? '' : 's'} ${verb === 'approve' ? 'approved' : 'rejected'}.`);
      } else {
        toast.error(
          `${done} ${verb === 'approve' ? 'approved' : 'rejected'}, ${failed.length} could not be: ` +
            failed
              .slice(0, 3)
              .map(({ row }) => row.sku)
              .join(', ') +
            (failed.length > 3 ? `, and ${failed.length - 3} more` : ''),
        );
      }

      setSelectedIds(new Set());
      void refetch();
    },
    [approve, reject, toast, refetch],
  );

  if (isLoading && products.length === 0) {
    return <SkeletonPage shape="list" />;
  }

  if (error && products.length === 0) {
    return <ErrorState title="Products could not be loaded" message={error} onRetry={refetch} />;
  }

  const stateMeaning = isProductState(filters.state)
    ? PRODUCT_STATE_MEANING[filters.state]
    : 'Every product, in any state.';

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Products</h1>
          <Text as="p" variant="secondary" className="mt-1">
            {pagination.total.toLocaleString('en-IN')} in this view
            {counts && counts.pending > 0 && (
              <>
                {' · '}
                <span className="font-semibold text-warn">
                  {counts.pending} awaiting your review
                </span>
              </>
            )}
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            iconLeft={RefreshCw}
            loading={isFetching}
            onClick={() => void refetch()}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            iconLeft={Plus}
            onClick={() => navigate(PRODUCT_ROUTES.CREATE)}
          >
            Add product
          </Button>
        </div>
      </div>

      <div>
        <ProductStateTabs
          value={filters.state}
          onChange={(state) => setFilter('state', state)}
          counts={counts}
          /*
           * The All tab is the SUM of the six, not `pagination.total`.
           *
           * `total` is the count under the CURRENT filters, state included, so
           * with Pending selected it is the pending count — and using it here
           * would make All read 37 while Pending also read 37. The counts are
           * computed with the state filter removed but every other filter
           * applied, so their sum is exactly "all states, same search and
           * supplier", which is what the All tab selects.
           */
          total={
            counts
              ? counts.draft +
                counts.pending +
                counts.approved +
                counts.public +
                counts.rejected +
                counts.removed
              : pagination.total
          }
        />
        <Text as="p" variant="caption" className="mt-2">
          {stateMeaning}
        </Text>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg bg-bad-wash p-3 text-sm text-bad">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
          <button
            onClick={() => void refetch()}
            className="ml-auto text-xs font-medium underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      <SearchFilterBar
        searchTerm={filters.search}
        onSearchChange={(value) => setFilter('search', value)}
        searchPlaceholder="Search name, original SKU or sub-SKU…"
        filters={[
          {
            key: 'category',
            label: 'Category',
            value: filters.category,
            options: categoryOptions,
            onChange: (value) => setFilter('category', value),
          },
          {
            key: 'wholesalerId',
            label: 'Supplier',
            value: filters.wholesalerId,
            options: wholesalerOptions,
            onChange: (value) => setFilter('wholesalerId', value),
          },
          {
            key: 'variants',
            label: 'Variants',
            // Client-only for now: the server has no `hasVariant` filter, and a
            // control that quietly narrows one page while the pager counts the
            // whole set is the defect this screen just removed. Left out rather
            // than faked.
            value: 'All',
            options: [{ label: 'Variants: any', value: 'All' }],
            onChange: () => {},
          },
        ]}
        onClearAll={clearFilters}
      />

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brass bg-brass-wash p-2.5">
          <span className="text-sm font-semibold text-brass">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="primary"
            iconLeft={Check}
            loading={bulkBusy}
            onClick={() => void runBulk('approve', selectedRows)}
          >
            Approve {selectedIds.size}
          </Button>
          <Button
            size="sm"
            variant="outline"
            iconLeft={X}
            disabled={bulkBusy}
            onClick={() => setRejectOpen(true)}
          >
            Reject…
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={products}
        rowKey={(row) => row.id}
        rowLabel={(row) => row.name}
        /*
         * `onRowClick`, not `rowHref`.
         *
         * `rowHref` is the better primitive — a real link, so middle-click and
         * open-in-new-tab work — but it stretches that link across the whole
         * row, and this table has a control inside a cell: the variant
         * expander. The table's own note records that neither list using
         * `rowHref` puts anything interactive in a cell, and this one has to.
         */
        onRowClick={(row) => navigate(PRODUCT_ROUTES.DETAIL.replace(':productId', row.id))}
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
        expandedKeys={expandedIds}
        renderExpanded={(row) =>
          row.variantCount > 0 ? (
            <ProductVariantRows productId={row.id} expectedCount={row.variantCount} />
          ) : null
        }
        caption="Products"
        empty={
          <EmptyState
            title="Nothing in this view"
            message={
              filters.search || filters.category !== 'All' || filters.wholesalerId !== 'All'
                ? 'No product matches these filters. Try clearing them.'
                : stateMeaning
            }
          />
        }
      />

      {pagination.total > pagination.limit && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.limit}
          total={pagination.total}
          disabled={isFetching}
          onPageChange={setPage}
        />
      )}

      <ReasonDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={`Reject ${selectedIds.size} product${selectedIds.size === 1 ? '' : 's'}?`}
        message="The supplier sees this reason and can correct the product and resubmit. It is recorded in the audit trail against your name."
        confirmLabel="Reject"
        loading={bulkBusy}
        onConfirm={async (reason) => {
          setRejectOpen(false);
          await runBulk('reject', selectedRows, reason);
        }}
      />
    </div>
  );
}
