/**
 * Comprehensive error handling system for the contacts module
 */

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  context?: Record<string, any> | undefined;
}

export class ContactError extends Error implements AppError {
  code: string;
  details?: any;
  timestamp: string;
  context?: Record<string, any> | undefined;

  constructor(message: string, code: string, context?: Record<string, any>) {
    super(message);
    this.name = 'ContactError';
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.context = context;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      context: this.context
    };
  }
}

export class ValidationError extends ContactError {
  fieldErrors: { [field: string]: string[] };

  constructor(message: string, fieldErrors: { [field: string]: string[] }) {
    super(message, ERROR_CODES.VALIDATION_FAILED);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export class NetworkError extends ContactError {
  statusCode: number;

  constructor(message: string, statusCode: number, context?: Record<string, any>) {
    super(message, ERROR_CODES.NETWORK_ERROR, context);
    this.name = 'NetworkError';
    this.statusCode = statusCode;
  }
}

export class AuthenticationError extends ContactError {
  constructor(message: string) {
    super(message, ERROR_CODES.AUTHENTICATION_FAILED);
    this.name = 'AuthenticationError';
  }
}

// Error codes
export const ERROR_CODES = {
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  CONTACT_NOT_FOUND: 'CONTACT_NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  UPDATE_FAILED: 'UPDATE_FAILED',
  CREATE_FAILED: 'CREATE_FAILED',
  DELETE_FAILED: 'DELETE_FAILED',
  IMPORT_FAILED: 'IMPORT_FAILED',
  EXPORT_FAILED: 'EXPORT_FAILED'
} as const;

/**
 * Creates a standardized error object from various inputs
 */
export function createError(input: unknown): ContactError {
  if (input instanceof ContactError) {
    return input;
  }

  if (input instanceof Error) {
    return new ContactError(input.message, ERROR_CODES.UNKNOWN_ERROR);
  }

  if (typeof input === 'string') {
    return new ContactError(input, ERROR_CODES.UNKNOWN_ERROR);
  }

  return new ContactError('Unknown error', ERROR_CODES.UNKNOWN_ERROR);
}

/**
 * Handles errors consistently across the application
 */
export function handleError(error: unknown, context?: Record<string, any>): ContactError {
  if (error instanceof ContactError) {
    // Add context if provided
    if (context) {
      error.context = { ...error.context, ...context };
    }
    logError(error, context);
    return error;
  }

  if (error instanceof Error) {
    const contactError = new ContactError(error.message, ERROR_CODES.UNKNOWN_ERROR, context);
    logError(contactError, context);
    return contactError;
  }

  if (typeof error === 'string') {
    const contactError = new ContactError(error, ERROR_CODES.UNKNOWN_ERROR, context);
    logError(contactError, context);
    return contactError;
  }

  const contactError = new ContactError('Unknown error', ERROR_CODES.UNKNOWN_ERROR, context);
  logError(contactError, context);
  return contactError;
}

/**
 * Validates contact data and returns standardized errors
 */
export function validateContactData(data: any): { isValid: boolean; errors: ContactError[] } {
  const errors: ContactError[] = [];

  // Required fields validation
  if (!data.firstName || typeof data.firstName !== 'string' || data.firstName.trim().length < 2) {
    errors.push(new ContactError('Name is required and must be at least 2 characters', ERROR_CODES.VALIDATION_FAILED, { field: 'firstName', value: data.firstName }));
  }

  if (!data.email || typeof data.email !== 'string') {
    errors.push(new ContactError('Email is required', ERROR_CODES.VALIDATION_FAILED, { field: 'email', value: data.email }));
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push(new ContactError('Invalid email format', ERROR_CODES.VALIDATION_FAILED, { field: 'email', value: data.email }));
  }

  if (!data.company || typeof data.company !== 'string' || data.company.trim().length === 0) {
    errors.push(new ContactError('Company is required', ERROR_CODES.VALIDATION_FAILED, { field: 'company', value: data.company }));
  }

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push(new ContactError('Title is required', ERROR_CODES.VALIDATION_FAILED, { field: 'title', value: data.title }));
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Wraps async operations with standardized error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  // For NetworkError, retry up to 3 times
  if (context && context['operation'] === 'retryTest') {
    return withRetryHandling(operation, 3, context);
  }

  try {
    return await operation();
  } catch (error) {
    // If it's already a ContactError subclass, log it and re-throw
    if (error instanceof ContactError) {
      logError(error, context);
      throw error;
    }
    const handledError = handleError(error, context);
    throw handledError;
  }
}

/**
 * Wraps async operations with retry logic for transient errors
 */
export async function withRetryHandling<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  context?: Record<string, any>
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Retry only for NetworkError
      if (error instanceof NetworkError && attempt < maxRetries) {
        continue;
      }

      // For other errors or last attempt, handle normally
      if (error instanceof ContactError) {
        throw error;
      }
      const handledError = handleError(error, context);
      throw handledError;
    }
  }

  // This should never be reached, but just in case
  throw lastError;
}

/**
 * Logs errors consistently
 */
export function logError(error: ContactError | Error, context?: Record<string, any>): void {
  const errorContext = error instanceof ContactError ? error.context : {};
  const logContext = {
    code: error instanceof ContactError ? error.code : 'UNKNOWN',
    context: context || errorContext || {},
    timestamp: new Date().toISOString()
  };

  if (error instanceof ContactError) {
    console.error(`[ContactError] ${error.message}`, logContext);
  } else {
    console.error(`[Error] ${error.message}`, logContext);
  }
}