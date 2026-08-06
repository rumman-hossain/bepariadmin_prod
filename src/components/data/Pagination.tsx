import React from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '@/src/components/controls';

export interface PaginationProps {
  page: number;
  pageSize: number;
  /** Total matching records, not the number on this page. */
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Table pagination.
 *
 * Extracted because ProductListPage hand-rolled Prev/Next inline while the
 * wholesaler list had no pagination at all and simply rendered whatever the
 * first page returned — which silently understates the list as data grows.
 *
 * Shows the record range rather than just page numbers: "1–20 of 248" answers
 * "how much is there" in one glance, which is what an operator actually wants.
 */
export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
  disabled = false,
  className,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 px-1 py-2',
        className,
      )}
    >
      <p className="text-sm text-ink-3">
        {total === 0 ? (
          'No records'
        ) : (
          <>
            <span className="cell-numeric font-medium text-ink-2">{from.toLocaleString('en-BD')}</span>
            {'–'}
            <span className="cell-numeric font-medium text-ink-2">{to.toLocaleString('en-BD')}</span>
            {' of '}
            <span className="cell-numeric font-medium text-ink-2">{total.toLocaleString('en-BD')}</span>
          </>
        )}
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <IconButton variant="secondary" size="sm" label="Previous page" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)} icon={ChevronLeft} />
          <span className="px-2 text-sm text-ink-3" aria-live="polite">
            <span className="cell-numeric font-medium text-ink-2">{page}</span>
            {' / '}
            <span className="cell-numeric">{totalPages}</span>
          </span>
          <IconButton variant="secondary" size="sm" label="Next page" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)} icon={ChevronRight} />
        </div>
      </div>
    </div>
  );
};
