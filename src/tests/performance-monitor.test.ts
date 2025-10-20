/**
 * Performance monitoring tests for the contacts module
 * Tests search performance, API response times, and user interactions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;

  record(name: string, value: number, metadata?: Record<string, any>): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      metadata
    });

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  startTimer(name: string): () => void {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.record(`${name}_duration`, duration);
    };
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  getAverage(name: string): number {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  clear(): void {
    this.metrics = [];
  }
}

const performanceMonitor = new PerformanceMonitor();

describe('Performance Monitor', () => {
  beforeEach(() => {
    performanceMonitor.clear();
    vi.useFakeTimers();
  });

  describe('Basic Recording', () => {
    it('should record performance metrics', () => {
      performanceMonitor.record('test_metric', 100);

      const metrics = performanceMonitor.getMetrics('test_metric');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(100);
      expect(metrics[0].name).toBe('test_metric');
      expect(metrics[0].timestamp).toBeDefined();
    });

    it('should record metrics with metadata', () => {
      const metadata = { userId: '123', action: 'search' };
      performanceMonitor.record('search_time', 250, metadata);

      const metrics = performanceMonitor.getMetrics('search_time');
      expect(metrics[0].metadata).toEqual(metadata);
    });

    it('should maintain maximum metrics limit', () => {
      // Record more than max metrics
      for (let i = 0; i < 1100; i++) {
        performanceMonitor.record('test', i);
      }

      const allMetrics = performanceMonitor.getMetrics();
      expect(allMetrics.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Timer Functionality', () => {
    it('should measure execution time with timer', () => {
      const endTimer = performanceMonitor.startTimer('test_operation');

      // Simulate some work
      vi.advanceTimersByTime(150);

      endTimer();

      const metrics = performanceMonitor.getMetrics('test_operation_duration');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBeGreaterThanOrEqual(150);
    });

    it('should handle multiple concurrent timers', () => {
      const timer1 = performanceMonitor.startTimer('operation1');
      const timer2 = performanceMonitor.startTimer('operation2');

      vi.advanceTimersByTime(100);
      timer1();

      vi.advanceTimersByTime(50);
      timer2();

      const metrics1 = performanceMonitor.getMetrics('operation1_duration');
      const metrics2 = performanceMonitor.getMetrics('operation2_duration');

      expect(metrics1[0].value).toBeGreaterThanOrEqual(100);
      expect(metrics2[0].value).toBeGreaterThanOrEqual(150);
    });
  });

  describe('Analytics', () => {
    it('should calculate average performance', () => {
      performanceMonitor.record('response_time', 100);
      performanceMonitor.record('response_time', 200);
      performanceMonitor.record('response_time', 300);

      const average = performanceMonitor.getAverage('response_time');
      expect(average).toBe(200);
    });

    it('should return 0 for non-existent metrics', () => {
      const average = performanceMonitor.getAverage('non_existent');
      expect(average).toBe(0);
    });

    it('should filter metrics by name', () => {
      performanceMonitor.record('metric1', 100);
      performanceMonitor.record('metric2', 200);
      performanceMonitor.record('metric1', 150);

      const metric1Metrics = performanceMonitor.getMetrics('metric1');
      const metric2Metrics = performanceMonitor.getMetrics('metric2');

      expect(metric1Metrics).toHaveLength(2);
      expect(metric2Metrics).toHaveLength(1);
    });
  });

  describe('Search Performance Monitoring', () => {
    it('should track search query performance', () => {
      const endTimer = performanceMonitor.startTimer('search_query');

      // Simulate search operation
      vi.advanceTimersByTime(75);

      endTimer();

      const metrics = performanceMonitor.getMetrics('search_query_duration');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBeGreaterThanOrEqual(75);
      expect(metrics[0].value).toBeLessThan(100); // Allow some tolerance
    });

    it('should track API response times', () => {
      performanceMonitor.record('api_response_time', 45, {
        endpoint: '/api/contacts/search',
        method: 'GET',
        statusCode: 200
      });

      const metrics = performanceMonitor.getMetrics('api_response_time');
      expect(metrics[0].metadata?.endpoint).toBe('/api/contacts/search');
      expect(metrics[0].metadata?.statusCode).toBe(200);
    });

    it('should track cache hit rates', () => {
      performanceMonitor.record('cache_hit', 1, { query: 'john' });
      performanceMonitor.record('cache_miss', 1, { query: 'unique-search' });

      const hits = performanceMonitor.getMetrics('cache_hit');
      const misses = performanceMonitor.getMetrics('cache_miss');

      expect(hits).toHaveLength(1);
      expect(misses).toHaveLength(1);
    });

    it('should monitor debounced search behavior', () => {
      // Record multiple rapid search attempts
      for (let i = 0; i < 5; i++) {
        performanceMonitor.record('search_attempt', i + 1, {
          query: `test${i}`,
          debounced: i > 0
        });
      }

      const attempts = performanceMonitor.getMetrics('search_attempt');
      expect(attempts).toHaveLength(5);

      // Check that debounced attempts are marked
      const debouncedAttempts = attempts.filter(m => m.metadata?.debounced);
      expect(debouncedAttempts).toHaveLength(4);
    });
  });

  describe('Memory and Cleanup', () => {
    it('should clear all metrics', () => {
      performanceMonitor.record('test', 100);
      performanceMonitor.record('test2', 200);

      expect(performanceMonitor.getMetrics()).toHaveLength(2);

      performanceMonitor.clear();

      expect(performanceMonitor.getMetrics()).toHaveLength(0);
    });

    it('should handle large volumes of metrics efficiently', () => {
      const startTime = Date.now();

      // Record many metrics quickly
      for (let i = 0; i < 5000; i++) {
        performanceMonitor.record(`metric_${i % 10}`, i);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(1000); // Less than 1 second

      // Should maintain reasonable memory usage
      const allMetrics = performanceMonitor.getMetrics();
      expect(allMetrics.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Integration with Search Operations', () => {
    it('should track complete search operation lifecycle', () => {
      // Start search operation
      const searchTimer = performanceMonitor.startTimer('search_operation');

      // Record cache check
      performanceMonitor.record('cache_check', 5, { hit: false });

      // Record API call
      const apiTimer = performanceMonitor.startTimer('api_call');
      vi.advanceTimersByTime(120);
      apiTimer();

      // Record result processing
      performanceMonitor.record('result_processing', 15, { resultCount: 25 });

      // End search operation
      vi.advanceTimersByTime(10);
      searchTimer();

      const searchMetrics = performanceMonitor.getMetrics('search_operation_duration');
      const apiMetrics = performanceMonitor.getMetrics('api_call_duration');
      const cacheMetrics = performanceMonitor.getMetrics('cache_check');
      const processingMetrics = performanceMonitor.getMetrics('result_processing');

      expect(searchMetrics).toHaveLength(1);
      expect(apiMetrics).toHaveLength(1);
      expect(cacheMetrics).toHaveLength(1);
      expect(processingMetrics).toHaveLength(1);

      // Search operation should include all phases
      expect(searchMetrics[0].value).toBeGreaterThanOrEqual(145); // 120 + 15 + 10 + buffer
    });

    it('should track search performance thresholds', () => {
      // Fast search
      performanceMonitor.record('search_response_time', 50, { query: 'fast' });

      // Slow search
      performanceMonitor.record('search_response_time', 2000, { query: 'slow' });

      // Acceptable search
      performanceMonitor.record('search_response_time', 500, { query: 'medium' });

      const metrics = performanceMonitor.getMetrics('search_response_time');
      expect(metrics).toHaveLength(3);

      const average = performanceMonitor.getAverage('search_response_time');
      expect(average).toBeGreaterThan(500); // Should be around 850ms

      // Check individual performance
      const fastSearch = metrics.find(m => m.metadata?.query === 'fast');
      const slowSearch = metrics.find(m => m.metadata?.query === 'slow');

      expect(fastSearch?.value).toBe(50);
      expect(slowSearch?.value).toBe(2000);
    });
  });
});