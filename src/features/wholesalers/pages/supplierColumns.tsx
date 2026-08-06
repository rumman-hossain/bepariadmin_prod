import type { Column } from '@/src/components/data';
import { StatusBadge } from '@/src/components/data/StatusBadge';
import { Avatar } from '@/src/components/data/Avatar';
import { cn } from '@/src/design-system/utils/cn';
import { REQUIRED_DOC_SLOTS } from '../constants/documents';
import type { Wholesaler } from '@/src/types/domain';

/**
 * THE PAPERWORK QUARTET.
 *
 * Four marks in a fixed order — trade licence, TIN, VAT, NID — the certificates
 * a supplier is actually onboarded with. Filled means on file.
 *
 * A percentage or a "3 of 4" would say how MANY are missing. **Which one** is
 * missing is what decides the next action: chasing a VAT certificate is a
 * different call from chasing an owner's NID. The fixed order makes position
 * identity — reading down the column, a gap in the third slot is the VAT column
 * every time — so the pattern is scannable without a legend.
 *
 * The server sends a COUNT, not a set, so the marks are filled left to right.
 * That is honest about what is known: the count is what the query returns, and
 * inventing which specific certificates are present from a number would be a
 * guess rendered as fact. The tooltip says so.
 */
function PaperworkQuartet({ onFile, removed }: { onFile: number; removed: boolean }) {
  const total = REQUIRED_DOC_SLOTS.length;
  const missing = Math.max(0, total - onFile);

  return (
    <span
      className="inline-flex items-center gap-0.5"
      title={
        removed
          ? 'Removed supplier — its paperwork is kept, not destroyed'
          : missing === 0
            ? 'All four certificates on file'
            : `${missing} of ${total} certificates still missing`
      }
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            'block h-3.5 w-1.5 rounded-xs border',
            removed
              ? 'border-rule bg-mute-wash'
              : i < onFile
                ? 'border-ok-border bg-ok'
                : // A gap must have BODY. Drawn as a transparent outline it
                  // vanished at this size and a row with a hole simply looked
                  // like a row with fewer marks — the one reading the fixed
                  // order exists to prevent.
                  'border-warn-border bg-warn-wash',
          )}
        />
      ))}
      <span className="sr-only">
        {onFile} of {total} certificates on file
      </span>
      {missing > 0 && !removed && (
        <span className="ml-1.5 text-2xs font-medium text-warn">{missing} missing</span>
      )}
    </span>
  );
}

export const supplierColumns: Column<Wholesaler>[] = [
  {
    key: 'company',
    header: 'Company',
    sortBy: (w) => w.companyName,
    render: (w) => (
      <div className="flex items-center gap-2.5">
        <Avatar name={w.companyName} size="sm" square />
        <div className="flex min-w-0 flex-col">
          <span className={cn('truncate font-medium text-ink', w.deletedAt && 'line-through decoration-ink-4')}>
            {w.companyName}
          </span>
          {w.deletedAt ? (
            <span className="text-xs text-ink-3">Removed {w.deletedAt.slice(0, 10)}</span>
          ) : w.ownerName ? (
            <span className="truncate text-xs text-ink-3">{w.ownerName}</span>
          ) : null}
        </div>
      </div>
    ),
  },
  {
    /*
     * The supplier code, in a column of its own.
     *
     * It was grey subtext under the company name, which reads as decoration
     * rather than as the identifier an operator quotes on a payout or searches a
     * spreadsheet for. `font-identifier` is the mono treatment that marks
     * machine data as distinct from prose.
     */
    key: 'code',
    header: 'Code',
    width: 'w-32',
    sortBy: (w) => w.code ?? '',
    render: (w) =>
      w.code?.trim() ? (
        <span className="font-identifier text-ink-2">{w.code}</span>
      ) : (
        // An em dash, never an empty cell: a blank reads as a rendering fault
        // and never as "this supplier has no code yet".
        <span className="text-ink-4">—</span>
      ),
  },
  {
    key: 'district',
    header: 'District',
    hideOnMobile: true,
    sortBy: (w) => w.location,
    render: (w) => <span className="text-ink-2">{w.location || <span className="text-ink-4">—</span>}</span>,
  },
  {
    key: 'paperwork',
    header: 'Paperwork',
    width: 'w-40',
    sortBy: (w) => w.documentsOnFile ?? 0,
    render: (w) => (
      <PaperworkQuartet onFile={w.documentsOnFile ?? 0} removed={Boolean(w.deletedAt)} />
    ),
  },
  {
    key: 'registeredBy',
    header: 'Added by',
    width: 'w-24',
    hideOnMobile: true,
    sortBy: (w) => w.createdBy ?? '',
    // A quiet stamp, not a badge. It answers "who put this here", which is a
    // different question from "what state is it in", so it must not compete
    // with the status badge beside it.
    render: (w) => (
      <span
        className={cn(
          'text-2xs font-semibold uppercase tracking-wider',
          w.createdBy === 'ADMIN' ? 'text-brass' : 'text-ink-4',
        )}
      >
        {w.createdBy === 'ADMIN' ? 'Admin' : 'Self'}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortBy: (w) => w.status,
    render: (w) =>
      w.deletedAt ? <StatusBadge status="Removed" /> : <StatusBadge status={w.status} />,
  },
  {
    key: 'commission',
    header: 'Commission',
    align: 'right',
    width: 'w-32',
    sortBy: (w) => w.commissionRate ?? 0,
    render: (w) => (w.commissionRate != null ? `${w.commissionRate}%` : '—'),
  },
];
