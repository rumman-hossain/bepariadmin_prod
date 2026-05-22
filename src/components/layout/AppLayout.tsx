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
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/design-system/utils/cn';
import { Sidebar } from '@/src/components/layout/Sidebar';
import { Header } from '@/src/components/layout/Header';
import { useAuth } from '@/src/hooks/useAuth';
import type { AppNotification } from '@/src/types/domain';

// ─── Types ───────────────────────────────────────────────

export interface AppLayoutProps {
  /** Page content from router <Outlet /> */
  children: React.ReactNode;
}

// ─── Component ───────────────────────────────────────────

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  // TODO: Replace with real notification state from context/store
  const notifications: AppNotification[] = [];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-surface-app font-sans">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />

      <div
        className={cn(
          'flex-1 flex flex-col',
          'transition-all duration-300 ease-out',
          sidebarOpen ? 'ml-0 lg:ml-64' : 'ml-0 lg:ml-[72px]',
        )}
      >
        <Header
          toggleSidebar={() => setSidebarOpen((prev) => !prev)}
          notifications={notifications}
          onMarkNotificationRead={() => {}}
          onMarkAllNotificationsRead={() => {}}
          onLogout={handleLogout}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

AppLayout.displayName = 'AppLayout';