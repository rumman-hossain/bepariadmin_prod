import React, { useState } from 'react';
import {  PanelLeft, Moon, Sun, LogOut } from 'lucide-react';
import { Dialog } from '@/src/components/feedback';
import { ChangePasswordForm } from '@/src/components/auth/ChangePasswordForm';
import { useToast } from '@/src/components/feedback/useToast';
import type { AuthUser } from '@/src/types/auth';
import { useTheme } from '@/src/design-system';
import { cn } from '@/src/design-system/utils/cn';

export interface HeaderProps {
  toggleSidebar: () => void;
  onLogout?: () => void;
  user?: AuthUser | null;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  className?: string;
}

/** Shared shape for the icon-only controls, so they line up and behave alike. */
const ICON_BUTTON = cn(
  'flex h-8 w-8 items-center justify-center rounded-md',
  'text-ink-2 transition-colors duration-150',
  'hover:bg-sheet-hover hover:text-ink',
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rule-focus',
);



/**
 * Who you are signed in as.
 *
 * The shell showed no identity at all — no name, no role — on a console where
 * five staff tiers see different affordances. An operator had no way to tell
 * whether a control was missing because of their permissions or because it was
 * never built.
 */


export const Header: React.FC<HeaderProps> = ({
  toggleSidebar,
  onLogout,
  className,
}) => {
  /*
   * `searchQuery` and `onSearchChange` are still on HeaderProps and still
   * passed by AppShell, but the search box they fed is commented out below.
   * They are deliberately NOT destructured: an unused binding fails the build,
   * and removing them from the interface would break the caller. Restoring the
   * box is a matter of uncommenting it and taking them back.
   */
  const { isDark, toggleTheme } = useTheme();
  const toast = useToast();
  const [changingPassword, setChangingPassword] = useState(false);

  return (
    <header
      className={cn(
        'sticky top-0 z-(--z-nav) flex h-14 shrink-0 items-center justify-between gap-3',
        'border-b border-rule-subtle bg-sheet px-3 lg:px-5',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button type="button" onClick={toggleSidebar} aria-label="Toggle sidebar" className={ICON_BUTTON}>
          <PanelLeft className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>

        {/* {onSearchChange && (
          <div className="hidden w-full max-w-xs md:block">
            <Input
              type="search"
              size="sm"
              placeholder="Search suppliers and products"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search suppliers and products"
            />
          </div>
        )} */}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className={ICON_BUTTON}
        >
          {isDark ? (
            <Sun className="h-[18px] w-[18px]" aria-hidden="true" />
          ) : (
            <Moon className="h-[18px] w-[18px]" aria-hidden="true" />
          )}
        </button>

        {/* {user && (
          <UserBadge user={user} onChangePassword={() => setChangingPassword(true)} />
        )} */}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            aria-label="Sign out"
            className={cn(ICON_BUTTON, 'ml-1 hover:bg-bad-wash hover:text-bad')}
          >
            <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        )}
      </div>

      <Dialog
        open={changingPassword}
        onClose={() => setChangingPassword(false)}
        size="sm"
        title="Change your password"
      >
        {/* Mounted only while open, so a half-filled form is discarded on
            close rather than lingering with the old password still in state. */}
        {changingPassword && (
          <ChangePasswordForm
            onCancel={() => setChangingPassword(false)}
            onSuccess={() => {
              setChangingPassword(false);
              toast.success('Password changed', 'Use your new password next time you sign in.');
            }}
          />
        )}
      </Dialog>
    </header>
  );
};

Header.displayName = 'Header';
