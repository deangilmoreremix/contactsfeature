import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { ModernButton } from '../ui/ModernButton';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ContactErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error
    console.error('Contact Error Boundary caught an error:', error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Could send to error reporting service here
    // errorReportingService.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    // Navigate to contacts list or dashboard
    window.location.href = '/contacts';
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Something went wrong
            </h2>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We encountered an error while loading this contact. This might be a temporary issue.
            </p>

            {process.env['NODE_ENV'] === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Error Details (Development)
                </summary>
                <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs font-mono text-red-600 dark:text-red-400 overflow-auto max-h-32">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">{this.state.error.stack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <ModernButton
                onClick={this.handleRetry}
                className="flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </ModernButton>

              <ModernButton
                variant="outline"
                onClick={this.handleGoHome}
                className="flex items-center justify-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Back to Contacts</span>
              </ModernButton>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                If this problem persists, please contact support with the error details above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useContactErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
    console.error('Contact error:', error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
};

// Higher-order component for wrapping contact components
export const withContactErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <ContactErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ContactErrorBoundary>
  );

  WrappedComponent.displayName = `withContactErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};