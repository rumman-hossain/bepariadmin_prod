/**
 * Modal — Reusable overlay dialog.
 *
 * Used 10+ times inline across Wholesalers, Retailers, Products components.
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, subtitle, children, maxWidth = 'max-w-lg' }: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className={`bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl w-full ${maxWidth} rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200/50 dark:border-gray-800/50`}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div className="px-8 py-5 border-b border-gray-200/50 dark:border-gray-800/50 flex justify-between items-center bg-transparent rounded-t-[2rem]">
            <div>
              {title && <h3 className="text-xl font-bold text-black dark:text-white">{title}</h3>}
              {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-8 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}