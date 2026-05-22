import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// ─── Icons ───────────────────────────────────────────────

const iconMap: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

function toBgClass(type: ToastType): string {
  switch (type) {
    case 'success': return 'bg-semantic-success-light border-semantic-success/30';
    case 'error': return 'bg-semantic-danger-light border-semantic-danger/30';
    case 'warning': return 'bg-semantic-warning-light border-semantic-warning/30';
    case 'info': return 'bg-semantic-info-light border-semantic-info/30';
  }
}

function toIconColorClass(type: ToastType): string {
  switch (type) {
    case 'success': return 'text-semantic-success';
    case 'error': return 'text-semantic-danger';
    case 'warning': return 'text-semantic-warning';
    case 'info': return 'text-semantic-info';
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

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return context;
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
        <p className="text-sm font-semibold text-text-default">{toast.title}</p>
        {toast.message && (
          <p className="text-sm text-text-muted mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 p-0.5 rounded-full text-text-muted hover:text-text-default transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}