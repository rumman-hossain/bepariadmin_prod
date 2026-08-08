import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/src/router';
import { AuthProvider } from '@/src/auth/AuthContext';
import { ThemeProvider } from '@/src/design-system';
import { ToastProvider } from '@/src/components/feedback/Toast';
import { ErrorBoundary } from '@/src/components/feedback';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/src/app/queryClient';
import { installGlobalHandlers } from '@/src/observability/reportCrash';

/*
 * Before anything renders. An error boundary sees render, lifecycle and effects
 * — it does NOT see an event handler, a setTimeout, or a floating promise, and
 * those were silent even in development. Installed first so a failure during
 * mount is caught by the same channel as one an hour later.
 */
installGlobalHandlers();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary name="root">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
