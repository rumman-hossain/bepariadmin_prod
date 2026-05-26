import React from 'react';
import { Package, DollarSign, Star, Zap, type LucideIcon } from 'lucide-react';
import { cn } from '@/src/design-system/utils/cn';
import type { WholesalerStats } from '../api/stubs';

interface StatItem {
  label: string;
  value: string;
  icon: LucideIcon;
  gradient: string;
  iconWrap: string;
  iconColor: string;
}

function formatStatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

interface WholesalerDetailStatsProps {
  stats: WholesalerStats | null;
  dispatchSpeedFallback?: string;
}

export function WholesalerDetailStats({ stats, dispatchSpeedFallback }: WholesalerDetailStatsProps) {
  const items: StatItem[] = [
    {
      label: 'Total Orders',
      value: formatStatValue(stats?.totalOrders),
      icon: Package,
      gradient: 'from-blue-50 to-white dark:from-blue-900/10 dark:to-[#1C1C1E]',
      iconWrap: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Total Payout',
      value: formatStatValue(stats?.totalPayout),
      icon: DollarSign,
      gradient: 'from-emerald-50 to-white dark:from-emerald-900/10 dark:to-[#1C1C1E]',
      iconWrap: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Rating',
      value: formatStatValue(stats?.rating),
      icon: Star,
      gradient: 'from-amber-50 to-white dark:from-amber-900/10 dark:to-[#1C1C1E]',
      iconWrap: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Dispatch Speed',
      value: formatStatValue(stats?.dispatchSpeed ?? dispatchSpeedFallback),
      icon: Zap,
      gradient: 'from-purple-50 to-white dark:from-purple-900/10 dark:to-[#1C1C1E]',
      iconWrap: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={cn(
              'p-4 flex items-center gap-4 rounded-2xl border border-[rgba(60,60,67,0.06)] bg-gradient-to-br',
              item.gradient,
            )}
          >
            <div className={cn('p-3 rounded-full shrink-0', item.iconWrap)}>
              <Icon className={cn('w-6 h-6', item.iconColor)} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{item.label}</p>
              <p className="text-xl font-bold text-[#1C1C1E] dark:text-white truncate">{item.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
