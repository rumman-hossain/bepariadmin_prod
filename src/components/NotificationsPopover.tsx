/**
 * PARKED — not rendered anywhere. Deliberately kept, not dead by oversight.
 *
 * The header bell used to render this with a hardcoded empty array and two
 * no-op handlers, so an operator read "no notifications" when the truth was
 * "notifications are not built". An empty state that looks like a negative
 * result is worse than no feature, so the bell was removed rather than left
 * lying.
 *
 * The supplier detail screen tried the other answer — render the panels and
 * say out loud that the metric is not connected. It ended up apologising five
 * times across two thirds of the screen, and those panels were deleted too.
 * Removing the surface beats explaining it.
 *
 * Two things to fix before this is wired up:
 *   1. It hand-rolls outside-click, Escape and focus-return — all of which
 *      `controls/Popover` already does. Rebuild on that.
 *   2. It renders in place rather than in a portal, so it is clipped by any
 *      `overflow: hidden` ancestor and sits below modals. `Popover`'s own
 *      docstring records that this exact bug is why it portals.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { AppNotification } from '@/src/types/domain';
import { cn } from '@/src/design-system/utils/cn';
import { formatDateTime } from '@/src/components/data';

interface NotificationsPopoverProps {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

const ICON: Record<AppNotification['type'], React.ElementType> = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const ICON_TONE: Record<AppNotification['type'], string> = {
  success: 'text-ok',
  warning: 'text-warn',
  error: 'text-bad',
  info: 'text-note',
};

/**
 * Notification bell and its panel.
 *
 * Two things were wrong beyond the twenty-two hard-coded colours.
 *
 * **The rows were not reachable.** Each was a `<div onClick>`, so marking a
 * notification read was mouse-only — no tab stop, no Enter, nothing announced.
 * They are buttons now.
 *
 * **The panel was a trap.** No `aria-expanded`, no Escape, and focus stayed
 * behind it after it closed. Opening it with the keyboard left you stranded.
 */
export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const close = useCallback((returnFocus: boolean) => {
    setIsOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close(false);
    };
    // Escape returns focus to the bell; a click outside does not, because the
    // pointer has already moved the user's attention elsewhere.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, close]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
        }
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-md',
          'text-ink-2 transition-colors duration-150',
          'hover:bg-sheet-hover hover:text-ink',
          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rule-focus',
          isOpen && 'bg-sheet-selected text-ink',
        )}
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute right-1 top-1 h-2 w-2 rounded-full bg-bad ring-2 ring-sheet"
            aria-hidden="true"
          />
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className={cn(
            'absolute right-0 z-(--z-dropdown) mt-2 w-80 overflow-hidden sm:w-96',
            'rounded-lg border border-rule bg-sheet shadow-overlay',
          )}
        >
          <div className="flex items-center justify-between border-b border-rule-subtle px-4 py-2.5">
            <h2 className="text-sm font-semibold text-ink">Notifications</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="flex items-center gap-1 rounded-sm text-xs font-medium text-brass transition-colors hover:text-brass-lift focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rule-focus"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <Bell className="h-7 w-7 text-ink-3" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-ink">Nothing to review</p>
                <p className="mt-1 text-xs text-ink-2">
                  Approvals and alerts will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-rule-subtle">
                {notifications.map((notif) => {
                  const Icon = ICON[notif.type];
                  return (
                    <li key={notif.id}>
                      <button
                        type="button"
                        onClick={() => !notif.read && onMarkRead(notif.id)}
                        // Nothing happens on an already-read row, so it should
                        // not present itself as an action.
                        disabled={notif.read}
                        aria-label={
                          notif.read
                            ? `${notif.title}. Read.`
                            : `${notif.title}. Unread — activate to mark as read.`
                        }
                        className={cn(
                          'flex w-full gap-3 px-4 py-3 text-left transition-colors duration-150',
                          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-rule-focus',
                          notif.read
                            ? 'cursor-default'
                            : 'cursor-pointer bg-brass-wash hover:bg-sheet-hover',
                        )}
                      >
                        <Icon
                          className={cn('mt-0.5 h-4 w-4 shrink-0', ICON_TONE[notif.type])}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="mb-0.5 flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                'truncate text-sm',
                                notif.read
                                  ? 'font-normal text-ink-2'
                                  : 'font-medium text-ink',
                              )}
                            >
                              {notif.title}
                            </span>
                            {!notif.read && (
                              <span
                                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brass"
                                aria-hidden="true"
                              />
                            )}
                          </span>
                          <span className="mb-1 line-clamp-2 block text-xs text-ink-2">
                            {notif.message}
                          </span>
                          <time
                            dateTime={new Date(notif.timestamp).toISOString()}
                            className="block text-2xs text-ink-3"
                          >
                            {formatDateTime(notif.timestamp)}
                          </time>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

NotificationsPopover.displayName = 'NotificationsPopover';
