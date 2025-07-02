/**
 * Logger Service
 * Centralized logging for all API interactions and system events
 */

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  context?: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    service?: string;
    operation?: string;
  };
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class LoggerService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  
  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    data?: any,
    context?: LogEntry['context'],
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      context: {
        sessionId: this.getSessionId(),
        ...context,
      },
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    };
  }
  
  private getSessionId(): string {
    // Generate or retrieve session ID
    let sessionId = sessionStorage.getItem('smartcrm_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('smartcrm_session_id', sessionId);
    }
    return sessionId;
  }
  
  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Console logging in development
    if (process.env.NODE_ENV === 'development') {
      const logMethod = entry.level === 'error' ? 'error' : 
                      entry.level === 'warn' ? 'warn' : 'log';
      console[logMethod](`[${entry.level.toUpperCase()}]`, entry.message, entry.data || '');
      
      if (entry.error) {
        console.error('Error details:', entry.error);
      }
    }
    
    // Send to remote logging service if configured
    this.sendToRemoteLogger(entry);
  }
  
  private async sendToRemoteLogger(entry: LogEntry): Promise<void> {
    // Implementation would send logs to external service
    // For now, just store locally
    try {
      const storedLogs = localStorage.getItem('smartcrm_logs');
      const logs = storedLogs ? JSON.parse(storedLogs) : [];
      logs.push(entry);
      
      // Keep only last 100 logs in localStorage
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('smartcrm_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store log:', error);
    }
  }
  
  debug(message: string, data?: any, context?: LogEntry['context']): void {
    this.addLog(this.createLogEntry('debug', message, data, context));
  }
  
  info(message: string, data?: any, context?: LogEntry['context']): void {
    this.addLog(this.createLogEntry('info', message, data, context));
  }
  
  warn(message: string, data?: any, context?: LogEntry['context']): void {
    this.addLog(this.createLogEntry('warn', message, data, context));
  }
  
  error(message: string, error?: Error, data?: any, context?: LogEntry['context']): void {
    this.addLog(this.createLogEntry('error', message, data, context, error));
  }
  
  // API-specific logging methods
  apiRequest(method: string, url: string, data?: any, context?: LogEntry['context']): void {
    this.info(`API Request: ${method} ${url}`, data, {
      ...context,
      operation: 'api_request',
    });
  }
  
  apiResponse(method: string, url: string, status: number, data?: any, context?: LogEntry['context']): void {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    this.addLog(this.createLogEntry(
      level,
      `API Response: ${method} ${url} - ${status}`,
      data,
      { ...context, operation: 'api_response' }
    ));
  }
  
  apiError(method: string, url: string, error: Error, context?: LogEntry['context']): void {
    this.error(`API Error: ${method} ${url}`, error, undefined, {
      ...context,
      operation: 'api_error',
    });
  }
  
  // Get logs for debugging
  getLogs(level?: LogEntry['level'], limit = 50): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }
    
    return filteredLogs.slice(-limit);
  }
  
  // Clear logs
  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('smartcrm_logs');
  }
  
  // Export logs for analysis
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new LoggerService();