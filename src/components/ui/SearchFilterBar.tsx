/**
 * SearchFilterBar — Reusable search input + dropdown filters.
 */

import React from 'react';
import { Search, Filter, X } from 'lucide-react';

interface Filter {
  key: string;
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}

interface SearchFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: Filter[];
  onClearAll?: () => void;
  className?: string;
}

export function SearchFilterBar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  onClearAll,
  className = '',
}: SearchFilterBarProps) {
  const hasActiveFilters = filters?.some((f) => f.value !== 'All');

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          className="w-full pl-10 pr-4 py-2 bg-surface-elevated text-text-default border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-shadow"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {filters && filters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 bg-surface-elevated rounded-lg px-3 py-1.5 border border-border-subtle">
            <Filter className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-xs font-medium text-text-muted">Filters:</span>
          </div>

          {filters.map((filter) => (
            <select
              key={filter.key}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="text-sm bg-surface-elevated text-text-default border border-border-default rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent-primary"
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ))}

          {hasActiveFilters && onClearAll && (
            <button
              onClick={onClearAll}
              className="text-xs text-semantic-danger hover:opacity-80 font-bold inline-flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
