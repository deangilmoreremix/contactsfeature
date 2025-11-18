import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ModernButton } from './ModernButton';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900">Something went wrong</h3>
              <p className="text-red-700">An error occurred while rendering this component.</p>
            </div>
          </div>

          {process.env['NODE_ENV'] === 'development' && this.state.error && (
            <div className="w-full max-w-2xl mb-4">
              <details className="bg-white p-4 rounded border border-red-200">
                <summary className="cursor-pointer font-medium text-red-900 mb-2">
                  Error Details (Development)
                </summary>
                <pre className="text-xs text-red-800 whitespace-pre-wrap overflow-auto max-h-40">
                  {this.state.error.stack}
                </pre>
              </details>
            </div>
          )}

          <ModernButton
            onClick={this.handleRetry}
            className="bg-red-600 hover:bg-red-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </ModernButton>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  return (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
};