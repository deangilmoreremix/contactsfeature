/**
 * Cron Job Runner
 * 
 * A flexible cron job scheduler with support for 1-5 minute intervals.
 * Used for scheduled tasks like sequence step due checks and autopilot ticks.
 */

import { logger } from '../core/logger';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type CronInterval = 1 | 2 | 3 | 4 | 5; // minutes

export interface ScheduledJob {
  id: string;
  name: string;
  interval: CronInterval;
  handler: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
  lastError?: string;
}

export interface JobResult {
  success: boolean;
  duration: number;
  error?: string;
  timestamp: Date;
}

export interface JobStats {
  jobId: string;
  name: string;
  runCount: number;
  errorCount: number;
  avgDuration: number;
  lastRun?: Date;
  lastError?: string;
}

// ============================================================================
// Cron Job Runner Class
// ============================================================================

class CronJobRunner {
  private jobs = new Map<string, ScheduledJob>();
  private intervals = new Map<CronInterval, NodeJS.Timeout[]>();
  private isRunning = false;

  /**
   * Register a new scheduled job
   */
  registerJob(
    name: string,
    handler: () => Promise<void>,
    interval: CronInterval = 1
  ): string {
    const id = uuidv4();
    
    const job: ScheduledJob = {
      id,
      name,
      interval,
      handler,
      enabled: true,
      runCount: 0,
      errorCount: 0
    };

    this.jobs.set(id, job);
    logger.info('Job registered', { jobId: id, name, interval: `${interval} min` });

    // If runner is already started, add this job to the schedule
    if (this.isRunning) {
      this.scheduleJob(job);
    }

    return id;
  }

  /**
   * Unregister a job
   */
  unregisterJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    // Clear existing intervals for this job
    this.clearJobIntervals(job);
    this.jobs.delete(jobId);
    
    logger.info('Job unregistered', { jobId, name: job.name });
    return true;
  }

  /**
   * Enable a job
   */
  enableJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    job.enabled = true;
    logger.info('Job enabled', { jobId, name: job.name });
    return true;
  }

  /**
   * Disable a job
   */
  disableJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    job.enabled = false;
    this.clearJobIntervals(job);
    logger.info('Job disabled', { jobId, name: job.name });
    return true;
  }

  /**
   * Start the cron runner
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Cron runner already running');
      return;
    }

    this.isRunning = true;
    logger.info('Cron runner started');

    // Schedule all registered jobs
    for (const job of this.jobs.values()) {
      this.scheduleJob(job);
    }
  }

  /**
   * Stop the cron runner
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    // Clear all intervals
    for (const timeouts of this.intervals.values()) {
      for (const timeout of timeouts) {
        clearInterval(timeout);
      }
    }
    this.intervals.clear();

    this.isRunning = false;
    logger.info('Cron runner stopped');
  }

  /**
   * Restart the cron runner (stop and start)
   */
  restart(): void {
    this.stop();
    this.start();
    logger.info('Cron runner restarted');
  }

  /**
   * Run a specific job immediately
   */
  async runJobNow(jobId: string): Promise<JobResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return {
        success: false,
        duration: 0,
        error: 'Job not found',
        timestamp: new Date()
      };
    }

    const startTime = Date.now();
    logger.info('Running job manually', { jobId, name: job.name });

    try {
      await job.handler();
      job.runCount++;
      job.lastRun = new Date();
      job.lastError = undefined;

      const duration = Date.now() - startTime;
      logger.info('Job completed', { jobId, name: job.name, duration });

      return {
        success: true,
        duration,
        timestamp: new Date()
      };
    } catch (error: any) {
      job.errorCount++;
      job.lastError = error.message;
      
      const duration = Date.now() - startTime;
      logger.error('Job failed', { jobId, name: job.name, error, duration });

      return {
        success: false,
        duration,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Run all due jobs immediately
   */
  async runAllJobs(): Promise<JobResult[]> {
    const results: JobResult[] = [];
    
    for (const job of this.jobs.values()) {
      if (job.enabled) {
        const result = await this.runJobNow(job.id);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Get job statistics
   */
  getStats(): JobStats[] {
    const stats: JobStats[] = [];

    for (const job of this.jobs.values()) {
      stats.push({
        jobId: job.id,
        name: job.name,
        runCount: job.runCount,
        errorCount: job.errorCount,
        avgDuration: 0, // Could be calculated if we track durations
        lastRun: job.lastRun,
        lastError: job.lastError
      });
    }

    return stats;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): ScheduledJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Schedule a job to run at its interval
   */
  private scheduleJob(job: ScheduledJob): void {
    if (!job.enabled) {
      return;
    }

    const intervalMs = job.interval * 60 * 1000;
    
    // Calculate next run time
    job.nextRun = new Date(Date.now() + intervalMs);

    // Create interval
    const timeout = setInterval(async () => {
      if (job.enabled) {
        await this.executeJob(job);
      }
    }, intervalMs);

    // Store the interval
    const existingIntervals = this.intervals.get(job.interval) || [];
    existingIntervals.push(timeout);
    this.intervals.set(job.interval, existingIntervals);

    // Run immediately on schedule
    this.executeJob(job);

    logger.debug('Job scheduled', { 
      jobId: job.id, 
      name: job.name, 
      interval: `${job.interval} min`,
      nextRun: job.nextRun
    });
  }

  /**
   * Execute a job
   */
  private async executeJob(job: ScheduledJob): Promise<void> {
    const startTime = Date.now();
    
    logger.debug('Executing job', { jobId: job.id, name: job.name });

    try {
      await job.handler();
      job.runCount++;
      job.lastRun = new Date();
      job.lastError = undefined;

      const duration = Date.now() - startTime;
      logger.debug('Job executed successfully', { 
        jobId: job.id, 
        name: job.name, 
        duration 
      });
    } catch (error: any) {
      job.errorCount++;
      job.lastError = error.message;
      
      const duration = Date.now() - startTime;
      logger.error('Job execution failed', { 
        jobId: job.id, 
        name: job.name, 
        error: error.message,
        duration 
      });
    }
  }

  /**
   * Clear all intervals for a job
   */
  private clearJobIntervals(job: ScheduledJob): void {
    // For simplicity, we don't track per-job intervals
    // In production, you'd want more granular interval management
  }

  /**
   * Get runner status
   */
  getStatus(): {
    running: boolean;
    jobCount: number;
    enabledJobCount: number;
  } {
    let enabledCount = 0;
    for (const job of this.jobs.values()) {
      if (job.enabled) enabledCount++;
    }

    return {
      running: this.isRunning,
      jobCount: this.jobs.size,
      enabledJobCount: enabledCount
    };
  }
}

// Create singleton instance
export const cronRunner = new CronJobRunner();
