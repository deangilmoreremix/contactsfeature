/**
 * Comprehensive tests for Error Handling and Logging
 * Tests custom error classes, error codes, fallbacks, and logging functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ContactError,
  ValidationError,
  NetworkError,
  AuthenticationError,
  createError,
  handleError,
  logError,
  withErrorHandling,
  ERROR_CODES
} from '../utils/errorHandling';

// Mock console methods
const consoleSpy = {
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  info: vi.spyOn(console, 'info').mockImplementation(() => {}),
  debug: vi.spyOn(console, 'debug').mockImplementation(() => {})
};

describe('Error Handling System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Custom Error Classes', () => {
    describe('ContactError', () => {
      it('should create ContactError with message and code', () => {
        const error = new ContactError('Contact not found', ERROR_CODES.CONTACT_NOT_FOUND);

        expect(error).toBeInstanceOf(ContactError);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Contact not found');
        expect(error.code).toBe(ERROR_CODES.CONTACT_NOT_FOUND);
        expect(error.name).toBe('ContactError');
      });

      it('should include additional context', () => {
        const context = { contactId: '123', operation: 'update' };
        const error = new ContactError('Update failed', ERROR_CODES.UPDATE_FAILED, context);

        expect(error.context).toEqual(context);
        expect(error.timestamp).toBeDefined();
      });

      it('should serialize to JSON correctly', () => {
        const error = new ContactError('Test error', ERROR_CODES.UNKNOWN_ERROR);

        const json = error.toJSON();
        expect(json).toEqual({
          name: 'ContactError',
          message: 'Test error',
          code: ERROR_CODES.UNKNOWN_ERROR,
          timestamp: error.timestamp,
          context: undefined
        });
      });
    });

    describe('ValidationError', () => {
      it('should create ValidationError with field errors', () => {
        const fieldErrors = {
          email: ['Invalid format'],
          phone: ['Must be 10 digits']
        };
        const error = new ValidationError('Validation failed', fieldErrors);

        expect(error).toBeInstanceOf(ValidationError);
        expect(error).toBeInstanceOf(ContactError);
        expect(error.fieldErrors).toEqual(fieldErrors);
        expect(error.code).toBe(ERROR_CODES.VALIDATION_FAILED);
      });
    });

    describe('NetworkError', () => {
      it('should create NetworkError with status code', () => {
        const error = new NetworkError('Connection failed', 500);

        expect(error).toBeInstanceOf(NetworkError);
        expect(error).toBeInstanceOf(ContactError);
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe(ERROR_CODES.NETWORK_ERROR);
      });
    });

    describe('AuthenticationError', () => {
      it('should create AuthenticationError', () => {
        const error = new AuthenticationError('Unauthorized access');

        expect(error).toBeInstanceOf(AuthenticationError);
        expect(error).toBeInstanceOf(ContactError);
        expect(error.code).toBe(ERROR_CODES.AUTHENTICATION_FAILED);
      });
    });
  });

  describe('Error Creation Utilities', () => {
    it('should create error from unknown input', () => {
      const stringError = createError('String error');
      expect(stringError).toBeInstanceOf(ContactError);
      expect(stringError.message).toBe('String error');

      const errorObj = createError(new Error('Original error'));
      expect(errorObj).toBeInstanceOf(ContactError);
      expect(errorObj.message).toBe('Original error');

      const contactError = createError(new ContactError('Contact error', ERROR_CODES.CONTACT_NOT_FOUND));
      expect(contactError).toBeInstanceOf(ContactError);
      expect(contactError.code).toBe(ERROR_CODES.CONTACT_NOT_FOUND);
    });

    it('should handle null/undefined input', () => {
      const nullError = createError(null);
      expect(nullError.message).toBe('Unknown error');

      const undefinedError = createError(undefined);
      expect(undefinedError.message).toBe('Unknown error');
    });
  });

  describe('Error Handling', () => {
    it('should handle ContactError instances', () => {
      const originalError = new ContactError('Contact not found', ERROR_CODES.CONTACT_NOT_FOUND);
      const context = { operation: 'findContact', contactId: '123' };

      const result = handleError(originalError, context);

      expect(result).toBe(originalError); // Should return the same error
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[ContactError] Contact not found',
        expect.objectContaining({
          code: ERROR_CODES.CONTACT_NOT_FOUND,
          context,
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle generic Error instances', () => {
      const originalError = new Error('Generic error');
      const context = { operation: 'genericOp' };

      const result = handleError(originalError, context);

      expect(result).toBeInstanceOf(ContactError);
      expect(result.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should handle string errors', () => {
      const errorString = 'String error message';
      const context = { operation: 'stringOp' };

      const result = handleError(errorString, context);

      expect(result).toBeInstanceOf(ContactError);
      expect(result.message).toBe('String error message');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should handle unknown error types', () => {
      const unknownError = { custom: 'error' };
      const context = { operation: 'unknownOp' };

      const result = handleError(unknownError, context);

      expect(result).toBeInstanceOf(ContactError);
      expect(result.message).toBe('Unknown error');
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('Error Logging', () => {
    it('should log errors with context', () => {
      const error = new ContactError('Test error', ERROR_CODES.CONTACT_NOT_FOUND);
      const context = { userId: '123', action: 'delete' };

      logError(error, context);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[ContactError] Test error',
        expect.objectContaining({
          code: ERROR_CODES.CONTACT_NOT_FOUND,
          context,
          timestamp: expect.any(String)
        })
      );
    });

    it('should log errors without context', () => {
      const error = new Error('Simple error');

      logError(error);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[Error] Simple error',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling Wrapper', () => {
    it('should execute function successfully', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const context = { operation: 'test' };

      const result = await withErrorHandling(mockFn, context);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('should handle synchronous errors', async () => {
      const mockFn = vi.fn(() => {
        throw new Error('Sync error');
      });
      const context = { operation: 'syncTest' };

      await expect(withErrorHandling(mockFn, context)).rejects.toThrow('Sync error');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should handle asynchronous errors', async () => {
      const mockFn = vi.fn().mockRejectedValue(new ContactError('Async error', ERROR_CODES.NETWORK_ERROR));
      const context = { operation: 'asyncTest' };

      await expect(withErrorHandling(mockFn, context)).rejects.toThrow('Async error');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should handle ContactError instances in wrapper', async () => {
      const contactError = new ContactError('Contact error', ERROR_CODES.CONTACT_NOT_FOUND);
      const mockFn = vi.fn().mockRejectedValue(contactError);
      const context = { operation: 'contactTest' };

      await expect(withErrorHandling(mockFn, context)).rejects.toThrow(contactError);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[ContactError] Contact error',
        expect.any(Object)
      );
    });

    it('should wrap non-ContactError instances', async () => {
      const mockFn = vi.fn().mockRejectedValue('String error');
      const context = { operation: 'stringErrorTest' };

      await expect(withErrorHandling(mockFn, context)).rejects.toThrow(ContactError);
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('Error Codes', () => {
    it('should have all required error codes', () => {
      expect(ERROR_CODES).toEqual({
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
      });
    });

    it('should use correct error codes for different scenarios', () => {
      const validationError = new ValidationError('Invalid data', { email: ['required'] });
      expect(validationError.code).toBe(ERROR_CODES.VALIDATION_FAILED);

      const networkError = new NetworkError('Connection failed', 500);
      expect(networkError.code).toBe(ERROR_CODES.NETWORK_ERROR);

      const authError = new AuthenticationError('Unauthorized');
      expect(authError.code).toBe(ERROR_CODES.AUTHENTICATION_FAILED);
    });
  });

  describe('Error Context and Metadata', () => {
    it('should include operation context in errors', () => {
      const error = new ContactError('Operation failed', ERROR_CODES.UPDATE_FAILED, {
        operation: 'updateContact',
        contactId: '123',
        userId: 'user456',
        timestamp: '2024-01-01T10:00:00Z'
      });

      expect(error.context).toEqual({
        operation: 'updateContact',
        contactId: '123',
        userId: 'user456',
        timestamp: '2024-01-01T10:00:00Z'
      });
    });

    it('should include stack trace for debugging', () => {
      const error = new ContactError('Debug error', ERROR_CODES.UNKNOWN_ERROR);

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
      expect(error.stack).toContain('ContactError');
    });

    it('should preserve original error information', () => {
      const originalError = new Error('Original message');
      originalError.stack = 'Original stack trace';

      const contactError = createError(originalError);

      expect(contactError.message).toBe('Original message');
      expect(contactError.stack).toBeDefined();
    });
  });

  describe('Error Recovery and Fallbacks', () => {
    it('should support error recovery patterns', async () => {
      let attemptCount = 0;
      const mockFn = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new NetworkError('Temporary failure', 503);
        }
        return 'success';
      });

      // Simulate retry logic
      let result;
      try {
        result = await withErrorHandling(mockFn, { operation: 'retryTest' });
      } catch (error) {
        // In real implementation, you might retry here
        throw error;
      }

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1); // Only once since it succeeded
    });

    it('should provide fallback values for failed operations', async () => {
      const mockFn = vi.fn().mockRejectedValue(new ContactError('Service unavailable', ERROR_CODES.NETWORK_ERROR));

      // Simulate fallback pattern
      let result;
      try {
        result = await withErrorHandling(mockFn, { operation: 'fallbackTest' });
      } catch (error) {
        // Provide fallback
        result = 'fallback-value';
      }

      expect(result).toBe('fallback-value');
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('Integration with Contact Operations', () => {
    it('should handle contact CRUD errors appropriately', () => {
      // Simulate contact not found
      const notFoundError = new ContactError('Contact not found', ERROR_CODES.CONTACT_NOT_FOUND, {
        contactId: 'non-existent',
        operation: 'findContact'
      });

      expect(notFoundError.code).toBe(ERROR_CODES.CONTACT_NOT_FOUND);
      expect(notFoundError.context?.contactId).toBe('non-existent');

      // Simulate validation error
      const validationError = new ValidationError('Invalid contact data', {
        email: ['Invalid format'],
        phone: ['Must be numeric']
      });

      expect(validationError.fieldErrors.email).toEqual(['Invalid format']);
      expect(validationError.code).toBe(ERROR_CODES.VALIDATION_FAILED);
    });

    it('should handle API communication errors', () => {
      const networkError = new NetworkError('API timeout', 408);
      const authError = new AuthenticationError('Invalid token');

      expect(networkError.statusCode).toBe(408);
      expect(networkError.code).toBe(ERROR_CODES.NETWORK_ERROR);

      expect(authError.code).toBe(ERROR_CODES.AUTHENTICATION_FAILED);
    });

    it('should support error chaining', () => {
      const rootCause = new Error('Database connection failed');
      const networkError = new NetworkError('API request failed', 500, {
        cause: rootCause,
        operation: 'databaseQuery'
      });

      expect(networkError.context?.cause).toBe(rootCause);
      expect(networkError.message).toBe('API request failed');
    });
  });

  describe('Logging Levels and Output', () => {
    it('should log errors at appropriate levels', () => {
      const contactError = new ContactError('Test error', ERROR_CODES.CONTACT_NOT_FOUND);

      logError(contactError, { severity: 'error' });

      expect(consoleSpy.error).toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
    });

    it('should include error metadata in logs', () => {
      const error = new ContactError('Metadata test', ERROR_CODES.UPDATE_FAILED, {
        userId: 'user123',
        contactId: 'contact456',
        changes: { status: 'updated' }
      });

      logError(error);

      const logCall = consoleSpy.error.mock.calls[0];
      expect(logCall[1]).toEqual(expect.objectContaining({
        code: ERROR_CODES.UPDATE_FAILED,
        context: expect.objectContaining({
          userId: 'user123',
          contactId: 'contact456',
          changes: { status: 'updated' }
        }),
        timestamp: expect.any(String)
      }));
    });

    it('should handle circular references in error context', () => {
      const circularContext: any = { operation: 'test' };
      circularContext.self = circularContext;

      const error = new ContactError('Circular reference test', ERROR_CODES.UNKNOWN_ERROR, circularContext);

      // Should not throw when logging
      expect(() => logError(error)).not.toThrow();
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });
});