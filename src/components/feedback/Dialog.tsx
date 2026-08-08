import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/src/design-system/utils/cn';
import { Button, IconButton } from '@/src/components/controls';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

const SIZE: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-3xl',
  full: 'max-w-[calc(100vw-2rem)]',
};

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  size?: DialogSize;
  /** Sticky action row. Use `DialogFooter` for the standard layout. */
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
  className?: string;
  /*
   * True when the dialog holds input the operator would lose by dismissing it.
   *
   * Escape and a backdrop click then raise a discard confirmation instead of
   * closing. It lives HERE rather than in each caller because the failure it
   * prevents — a stray backdrop click throwing away a typed rejection reason —
   * is one every hand-rolled modal would get wrong differently, and six of the
   * ones in this app did not consider it at all.
   *
   * Leave it false for a dialog that holds no input: a confirmation the
   * operator must answer already uses `closeOnBackdrop`, and asking "discard?"
   * about a question is nonsense.
   */
  isDirty?: boolean;
  /** Shown in the discard confirmation, so it can name what is being lost. */
  discardMessage?: string;
}

/**
 * Dialog.
 *
 * The behaviour is ported from `ui/Modal` rather than rewritten — portal,
 * focus trap, focus restore, document-level Escape and scrollbar-compensating
 * scroll lock were all correct there and are the hard parts. What changed:
 * the tokens, and `z-(--z-modal)` in place of a hardcoded `z-50`, so it sits on
 * the documented stacking scale instead of colliding with whatever else picked
 * 50.
 *
 * Note that a `Popover` opened inside this renders ABOVE it, by design — see
 * the stacking-order note in index.css.
 */
export function Dialog({
  open,
  onClose,
  children,
  title,
  subtitle,
  size = 'md',
  footer,
  closeOnBackdrop = true,
  className,
  isDirty = false,
  discardMessage = 'Anything typed here will be lost.',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const subtitleId = useId();
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  /*
   * The single door out for both dismissal gestures.
   *
   * Escape and the backdrop used to call `onClose` directly, so a dialog
   * holding a half-typed rejection reason discarded it on a misclick with no
   * warning. Routing both through here means a caller cannot opt one of them
   * into the guard and forget the other.
   */
  const requestClose = useCallback(() => {
    if (isDirty) setConfirmingDiscard(true);
    else onClose();
  }, [isDirty, onClose]);

  // Bound to the document, not the panel, so Escape works wherever focus sits —
  // including after a backdrop click has moved it out.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        requestClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, requestClose]);

  // Focus trap: cycle Tab within the panel.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) {
        e.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Focus in on open, back where it came from on close.
  useEffect(() => {
    if (!open) return;
    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    const id = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panelRef.current)?.focus();
    });
    return () => {
      cancelAnimationFrame(id);
      restoreFocusTo.current?.focus?.();
    };
  }, [open]);

  // Scroll lock, compensating for the scrollbar so the page does not shift.
  useEffect(() => {
    if (!open) return;
    const { body, documentElement } = document;
    const gap = window.innerWidth - documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    body.style.overflow = 'hidden';
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
    };
  }, [open]);

  const onBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnBackdrop && e.target === e.currentTarget) requestClose();
    },
    [closeOnBackdrop, requestClose],
  );

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-(--z-modal) flex items-center justify-center p-4">
      {/*
        `--z-base`, NOT `--z-overlay`.

        The overlay step is a page-level rank — it is what puts the Sidebar's
        drawer backdrop above the app chrome. Used here it is applied *inside*
        the container that is already at `--z-modal`, so it stops ranking
        against the page and starts ranking against its own sibling, the panel.
        The panel is `relative` with `z-index: auto`, and within a stacking
        context a positioned child with a positive z-index paints above one with
        auto — so the backdrop covered the dialog and every button in it,
        including Cancel, was unclickable.

        This was live in every confirm dialog in the app. jsdom does no hit
        testing and `fireEvent.click` dispatches on the node directly, so the
        whole feedback suite passed against an unusable dialog; it took hit
        testing in a real browser to see it.

        Inside this container the only question is local order, so the two
        siblings say so explicitly rather than relying on tree order.
      */}
      <div
        className="absolute inset-0 z-(--z-base) animate-fade-in bg-sheet-inverse/45"
        onClick={onBackdropClick}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        className={cn(
          'relative z-(--z-raised) flex max-h-[calc(100vh-2rem)] w-full flex-col',
          SIZE[size],
          'rounded-lg border border-rule bg-sheet shadow-modal',
          'animate-scale-in focus:outline-none',
          className,
        )}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between gap-4 border-b border-rule-subtle px-5 py-3.5">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="text-lg font-semibold text-ink">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p id={subtitleId} className="mt-0.5 text-sm text-ink-3">
                  {subtitle}
                </p>
              )}
            </div>
            <IconButton icon={X} label="Close" size="sm" onClick={onClose} className="-mt-1 -mr-1.5" />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-rule-subtle px-5 py-3">
            {footer}
          </div>
        )}

        {/*
          The discard guard, rendered INSIDE the panel rather than as a second
          Dialog.

          A nested portal would put a dialog on top of a dialog, and the focus
          trap of the one underneath would still be live — Tab would cycle
          through the form the operator is being asked about. Covering the panel
          keeps one trap, one Escape handler and one scroll lock.
        */}
        {confirmingDiscard && (
          <div className="absolute inset-0 z-(--z-raised) flex items-center justify-center rounded-lg bg-sheet/95 p-5">
            <div className="max-w-xs text-center">
              <p className="text-md font-semibold text-ink">Discard your changes?</p>
              <p className="mt-1 text-sm text-ink-2">{discardMessage}</p>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="secondary" onClick={() => setConfirmingDiscard(false)}>
                  Keep editing
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setConfirmingDiscard(false);
                    onClose();
                  }}
                >
                  Discard
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * The standard dialog action row.
 *
 * `DialogProps.footer` has told callers to "use `DialogFooter`" since the
 * primitive was written, and it did not exist — that string's only other
 * occurrence in the tree was the docstring itself. So six callers invented six
 * footers, and "Cancel" acquired three different spellings across them
 * (`ghost`, `secondary`, `outline`).
 *
 * Cancel FIRST in source order and therefore first in the tab order, primary
 * last: the destructive or committing action should not be the thing a hurried
 * operator reaches by muscle memory. Four dialogs in the wizard had it the
 * other way round.
 */
