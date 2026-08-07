/**
 * AppLayout — top-level application shell.
 *
 * Composes Sidebar + Header + main content area.
 * URL is the single source of truth for active route.
 * Sidebar visibility managed locally via useState.
 *
 * Props:
 * - children: page content rendered via react-router <Outlet />
 */
import React, { useState } from 'react';
import { useNavigate, useMatches } from 'react-router-dom';
import { cn } from '@/src/design-system/utils/cn';
import { Sidebar } from '@/src/components/layout/Sidebar';
import { Header } from '@/src/components/layout/Header';
import { useAuth } from '@/src/hooks/useAuth';

// ─── Types ───────────────────────────────────────────────

export interface AppLayoutProps {
  /** Page content from router <Outlet /> */
  children: React.ReactNode;
}

/**
 * What a route may declare through react-router's `handle`.
 *
 * `handle: { fullBleed: true }` on a route object.
 */
interface RouteHandle {
  fullBleed?: boolean;
}

/**
 * FULL BLEED — the route owns its own scrolling and padding.
 *
 * `<main>` is normally THE scroller for the whole console, with its own
 * padding. That is right for a page of content, and wrong for anything that
 * needs a fixed header and footer with a scrolling middle: the page ends up
 * putting a second `overflow-y-auto` inside the first, and a nested scroller
 * inside an auto-height region has no bounded height to scroll within.
 *
 * The add/edit product wizard is exactly that shape and it broke in all three
 * predictable ways — its sticky header stuck to `<main>` and so sat BELOW
 * `<main>`'s padding with content scrolling up into the strip above it; its
 * negative margins (-m-6 / md:-m-8) missed the padding they were cancelling by
 * 8px; and its footer floated because the middle was never its own region.
 *
 * A route taking this flag gets an unpadded, non-scrolling `<main>` and must
 * supply both itself. A page that takes it without providing a scroller will
 * simply not scroll — that is the whole contract, and it is deliberately
 * blunt.
 *
 * Read from `handle` rather than matched on pathname: the route declares it,
 * synchronously, so there is no first paint with the wrong layout and no list
 * of paths in here to fall out of date.
 */
function useFullBleed(): boolean {
  const matches = useMatches();
  return matches.some((m) => (m.handle as RouteHandle | undefined)?.fullBleed === true);
}

// ─── Component ───────────────────────────────────────────

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const fullBleed = useFullBleed();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-paper font-sans">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />

      <div
        className={cn(
          'flex-1 flex flex-col',
          'transition-[margin] duration-200 ease-out',
          sidebarOpen ? 'ml-0 lg:ml-60' : 'ml-0 lg:ml-[68px]',
        )}
      >
        <Header
          toggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onLogout={handleLogout}
          user={user}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main
          className={cn(
            'min-h-0 flex-1',
            fullBleed
              ? // No scroll and no padding: the route supplies both. `overflow-hidden`
                // rather than `visible` so the region is a hard boundary — a child
                // with `h-full` gets a real height to fill instead of growing the
                // page and taking the shell's own layout with it.
                'overflow-hidden'
              : 'overflow-y-auto px-4 py-5 md:px-6 md:py-6',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

AppLayout.displayName = 'AppLayout';