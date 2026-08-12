import type { Column } from '@/src/components/data';
import { StatusBadge } from '@/src/components/data/StatusBadge';
import { Avatar } from '@/src/components/data/Avatar';
import { cn } from '@/src/design-system/utils/cn';
import { PaperworkQuartet } from './PaperworkQuartet';
import type { Wholesaler } from '@/src/types/domain';

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
