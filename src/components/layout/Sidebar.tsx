/**
 * Sidebar — navigation rail/panel.
 * Uses react-router for navigation (URL is the single source of truth).
 * Parent controls visibility via isOpen/onToggle.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/src/design-system/utils/cn';
import { ROUTES } from '@/src/app/routes';
import { ChevronLeft } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────

export interface SidebarProps {
  /** Whether sidebar is expanded */
  isOpen: boolean;
  /** Called when user toggles sidebar (collapse button or mobile backdrop) */
  onToggle: () => void;
  /** Optional class override */
  className?: string;
}

// ─── Token-derived constants ──────────────────────────────

const NAV_ITEM_CLASS =
  'w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#007AFF]/50 dark:focus-visible:ring-[#0A84FF]/50 focus-visible:ring-offset-0 min-h-[44px]';

const NAV_ITEM_ACTIVE_CLASS = cn(
  'bg-[#F2F2F7] dark:bg-[#2C2C2E]',
  'text-[#1C1C1E] dark:text-[#FFFFFF]',
  'font-medium',
);

const NAV_ITEM_INACTIVE_CLASS = cn(
  'bg-transparent',
  'text-[#6D6D72] dark:text-[#AEAEB2]',
  'font-normal',
  'hover:bg-[#F2F2F7]/70 dark:hover:bg-[#2C2C2E]/70',
  'hover:text-[#1C1C1E] dark:hover:text-[#FFFFFF]',
);

const ICON_CLASS = 'w-5 h-5 shrink-0';

// ─── Component ───────────────────────────────────────────

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  className,
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);
  const location = useLocation();
  const navigate = useNavigate();

  // Current active route id derived from URL path
  const currentPath = location.pathname.replace(/^\/+/, '');

  // Track isOpen for escape key handler without stale closure
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpenRef.current) {
        onToggle();
      }
    },
    [onToggle],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll when mobile overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Separate bottom group: Settings, Audit Logs (last 2 routes)
  const mainRoutes = ROUTES.slice(0, -2);
  const bottomRoutes = ROUTES.slice(-2);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onToggle}
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-40',
          'bg-black/20 dark:bg-black/40',
          'backdrop-blur-sm',
          'transition-opacity duration-300 ease-out',
          'lg:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        role="navigation"
        aria-label="Main navigation"
        className={cn(
          // Positioning
          'fixed top-0 left-0 bottom-0 z-50',
          'flex flex-col',

          // Glass surface
          'bg-[rgba(255,255,255,0.88)] dark:bg-[rgba(28,28,30,0.88)]',
          'backdrop-blur-xl',

          // Border — right edge hairline only
          'border-r border-[rgba(60,60,67,0.12)] dark:border-[rgba(255,255,255,0.08)]',

          // Width transition
          'transition-all duration-300 ease-out',
          isOpen ? 'w-64' : 'w-[72px]',

          // Mobile: slide in overlay
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',

          // Shadow — soft edge on desktop only
          'lg:shadow-[0_0_0_1px_rgba(0,0,0,0.04)]',

          className,
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            'h-16 flex items-center shrink-0',
            'border-b border-[rgba(60,60,67,0.08)] dark:border-[rgba(255,255,255,0.04)]',
            isOpen ? 'px-5' : 'px-5 justify-center',
          )}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Logo mark */}
            <div
              className={cn(
                'w-8 h-8 rounded-xl shrink-0',
                'bg-[#007AFF] dark:bg-[#0A84FF]',
                'flex items-center justify-center',
                'text-white font-bold text-[15px]',
              )}
              aria-hidden="true"
            >
              B
            </div>

            {/* Wordmark */}
            <span
              className={cn(
                'font-semibold text-[17px] tracking-tight whitespace-nowrap',
                'text-[#1C1C1E] dark:text-[#FFFFFF]',
                'transition-opacity duration-200',
                isOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden',
              )}
              aria-hidden={!isOpen}
            >
              BepariBD
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {mainRoutes.map((route) => {
            const Icon = route.icon as React.FC<{ className?: string }>;
            const isActive = currentPath === route.id;

            return (
              <button
                key={route.id}
                onClick={() => {
                  navigate(`/${route.id}`);
                  // Close on mobile after navigation
                  if (window.innerWidth < 1024) {
                    onToggle();
                  }
                }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={!isOpen ? route.label : undefined}
                title={!isOpen ? route.label : undefined}
                className={cn(
                  NAV_ITEM_CLASS,
                  isActive ? NAV_ITEM_ACTIVE_CLASS : NAV_ITEM_INACTIVE_CLASS,
                  !isOpen && 'justify-center px-0',
                )}
              >
                <Icon className={cn(ICON_CLASS, isActive ? 'opacity-100' : 'opacity-60')} aria-hidden="true" />
                <span
                  className={cn(
                    'text-sm whitespace-nowrap',
                    !isOpen && 'hidden',
                  )}
                >
                  {route.label}
                </span>
              </button>
            );
          })}

          {/* Separator before bottom group */}
          <div className="my-3 mx-1 border-t border-[rgba(60,60,67,0.08)] dark:border-[rgba(255,255,255,0.04)]" />

          {/* Bottom nav group (last 2 items: Settings, Audit Logs) */}
          {bottomRoutes.map((route) => {
            const Icon = route.icon as React.FC<{ className?: string }>;
            const isActive = currentPath === route.id;

            return (
              <button
                key={route.id}
                onClick={() => {
                  navigate(`/${route.id}`);
                  if (window.innerWidth < 1024) {
                    onToggle();
                  }
                }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={!isOpen ? route.label : undefined}
                title={!isOpen ? route.label : undefined}
                className={cn(
                  NAV_ITEM_CLASS,
                  isActive ? NAV_ITEM_ACTIVE_CLASS : NAV_ITEM_INACTIVE_CLASS,
                  !isOpen && 'justify-center px-0',
                )}
              >
                <Icon className={cn(ICON_CLASS, isActive ? 'opacity-100' : 'opacity-60')} aria-hidden="true" />
                <span
                  className={cn(
                    'text-sm whitespace-nowrap',
                    !isOpen && 'hidden',
                  )}
                >
                  {route.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div
          className={cn(
            'shrink-0',
            'border-t border-[rgba(60,60,67,0.08)] dark:border-[rgba(255,255,255,0.04)]',
            isOpen ? 'px-3 py-3' : 'px-0 py-3 flex justify-center',
          )}
        >
          <button
            onClick={onToggle}
            aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className={cn(
              'flex items-center gap-2',
              'w-full rounded-xl',
              'px-3 py-2',
              'text-[#6D6D72] dark:text-[#AEAEB2]',
              'hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]',
              'hover:text-[#1C1C1E] dark:hover:text-[#FFFFFF]',
              'transition-all duration-200 ease-out',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#007AFF]/50 dark:focus-visible:ring-[#0A84FF]/50',
              'min-h-[44px]',
              !isOpen && 'justify-center px-0',
            )}
          >
            <ChevronLeft
              className={cn(
                'w-5 h-5 shrink-0',
                'transition-transform duration-300 ease-out',
                !isOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
            <span className={cn('text-sm font-medium', !isOpen && 'hidden')}>
              Collapse
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

Sidebar.displayName = 'Sidebar';