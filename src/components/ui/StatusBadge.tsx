/**
 * StatusBadge — Colored status pill used across Wholesalers, Retailers, Products.
 *
 * Replaces repeated inline status styling patterns.
 */

import React from 'react';

export type StatusBadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

const statusVariantMap: Record<string, StatusBadgeVariant> = {
  Active: 'success',
  Approved: 'success',
  Settled: 'success',
  Delivered: 'success',
  active: 'success',
  Suspended: 'danger',
  Rejected: 'danger',
  Cancelled: 'danger',
  Pending: 'warning',
  Review: 'warning',
  'Pending Approval': 'warning',
  Draft: 'neutral',
  Archived: 'neutral',
  inactive: 'neutral',
};

const variantStyles: Record<StatusBadgeVariant, string> = {
  success: 'bg-semantic-success-light text-semantic-success border-semantic-success',
  danger: 'bg-semantic-danger-light text-semantic-danger border-semantic-danger',
  warning: 'bg-semantic-warning-light text-semantic-warning border-semantic-warning',
  info: 'bg-semantic-info-light text-semantic-info border-semantic-info',
  neutral: 'bg-surface-muted text-text-muted border-border-default',
};

interface StatusBadgeProps {
  status: string;
  variant?: StatusBadgeVariant;
  className?: string;
}

export function StatusBadge({ status, variant, className = '' }: StatusBadgeProps) {
  const resolvedVariant = variant ?? statusVariantMap[status] ?? 'neutral';
  const style = variantStyles[resolvedVariant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} ${className}`}
    >
      {status}
    </span>
  );
}
