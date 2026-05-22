/**
 * DataTable — Generic sortable table with column config.
 *
 * Extracted from Wholesalers, Retailers, Products components
 * which all had repeated table markup.
 */

import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

function safeKey(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'symbol') {
    return String(value);
  }
  return '';
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  emptyMessage = 'No data found.',
  onRowClick,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <p className="text-sm text-text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border-default">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-text-muted uppercase bg-surface-elevated border-b border-border-default">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3 font-medium ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={safeKey(row[keyField])}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-border-subtle hover:bg-surface-hover transition-colors ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-text-default ${col.className || ''}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
