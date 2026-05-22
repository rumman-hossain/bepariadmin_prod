import React from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { Button } from '@/src/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, onBack, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4', className)}>
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
          <h1 className="text-2xl font-bold text-[#1C1C1E] dark:text-[#FFFFFF] truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-[#8E8E93] dark:text-[#6D6D72] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex gap-2 w-full sm:w-auto">{actions}</div>}
    </div>
  );
}