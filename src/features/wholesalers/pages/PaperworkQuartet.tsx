import { cn } from '@/src/design-system/utils/cn';
import { REQUIRED_DOC_SLOTS } from '../constants/documents';

/*
 * Lifted out of supplierColumns.tsx, which is a DATA file: it exports a column
 * definition array, and a module that exports data while also declaring a
 * component loses Fast Refresh for the whole module
 * (`react-refresh/only-export-components`). The column list is imported by
 * ListPage, so that cost landed on the supplier list screen.
 */
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
export function PaperworkQuartet({ onFile, removed }: { onFile: number; removed: boolean }) {
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
