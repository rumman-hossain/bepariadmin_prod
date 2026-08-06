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

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
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
