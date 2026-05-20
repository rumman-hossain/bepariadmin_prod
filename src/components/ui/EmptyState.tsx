/**
 * EmptyState — Consistent "no data" placeholder.
 *
 * Used across 15+ component files with duplicate markup.
 */

import React from 'react';
import { Package } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title = 'No data found.',
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      {icon || <Package className="w-10 h-10 mb-2 opacity-20" />}
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="text-xs text-slate-300 dark:text-slate-600 mt-1 text-center max-w-xs">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}