import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { AppNotification } from '@/src/types/domain';
import { cn } from '@/src/design-system/utils/cn';

// ─── Types ───────────────────────────────────────────────

interface NotificationsPopoverProps {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

// ─── Helper ──────────────────────────────────────────────

const iconMap: Record<AppNotification['type'], React.ElementType> = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const iconColorMap: Record<AppNotification['type'], string> = {
  success: 'text-[#34C759]',
  warning: 'text-[#FF9F0A]',
  error: 'text-[#FF3B30] dark:text-[#FF453A]',
  info: 'text-[#007AFF] dark:text-[#0A84FF]',
};

// ─── Component ───────────────────────────────────────────

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={popoverRef}>
      {/* ── Trigger button ──────────────────────────── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        className={cn(
          'relative flex items-center justify-center',
          'w-10 h-10 rounded-xl',
          'text-[#6D6D72] dark:text-[#AEAEB2]',
          'hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]',
          'hover:text-[#1C1C1E] dark:hover:text-[#FFFFFF]',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#007AFF]/50 dark:focus-visible:ring-[#0A84FF]/50',
        )}
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute top-1 right-1',
              'w-2 h-2 rounded-full',
              'bg-[#FF3B30] dark:bg-[#FF453A]',
              'ring-2 ring-white dark:ring-[#1C1C1E]',
            )}
          />
        )}
      </button>

      {/* ── Popover dropdown ────────────────────────── */}
      {isOpen && (
        <div
          className={cn(
            'absolute right-0 mt-2 w-80 sm:w-96',
            // Glass surface
            'bg-[rgba(255,255,255,0.96)] dark:bg-[rgba(44,44,46,0.96)]',
            'backdrop-blur-2xl',
            // Border & shadow
            'rounded-2xl',
            'border border-[rgba(60,60,67,0.12)] dark:border-[rgba(255,255,255,0.08)]',
            'shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
            'z-50 overflow-hidden',
          )}
        >
          {/* Header */}
          <div
            className={cn(
              'flex items-center justify-between px-4 py-3',
              'border-b border-[rgba(60,60,67,0.08)] dark:border-[rgba(255,255,255,0.04)]',
              'bg-[rgba(242,242,247,0.5)] dark:bg-[rgba(28,28,30,0.5)]',
            )}
          >
            <h3 className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#FFFFFF]">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className={cn(
                  'flex items-center gap-1',
                  'text-[13px] font-medium',
                  'text-[#34C759] dark:text-[#30D158]',
                  'hover:text-[#248A3D] dark:hover:text-[#27AE60]',
                  'transition-colors duration-200',
                )}
              >
                <Check className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <Bell className="w-8 h-8 text-[#C7C7CC] dark:text-[#48484A]" />
                <p className="mt-3 text-[14px] text-[#8E8E93] dark:text-[#636366]">
                  No notifications yet
                </p>
              </div>
            ) : (
              <div
                className={cn(
                  'divide-y divide-[rgba(60,60,67,0.08)] dark:divide-[rgba(255,255,255,0.04)]',
                )}
              >
                {notifications.map((notif) => {
                  const Icon = iconMap[notif.type];
                  return (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (!notif.read) onMarkRead(notif.id);
                      }}
                      className={cn(
                        'flex gap-3 px-4 py-3 cursor-pointer',
                        'hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]',
                        'transition-colors duration-150',
                        !notif.read &&
                          'bg-[#007AFF]/4 dark:bg-[#0A84FF]/6',
                      )}
                    >
                      {/* Icon */}
                      <div className="shrink-0 mt-0.5">
                        <Icon className={cn('w-4 h-4', iconColorMap[notif.type])} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <p
                            className={cn(
                              'text-[14px] font-medium truncate',
                              !notif.read
                                ? 'text-[#1C1C1E] dark:text-[#FFFFFF]'
                                : 'text-[#6D6D72] dark:text-[#AEAEB2]',
                            )}
                          >
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <span
                              className={cn(
                                'w-2 h-2 rounded-full shrink-0 mt-1.5',
                                'bg-[#007AFF] dark:bg-[#0A84FF]',
                              )}
                            />
                          )}
                        </div>
                        <p
                          className={cn(
                            'text-[13px] text-[#8E8E93] dark:text-[#636366]',
                            'line-clamp-2 mb-1',
                          )}
                        >
                          {notif.message}
                        </p>
                        <p className="text-[11px] text-[#C7C7CC] dark:text-[#48484A] font-medium">
                          {new Date(notif.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

NotificationsPopover.displayName = 'NotificationsPopover';