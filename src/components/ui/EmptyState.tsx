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
  className?: string;
}

export function EmptyState({
  icon,
  title = 'No data found.',
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-text-muted ${className}`}>
      {icon || <Package className="w-10 h-10 mb-2 opacity-30" />}
      <p className="text-sm font-medium text-text-default">{title}</p>
      {description && (
        <p className="text-xs text-text-muted mt-1 text-center max-w-xs">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
