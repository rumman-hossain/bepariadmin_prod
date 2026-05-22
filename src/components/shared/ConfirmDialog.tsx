import React from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { AlertTriangle, type LucideIcon } from 'lucide-react';

type ConfirmVariant = 'danger' | 'warning' | 'success';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  icon?: LucideIcon;
  loading?: boolean;
}

const variantStyles: Record<ConfirmVariant, { bg: string; iconColor: string; buttonVariant: 'danger' | 'primary' | 'primary' }> = {
  danger: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    buttonVariant: 'danger',
  },
  warning: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    buttonVariant: 'primary',
  },
  success: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    buttonVariant: 'primary',
  },
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  icon: Icon = AlertTriangle,
  loading = false,
}: ConfirmDialogProps) {
  const style = variantStyles[variant];

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="text-center">
        <div
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
            style.bg,
            style.iconColor,
          )}
        >
          <Icon className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-[#1C1C1E] dark:text-[#FFFFFF] mb-2">
          {title}
        </h3>
        <p className="text-sm text-[#6D6D72] dark:text-[#AEAEB2] mb-6">{message}</p>

        <div className="flex gap-3 justify-center">
          <Button variant="secondary" size="md" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={style.buttonVariant}
            size="md"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}