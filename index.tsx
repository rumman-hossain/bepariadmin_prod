import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/src/router';
import { AuthProvider } from '@/src/auth/AuthContext';
import { ThemeProvider } from '@/src/design-system';
import { ToastProvider } from '@/src/components/ui/Toast';
import { AppErrorBoundary } from '@/src/app/AppErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
);
