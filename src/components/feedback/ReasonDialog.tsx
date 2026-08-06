import { useState } from 'react';
import { Dialog } from './Dialog';
import { Button } from '@/src/components/controls';
import { Textarea } from '@/src/components/controls';
import { AlertTriangle } from 'lucide-react';
import { Text } from '@/src/components/data';

const MAX_REASON_LENGTH = 1000;
/** Short enough to allow "fake", long enough to reject an accidental keystroke. */
const MIN_REASON_LENGTH = 3;

interface ReasonDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  loading?: boolean;
}

/**
 * Confirmation dialog that requires a written reason — used for reject,
 * suspend and request-resubmit, where the supplier is told why.
 *
 * Closing unmounts the body, so the draft reason and any validation message go
 * with it. An effect used to clear them on `open === false` instead, which left
 * the previous reason on screen for a frame the next time the dialog opened.
 */
export function ReasonDialog({ open, onClose, ...props }: ReasonDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} size="sm">
      {open && <ReasonDialogBody onClose={onClose} {...props} />}
    </Dialog>
  );
}

function ReasonDialogBody({
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  loading = false,
}: Omit<ReasonDialogProps, 'open'>) {
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleConfirm = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < MIN_REASON_LENGTH) {
      setLocalError(`Please enter a reason (at least ${MIN_REASON_LENGTH} characters).`);
      return;
    }
    if (trimmed.length > MAX_REASON_LENGTH) {
      setLocalError(`Reason must be ${MAX_REASON_LENGTH} characters or fewer.`);
      return;
    }
    setLocalError(null);
    await onConfirm(trimmed);
  };

  const isDanger = variant === 'danger';

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-full shrink-0 ${
            isDanger
              ? 'bg-bad-wash text-bad'
              : 'bg-warn-wash text-warn'
          }`}
        >
          <AlertTriangle className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          <Text as="p" variant="secondary" className="mt-1">{message}</Text>
        </div>
      </div>

      <Textarea
        label="Reason"
        required
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={4}
        maxLength={MAX_REASON_LENGTH}
        placeholder="Enter the reason for this action…"
        disabled={loading}
        error={localError ?? undefined}
      />

      <div className="flex gap-3 justify-end">
        <Button variant="secondary" size="md" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant={isDanger ? 'danger' : 'primary'}
          size="md"
          onClick={handleConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
