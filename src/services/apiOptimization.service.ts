/**
 * API Optimization Service
 * Handles request batching, deduplication, and efficient data fetching
 */

interface QueuedRequest {
  id: string;
  request: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  priority: number;
}

interface BatchRequest {
  endpoint: string;
  requests: QueuedRequest[];
  batchSize: number;
}

export class APIOptimizationService {
  private requestQueue: Map<string, QueuedRequest[]> = new Map();
  private processingBatches: Set<string> = new Set();
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_TIMEOUT = 100; // ms
  private readonly MAX_CONCURRENT_REQUESTS = 6;

  private activeRequests = 0;
  private requestQueueArray: QueuedRequest[] = [];

  /**
   * Queue a request for batching or deduplication
   */
  async queueRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: {
      priority?: number;
      skipCache?: boolean;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const { priority = 0, timeout = 30000 } = options;

    return new Promise<T>((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: `${key}_${Date.now()}_${Math.random()}`,
        request: requestFn,
        resolve,
        reject,
        timestamp: Date.now(),
        priority
      };

      // Check if we already have pending requests for this key
      if (!this.requestQueue.has(key)) {
        this.requestQueue.set(key, []);
      }

      const queue = this.requestQueue.get(key)!;
      queue.push(queuedRequest);

      // Sort by priority (higher priority first)
      queue.sort((a, b) => b.priority - a.priority);

      // Process the queue
      this.processQueue(key);

      // Set timeout
      setTimeout(() => {
        const index = queue.findIndex(req => req.id === queuedRequest.id);
        if (index !== -1) {
          queue.splice(index, 1);
          reject(new Error(`Request timeout: ${key}`));
        }
      }, timeout);
    });
  }

  /**
   * Process queued requests for a specific key
   */
  private async processQueue(key: string): Promise<void> {
    const queue = this.requestQueue.get(key);
    if (!queue || queue.length === 0 || this.processingBatches.has(key)) {
      return;
    }

    // Check concurrency limit
    if (this.activeRequests >= this.MAX_CONCURRENT_REQUESTS) {
      // Wait for a slot to open up
      setTimeout(() => this.processQueue(key), 100);
      return;
    }

    this.processingBatches.add(key);
    this.activeRequests++;

    try {
      // Process requests in batches
      while (queue.length > 0) {
        const batch = queue.splice(0, this.BATCH_SIZE);

        if (batch.length === 1 && batch[0]) {
          // Single request - execute directly
          try {
            const result = await batch[0].request();
            batch[0].resolve(result);
          } catch (error) {
            batch[0].reject(error);
          }
        } else if (batch.length > 1) {
          // Multiple requests - try to batch them
          await this.processBatch(key, batch);
        }
      }
    } finally {
      this.processingBatches.delete(key);
      this.activeRequests--;

      // Process next batch if queue still has items
      if (queue.length > 0) {
        setTimeout(() => this.processQueue(key), 10);
      }
    }
  }

  /**
   * Process a batch of requests
   */
  private async processBatch(key: string, batch: QueuedRequest[]): Promise<void> {
    // For now, execute requests sequentially
    // In a real implementation, you might batch API calls to the same endpoint
    const results = await Promise.allSettled(
      batch.map(req => req.request())
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && batch[index]) {
        batch[index].resolve(result.value);
      } else if (result.status === 'rejected' && batch[index]) {
        batch[index].reject(result.reason);
      }
    });
  }

  /**
   * Cancel pending requests for a key
   */
  cancelRequests(key: string): void {
    const queue = this.requestQueue.get(key);
    if (queue) {
      queue.forEach(req => {
        req.reject(new Error(`Request cancelled: ${key}`));
      });
      queue.length = 0;
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    totalQueued: number;
    activeRequests: number;
    processingBatches: number;
    queueSizes: Record<string, number>;
  } {
    const queueSizes: Record<string, number> = {};
    for (const [key, queue] of this.requestQueue.entries()) {
      queueSizes[key] = queue.length;
    }

    return {
      totalQueued: Array.from(this.requestQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
      activeRequests: this.activeRequests,
      processingBatches: this.processingBatches.size,
      queueSizes
    };
  }

  /**
   * Prefetch data for likely future requests
   */
  async prefetch<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = 300000 // 5 minutes
  ): Promise<void> {
    try {
      const result = await requestFn();
      // Store in cache with longer TTL
      // This would integrate with your cache service
      console.log(`[API Opt] Prefetched data for ${key}`);
    } catch (error) {
      console.warn(`[API Opt] Prefetch failed for ${key}:`, error);
    }
  }

  /**
   * Compress data for storage/transmission
   */
  async compressData(data: any): Promise<string> {
    // Simple compression using JSON + base64
    // In production, use a proper compression library
    const jsonString = JSON.stringify(data);
    return btoa(jsonString);
  }

  /**
   * Decompress data
   */
  async decompressData(compressed: string): Promise<any> {
    try {
      const jsonString = atob(compressed);
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error('Failed to decompress data');
    }
  }

  /**
   * Implement circuit breaker pattern for failing services
   */
  private circuitBreakers: Map<string, {
    failures: number;
    lastFailure: number;
    state: 'closed' | 'open' | 'half-open';
  }> = new Map();

  async executeWithCircuitBreaker<T>(
    serviceName: string,
    requestFn: () => Promise<T>,
    options: {
      failureThreshold?: number;
      recoveryTimeout?: number;
      monitoringPeriod?: number;
    } = {}
  ): Promise<T> {
    const {
      failureThreshold = 5,
      recoveryTimeout = 60000, // 1 minute
      monitoringPeriod = 300000 // 5 minutes
    } = options;

    const now = Date.now();
    let breaker = this.circuitBreakers.get(serviceName);

    if (!breaker) {
      breaker = { failures: 0, lastFailure: 0, state: 'closed' };
      this.circuitBreakers.set(serviceName, breaker);
    }

    // Check if circuit should transition from open to half-open
    if (breaker.state === 'open' && now - breaker.lastFailure > recoveryTimeout) {
      breaker.state = 'half-open';
    }

    // If circuit is open, fail fast
    if (breaker.state === 'open') {
      throw new Error(`Circuit breaker open for ${serviceName}`);
    }

    try {
      const result = await requestFn();

      // Success - reset failure count if in half-open state
      if (breaker.state === 'half-open') {
        breaker.failures = 0;
        breaker.state = 'closed';
      }

      return result;
    } catch (error) {
      breaker.failures++;
      breaker.lastFailure = now;

      // Check if we should open the circuit
      if (breaker.failures >= failureThreshold) {
        breaker.state = 'open';
        console.warn(`[Circuit Breaker] Opened circuit for ${serviceName} after ${breaker.failures} failures`);
      }

      throw error;
    }
  }

  /**
   * Clean up old circuit breaker data
   */
  cleanupCircuitBreakers(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [serviceName, breaker] of this.circuitBreakers.entries()) {
      // Remove old circuit breakers that haven't failed recently
      if (breaker.state === 'closed' && now - breaker.lastFailure > 24 * 60 * 60 * 1000) { // 24 hours
        toDelete.push(serviceName);
      }
    }

    toDelete.forEach(serviceName => this.circuitBreakers.delete(serviceName));
  }
}

export const apiOptimizationService = new APIOptimizationService();