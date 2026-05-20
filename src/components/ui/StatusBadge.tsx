/**
 * StatusBadge — Colored status pill used across Wholesalers, Retailers, Products.
 *
 * Replaces repeated inline status styling patterns.
 */

import React from 'react';

const statusStyles: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Suspended: 'bg-red-50 text-red-700 border-red-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
  Pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Review: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Draft: 'bg-slate-50 text-slate-600 border-slate-200',
  'Pending Approval': 'bg-amber-50 text-amber-700 border-amber-200',
  Archived: 'bg-slate-100 text-slate-500 border-slate-300',
  Settled: 'bg-emerald-100 text-emerald-700',
  Delivered: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-red-100 text-red-700',
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-500',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const style = statusStyles[status] || 'bg-slate-50 text-slate-600 border-slate-200';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style} ${className}`}
    >
      {status}
    </span>
  );
}