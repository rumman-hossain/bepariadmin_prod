import React from 'react';
import { cn } from '@/src/design-system/utils/cn';
import type { LucideIcon } from 'lucide-react';

interface DetailSection {
  icon: LucideIcon;
  title: string;
  content: React.ReactNode;
}

interface EntityDetailsCardProps {
  title: string;
  sections: DetailSection[];
  className?: string;
}

export function EntityDetailsCard({ title, sections, className }: EntityDetailsCardProps) {
  return (
    <div className={cn('bg-surface-glass backdrop-blur-xl rounded-2xl border border-border-subtle p-5', className)}>
      <h3 className="text-sm font-bold uppercase text-accent-primary tracking-wider mb-4">{title}</h3>
      <div className="space-y-5">
        {sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <div key={i} className="flex items-start gap-3">
              <Icon className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
              <div className="w-full min-w-0">
                <p className="text-xs font-bold text-text-muted uppercase mb-1">{section.title}</p>
                <div className="text-sm text-text-default">{section.content}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}