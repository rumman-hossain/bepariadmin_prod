import React from 'react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/Button';
import { SearchFilterBar } from '@/src/components/ui/SearchFilterBar';
import { DataTable, type Column } from '@/src/components/ui/DataTable';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { useWholesalerList } from '../hooks/useWholesalerList';
import { useWholesalerStore } from '../store';
import { listWholesalers } from '../api/wholesalerApi';
import { Plus, Star, Zap, ShieldAlert, ExternalLink, Clock, Loader2 } from 'lucide-react';
import type { Wholesaler } from '@/src/types/domain';
import { useToast } from '@/src/components/ui/Toast';

export interface ListPageProps {
  onNavigate: (path: string) => void;
}

export function ListPage({ onNavigate }: ListPageProps) {
  const { filteredWholesalers, uniqueCategories, uniqueLocations } = useWholesalerList();
  const filters = useWholesalerStore((s) => s.filters);
  const setFilter = useWholesalerStore((s) => s.setFilter);
  const clearFilters = useWholesalerStore((s) => s.clearFilters);
  const selectWholesaler = useWholesalerStore((s) => s.selectWholesaler);
  const setWholesalers = useWholesalerStore((s) => s.setWholesalers);
  const wholesalers = useWholesalerStore((s) => s.wholesalers);
  
  const [loading, setLoading] = React.useState(true);
  const toast = useToast();

  React.useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        const data = await listWholesalers();
        if (active) {
          setWholesalers(data);
        }
      } catch (err: unknown) {
        console.error('Failed to load wholesalers:', err);
        if (active) {
          toast.error('Network Error', 'Failed to retrieve wholesalers from backend.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => { active = false; };
  }, [setWholesalers]);

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
            <div className="font-semibold text-black group-hover:text-emerald-600 transition-colors">{w.companyName}</div>
            <div className="text-xs text-slate-500">ID: {w.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (w) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
          {w.category}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Address & Location',
      render: (w) => (
        <div>
          <div className="max-w-xs truncate text-slate-600 dark:text-slate-400" title={w.address}>
            {w.address || '—'}
          </div>
          <div className="text-xs text-slate-500">{w.location || 'Dhaka'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (w) => <StatusBadge status={w.status} />,
    },
    {
      key: 'acceptanceRate',
      header: 'Acceptance Rate',
      className: 'text-center',
      render: (w) => (
        <div className="flex items-center justify-center gap-1 font-medium text-slate-700 dark:text-slate-300">
          <Star className="w-4 h-4 text-gold-500 fill-current" />
          {w.acceptanceRate}%
        </div>
      ),
    },
    {
      key: 'riskScore',
      header: 'Risk Score',
      className: 'text-center',
      render: (w) => (
        <div className={`inline-flex items-center gap-1 font-semibold ${w.riskScore && w.riskScore > 50 ? 'text-red-600' : 'text-emerald-600'}`}>
          {w.riskScore && w.riskScore > 50 && <ShieldAlert className="w-4 h-4" />}
          {w.riskScore || 0}
        </div>
      ),
    },
    {
      key: 'dispatchSpeed',
      header: 'Dispatch Speed',
      className: 'text-center',
      render: (w) => (
        <div className="flex items-center justify-center gap-1 font-medium text-slate-700 dark:text-slate-300">
          <Zap className="w-4 h-4 text-blue-500" />
          {w.dispatchSpeed}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-center',
      render: (w) => (
        <button
          className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          onClick={(e) => { e.stopPropagation(); selectWholesaler(w.id); onNavigate(`/wholesalers/${w.id}`); }}
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

  // Cast to satisfy DataTable's Record<string, unknown> constraint
  const tableColumns = columns as unknown as Column<Record<string, unknown>>[];
  const tableData = filteredWholesalers as unknown as Record<string, unknown>[];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Wholesaler Management"
        subtitle={`Manage ${wholesalers.length} suppliers`}
        actions={
          <Button variant="primary" size="md" iconLeft={Plus} onClick={() => onNavigate('/wholesalers/create')}>
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
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin" />
          <p className="text-sm font-medium">Fetching wholesalers from backend...</p>
        </div>
      ) : (
        <DataTable
          columns={tableColumns}
          data={tableData}
          keyField={'id' as keyof Record<string, unknown>}
          emptyMessage="No wholesalers found."
          onRowClick={(row) => { selectWholesaler(row.id as string); onNavigate(`/wholesalers/${row.id as string}`); }}
        />
      )}
    </div>
  );
}
