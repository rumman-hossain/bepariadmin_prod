import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ToastContext, type Toast, type ToastType } from './useToast';
import { cn } from '@/src/design-system/utils/cn';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

// ─── Icons ───────────────────────────────────────────────

const iconMap: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

function toBgClass(type: ToastType): string {
  switch (type) {
    case 'success': return 'bg-ok-wash border-ok/30';
    case 'error': return 'bg-bad-wash border-bad/30';
    case 'warning': return 'bg-warn-wash border-warn/30';
    case 'info': return 'bg-note-wash border-note/30';
  }
}

function toIconColorClass(type: ToastType): string {
  switch (type) {
    case 'success': return 'text-ok';
    case 'error': return 'text-bad';
    case 'warning': return 'text-warn';
    case 'info': return 'text-note';
  }
}

// ─── Provider ────────────────────────────────────────────

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastIdCounter}`;
    setToasts((prev) => [...prev, { ...t, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string) => addToast({ type: 'success', title, message }), [addToast]);
  const error = useCallback((title: string, message?: string) => addToast({ type: 'error', title, message }), [addToast]);
  const warning = useCallback((title: string, message?: string) => addToast({ type: 'warning', title, message }), [addToast]);
  const info = useCallback((title: string, message?: string) => addToast({ type: 'info', title, message }), [addToast]);

  /*
   * Memoised, and deliberately NOT including `toasts`.
   *
   * ToastProvider wraps RouterProvider, so its context value is read by the
   * entire app. An inline object literal meant a brand-new context identity on
   * every toast added AND every 5-second auto-dismiss — two full-tree
   * reconciliations per notification, for a piece of transient chrome.
   *
   * The toast list itself is passed straight to <ToastContainer> below, which is
   * the only thing that needs to re-render when it changes. Consumers of
   * `useToast()` only ever call the emit functions, all of which are stable.
   */
  const value = useMemo(
    () => ({ addToast, removeToast, success, error, warning, info }),
    [addToast, removeToast, success, error, warning, info],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ─── Container ───────────────────────────────────────────

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ─── Item ────────────────────────────────────────────────

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const ToastIcon = iconMap[toast.type];

  useEffect(() => {
    const duration = toast.duration ?? 5000;
    if (duration <= 0) return;
    const timer = setTimeout(() => onRemove(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto flex items-start gap-3',
        'px-4 py-3 rounded-2xl border',
        'shadow-lg backdrop-blur-xl',
        'animate-slide-up',
        toBgClass(toast.type),
      )}
    >
      {React.createElement(ToastIcon, {
        className: cn('w-5 h-5 shrink-0 mt-0.5', toIconColorClass(toast.type)),
        'aria-hidden': true,
      })}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">{toast.title}</p>
        {toast.message && (
          <p className="text-sm text-ink-3 mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 p-0.5 rounded-full text-ink-3 hover:text-ink transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}