import React from 'react';
import { Menu, Moon, Sun, LogOut } from 'lucide-react';
import { NotificationsPopover } from '@/components/NotificationsPopover';
import type { AppNotification } from '@/src/types/domain';
import { useTheme } from '@/src/design-system';
import { cn } from '@/src/design-system/utils/cn';
import { Input } from '@/src/components/ui/Input';

// ─── Types ───────────────────────────────────────────────

export interface HeaderProps {
  /** Toggle sidebar open/close */
  toggleSidebar: () => void;
  /** Notification data */
  notifications: AppNotification[];
  /** Mark single notification as read */
  onMarkNotificationRead: (id: string) => void;
  /** Mark all notifications as read */
  onMarkAllNotificationsRead: () => void;
  /** Logout handler */
  onLogout?: () => void;
  /** Global search query */
  searchQuery?: string;
  /** Called when search query changes */
  onSearchChange?: (query: string) => void;
  /** Optional class override */
  className?: string;
}

// ─── Component ───────────────────────────────────────────

export const Header: React.FC<HeaderProps> = ({
  toggleSidebar,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onLogout,
  searchQuery = '',
  onSearchChange,
  className,
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header
      className={cn(
        // Height
        'h-16',

        // Glass surface
        'bg-[rgba(255,255,255,0.88)] dark:bg-[rgba(28,28,30,0.88)]',
        'backdrop-blur-xl',

        // Hairline bottom border
        'border-b border-[rgba(60,60,67,0.08)] dark:border-[rgba(255,255,255,0.04)]',

        // Layout
        'flex items-center justify-between',

        // Padding
        'px-4 lg:px-6',

        // Sticky
        'sticky top-0 z-40',

        className,
      )}
    >
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Sidebar toggle */}
        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className={cn(
            'flex items-center justify-center',
            'w-10 h-10 rounded-xl',
            'text-[#6D6D72] dark:text-[#AEAEB2]',
            'hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]',
            'hover:text-[#1C1C1E] dark:hover:text-[#FFFFFF]',
            'transition-all duration-200 ease-out',
            'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#007AFF]/50 dark:focus-visible:ring-[#0A84FF]/50',
          )}
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Global search */}
        {onSearchChange && (
          <div className="hidden md:block w-64">
            <Input
              type="search"
              size="sm"
              placeholder="Global Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Global search"
            />
          </div>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={cn(
            'flex items-center justify-center',
            'w-10 h-10 rounded-xl',
            'text-[#6D6D72] dark:text-[#AEAEB2]',
            'hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]',
            'hover:text-[#1C1C1E] dark:hover:text-[#FFFFFF]',
            'transition-all duration-200 ease-out',
            'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#007AFF]/50 dark:focus-visible:ring-[#0A84FF]/50',
          )}
        >
          {isDark ? (
            <Sun className="w-5 h-5" aria-hidden="true" />
          ) : (
            <Moon className="w-5 h-5" aria-hidden="true" />
          )}
        </button>

        {/* Notifications */}
        <NotificationsPopover
          notifications={notifications}
          onMarkRead={onMarkNotificationRead}
          onMarkAllRead={onMarkAllNotificationsRead}
        />

        {/* Logout */}
        {onLogout && (
          <button
            onClick={onLogout}
            aria-label="Logout"
            className={cn(
              'flex items-center justify-center',
              'w-10 h-10 rounded-xl ml-1',
              'text-[#FF3B30] dark:text-[#FF453A]',
              'hover:bg-[#FF3B30]/8 dark:hover:bg-[#FF453A]/10',
              'transition-all duration-200 ease-out',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#FF3B30]/50 dark:focus-visible:ring-[#FF453A]/50',
            )}
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </header>
  );
};

Header.displayName = 'Header';