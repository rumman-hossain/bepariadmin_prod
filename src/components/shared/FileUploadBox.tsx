import React from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { UploadCloud, Check } from 'lucide-react';

interface FileUploadBoxProps {
  label: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
  className?: string;
}

export function FileUploadBox({ label, subtitle, selected, onClick, className }: FileUploadBoxProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className={cn(
        'border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer group transition-all relative',
        selected
          ? 'border-semantic-success bg-semantic-success-light'
          : 'border-border-input hover:bg-surface-secondary',
        className,
      )}
    >
      {selected && (
        <div className="absolute top-2 right-2 bg-semantic-success text-white rounded-full p-0.5">
          <Check className="w-3 h-3" />
        </div>
      )}
      <UploadCloud
        className={cn(
          'w-8 h-8 mb-2',
          selected ? 'text-semantic-success' : 'text-text-placeholder group-hover:text-accent-primary',
        )}
      />
      <p className={cn('text-sm font-bold', selected ? 'text-semantic-success' : 'text-text-default')}>
        {label}
      </p>
      <p className="text-xs text-text-muted">{selected ? 'Selected' : subtitle}</p>
    </div>
  );
}