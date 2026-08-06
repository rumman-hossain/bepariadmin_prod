import React from 'react';
import { cn } from '@/src/design-system/utils/cn';
import type { LucideIcon } from 'lucide-react';

interface FormSectionProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ icon: Icon, title, children, className }: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <h4 className="text-sm font-bold uppercase text-brass tracking-wider flex items-center gap-2">
        <Icon className="w-4 h-4" /> {title}
      </h4>
      {children}
    </div>
  );
}