/**
 * Standardized error handling utilities for the contacts module
 */

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  context?: Record<string, any>;
}

export class ContactError extends Error implements AppError {
  code: string;
  details?: any;
  timestamp: string;
  context?: Record<string, any>;

  constructor(code: string, message: string, details?: any, context?: Record<string, any>) {
    super(message);
    this.name = 'ContactError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.context = context || {};
  }
}

// Error codes
export const ERROR_CODES = {
  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PHONE: 'INVALID_PHONE',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // API errors
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',

  // Data errors
  CONTACT_NOT_FOUND: 'CONTACT_NOT_FOUND',
  DUPLICATE_CONTACT: 'DUPLICATE_CONTACT',
  INVALID_DATA_FORMAT: 'INVALID_DATA_FORMAT',

  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Storage errors
  STORAGE_ERROR: 'STORAGE_ERROR',
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR',

  // AI errors
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  AI_TIMEOUT: 'AI_TIMEOUT',

  // Generic errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  OPERATION_FAILED: 'OPERATION_FAILED'
} as const;

/**
 * Creates a standardized error object
 */
export function createError(
  code: string,
  message: string,
  details?: any,
  context?: Record<string, any>
): ContactError {
  return new ContactError(code, message, details, context);
}

/**
 * Handles errors consistently across the application
 */
export function handleError(error: unknown, context?: Record<string, any>): ContactError {
  if (error instanceof ContactError) {
    return error;
  }

  if (error instanceof Error) {
    // Map common error types to standardized codes
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return createError(ERROR_CODES.NETWORK_ERROR, 'Network request failed', error, context);
    }

    if (error.message.includes('timeout')) {
      return createError(ERROR_CODES.TIMEOUT_ERROR, 'Request timed out', error, context);
    }

    if (error.message.includes('unauthorized') || error.message.includes('401')) {
      return createError(ERROR_CODES.UNAUTHORIZED, 'Authentication required', error, context);
    }

    if (error.message.includes('forbidden') || error.message.includes('403')) {
      return createError(ERROR_CODES.FORBIDDEN, 'Access denied', error, context);
    }

    // Generic error
    return createError(ERROR_CODES.UNKNOWN_ERROR, error.message, error, context);
  }

  // Handle non-Error objects
  const message = typeof error === 'string' ? error : 'An unknown error occurred';
  return createError(ERROR_CODES.UNKNOWN_ERROR, message, error, context);
}

/**
 * Validates contact data and returns standardized errors
 */
export function validateContactData(data: any): { isValid: boolean; errors: ContactError[] } {
  const errors: ContactError[] = [];

  // Required fields validation
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push(createError(
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      'Name is required and must be at least 2 characters',
      { field: 'name', value: data.name }
    ));
  }

  if (!data.email || typeof data.email !== 'string') {
    errors.push(createError(
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      'Email is required',
      { field: 'email', value: data.email }
    ));
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push(createError(
      ERROR_CODES.INVALID_EMAIL,
      'Invalid email format',
      { field: 'email', value: data.email }
    ));
  }

  if (!data.company || typeof data.company !== 'string' || data.company.trim().length === 0) {
    errors.push(createError(
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      'Company is required',
      { field: 'company', value: data.company }
    ));
  }

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push(createError(
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      'Title is required',
      { field: 'title', value: data.title }
    ));
  }

  // Optional field validations
  if (data.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(data.phone.replace(/[\s\-\(\)]/g, ''))) {
    errors.push(createError(
      ERROR_CODES.INVALID_PHONE,
      'Invalid phone number format',
      { field: 'phone', value: data.phone }
    ));
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
  try {
    return await operation();
  } catch (error) {
    throw handleError(error, context);
  }
}

/**
 * Logs errors consistently
 */
export function logError(error: ContactError | Error, additionalContext?: Record<string, any>): void {
  const context = {
    ...error instanceof ContactError ? error.context : {},
    ...additionalContext
  };

  console.error(`[${error instanceof ContactError ? error.code : 'UNKNOWN'}] ${error.message}`, {
    error,
    context,
    timestamp: new Date().toISOString()
  });
}