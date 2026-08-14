/**
 * Sidebar — primary navigation.
 *
 * The URL is the single source of truth for what is active; the parent owns
 * open/closed. Rewritten for the Ledger direction: a dense, quiet rail where
 * the only saturated colour on screen is the active row's accent bar.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/src/design-system/utils/cn';
import { ROUTE_GROUPS, type Route } from '@/src/app/routes';
import { useAuth } from '@/src/hooks/useAuth';
import { hasRole } from '@/src/auth/roles';
import { PanelLeftClose } from 'lucide-react';
import { Text } from '@/src/components/data';

export interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

const HAIRLINE = 'border-rule-subtle';

/**
 * A route that exists in name only.
 *
 * Shown as a dot rather than a word so the rail stays scannable, with the
 * reason in the tooltip. Amber for `inert` because a screen that would silently
 * report zeroes is worse than one that plainly is not there.
 */
function StatusDot({ status }: { status: Route['status'] }) {
  if (status === 'live') return null;

  const isInert = status === 'inert';
  return (
    <span
      className={cn(
        'ml-auto h-1.5 w-1.5 shrink-0 rounded-full',
        isInert ? 'bg-warn' : 'bg-ink-3/40',
      )}
      aria-hidden="true"
    />
  );
}

function statusHint(route: Route): string {
  if (route.status === 'live') return route.label;
  const suffix = route.status === 'inert' ? 'not running' : 'not built yet';
  return `${route.label} — ${suffix}`;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle, className }) => {
  const isOpenRef = useRef(isOpen);
  const { user } = useAuth();

  /*
   * Destinations this person can actually reach.
   *
   * A route with no `roles` is visible to every staff role, which is all but
   * one of them today. Hiding rather than disabling is the right call here:
   * a greyed-out Accounting row tells a viewer the books exist and that they
   * are being kept from them, which is information, and it is not information
   * the nav is for.
   *
   * A group whose every route is filtered out is dropped, so no heading is
   * left labelling nothing.
   */
  const visibleGroups = React.useMemo(
    () =>
      ROUTE_GROUPS.map((group) => ({
        ...group,
        // `hidden` first: a reachable-but-unlisted destination — /profile, behind
        // your name in the header — is registered so RouteGuard can find it, and
        // must not therefore appear in the rail.
        routes: group.routes.filter(
          (r) => !r.hidden && (!r.roles || hasRole(user?.role, r.roles)),
        ),
      })).filter((group) => group.routes.length > 0),
    [user?.role],
  );

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Escape closes the mobile overlay.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpenRef.current) onToggle();
    },
    [onToggle],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Lock the page behind the mobile overlay.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const closeOnMobile = () => {
    if (window.innerWidth < 1024) onToggle();
  };

  return (
    <>
      <div
        onClick={onToggle}
        aria-hidden="true"
        className={cn(
          /*
           * BELOW THE NAV, NOT ABOVE IT — this is the real cause of the
           * full-screen blur on mobile.
           *
           * The scrim was `z-(--z-overlay)` = 40 while the sidebar is
           * `z-(--z-nav)` = 30, so the scrim covered the very thing it exists to
           * set apart. Opening the menu blurred the MENU, and because the scrim
           * closes on click, every tap on a nav item hit the scrim instead and
           * shut the drawer. The nav was unreadable and unusable at once.
           *
           * `--z-sticky` = 20 sits above the page content and below the nav,
           * which is the whole job of a scrim.
           */
          'fixed inset-0 z-(--z-sticky) bg-sheet-inverse/30 lg:hidden',
          'transition-opacity duration-200 ease-out',
          /*
           * THE BLUR IS ATTACHED ONLY WHILE THE SCRIM IS OPEN, and that is the
           * whole fix for a full-screen blur on mobile.
           *
           * `backdrop-blur-sm` used to sit on the base class, with `opacity-0`
           * relied on to hide it. Opacity hides the element's OWN paint — its
           * background tint — but Chrome on Android keeps applying
           * `backdrop-filter` regardless. So a scrim nobody could see was
           * blurring the entire page behind it, permanently, on every mobile
           * load: the dashboard rendered as an unreadable smear with no visible
           * cause. Reported on a Pixel 7.
           *
           * `pointer-events-none` had made it worse to find, not better — the
           * page still responded to taps, so it looked like a rendering fault
           * rather than something covering the screen.
           */
          isOpen
            ? 'opacity-100 backdrop-blur-sm'
            : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        aria-label="Main navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-(--z-nav) flex flex-col',
          'bg-sheet',
          `border-r ${HAIRLINE}`,
          'transition-[width,transform] duration-200 ease-out',
          isOpen ? 'w-60' : 'w-[68px]',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          className,
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            'flex h-14 shrink-0 items-center gap-2.5 px-4',
            `border-b ${HAIRLINE}`,
            !isOpen && 'justify-center px-0',
          )}
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brass text-sm font-bold text-brass-content"
            aria-hidden="true"
          >
            B
          </span>
          {isOpen && (
            <span className="truncate text-md font-semibold tracking-tight text-ink">
              Bepari-BD
            </span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
          {visibleGroups.map((group) => (
            <div key={group.id} className="mb-1 px-2 last:mb-0">
              {/*
                A heading only when there is more than one group to tell apart.
                The registry is currently a single flat list of sixteen, and a
                lone "Navigation" heading above it labels nothing.

                Collapsed, a heading has nothing to label either — a rule
                separates instead.
              */}
              {group.label && visibleGroups.length > 1 ? (
                isOpen ? (
                  <Text as="p" variant="label" className="px-2 pb-1 pt-3">
                    {group.label}
                  </Text>
                ) : (
                  <div className={cn('mx-3 my-2 border-t', HAIRLINE)} aria-hidden="true" />
                )
              ) : null}

              {group.routes.map((route) => (
                <NavLink
                  key={route.id}
                  to={`/${route.id}`}
                  onClick={closeOnMobile}
                  title={!isOpen ? statusHint(route) : route.note}
                  aria-label={!isOpen ? statusHint(route) : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex min-h-9 items-center gap-2.5 rounded-md px-2 py-1.5',
                      'text-sm transition-colors duration-150',
                      'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rule-focus',
                      !isOpen && 'justify-center px-0',
                      isActive
                        ? 'bg-sheet-selected font-medium text-ink'
                        : 'font-normal text-ink-2 hover:bg-sheet-hover hover:text-ink',
                      // Unbuilt sections stay reachable but visibly recede.
                      route.status !== 'live' && 'text-ink-3',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* The one saturated mark in the rail. */}
                      {isActive && (
                        <span
                          className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-brass"
                          aria-hidden="true"
                        />
                      )}
                      <route.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                      {isOpen && <span className="truncate">{route.label}</span>}
                      {isOpen && <StatusDot status={route.status} />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className={cn('shrink-0 p-2', `border-t ${HAIRLINE}`)}>
          <button
            type="button"
            onClick={onToggle}
            aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className={cn(
              'flex min-h-9 w-full items-center gap-2.5 rounded-md px-2 py-1.5',
              'text-sm text-ink-2 transition-colors duration-150',
              'hover:bg-sheet-hover hover:text-ink',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rule-focus',
              !isOpen && 'justify-center px-0',
            )}
          >
            <PanelLeftClose
              className={cn(
                'h-[18px] w-[18px] shrink-0 transition-transform duration-200',
                !isOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
            {isOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

Sidebar.displayName = 'Sidebar';
