/**
 * Product List Page — main product management view.
 *
 * Architecture:
 * - Reads from useProductStore via useProductList hook
 * - Zero props — fully self-contained
 * - Uses DataTable, SearchFilterBar, StatusBadge UI components
 * - Handles: loading, empty, error, success states
 */
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/src/components/controls';
import { DataTable, Text } from '@/src/components/data';
import { Pagination } from '@/src/components/data/Pagination';
import { SearchFilterBar } from '@/src/components/data/SearchFilterBar';
import { EmptyState, SkeletonPage, ErrorState } from '@/src/components/feedback';
import { Dialog } from '@/src/components/feedback';
import { useProductList } from '../hooks/useProductList';
import { PRODUCT_ROUTES } from '../routes';
import { PRODUCT_STATUSES } from '../constants';
import { buildColumns, type ProductRow } from './productColumns';

export function ProductListPage() {
  const navigate = useNavigate();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    filteredProducts,
    products,
    filters,
    pagination,
    categoryOptions,
    categoryNames,
    wholesalerOptions,
    isLoading,
    error,
    refetch,
    setFilter,
    clearFilters,
    setPage,
    removeProduct,
    showsApiDefaultFilters,
  } = useProductList();

  const statusOptions = useMemo(
    () => [
      { label: 'All Statuses', value: 'All' },
      ...PRODUCT_STATUSES.map((status) => ({ label: status, value: status })),
    ],
    [],
  );

  const visibilityOptions = useMemo(
    () => [
      { label: 'All', value: 'All' },
      { label: 'Public', value: 'Public' },
      { label: 'Private', value: 'Private' },
    ],
    [],
  );


  const rows = useMemo<ProductRow[]>(
    () =>
      filteredProducts.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        /*
         * Resolved HERE, from the live map — not from `p.category`, which
         * `mapProduct` baked in when the row was fetched. Products and
         * categories are two independent requests, and products almost always
         * win, so the baked label was the empty-map fallback (`2a7be0ef…`) and
         * nothing ever re-mapped it.
         */
        category: (p.categoryId ? categoryNames[p.categoryId] : '') || p.category,
        basePrice: p.basePrice,
        sellingPrice: p.sellingPrice,
        stock: p.availableStock ?? p.stock,
        status: p.status,
        visibility: p.visibility,
        product: p,
      })),
    [filteredProducts, categoryNames],
  );

  const handleEdit = useCallback(
    (id: string) => {
      navigate(PRODUCT_ROUTES.EDIT.replace(':productId', id));
    },
    [navigate],
  );

  const handleDeleteRequest = useCallback((id: string) => {
    setDeleteTargetId(id);
  }, []);

  const columns = useMemo(
    () => buildColumns(handleEdit, handleDeleteRequest),
    [handleEdit, handleDeleteRequest],
  );

  const handleRowClick = useCallback(
    (row: ProductRow) => {
      navigate(PRODUCT_ROUTES.DETAIL.replace(':productId', row.id));
    },
    [navigate],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    await removeProduct(deleteTargetId);
    setIsDeleting(false);
    setDeleteTargetId(null);
    void refetch();
  }, [deleteTargetId, removeProduct, refetch]);

  const handleAddProduct = useCallback(() => {
    navigate(PRODUCT_ROUTES.CREATE);
  }, [navigate]);

  if (isLoading && products.length === 0) {
    return <SkeletonPage shape="list" />;
  }

  if (error && products.length === 0) {
    return <ErrorState title="Products could not be loaded" message={error} onRetry={refetch} />;
  }


  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Products</h1>
          <Text as="p" variant="secondary" className="mt-1">
            {filteredProducts.length} shown · {pagination.total} total
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            iconLeft={RefreshCw}
            onClick={() => void refetch()}
            aria-label="Refresh products"
          >
            Refresh
          </Button>
          <Button variant="primary" size="sm" iconLeft={Plus} onClick={handleAddProduct}>
            Add Product
          </Button>
        </div>
      </div>

      {showsApiDefaultFilters && (
        <div
          role="status"
          className="flex items-start gap-2 p-3 rounded-lg bg-sheet-2 text-sm text-ink-2"
        >
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Wholesaler-submitted products start as <strong>Pending Approval</strong> — use that filter to
            review them. &quot;All Statuses&quot; only returns <strong>approved</strong> products (API default).
            Switch to Approved after you approve a product via PATCH /products/:id/status.
          </span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 p-3 rounded-lg bg-bad-wash text-sm text-bad"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
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
        searchPlaceholder="Search products..."
        filters={[
          {
            key: 'category',
            label: 'Category',
            value: filters.category,
            options: categoryOptions,
            onChange: (value) => setFilter('category', value),
          },
          {
            key: 'status',
            label: 'Status',
            value: filters.status,
            options: statusOptions,
            onChange: (value) => setFilter('status', value),
          },
          {
            key: 'wholesalerId',
            label: 'Supplier',
            value: filters.wholesalerId,
            options: wholesalerOptions,
            onChange: (value) => setFilter('wholesalerId', value),
          },
          {
            key: 'visibility',
            label: 'Visibility',
            value: filters.visibility,
            options: visibilityOptions,
            onChange: (value) => setFilter('visibility', value),
          },
        ]}
        onClearAll={clearFilters}
      />

      {/* The casts these props used to need are gone: DataTable is generic over
          T now, instead of forcing every caller through Record<string, unknown>. */}
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(row) => row.id}
        onRowClick={handleRowClick}
        empty={
          products.length === 0 ? (
            <EmptyState
              title="No products yet"
              message="Products appear here once a supplier lists one."
            />
          ) : (
            <EmptyState
              title="No matches"
              message="No product matches these filters. Try clearing them."
            />
          )
        }
        caption="Products"
      />

      {pagination.total > pagination.limit && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.limit}
          total={pagination.total}
          disabled={isLoading}
          onPageChange={setPage}
        />
      )}

      <Dialog open={deleteTargetId != null} onClose={() => setDeleteTargetId(null)} size="sm">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-ink">Delete product?</h3>
          <Text as="p" variant="secondary">
            This action cannot be undone. The product will be removed permanently.
          </Text>
          <div className="flex gap-3">
            <Button variant="danger" loading={isDeleting} onClick={() => void handleConfirmDelete()}>
              Delete
            </Button>
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
