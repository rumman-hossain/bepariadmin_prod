/**
 * AppErrorBoundary — Catches rendering errors across the entire app.
 * Extracted from App.tsx. Uses design-system Button component.
 */

import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorInfo: string;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      errorInfo: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = 'Something went wrong.';

      try {
        const parsed = JSON.parse(this.state.errorInfo);
        if (parsed.error?.includes('insufficient permissions')) {
          displayMessage =
            "You don't have permission to perform this action. Please make sure you are logged in as an admin.";
        }
      } catch {
        // Not JSON — use raw error message
      }

      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertOctagon className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Application Error</h1>
          <p className="text-slate-600 mb-6 max-w-md">{displayMessage}</p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Reload Application
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 p-4 bg-slate-900 text-slate-300 text-xs rounded-lg overflow-auto max-w-full text-left">
              {this.state.errorInfo}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}