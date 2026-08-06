import React from 'react';
import { cn } from '@/src/design-system/utils/cn';
import type { LucideIcon } from 'lucide-react';
import { Text } from '@/src/components/data';

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
    <div className={cn('bg-sheet backdrop-blur-xl rounded-2xl border border-rule-subtle p-5', className)}>
      <h3 className="text-sm font-bold uppercase text-brass tracking-wider mb-4">{title}</h3>
      <div className="space-y-5">
        {sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <div key={i} className="flex items-start gap-3">
              <Icon className="w-4 h-4 text-ink-3 mt-0.5 shrink-0" />
              <div className="w-full min-w-0">
                <Text as="p" variant="label" className="mb-1">{section.title}</Text>
                <div className="text-sm text-ink">{section.content}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}