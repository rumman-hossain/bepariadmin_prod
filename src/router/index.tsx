/* eslint-disable react-refresh/only-export-components --
 * This file's only export is `router`. The fifteen components below are all
 * private route elements, which is exactly what belongs in a router file —
 * splitting them across fifteen files to satisfy a Fast Refresh heuristic
 * would be strictly worse to read and would not make anything hot-swap,
 * because editing a route element remounts the route either way.
 *
 * Disabled here rather than in eslint.config.js so the exception is visible to
 * whoever opens the file, and so it does not silently cover anything else.
 */

/**
 * Application router — single source of truth for all routes.
 * Uses createBrowserRouter from react-router-dom v6.
 */
import React, { Suspense } from 'react';
import { createBrowserRouter, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { Loader2, ShieldOff } from 'lucide-react';
import { ROUTES } from '@/src/app/routes';
import { ProtectedRoute } from '@/src/components/auth/ProtectedRoute';
import { RequireRole } from '@/src/components/auth/RequireRole';
import { ADMIN_WRITE, FINANCE, LOGISTICS, homeFor } from '@/src/auth/roles';
import { EmptyState, ErrorBoundary, RouteErrorBoundary, RoutePageError } from '@/src/components/feedback';
import { NotBuiltPage } from '@/src/components/shared/NotBuiltPage';
import { AppLayout } from '@/src/components/layout/AppLayout';
import { LoginForm } from '@/src/components/auth/LoginForm';
import { AuthShell } from '@/src/components/auth/AuthShell';
import { PUBLIC_PATHS } from '@/src/auth/sessionHint';
import { OtpVerification } from '@/src/components/auth/OtpVerification';
import { ForgotPasswordForm } from '@/src/components/auth/ForgotPasswordForm';
import { ResetPasswordForm } from '@/src/components/auth/ResetPasswordForm';
import { useAuth } from '@/src/hooks/useAuth';

// ─── Lazy-loaded page imports ──────────────────────────
// Dashboard (default export pattern)
const DashboardPage = React.lazy(() =>
  import('@/src/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);

// Wholesaler pages (named exports → default)
const LazyList = React.lazy(() =>
  import('@/src/features/wholesalers/pages/ListPage').then((m) => ({ default: m.ListPage })),
);
const LazyCreate = React.lazy(() =>
  import('@/src/features/wholesalers/pages/CreatePage').then((m) => ({ default: m.CreatePage })),
);
const LazyDetails = React.lazy(() =>
  import('@/src/features/wholesalers/pages/DetailsPage').then((m) => ({ default: m.DetailsPage })),
);
const LazyEdit = React.lazy(() =>
  import('@/src/features/wholesalers/pages/EditPage').then((m) => ({ default: m.EditPage })),
);

// Product pages (named exports → default)
const LazyProductList = React.lazy(() =>
  import('@/src/features/products/pages/ProductListPage').then((m) => ({ default: m.ProductListPage })),
);
const LazyProductDetail = React.lazy(() =>
  import('@/src/features/products/pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })),
);
const LazyAddProduct = React.lazy(() =>
  import('@/src/features/products/add-product/pages/AddProductPage').then((m) => ({ default: m.AddProductPage })),
);

// Order pages
const LazyOrderList = React.lazy(() =>
  import('@/src/features/orders/pages/OrdersPage').then((m) => ({ default: m.OrdersPage })),
);
const LazyRetailers = React.lazy(() =>
  import('@/src/features/retailers/pages/RetailersPage').then((m) => ({
    default: m.RetailersPage,
  })),
);
const LazyRetailerCreate = React.lazy(() =>
  import('@/src/features/retailers/pages/CreatePage').then((m) => ({ default: m.CreatePage })),
);
const LazyRetailerDetail = React.lazy(() =>
  import('@/src/features/retailers/pages/DetailPage').then((m) => ({ default: m.DetailPage })),
);
const LazyRetailerEdit = React.lazy(() =>
  import('@/src/features/retailers/pages/EditPage').then((m) => ({ default: m.EditPage })),
);
const LazyAnalytics = React.lazy(() =>
  import('@/src/features/analytics/pages/AnalyticsPage').then((m) => ({
    default: m.AnalyticsPage,
  })),
);
const LazyCoupons = React.lazy(() =>
  import('@/src/features/coupons/pages/CouponsPage').then((m) => ({ default: m.CouponsPage })),
);
const LazyPayments = React.lazy(() =>
  import('@/src/features/payments/pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })),
);
const LazySalesBrain = React.lazy(() =>
  import('@/src/features/salesbrain/pages/SalesBrainPage').then((m) => ({ default: m.SalesBrainPage })),
);
const LazyLogistics = React.lazy(() =>
  import('@/src/features/logistics/pages/LogisticsPage').then((m) => ({ default: m.LogisticsPage })),
);
const LazyManufacturing = React.lazy(() =>
  import('@/src/features/manufacturing/pages/ManufacturingPage').then((m) => ({
    default: m.ManufacturingPage,
  })),
);
const LazyMessages = React.lazy(() =>
  import('@/src/features/messages/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })),
);
const LazyProfile = React.lazy(() =>
  import('@/src/features/profile/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const LazyStaffCreate = React.lazy(() =>
  import('@/src/features/settings/pages/StaffCreatePage').then((m) => ({ default: m.StaffCreatePage })),
);
const LazySettings = React.lazy(() =>
  import('@/src/features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const LazyReferrals = React.lazy(() =>
  import('@/src/features/referrals/pages/ReferralsPage').then((m) => ({ default: m.ReferralsPage })),
);
const LazyRewards = React.lazy(() =>
  import('@/src/features/rewards/pages/RewardsPage').then((m) => ({ default: m.RewardsPage })),
);
const LazyAccounting = React.lazy(() =>
  import('@/src/features/accounting/pages/AccountingPage').then((m) => ({
    default: m.AccountingPage,
  })),
);
const LazyOrderDetail = React.lazy(() =>
  import('@/src/features/orders/pages/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })),
);

// ─── Placeholder pages for routes not yet migrated ─────
/** Lazy page wrapper with Suspense fallback */
const LazyPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense
    fallback={
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-brass animate-spin" />
      </div>
    }
  >
    {children}
  </Suspense>
);

// ─── Auth layout ────────────────────────────────────────
/**
 * `AuthShell` owns the viewport now — it is a two-column grid with its own
 * `min-h-screen` and background. This used to centre a 380px card here, and
 * keeping that wrapper would have boxed the split layout inside a centred
 * flex item, collapsing both columns.
 */
const AuthLayout: React.FC = () => <Outlet />;

/**
 * Wraps ForgotPasswordForm to provide onBack via useNavigate.
 *
 * The `AuthShell` is not decoration here. These two screens used to rely on
 * `AuthLayout` centring them, and when the shell took over the viewport they
 * rendered edge-to-edge across a 1440px window with no card and no frame. The
 * test suite did not notice, because jsdom has no layout — a browser did.
 *
 * No `title` is passed: both forms render their own `<h2>` per state
 * ("Check your email", "Password changed"), and a shell title would put two
 * competing headings on one screen.
 */
const ForgotPasswordWrapper: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AuthShell>
      <ForgotPasswordForm onBack={() => navigate('/login')} />
    </AuthShell>
  );
};

/** See ForgotPasswordWrapper — same reason, same shell. */
const ResetPasswordRoute: React.FC = () => (
  <AuthShell>
    <ResetPasswordForm />
  </AuthShell>
);

/**
 * LoginRoute — renders the correct auth component based on step,
 * and redirects authenticated users away from /login to their
 * intended destination (or /dashboard as fallback).
 */
/** Paths that would bounce an authenticated user straight back here. */
// One definition, shared with the boot-time session hint. Two copies of "which
// routes are public" is how one of them quietly stops matching the other.
const AUTH_PATHS = PUBLIC_PATHS;

/**
 * Resolves the post-login destination, rejecting anything that isn't a
 * same-origin path on this app.
 *
 * The previous version concatenated `pathname + search + hash` and screened it
 * with three `startsWith` checks. That is a string-prefix test on a value the
 * router hands back, and react-router's own open-redirect advisory
 * (GHSA-wrjc-x8rr-h8h6) is precisely about paths that begin `/\` — browsers
 * normalise the backslash to a slash, so `/\evil.com` passes every `startsWith`
 * check and then navigates off-origin. `//evil.com` does the same.
 *
 * Today `from` is only ever populated from a real Location by ProtectedRoute,
 * so this was latent rather than live. But it is one `navigate(userInput)` away
 * from being a genuine open redirect on a login page, which is prime phishing
 * real estate — so resolve it against the origin and compare, rather than
 * pattern-matching the string.
 */
export function safeRedirect(from: Location | undefined, role?: string | null): string {
  // homeFor, not a hardcoded '/dashboard'. A logistics account cannot see the
  // dashboard, so landing them there after a correct sign-in looks like a
  // failed login.
  if (!from?.pathname) return homeFor(role);

  const candidate = `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`;

  let resolved: URL;
  try {
    resolved = new URL(candidate, window.location.origin);
  } catch {
    return homeFor(role);
  }

  // Anything that resolved to another origin is not ours to navigate to.
  if (resolved.origin !== window.location.origin) return homeFor(role);

  // Don't bounce back into the auth flow we just completed.
  if (AUTH_PATHS.some((p) => resolved.pathname === p || resolved.pathname.startsWith(`${p}/`))) {
    return homeFor(role);
  }

  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

/** Sends each role to the first screen it can actually see. */
const RoleHome: React.FC = () => {
  const { user } = useAuth();
  return <Navigate to={homeFor(user?.role)} replace />;
};

const LoginRoute: React.FC = () => {
  const { step, isLoading, user } = useAuth();
  const location = useLocation();
  const from = (location.state as Record<string, unknown> | null)?.from as Location | undefined;

  // Already authenticated — redirect to intended destination or dashboard
  if (step === 'dashboard' && user) {
    return <Navigate to={safeRedirect(from, user?.role)} replace />;
  }

  // Still bootstrapping — show spinner
  if (isLoading && step === 'idle') {
    return (
      <div className="flex items-center justify-center w-full">
        <Loader2 className="w-6 h-6 text-brass animate-spin" />
      </div>
    );
  }

  if (step === 'verifying_login') {
    return (
      <AuthShell title="Check your email" subtitle="Enter the 6-digit code we sent you.">
        <OtpVerification />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Sign in" subtitle="Admin console for the Bepari-BD marketplace.">
      <LoginForm />
    </AuthShell>
  );
};

// ─── Protected app layout ────────────────────────────
/**
 * Refuses a destination the signed-in role is not entitled to.
 *
 * ONE enforcement point, driven by the SAME `roles` field the sidebar filters
 * on. Wrapping each of the sixteen routes in `RequireRole` individually would
 * have been the fail-open pattern all over again: correct on the day it was
 * written, and one forgotten wrap away from a department seeing a screen it
 * should not.
 *
 * Fail-closed twice over. A path with no entry in the registry is refused
 * rather than allowed, so a route mounted without a nav entry does not quietly
 * bypass this — and `roles` is required, so an entry cannot exist without an
 * answer.
 *
 * None of this is the security boundary. The server refuses these calls
 * regardless; this stops someone reaching a screen that would then fail on
 * every request, and explains why instead of bouncing them silently.
 */
const RouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();

  // The first path segment is the destination id in the registry.
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) return <>{children}</>; // the index route resolves via RoleHome

  const entry = ROUTES.find((r) => r.id === segment);
  if (!entry) {
    return (
      <EmptyState
        icon={ShieldOff}
        variant="not-built"
        title="There is nothing here"
        message="That address does not match any section of the console."
      />
    );
  }

  return <RequireRole roles={entry.roles}>{children}</RequireRole>;
};

/*
 * THE BOUNDARY SITS INSIDE THE SHELL, NOT AROUND IT.
 *
 * It used to wrap `AppLayout`, so a render error on any screen took the
 * navigation rail and the header down with it — the whole console became
 * "Application Error" with nothing to press but Reload. MEASURED: one bad
 * `<option>` on the Products screen did exactly that.
 *
 * Now the inner boundary wraps only the routed page, and remounts on a new
 * pathname. The rail survives, so an operator can simply go somewhere else.
 *
 * The OUTER boundary stays, and is not redundant: `AppLayout`, `ProtectedRoute`
 * and the rail itself render outside the inner one, and a failure there has
 * nowhere else to be caught.
 */
const ProtectedLayout: React.FC = () => (
  <ProtectedRoute>
    <ErrorBoundary name="shell">
      <AppLayout>
        <RouteErrorBoundary>
          <RouteGuard>
            <Outlet />
          </RouteGuard>
        </RouteErrorBoundary>
      </AppLayout>
    </ErrorBoundary>
  </ProtectedRoute>
);

/**
 * EVERY PAGE GETS AN `errorElement`, applied in one place.
 *
 * `createBrowserRouter` wraps each route in its own error boundary, nested
 * below whatever the layout renders — so React Router catches a page's render
 * error first, and with no `errorElement` it unwinds to its built-in screen:
 * "Unexpected Application Error!", a raw stack, and no navigation. MEASURED on
 * dev, with a React boundary already in the layout and doing nothing.
 *
 * Attaching the element to a LEAF route makes React Router render it into the
 * parent's `Outlet`, which keeps the shell mounted. Doing that here, as a
 * transform over the whole subtree, is the difference between a rule and a
 * convention: a route added next week cannot forget it.
 */
function withPageErrorElement(routes: RouteObject[]): RouteObject[] {
  return routes.map((route) => {
    const next = route.element ? { ...route, errorElement: <RoutePageError /> } : { ...route };
    /*
     * Branch rather than spread `children` conditionally: `RouteObject` is a
     * union, and an index route is typed with `children?: undefined`, so adding
     * an optional `children` to every object makes the whole array fail to
     * narrow. The single cast is on the reassembled object, whose shape is
     * unchanged apart from `errorElement`.
     */
    if ('children' in next && Array.isArray(next.children)) {
      next.children = withPageErrorElement(next.children);
    }
    return next as RouteObject;
  });
}

/**
 * Full application router.
 */
export const router = createBrowserRouter([
  // ── Auth routes ──────────────────────────────────────
  {
    path: '/login',
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginRoute /> }],
  },
  {
    path: '/forgot-password',
    element: <AuthLayout />,
    children: [{ index: true, element: <ForgotPasswordWrapper /> }],
  },
  {
    path: '/reset-password',
    element: <AuthLayout />,
    children: [{ index: true, element: <ResetPasswordRoute /> }],
  },

  // ── Protected app routes ─────────────────────────────
  {
    path: '/',
    element: <ProtectedLayout />,
    children: withPageErrorElement([
      // Role-aware: a logistics account cannot see the dashboard, so sending
      // them there on arrival is a login that appears to have failed.
      { index: true, element: <RoleHome /> },

      // Dashboard
      { path: 'dashboard', element: <LazyPage><DashboardPage /></LazyPage> },

      // Wholesalers
      {
        path: 'wholesalers',
        children: [
          { index: true, element: <LazyPage><LazyList /></LazyPage> },
          // Mutating routes only. Reads stay open to every staff role, matching
          // the backend's AdminOnly; these three match StrictAdminOnly.
          { path: 'create', element: <RequireRole roles={ADMIN_WRITE}><LazyPage><LazyCreate /></LazyPage></RequireRole> },
          { path: ':id', element: <LazyPage><LazyDetails /></LazyPage> },
          { path: ':id/edit', element: <RequireRole roles={ADMIN_WRITE}><LazyPage><LazyEdit /></LazyPage></RequireRole> },
        ],
      },

      // Products
      {
        path: 'products',
        children: [
          { index: true, element: <LazyPage><LazyProductList /></LazyPage> },
          /*
           * `fullBleed` — the product wizard owns its own scrolling.
           *
           * It is a fixed header, a fixed step bar, ONE scrolling middle and a
           * fixed footer, mirroring the wholesale app. That cannot be built
           * inside the shell's own scroller: the second `overflow-y-auto` has
           * no bounded height to work in, so the footer floats and the sticky
           * header sticks below `<main>`'s padding with content sliding up
           * into the strip above it.
           *
           * Both add and edit take it, because they are the same wizard.
           */
          {
            path: 'new',
            handle: { fullBleed: true },
            element: <RequireRole roles={ADMIN_WRITE}><LazyPage><LazyAddProduct /></LazyPage></RequireRole>,
          },
          { path: ':productId', element: <LazyPage><LazyProductDetail /></LazyPage> },
          {
            path: ':productId/edit',
            handle: { fullBleed: true },
            element: <RequireRole roles={ADMIN_WRITE}><LazyPage><LazyAddProduct /></LazyPage></RequireRole>,
          },
        ],
      },

      // Orders — read-only for every staff role, matching the backend's
      // AdminOnly on GET. The status transition is guarded inside the screen by
      // the same PATCH the server gates.
      {
        path: 'orders',
        children: [
          { index: true, element: <LazyPage><LazyOrderList /></LazyPage> },
          { path: ':id', element: <LazyPage><LazyOrderDetail /></LazyPage> },
        ],
      },

      // Retailers.
      //
      // `new` is a ROUTE, not a modal — the form has four sections, a password
      // and an assessment, and a dialog gives that a scrollbar inside a
      // scrollbar with no address to return to.
      //
      // It is declared BEFORE any `:id` route would be, so `/retailers/new`
      // cannot be captured as a retailer whose id is the literal string "new".
      { path: 'retailers', element: <LazyPage><LazyRetailers /></LazyPage> },
      { path: 'retailers/new', element: <LazyPage><LazyRetailerCreate /></LazyPage> },
      // AFTER 'retailers/new', so the literal "new" is never captured as an id.
      //
      // These two were declared in RETAILER_ROUTES and used by
      // useRetailerNavigation from the day the create screen shipped, and were
      // never registered here. `goToDetail` after a successful create therefore
      // navigated to /retailers/<uuid>, matched nothing, fell through to
      // `path: '*'` and bounced the operator to their role home — the retailer
      // WAS created, and the screen behaved as though nothing had happened.
      { path: 'retailers/:id', element: <LazyPage><LazyRetailerDetail /></LazyPage> },
      { path: 'retailers/:id/edit', element: <LazyPage><LazyRetailerEdit /></LazyPage> },

      // Analytics — two real endpoints, three that return a hardcoded empty
      // list. The screen shows the two and says so about the three (F-17).
      { path: 'analytics', element: <LazyPage><LazyAnalytics /></LazyPage> },

      // Coupon Settings — create and list only; there is no PATCH or DELETE.
      { path: 'coupons', element: <LazyPage><LazyCoupons /></LazyPage> },

      // Payments — the transaction ledger only. Settlements are absent because
      // the settle endpoint takes the amount from the caller (F-18).
      { path: 'payments', element: <LazyPage><LazyPayments /></LazyPage> },

      // Sales Brain — retailer segmentation and campaigns.
      { path: 'sales-brain', element: <LazyPage><LazySalesBrain /></LazyPage> },

      // Logistics — the shipping department. The ONLY screen a `logistics`
      // account can reach; RequireRole explains the refusal on every other.
      {
        path: 'logistics',
        element: (
          <RequireRole roles={LOGISTICS}>
            <LazyPage><LazyLogistics /></LazyPage>
          </RequireRole>
        ),
      },

      // Manufacturing — the production pipeline. Reads are AdminOnly; placing
      // and advancing an order is StrictAdminOnly, gated on the server.
      { path: 'manufacturing', element: <LazyPage><LazyManufacturing /></LazyPage> },

      // Messages — the support queue. AdminOnly on the server: a thread
      // contains whatever a retailer chose to tell us.
      { path: 'messages', element: <LazyPage><LazyMessages /></LazyPage> },

      // Settings. Readable by any staff role; changing access and the platform
      // margin is super-admin only, gated inside the screen and on the server.
      { path: 'settings', element: <LazyPage><LazySettings /></LazyPage> },
      /*
       * Creating a staff account. Under /settings because that is where the
       * access list lives and where the operator comes from — the screen itself
       * refuses anyone who is not a super admin, matching SuperAdminOnly on the
       * endpoint.
       */
      { path: 'settings/staff/new', element: <LazyPage><LazyStaffCreate /></LazyPage> },

      /*
       * Your own details. Deliberately NOT in the nav registry: it is reached
       * from your name in the header, the way every console does it, and a
       * nineteenth rail entry for a page about yourself would compete with the
       * work.
       *
       * No role gate — every signed-in staff member has a profile, including
       * the two department roles that can see almost nothing else.
       */
      { path: 'profile', element: <LazyPage><LazyProfile /></LazyPage> },

      // Referral Settings — a view onto the same loyalty programme as /rewards,
      // sharing its settings row and its points ledger.
      { path: 'referrals', element: <LazyPage><LazyReferrals /></LazyPage> },

      // Reward Settings. Readable by any staff role; adjusting points is
      // FinanceOnly and gated inside the screen, matching the server.
      { path: 'rewards', element: <LazyPage><LazyRewards /></LazyPage> },

      // Accounting — the cash book. Every endpoint behind it is FinanceOnly.
      {
        path: 'accounting',
        element: (
          <RequireRole roles={FINANCE}>
            <LazyPage><LazyAccounting /></LazyPage>
          </RequireRole>
        ),
      },

      // Every nav entry without a screen resolves to NotBuiltPage, which
      // reads its status and note from the registry rather than claiming a
      // migration that is not happening.
      ...ROUTES.filter(
        (r) => !r.hidden &&
          !['dashboard', 'wholesalers', 'products', 'orders', 'retailers', 'analytics', 'coupons', 'payments', 'accounting', 'rewards', 'referrals', 'settings', 'messages', 'manufacturing', 'logistics', 'sales-brain'].includes(r.id),
      ).map((route) => ({
        path: route.id,
        element: <NotBuiltPage routeId={route.id} />,
      })),
    ]),
  },

  // ── Catch-all ────────────────────────────────────────
  {
    path: '*',
    element: <RoleHome />,
  },
]);