import React from 'react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/Button';
import { SearchFilterBar } from '@/src/components/ui/SearchFilterBar';
import { DataTable, type Column } from '@/src/components/ui/DataTable';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { useWholesalerList } from '../hooks/useWholesalerList';
import { useWholesalerStore } from '../store';
import { useWholesalerNavigation } from '../hooks/useWholesalerNavigation';
import { Plus, ExternalLink, Clock, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import type { Wholesaler } from '@/src/types/domain';

export function ListPage() {
  const { goToCreate, goToDetail } = useWholesalerNavigation();
  const { filteredWholesalers, uniqueCategories, uniqueLocations, isLoading, error, refetch } =
    useWholesalerList();
  const filters = useWholesalerStore((s) => s.filters);
  const setFilter = useWholesalerStore((s) => s.setFilter);
  const clearFilters = useWholesalerStore((s) => s.clearFilters);
  const wholesalers = useWholesalerStore((s) => s.wholesalers);

  const columns: Column<Wholesaler>[] = [
    {
      key: 'company',
      header: 'Company',
      render: (w) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold">
            {w.companyName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-black group-hover:text-emerald-600 transition-colors">
              {w.companyName}
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {w.code?.trim() ? w.code : '—'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (w) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
          {w.category || '—'}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (w) => <div className="text-sm text-slate-600 dark:text-slate-400">{w.location || '—'}</div>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (w) => <StatusBadge status={w.status} />,
    },
    {
      key: 'commission',
      header: 'Commission',
      className: 'text-center',
      render: (w) => (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {w.commissionRate != null ? `${w.commissionRate}%` : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-center',
      render: (w) => (
        <button
          type="button"
          className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            goToDetail(w.id);
          }}
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const categoryFilter = {
    key: 'category',
    label: 'Category',
    value: filters.category,
    options: [{ label: 'All Categories', value: 'All' }, ...uniqueCategories.map((c) => ({ label: c, value: c }))],
    onChange: (v: string) => setFilter('category', v),
  };

  const locationFilter = {
    key: 'location',
    label: 'Location',
    value: filters.location,
    options: [{ label: 'All Locations', value: 'All' }, ...uniqueLocations.map((l) => ({ label: l, value: l }))],
    onChange: (v: string) => setFilter('location', v),
  };

  const tableColumns = columns as unknown as Column<Record<string, unknown>>[];
  const tableData = filteredWholesalers as unknown as Record<string, unknown>[];

  if (isLoading && wholesalers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin" />
        <p className="text-sm font-medium">Loading wholesalers...</p>
      </div>
    );
  }

  if (error && wholesalers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-500">
        <AlertTriangle className="w-10 h-10 text-red-500" />
        <p className="text-sm font-medium text-center max-w-md">{error}</p>
        <Button variant="primary" size="md" iconLeft={RefreshCw} onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Wholesaler Management"
        subtitle={`Manage ${wholesalers.length} suppliers`}
        actions={
          <Button variant="primary" size="md" iconLeft={Plus} onClick={() => goToCreate()}>
            Onboard Supplier
          </Button>
        }
      />

      <div className="space-y-3">
        <SearchFilterBar
          searchTerm={filters.search}
          onSearchChange={(v) => setFilter('search', v)}
          searchPlaceholder="Search companies..."
          filters={[categoryFilter, locationFilter]}
          onClearAll={clearFilters}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filters.recentlyAdded ? 'primary' : 'secondary'}
            size="sm"
            iconLeft={Clock}
            onClick={() => setFilter('recentlyAdded', !filters.recentlyAdded)}
          >
            Recently Added
          </Button>
          <Button variant="ghost" size="sm" iconLeft={RefreshCw} onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      {error && wholesalers.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <DataTable
        columns={tableColumns}
        data={tableData}
        keyField={'id' as keyof Record<string, unknown>}
        emptyMessage="No wholesalers found."
        onRowClick={(row) => goToDetail(row.id as string)}
      />
    </div>
  );
}
