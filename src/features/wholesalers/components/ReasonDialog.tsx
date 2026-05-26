import React, { useState, useEffect } from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

interface ReasonDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  loading?: boolean;
  minLength?: number;
}

export function ReasonDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  loading = false,
  minLength = 3,
}: ReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReason('');
      setLocalError(null);
    }
  }, [open]);

  const handleConfirm = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < minLength) {
      setLocalError(`Please enter a reason (at least ${minLength} characters).`);
      return;
    }
    if (trimmed.length > 1000) {
      setLocalError('Reason must be 1000 characters or fewer.');
      return;
    }
    setLocalError(null);
    await onConfirm(trimmed);
  };

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-full shrink-0 ${
              variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1C1C1E] dark:text-white">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{message}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={1000}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[rgba(60,60,67,0.16)] bg-white dark:bg-[#2C2C2E] focus:ring-2 focus:ring-[#007AFF]/30 outline-none"
            placeholder="Enter the reason for this action..."
            disabled={loading}
          />
          {localError && <p className="mt-1 text-xs text-red-500">{localError}</p>}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" size="md" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="md"
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