export function DialogFooter({
  cancelLabel = 'Cancel',
  onCancel,
  children,
}: {
  cancelLabel?: string;
  /** Omit to render no cancel — for a dialog whose only exit is the primary. */
  onCancel?: () => void;
  /** The primary action, and any secondary ones, in order. */
  children: React.ReactNode;
}) {
  return (
    <>
      {onCancel && (
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
      )}
      {children}
    </>
  );
}

export type ConfirmTone = 'danger' | 'warning' | 'success' | 'default';

const CONFIRM_TONE: Record<ConfirmTone, { wash: string; ink: string; button: 'danger' | 'primary' }> =
  {
    danger: { wash: 'bg-bad-wash', ink: 'text-bad', button: 'danger' },
    warning: { wash: 'bg-warn-wash', ink: 'text-warn', button: 'primary' },
    // Constructive, not destructive — onboarding a supplier, not deleting one.
    // Carried over from the second ConfirmDialog this one absorbed, so that
    // screen keeps the colour it shipped with.
    success: { wash: 'bg-ok-wash', ink: 'text-ok', button: 'primary' },
    default: { wash: 'bg-brass-wash', ink: 'text-brass', button: 'primary' },
  };

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** ReactNode, not string — some confirmations need a list or an amount. */
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  icon?: LucideIcon;
  loading?: boolean;
}

/**
 * Confirm before an action that is hard to undo.
 *
 * Seven copies of this shape shipped inline — four of them back to back in
 * `AddProductFlow`, plus one in the product list, one in the add-product page,
 * and a fifth variant with its own icon-circle header in `ReasonDialog`. Each
 * re-invented `p-6 space-y-4` and the footer button row, and they disagreed on
 * button order: two put the destructive action first.
 *
 * Cancel comes first here and is the safe default under Escape, because the
 * dialog exists precisely when the other option is expensive.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  icon: Icon = AlertTriangle,
  loading = false,
}: ConfirmDialogProps) {
  const style = CONFIRM_TONE[tone];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      // A confirmation must be answered, not dismissed by a stray click.
      closeOnBackdrop={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={style.button} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            style.wash,
            style.ink,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-md font-semibold text-ink">{title}</h2>
          <div className="mt-1 text-sm text-ink-2">{message}</div>
        </div>
      </div>
    </Dialog>
  );
}
