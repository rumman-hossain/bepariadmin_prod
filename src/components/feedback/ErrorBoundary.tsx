import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { Button } from '@/src/components/controls';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Rendered instead of the default screen. For scoping a failure to one panel. */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string;
}

/**
 * Catches a render error and shows a screen instead of a blank page.
 *
 * This absorbed two near-identical boundaries — one mounted at the app root and
 * one inside the router — which meant the inner one always won and the outer was
 * effectively unreachable. They had drifted apart in three ways, and the merge
 * kept the better half of each:
 *
 *   - `fallback` and `role="alert"` came from the router copy. Without the role,
 *     a screen reader announced nothing when the page swapped out under it.
 *   - The reload button is the kit `Button`. The router copy hand-rolled one in
 *     raw brass classes, so it drifted from every other button in the console.
 *   - The message is generic. The router copy fell back to rendering the raw
 *     error string, which is how an operator ended up reading a Postgres
 *     constraint name. The raw text still appears in the dev-only block below,
 *     which is where it is useful.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorInfo: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    let displayMessage = 'Something went wrong.';
    try {
      const parsed = JSON.parse(this.state.errorInfo);
      if (typeof parsed?.error === 'string' && parsed.error.includes('insufficient permissions')) {
        displayMessage =
          "You don't have permission to perform this action. Please make sure you are signed in as an admin.";
      }
    } catch {
      // Not JSON. Keep the generic message rather than showing the raw error.
    }

    return (
      <div
        className="flex h-screen flex-col items-center justify-center bg-paper p-6 text-center"
        role="alert"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bad-wash">
          <AlertOctagon className="h-8 w-8 text-bad" aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-xl font-bold text-ink">Application Error</h1>
        <p className="mb-6 max-w-md text-ink-2">{displayMessage}</p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Reload Application
        </Button>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-8 max-w-full overflow-auto rounded-lg bg-sheet-inverse p-4 text-left text-xs text-ink-3">
            {this.state.errorInfo}
          </pre>
        )}
      </div>
    );
  }
}
