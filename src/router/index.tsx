/**
 * Application router — single source of truth for all routes.
 * Uses createBrowserRouter from react-router-dom v6.
 */
import React, { Suspense } from 'react';
import { createBrowserRouter, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ROUTES } from '@/src/app/routes';
import { ProtectedRoute } from '@/src/components/auth/ProtectedRoute';
import { ErrorBoundary } from '@/src/components/ui/ErrorBoundary';
import { AppLayout } from '@/src/components/layout/AppLayout';
import { LoginForm } from '@/src/components/auth/LoginForm';
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
const LazyProductForm = React.lazy(() =>
  import('@/src/features/products/pages/ProductFormPage').then((m) => ({ default: m.ProductFormPage })),
);

// { Wrappers that inject onNavigate via useNavigate }
const WholesalerListRoute: React.FC = () => <LazyList />;
const WholesalerCreateRoute: React.FC = () => <LazyCreate />;
const WholesalerDetailsRoute: React.FC = () => <LazyDetails />;
const WholesalerEditRoute: React.FC = () => <LazyEdit />;

// ─── Placeholder pages for routes not yet migrated ─────
/** Lazy page wrapper with Suspense fallback */
const LazyPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense
    fallback={
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
      </div>
    }
  >
    {children}
  </Suspense>
);

const Placeholder: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-text-tertiary gap-4">
    <span className="text-6xl" role="img" aria-hidden="true">
      🚧
    </span>
    <h2 className="text-xl font-medium text-text-primary">{label}</h2>
    <p className="text-sm">Migrating to new router — coming soon.</p>
  </div>
);

// ─── Auth layout ────────────────────────────────────────
const AuthLayout: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-surface-app p-4">
    <Outlet />
  </div>
);

/** Wraps ForgotPasswordForm to provide onBack via useNavigate */
const ForgotPasswordWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <ForgotPasswordForm onBack={() => navigate('/login')} />;
};

/**
 * LoginRoute — renders the correct auth component based on step,
 * and redirects authenticated users away from /login to their
 * intended destination (or /dashboard as fallback).
 */
const LoginRoute: React.FC = () => {
  const { step, isLoading, user } = useAuth();
  const location = useLocation();
  const from = (location.state as Record<string, unknown> | null)?.from as Location | undefined;

  // Already authenticated — redirect to intended destination or dashboard
  if (step === 'dashboard' && user) {
    const dest = from ? from.pathname + (from.search ?? '') + (from.hash ?? '') : '/dashboard';
    // Avoid redirect loop back to /login
    if (dest.startsWith('/login') || dest.startsWith('/forgot-password') || dest.startsWith('/reset-password')) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to={dest} replace />;
  }

  // Still bootstrapping — show spinner
  if (isLoading && step === 'idle') {
    return (
      <div className="flex items-center justify-center w-full">
        <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
      </div>
    );
  }

  // OTP verification in progress
  if (step === 'verifying_login') {
    return (
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">BEPARIBD</h1>
          <p className="text-[#8E8E93] text-[15px] mt-1">Admin Portal</p>
        </div>
        <div className="bg-white rounded-3xl px-6 py-8 shadow-md shadow-black/5">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-[#F2F2F7] flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">📧</span>
            </div>
            <h2 className="text-lg font-semibold text-[#1C1C1E]">Check Your Email</h2>
            <p className="text-[#8E8E93] text-[15px] mt-1">
              Enter the 6‑digit code we sent you
            </p>
          </div>
          <OtpVerification />
        </div>
      </div>
    );
  }

  // Default: login form
  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">BEPARIBD</h1>
        <p className="text-[#8E8E93] text-[15px] mt-1">Admin Portal</p>
      </div>
      <div className="bg-white rounded-3xl px-6 py-8 shadow-md shadow-black/5">
        <LoginForm />
      </div>
    </div>
  );
};

// ─── Protected app layout ────────────────────────────
const ProtectedLayout: React.FC = () => (
  <ProtectedRoute>
    <ErrorBoundary>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ErrorBoundary>
  </ProtectedRoute>
);

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
    children: [{ index: true, element: <ResetPasswordForm /> }],
  },

  // ── Protected app routes ─────────────────────────────
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // Dashboard
      { path: 'dashboard', element: <LazyPage><DashboardPage /></LazyPage> },

      // Wholesalers
      {
        path: 'wholesalers',
        children: [
          { index: true, element: <LazyPage><WholesalerListRoute /></LazyPage> },
          { path: 'create', element: <LazyPage><WholesalerCreateRoute /></LazyPage> },
          { path: ':id', element: <LazyPage><WholesalerDetailsRoute /></LazyPage> },
          { path: ':id/edit', element: <LazyPage><WholesalerEditRoute /></LazyPage> },
        ],
      },

      // Products
      {
        path: 'products',
        children: [
          { index: true, element: <LazyPage><LazyProductList /></LazyPage> },
          { path: 'new', element: <LazyPage><LazyProductForm /></LazyPage> },
          { path: ':productId', element: <LazyPage><LazyProductDetail /></LazyPage> },
          { path: ':productId/edit', element: <LazyPage><LazyProductForm /></LazyPage> },
        ],
      },

      // All other menu routes — placeholders
      ...ROUTES.filter((r) => r.id !== 'dashboard' && r.id !== 'wholesalers' && r.id !== 'products').map((route) => ({
        path: route.id,
        element: <Placeholder label={route.label} />,
      })),
    ],
  },

  // ── Catch-all ────────────────────────────────────────
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);