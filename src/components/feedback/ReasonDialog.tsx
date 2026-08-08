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
  /*
   * Whether the operator has typed a reason yet.
   *
   * This dialog inherited `closeOnBackdrop`'s default of `true` and had no
   * dirty guard, so a stray click on the backdrop threw away a rejection reason
   * mid-sentence with no warning — on the one dialog in the app whose entire
   * purpose is a piece of writing the supplier will read.
   *
   * Held here rather than in the body because Dialog needs it, and the body is
   * deliberately remounted per open (see above) so its own state cannot be
   * lifted without reintroducing the stale-frame bug that remount fixes.
   */
  const [dirty, setDirty] = useState(false);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={props.title}
      isDirty={dirty}
      discardMessage="The reason you have written will be lost."
    >
      {open && <ReasonDialogBody onClose={onClose} onDirtyChange={setDirty} {...props} />}
    </Dialog>
  );
}

function ReasonDialogBody({
  onClose,
  onConfirm,
  onDirtyChange,
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  loading = false,
}: Omit<ReasonDialogProps, 'open' | 'title'> & { onDirtyChange: (dirty: boolean) => void }) {
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
        {/* The heading moved to Dialog's `title`, which is what wires
            aria-labelledby and renders the close button — with it in the body
            this dialog had neither. `font-bold` went with it: the type scale
            deliberately stops at semibold. */}
        <Text as="p" variant="secondary">{message}</Text>
      </div>

      <Textarea
        label="Reason"
        required
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          onDirtyChange(e.target.value.trim().length > 0);
        }}
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
