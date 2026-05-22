import React, { forwardRef, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  size?: ModalSize;
  /** Close when clicking outside (backdrop) */
  closeOnBackdrop?: boolean;
  /** Close when pressing Escape */
  closeOnEscape?: boolean;
  className?: string;
}

// ─── Size Map ────────────────────────────────────────────

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-[calc(100vw-2rem)]',
};

// ─── Component ───────────────────────────────────────────

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      open,
      onClose,
      children,
      title,
      subtitle,
      size = 'md',
      closeOnBackdrop = true,
      closeOnEscape = true,
      className,
    },
    ref,
  ) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<Element | null>(null);

    // Focus trap + restore
    useEffect(() => {
      if (!open) return;
      previousActiveElement.current = document.activeElement;
      // Focus the modal content container
      requestAnimationFrame(() => {
        contentRef.current?.focus();
      });
      return () => {
        (previousActiveElement.current as HTMLElement)?.focus?.();
      };
    }, [open]);

    // Keyboard: Escape to close
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Escape' && closeOnEscape) {
          onClose();
        }
      },
      [closeOnEscape, onClose],
    );

    // Backdrop click
    const handleBackdropClick = useCallback(
      (e: React.MouseEvent) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onClose();
        }
      },
      [closeOnBackdrop, onClose],
    );

    // Scroll lock
    useEffect(() => {
      if (!open) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }, [open]);

    if (!open) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        role="presentation"
      >
        {/* Backdrop */}
        <div
          className={cn(
            'absolute inset-0 bg-black/40 dark:bg-black/60',
            'backdrop-blur-md',
            'animate-fade-in',
          )}
          onClick={handleBackdropClick}
          aria-hidden="true"
        />

        {/* Panel */}
        <div
          ref={ref}
          onKeyDown={handleKeyDown}
          className={cn(
            'relative w-full mx-4',
            sizeClasses[size],
            'bg-surface-glass backdrop-blur-2xl',
            'rounded-3xl',
            'shadow-elevation',
            'border border-border-subtle',
            'overflow-hidden',
            'flex flex-col max-h-[90vh]',
            'animate-scale-in',
            'focus:outline-none',
            className,
          )}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
        >
          {/* Header */}
          {(title || subtitle) && (
            <div className="flex items-start justify-between px-8 pt-6 pb-4">
              <div className="min-w-0">
                {title && (
                  <h2 className="text-xl font-bold text-text-default truncate">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-sm text-text-muted mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className={cn(
                  'shrink-0 ml-4 p-2 rounded-full',
                  'text-text-muted hover:text-text-default',
                  'hover:bg-surface-secondary',
                  'transition-colors',
                )}
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Body */}
          <div
            ref={contentRef}
            className="px-8 pb-6 overflow-y-auto focus:outline-none"
            tabIndex={-1}
          >
            {children}
          </div>
        </div>
      </div>
    );
  },
);

Modal.displayName = 'Modal';