import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { cn } from '../../design-system/utils/cn';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
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
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    let displayMessage = 'Something went wrong.';
    try {
      const parsed = JSON.parse(this.state.errorInfo);
      if (
        parsed.error &&
        parsed.error.includes('insufficient permissions')
      ) {
        displayMessage =
          "You don't have permission to perform this action. Please make sure you are logged in as an admin.";
      }
    } catch {
      // Not JSON, use raw message
      displayMessage = this.state.errorInfo || displayMessage;
    }

    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-screen',
          'bg-surface-app p-6 text-center',
        )}
        role="alert"
      >
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
          <AlertOctagon className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-text-primary mb-2">
          Application Error
        </h1>
        <p className="text-text-secondary mb-6 max-w-md">
          {displayMessage}
        </p>
        <button
          onClick={() => window.location.reload()}
          className={cn(
            'px-6 py-2 bg-accent-primary text-white rounded-lg font-medium',
            'hover:bg-accent-primary/90 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2',
          )}
        >
          Reload Application
        </button>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-8 p-4 bg-gray-900 text-gray-300 text-xs rounded-lg overflow-auto max-w-full text-left">
            {this.state.errorInfo}
          </pre>
        )}
      </div>
    );
  }
}