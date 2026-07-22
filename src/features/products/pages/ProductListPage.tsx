/**
 * Product List Page — main product management view.
 *
 * Architecture:
 * - Reads from useProductStore via useProductList hook
 * - Zero props — fully self-contained
 * - Uses DataTable, SearchFilterBar, StatusBadge UI components
 * - Handles: loading, empty, error, success states
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { DataTable } from '@/src/components/ui/DataTable';
import { SearchFilterBar } from '@/src/components/ui/SearchFilterBar';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { Card } from '@/src/components/ui/Card';
import { Modal } from '@/src/components/ui/Modal';
import { useProductList } from '../hooks/useProductList';
import { PRODUCT_ROUTES } from '../routes';
import { PRODUCT_STATUSES } from '../constants';
import type { Product } from '../types';

// ─── Table columns ─────────────────────────────────────────────

type ProductRow = Record<string, unknown> & {
  id: string;
  name: string;
  sku: string;
  category: string;
  basePrice: number;
  sellingPrice: number | undefined;
  stock: number;
  status: string;
  visibility: string;
  product: Product;
};

function buildColumns(
  onEdit: (id: string) => void,
  onDelete: (id: string) => void,
) {
  return [
    {
      key: 'name',
      header: 'Name',
      className: '',
      render: (row: ProductRow) => (
        <div className="min-w-0">
          <p className="font-medium text-text-primary truncate" title={row.name}>
            {row.name}
          </p>
          <p className="text-xs text-text-tertiary">{row.sku}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      className: '',
      render: (row: ProductRow) => (
        <span className="text-sm text-text-secondary">{row.category}</span>
      ),
    },
    {
      key: 'basePrice',
      header: 'Base Price',
      className: 'text-right',
      render: (row: ProductRow) => (
        <span className="tabular-nums text-sm font-medium text-text-primary">
          ৳{row.basePrice.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'sellingPrice',
      header: 'Selling',
      className: 'text-right',
      render: (row: ProductRow) => (
        <span className="tabular-nums text-sm text-text-secondary">
          ৳{(row.sellingPrice ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      className: 'text-center',
      render: (row: ProductRow) => {
        const available = row.stock;
        return (
          <span
            className={`text-sm font-medium tabular-nums ${
              available <= 5
                ? 'text-semantic-danger'
                : available <= 20
                  ? 'text-semantic-warning'
                  : 'text-text-primary'
            }`}
          >
            {available}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      className: 'text-center',
      render: (row: ProductRow) => <StatusBadge status={row.status} />,
    },
    {
      key: 'visibility',
      header: 'Visibility',
      className: 'text-center',
      render: (row: ProductRow) => (
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            row.visibility === 'Public'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {row.visibility}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-center w-[80px]',
      render: (row: ProductRow) => (
        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            iconLeft={Pencil}
            aria-label="Edit product"
            onClick={() => onEdit(row.id)}
          >
            {''}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconLeft={Trash2}
            aria-label="Delete product"
            className="text-semantic-danger hover:bg-semantic-danger-light"
            onClick={() => onDelete(row.id)}
          >
            {''}
          </Button>
        </div>
      ),
    },
  ];
}

function ListSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in" aria-busy="true" aria-label="Loading products">
      <div className="h-10 w-72 bg-surface-muted rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-4 animate-pulse">
              <div className="h-10 w-10 bg-surface-muted rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-surface-muted rounded" />
                <div className="h-3 w-24 bg-surface-muted rounded" />
              </div>
              <div className="h-4 w-16 bg-surface-muted rounded" />
              <div className="h-6 w-20 bg-surface-muted rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ListError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
      <AlertTriangle className="w-12 h-12 text-semantic-danger" aria-hidden="true" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-text-primary">Failed to load products</h2>
        <p className="text-sm text-text-secondary max-w-md">{message}</p>
      </div>
      <Button variant="outline" size="md" iconLeft={RefreshCw} onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

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

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));

  const rows = useMemo<ProductRow[]>(
    () =>
      filteredProducts.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        basePrice: p.basePrice,
        sellingPrice: p.sellingPrice,
        stock: p.availableStock ?? p.stock,
        status: p.status,
        visibility: p.visibility,
        product: p,
      })),
    [filteredProducts],
  );

  const handleEdit = useCallback(
    (id: string) => {
      // #region agent log
      fetch('http://127.0.0.1:7294/ingest/ae423c12-13a4-45ec-a07b-20329cf2b723',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'098add'},body:JSON.stringify({sessionId:'098add',location:'ProductListPage.tsx:handleEdit',message:'edit navigation',data:{id,route:'edit'},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
      // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7294/ingest/ae423c12-13a4-45ec-a07b-20329cf2b723',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'098add'},body:JSON.stringify({sessionId:'098add',location:'ProductListPage.tsx:handleRowClick',message:'row navigation',data:{id:row.id,route:'detail'},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
      // #endregion
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
    return <ListSkeleton />;
  }

  if (error && products.length === 0) {
    return <ListError message={error} onRetry={refetch} />;
  }

  const isEmpty = products.length === 0;
  const emptyMessage =
    isEmpty && !filters.search && filters.category === 'All' && filters.status === 'All'
      ? 'No products yet. Use Add Product to create one, or adjust filters to see pending items.'
      : 'No products match your filters';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Products</h1>
          <p className="text-sm text-text-secondary mt-1">
            {filteredProducts.length} shown · {pagination.total} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            iconLeft={RefreshCw}
            onClick={refetch}
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
          className="flex items-start gap-2 p-3 rounded-lg bg-surface-muted text-sm text-text-secondary"
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
          className="flex items-center gap-2 p-3 rounded-lg bg-semantic-danger-light text-sm text-semantic-danger"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
          <button
            onClick={refetch}
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
            label: 'Wholesaler',
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

      <DataTable
        columns={
          columns as Array<{
            key: string;
            header: string;
            className?: string;
            render: (row: Record<string, unknown>) => React.ReactNode;
          }>
        }
        data={rows as Record<string, unknown>[]}
        keyField="id"
        onRowClick={handleRowClick as (row: Record<string, unknown>) => void}
        emptyMessage={emptyMessage}
      />

      {pagination.total > pagination.limit && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-sm text-text-secondary">
            Page {pagination.page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              iconLeft={ChevronLeft}
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => setPage(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconRight={ChevronRight}
              disabled={pagination.page >= totalPages || isLoading}
              onClick={() => setPage(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Modal open={deleteTargetId != null} onClose={() => setDeleteTargetId(null)} size="sm">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">Delete product?</h3>
          <p className="text-sm text-text-secondary">
            This action cannot be undone. The product will be removed permanently.
          </p>
          <div className="flex gap-3">
            <Button variant="danger" loading={isDeleting} onClick={() => void handleConfirmDelete()}>
              Delete
            </Button>
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
