import React from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { Button } from '@/src/components/controls';
import { ArrowLeft } from 'lucide-react';
import { Text } from '@/src/components/data';

export interface PageHeaderProps {
  title: string;
  /**
   * A status pill beside the title.
   *
   * The supplier detail screen had been writing the state INTO the title —
   * `Mayer Doa Store (Active)` — which makes the name of the business change
   * when it is suspended, and renders a state machine in the same weight as a
   * proper noun. Every other surface in the console, including the list column
   * next to it, uses `StatusBadge`.
   */
  badge?: React.ReactNode;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, badge, subtitle, onBack, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col justify-between gap-3 sm:flex-row sm:items-center', className)}>
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <Button
            variant="ghost"
            size="md"
            onClick={onBack}
            iconLeft={ArrowLeft}
            className="shrink-0"
            aria-label="Go back"
          >
            Back
          </Button>
        )}
        <div className="min-w-0">
          {/* text-xl is the page-title step (21px). The old text-2xl bold at
              26px competed with the KPI figures it sat above. */}
          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="truncate text-xl font-semibold tracking-tight text-ink">
              {title}
            </h1>
            {badge && <span className="shrink-0">{badge}</span>}
          </div>
          {subtitle && <Text as="p" variant="secondary" className="mt-0.5">{subtitle}</Text>}
        </div>
      </div>
      {actions && <div className="flex gap-2 w-full sm:w-auto">{actions}</div>}
    </div>
  );
}