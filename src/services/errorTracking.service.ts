/**
 * Production Error Tracking Service
 * Tracks and reports errors in production environment
 */

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  contactId?: string;
  feature?: string;
  timestamp: string;
  userAgent: string;
  url: string;
}

interface ErrorReport {
  message: string;
  stack?: string;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorTrackingService {
  private static instance: ErrorTrackingService;
  private errors: ErrorReport[] = [];
  private maxErrors = 100; // Keep last 100 errors

  private constructor() {
    this.setupGlobalErrorHandling();
  }

  static getInstance(): ErrorTrackingService {
    if (!ErrorTrackingService.instance) {
      ErrorTrackingService.instance = new ErrorTrackingService();
    }
    return ErrorTrackingService.instance;
  }

  private setupGlobalErrorHandling() {
    // Global error handler for uncaught errors
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        stack: event.error?.stack,
        context: this.createErrorContext('global', 'uncaught_error'),
        severity: 'high'
      });
    });

    // Global promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        context: this.createErrorContext('global', 'unhandled_rejection'),
        severity: 'high'
      });
    });
  }

  private createErrorContext(component: string = 'unknown', action: string = 'unknown'): ErrorContext {
    return {
      component,
      action,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  }

  trackError(error: ErrorReport) {
    // Add to local storage for debugging
    this.errors.unshift(error);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error tracked:', error);
    }

    // In production, send to error reporting service
    if (import.meta.env.PROD) {
      this.sendToErrorReporting(error);
    }

    // Store in localStorage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('error_logs') || '[]');
      existingErrors.unshift(error);
      if (existingErrors.length > 50) {
        existingErrors.splice(50);
      }
      localStorage.setItem('error_logs', JSON.stringify(existingErrors));
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  trackAIError(message: string, component: string, contactId?: string, stack?: string) {
    this.trackError({
      message,
      stack,
      context: {
        ...this.createErrorContext(component, 'ai_operation'),
        contactId,
        feature: 'ai'
      },
      severity: 'medium'
    });
  }

  trackAPIError(message: string, endpoint: string, statusCode?: number, stack?: string) {
    this.trackError({
      message: `${message} (${endpoint})`,
      stack,
      context: {
        ...this.createErrorContext('api', 'http_request'),
        feature: 'api',
        action: `status_${statusCode || 'unknown'}`
      },
      severity: statusCode && statusCode >= 500 ? 'high' : 'medium'
    });
  }

  private async sendToErrorReporting(error: ErrorReport) {
    // In a real implementation, send to services like Sentry, LogRocket, etc.
    try {
      // Example: Send to a logging endpoint
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(error)
      // });
      console.warn('Error reporting not implemented in demo');
    } catch (e) {
      // Don't track errors in error tracking to avoid loops
    }
  }

  getRecentErrors(count: number = 10): ErrorReport[] {
    return this.errors.slice(0, count);
  }

  clearErrors() {
    this.errors = [];
    localStorage.removeItem('error_logs');
  }

  getErrorStats() {
    const stats = {
      total: this.errors.length,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      byComponent: {} as Record<string, number>,
      recent: this.errors.slice(0, 5)
    };

    this.errors.forEach(error => {
      stats.bySeverity[error.severity]++;
      const component = error.context.component || 'unknown';
      stats.byComponent[component] = (stats.byComponent[component] || 0) + 1;
    });

    return stats;
  }
}

export const errorTracking = ErrorTrackingService.getInstance();