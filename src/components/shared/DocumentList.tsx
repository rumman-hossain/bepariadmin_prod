import { cn } from '@/src/design-system/utils/cn';
import { CheckCircle, Clock, Download, XCircle } from 'lucide-react';
import { formatDate } from '@/src/components/data';

interface Document {
  name: string;
  date?: string;
  status: string;
  fileUrl?: string;
}

interface DocumentListProps {
  documents: Document[];
  className?: string;
}

const STATUS_ICON = {
  verified: { Icon: CheckCircle, tone: 'text-ok' },
  rejected: { Icon: XCircle, tone: 'text-bad' },
  pending: { Icon: Clock, tone: 'text-warn' },
} as const;

function statusPresentation(status: string) {
  const key = status.toLowerCase();
  if (key === 'verified' || key === 'uploaded') return STATUS_ICON.verified;
  if (key === 'rejected') return STATUS_ICON.rejected;
  // Anything unrecognised reads as awaiting review, never as verified.
  return STATUS_ICON.pending;
}

function formatDay(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatDate(date);
}

/**
 * KYC documents attached to a supplier.
 *
 * The download control used to be a `<button>` with no handler — it rendered,
 * it hovered, and clicking it did nothing at all. `fileUrl` was on the document
 * the whole time; nothing read it. It is an anchor now when a file exists, and
 * simply absent when one does not, rather than offering an action that fails.
 */
export function DocumentList({ documents, className }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-ink-3">
        No documents uploaded. A trade licence, TIN, VAT registration and owner NID are needed
        before approval.
      </p>
    );
  }

  return (
    <ul className={cn('space-y-1.5', className)}>
      {documents.map((doc, index) => {
        const { Icon, tone } = statusPresentation(doc.status);
        return (
          <li
            key={doc.fileUrl ?? `${doc.name}-${index}`}
            className="flex items-center justify-between gap-3 rounded-md border border-rule-subtle bg-sheet-2 px-2.5 py-2"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Icon className={cn('h-3.5 w-3.5 shrink-0', tone)} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-ink">
                  {doc.name}
                </span>
                <span className="block text-2xs text-ink-3">
                  {doc.status}
                  {doc.date ? ` · ${formatDay(doc.date)}` : ''}
                </span>
              </span>
            </span>

            {doc.fileUrl ? (
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${doc.name}`}
                className="shrink-0 rounded-sm p-1 text-ink-3 transition-colors hover:text-brass focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rule-focus"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ) : (
              <span className="shrink-0 text-2xs text-ink-3">No file</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
