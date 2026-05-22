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
import { Plus, Pencil, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { DataTable } from '@/src/components/ui/DataTable';
import { SearchFilterBar } from '@/src/components/ui/SearchFilterBar';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { Card } from '@/src/components/ui/Card';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { useProductList } from '../hooks/useProductList';
import { useProductForm } from '../hooks/useProductForm';
import { PRODUCT_ROUTES } from '../routes';
import type { Product } from '../types';

// ─── Table columns ─────────────────────────────────────────────

// Use type alias with index signature to satisfy DataTable's Record<string, unknown> constraint
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

const COLUMNS = [
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
    render: () => (
      <div className="flex items-center justify-center gap-1">
        <Button variant="ghost" size="sm" iconLeft={Pencil} aria-label="Edit product">
          {''}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          iconLeft={Trash2}
          aria-label="Delete product"
          className="text-semantic-danger hover:bg-semantic-danger-light"
        >
          {''}
        </Button>
      </div>
    ),
  },
];

// ─── Skeleton shimmer ──────────────────────────────────────────

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

// ─── Error state ───────────────────────────────────────────────

function ListError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
      <AlertTriangle className="w-12 h-12 text-semantic-danger" aria-hidden="true" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-text-primary">
          Failed to load products
        </h2>
        <p className="text-sm text-text-secondary max-w-md">{message}</p>
      </div>
      <Button variant="outline" size="md" iconLeft={RefreshCw} onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

// ─── Filter options helper ─────────────────────────────────────

interface FilterOption {
  label: string;
  value: string;
}

function buildFilterOptions(
  categories: string[],
  wholesalerIds: string[],
): {
  categoryOptions: FilterOption[];
  statusOptions: FilterOption[];
  wholesalerOptions: FilterOption[];
  visibilityOptions: FilterOption[];
} {
  return {
    categoryOptions: [
      { label: 'All Categories', value: 'All' },
      ...categories.map((c) => ({ label: c, value: c })),
    ],
    statusOptions: [
      { label: 'All Statuses', value: 'All' },
      { label: 'Active', value: 'Active' },
      { label: 'Pending', value: 'Pending' },
      { label: 'Rejected', value: 'Rejected' },
      { label: 'Inactive', value: 'Inactive' },
      { label: 'Draft', value: 'Draft' },
    ],
    wholesalerOptions: [
      { label: 'All Wholesalers', value: 'All' },
      ...wholesalerIds.map((id) => ({ label: id, value: id })),
    ],
    visibilityOptions: [
      { label: 'All', value: 'All' },
      { label: 'Public', value: 'Public' },
      { label: 'Private', value: 'Private' },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════
// Product List Page
// ═══════════════════════════════════════════════════════════════

export function ProductListPage() {
  const navigate = useNavigate();
  const {
    filteredProducts,
    products,
    uniqueCategories,
    uniqueWholesalerIds,
    isLoading,
    error,
    refetch,
  } = useProductList();

  const { openCreate } = useProductForm();

  // Local filter state for SearchFilterBar
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterWholesaler, setFilterWholesaler] = useState('All');
  const [filterVisibility, setFilterVisibility] = useState('All');

  const filterOptions = useMemo(
    () => buildFilterOptions(uniqueCategories, uniqueWholesalerIds),
    [uniqueCategories, uniqueWholesalerIds],
  );

  // Build table rows
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

  const handleRowClick = useCallback(
    (row: ProductRow) => {
      navigate(PRODUCT_ROUTES.DETAIL.replace(':productId', row.id));
    },
    [navigate],
  );

  const handleClearAll = useCallback(() => {
    setSearchTerm('');
    setFilterCategory('All');
    setFilterStatus('All');
    setFilterWholesaler('All');
    setFilterVisibility('All');
  }, []);

  // ── Loading state ────────────────────────────────────
  if (isLoading && products.length === 0) {
    return <ListSkeleton />;
  }

  // ── Error state ─────────────────────────────────────
  if (error && products.length === 0) {
    return <ListError message={error} onRetry={refetch} />;
  }

  // ── Empty state ─────────────────────────────────────
  if (products.length === 0) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <EmptyState
          icon={<Plus className="w-12 h-12" />}
          title="No products yet"
          description="Create your first product to start selling."
          action={
            <Button variant="primary" size="md" iconLeft={Plus} onClick={() => openCreate()}>
              Add Product
            </Button>
          }
        />
      </div>
    );
  }

  // ── Success state ───────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Products
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {filteredProducts.length} of {products.length} products
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
          <Button variant="primary" size="sm" iconLeft={Plus} onClick={() => openCreate()}>
            Add Product
          </Button>
        </div>
      </div>

      {/* Error banner (non-blocking) */}
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

      {/* Search & Filter bar */}
      <SearchFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search products..."
        filters={[
          {
            key: 'category',
            label: 'Category',
            value: filterCategory,
            options: filterOptions.categoryOptions,
            onChange: setFilterCategory,
          },
          {
            key: 'status',
            label: 'Status',
            value: filterStatus,
            options: filterOptions.statusOptions,
            onChange: setFilterStatus,
          },
          {
            key: 'wholesalerId',
            label: 'Wholesaler',
            value: filterWholesaler,
            options: filterOptions.wholesalerOptions,
            onChange: setFilterWholesaler,
          },
          {
            key: 'visibility',
            label: 'Visibility',
            value: filterVisibility,
            options: filterOptions.visibilityOptions,
            onChange: setFilterVisibility,
          },
        ]}
        onClearAll={handleClearAll}
      />

      {/* Data Table */}
      <DataTable
        columns={COLUMNS as Array<{ key: string; header: string; className?: string; render: (row: Record<string, unknown>) => React.ReactNode }>}
        data={rows as Record<string, unknown>[]}
        keyField="id"
        onRowClick={handleRowClick as (row: Record<string, unknown>) => void}
        emptyMessage="No products match your filters"
      />
    </div>
  );
}