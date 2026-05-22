import React from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { CheckCircle, Clock, Download } from 'lucide-react';

interface Document {
  name: string;
  date?: string;
  status: string;
}

interface DocumentListProps {
  documents: Document[];
  className?: string;
}

export function DocumentList({ documents, className }: DocumentListProps) {
  if (documents.length === 0) {
    return <p className="text-sm text-[#8E8E93] dark:text-[#6D6D72] italic">No documents uploaded</p>;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {documents.map((doc, i) => (
        <div
          key={i}
          className="flex justify-between items-center p-2 bg-white/50 dark:bg-[#2C2C2E]/50 rounded-lg border border-[rgba(60,60,67,0.08)] dark:border-[rgba(255,255,255,0.06)]"
        >
          <div className="flex items-center gap-2 min-w-0">
            {doc.status === 'Verified' ? (
              <CheckCircle className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-[#FF9500] shrink-0" />
            )}
            <span className="text-xs font-medium text-[#1C1C1E] dark:text-[#FFFFFF] truncate">
              {doc.name}
            </span>
          </div>
          <button
            className="text-[#8E8E93] dark:text-[#6D6D72] hover:text-[#007AFF] dark:hover:text-[#0A84FF] p-1 shrink-0"
            aria-label={`Download ${doc.name}`}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}