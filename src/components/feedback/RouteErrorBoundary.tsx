import { useState } from 'react';
import { useLocation, useNavigate, useRouteError } from 'react-router-dom';
import { AlertOctagon } from 'lucide-react';
import { Button } from '@/src/components/controls';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * A RENDER FAILURE COSTS YOU THE PAGE, NOT THE CONSOLE.
 *
 * MEASURED ON DEV, and the reason this exists. The app had exactly one
 * `ErrorBoundary`, mounted around `AppLayout` — so it wrapped the navigation
 * rail and the header too. One bad `<option>` on the Products screen replaced
 * the ENTIRE console with "Application Error / Reload Application": no nav, no
 * sign-out, nothing to click but reload.
 *
 * It was also unkeyed, so `hasError` never cleared. React Router could change
 * the URL underneath it and the boundary kept rendering its fallback forever. A
 * full page reload was the only way out — which is precisely why the only
 * button offered one.
 *
 * Two changes, both structural:
 *
 *   1. It wraps the ROUTED PAGE only. The shell stays mounted and usable, so an
 *      operator can go somewhere else — which is what a person actually does
 *      when a screen breaks.
 *   2. It REMOUNTS on a new pathname, or on Try again. A boundary that cannot
 *      be reset is a dead end wearing a button.
 *
 * A root-level boundary still wraps everything, for the one case this cannot
 * catch: a failure in the shell itself.
 */
export function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  /*
   * `pathname` alone is not enough to reset.
   *
   * Navigating away and back does change it, so that recovers. But pressing
   * "Try again" ON the broken screen navigates to the path it is already on —
   * React Router treats that as no change, the key stays identical, and the
   * boundary never remounts. The button would do nothing at all.
   *
   * The nonce is the second half of the key, and the only thing Try again
   * touches.
   */
  const [retry, setRetry] = useState({ path: pathname, attempt: 0 });

  /*
   * DERIVED, not reset in an effect.
   *
   * The obvious version is `useEffect(() => setAttempt(0), [pathname])`, and it
   * is wrong twice over: setting state inside an effect costs an extra render
   * pass on every navigation, and for one of those passes the key still carries
   * the PREVIOUS route's attempt count. Storing the path alongside the counter
   * makes a stale count unrepresentable — a different path simply reads as
   * attempt zero.
   */
  const attempt = retry.path === pathname ? retry.attempt : 0;

  return (
    <ErrorBoundary
      key={`${pathname}#${attempt}`}
      fallback={<RouteFailure onRetry={() => setRetry({ path: pathname, attempt: attempt + 1 })} />}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * WHAT REACT ROUTER RENDERS WHEN A PAGE THROWS.
 *
 * MEASURED ON DEV, after the boundary above was already in place: forcing a
 * render error still produced a full-page "Unexpected Application Error!" with
 * a raw stack trace and a note addressed to developers.
 *
 * `createBrowserRouter` gives every route its own internal error boundary,
 * nested BELOW anything the layout renders — so React Router catches a page's
 * render error before a React boundary in the layout ever sees it, and with no
 * `errorElement` declared it unwinds to its own default screen at the router
 * root. The nav rail went with it, exactly as before.
 *
 * Declaring this as each page's `errorElement` puts the failure back where it
 * belongs: rendered into the layout's `Outlet`, with the shell still around it.
 * React Router also clears the error on the next navigation, which is the
 * recovery the unkeyed boundary never had.
 */
export function RoutePageError() {
  const error = useRouteError();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (import.meta.env.DEV) console.error('Route render failed:', error);

  // A new location key is what clears React Router's error state, so this is a
  // real retry rather than a re-render of the same failure.
  return <RouteFailure onRetry={() => navigate(pathname, { replace: true })} />;
}

/**
 * Page-sized, and honest about its scope.
 *
 * It does not say "Application Error", because the application is fine — the
 * nav beside this panel still works. Naming the failure correctly is what tells
 * an operator they can carry on working somewhere else instead of reloading and
 * losing every other screen they had loaded.
 */
function RouteFailure({ onRetry }: { onRetry: () => void }) {
  const navigate = useNavigate();

  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center"
      role="alert"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bad-wash">
        <AlertOctagon className="h-7 w-7 text-bad" aria-hidden="true" />
      </div>
      <div className="max-w-md">
        <h2 className="text-lg font-semibold text-ink">This section could not be displayed</h2>
        <p className="mt-1 text-sm text-ink-2">
          Something in this screen failed to render. The rest of the console is unaffected — carry
          on working elsewhere, or try this screen again.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* Remounts the page. Deliberately NOT a document reload, which would
            throw away every other screen already loaded. */}
        <Button variant="primary" onClick={onRetry}>
          Try again
        </Button>
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
