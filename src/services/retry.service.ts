/**
 * Retry Service
 *
 * Provides automatic retry mechanisms for failed operations with exponential backoff.
 */

import { logger } from './logger.service';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: Error) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDelay: number;
}

class RetryService {
  private readonly DEFAULT_MAX_ATTEMPTS = 3;
  private readonly DEFAULT_INITIAL_DELAY = 1000; // 1 second
  private readonly DEFAULT_MAX_DELAY = 30000; // 30 seconds
  private readonly DEFAULT_BACKOFF_MULTIPLIER = 2;

  /**
   * Execute a function with automatic retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const {
      maxAttempts = this.DEFAULT_MAX_ATTEMPTS,
      initialDelay = this.DEFAULT_INITIAL_DELAY,
      maxDelay = this.DEFAULT_MAX_DELAY,
      backoffMultiplier = this.DEFAULT_BACKOFF_MULTIPLIER,
      retryCondition = () => true
    } = options;

    let lastError: Error | undefined;
    let attempts = 0;
    let totalDelay = 0;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        const result = await operation();
        return {
          success: true,
          result,
          attempts,
          totalDelay
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry this error
        if (!retryCondition(lastError)) {
          logger.info('Not retrying operation due to retry condition', {
            error: lastError.message,
            attempts
          });
          break;
        }

        // Don't retry on the last attempt
        if (attempts >= maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          initialDelay * Math.pow(backoffMultiplier, attempts - 1),
          maxDelay
        );

        totalDelay += delay;

        logger.warn('Operation failed, retrying', {
          error: lastError.message,
          attempt: attempts,
          nextDelay: delay,
          totalDelay
        });

        // Wait before retrying
        await this.delay(delay);
      }
    }

    return {
      success: false,
      error: lastError || new Error('Unknown error'),
      attempts,
      totalDelay
    };
  }

  /**
   * Execute a contact API operation with retry
   */
  async executeContactOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const result = await this.executeWithRetry(operation, {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      retryCondition: (error) => {
        // Retry on network errors, timeouts, and 5xx server errors
        const message = error.message.toLowerCase();
        return message.includes('network') ||
               message.includes('timeout') ||
               message.includes('fetch') ||
               message.includes('500') ||
               message.includes('502') ||
               message.includes('503') ||
               message.includes('504');
      }
    });

    if (!result.success) {
      logger.error(`${operationName} failed after retries`, {
        error: result.error?.message || 'Unknown error',
        attempts: result.attempts,
        totalDelay: result.totalDelay
      } as any);
      throw result.error || new Error(`${operationName} failed`);
    }

    logger.info(`${operationName} succeeded after retries`, {
      attempts: result.attempts,
      totalDelay: result.totalDelay
    });

    return result.result!;
  }

  /**
   * Execute a file upload operation with retry
   */
  async executeFileOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    fileName?: string
  ): Promise<T> {
    const result = await this.executeWithRetry(operation, {
      maxAttempts: 2, // Fewer retries for file operations
      initialDelay: 2000,
      maxDelay: 15000,
      retryCondition: (error) => {
        // Retry on network errors and some server errors
        const message = error.message.toLowerCase();
        return message.includes('network') ||
               message.includes('timeout') ||
               message.includes('fetch') ||
               message.includes('500') ||
               message.includes('502') ||
               message.includes('503') ||
               message.includes('504') ||
               message.includes('storage');
      }
    });

    if (!result.success) {
      logger.error(`File operation ${operationName} failed after retries`, {
        fileName,
        error: result.error?.message || 'Unknown error',
        attempts: result.attempts,
        totalDelay: result.totalDelay
      } as any);
      throw result.error || new Error(`${operationName} failed`);
    }

    logger.info(`File operation ${operationName} succeeded after retries`, {
      fileName,
      attempts: result.attempts,
      totalDelay: result.totalDelay
    });

    return result.result!;
  }

  /**
   * Execute a batch operation with retry
   */
  async executeBatchOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    batchSize: number
  ): Promise<T> {
    const result = await this.executeWithRetry(operation, {
      maxAttempts: 2,
      initialDelay: 3000,
      maxDelay: 20000,
      retryCondition: (error) => {
        // Retry on network errors and server errors
        const message = error.message.toLowerCase();
        return message.includes('network') ||
               message.includes('timeout') ||
               message.includes('fetch') ||
               message.includes('500') ||
               message.includes('502') ||
               message.includes('503') ||
               message.includes('504');
      }
    });

    if (!result.success) {
      logger.error(`Batch operation ${operationName} failed after retries`, {
        batchSize,
        error: result.error?.message || 'Unknown error',
        attempts: result.attempts,
        totalDelay: result.totalDelay
      } as any);
      throw result.error || new Error(`${operationName} failed`);
    }

    logger.info(`Batch operation ${operationName} succeeded after retries`, {
      batchSize,
      attempts: result.attempts,
      totalDelay: result.totalDelay
    });

    return result.result!;
  }

  /**
   * Utility method to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a retry-enabled version of a function
   */
  createRetryWrapper<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: RetryOptions = {}
  ): T {
    return ((...args: Parameters<T>) => {
      return this.executeWithRetry(() => fn(...args), options);
    }) as T;
  }
}

export const retryService = new RetryService();