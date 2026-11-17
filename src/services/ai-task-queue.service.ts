/**
 * AI Task Queue Service
 * Manages AI operations efficiently with batching, prioritization, and progress tracking
 */

import { logger } from './logger.service';
import { rateLimiter } from './rate-limiter.service';
import { aiJson, AIError } from './aiClient';
import {
  SCORE_SCHEMA, TASK_ENRICHMENT_SCHEMA, TASK_INSIGHTS_SCHEMA, TASK_EMAIL_SCHEMA, TASK_ANALYSIS_SCHEMA,
  normalizeScore, normalizeTaskEnrichment, normalizeTaskInsights, normalizeTaskEmail, normalizeTaskAnalysis,
} from './taskQueueSchemas';

export interface QueuedTask {
  id: string;
  type: 'scoring' | 'enrichment' | 'insights' | 'email' | 'analysis';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data: any;
  context: {
    contactId?: string;
    userId?: string;
    batchId?: string;
  };
  options: {
    timeout: number;
    retries: number;
    provider?: 'openai' | 'auto';
  };
  callbacks: {
    onProgress?: (progress: number) => void;
    onComplete?: (result: any) => void;
    onError?: (error: Error) => void;
  };
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string | undefined;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
}

export interface BatchConfiguration {
  maxBatchSize: number;
  maxConcurrency: number;
  batchTimeoutMs: number;
  retryDelayMs: number;
  maxRetries: number;
}

export interface QueueMetrics {
  totalTasks: number;
  queuedTasks: number;
  processingTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageProcessingTime: number;
  throughputPerMinute: number;
  successRate: number;
  currentLoad: number;
}

class AITaskQueueService {
  private queue: QueuedTask[] = [];
  private processing: Map<string, QueuedTask> = new Map();
  private completed: QueuedTask[] = [];
  private failed: QueuedTask[] = [];
  private isRunning = false;
  private config: BatchConfiguration = {
    maxBatchSize: 5,
    maxConcurrency: 3,
    batchTimeoutMs: 30000,
    retryDelayMs: 2000,
    maxRetries: 3
  };

  constructor() {
    this.startProcessor();
  }

  private startProcessor(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.processQueue();
    
    // Clean up completed tasks every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }

  private async processQueue(): Promise<void> {
    while (this.isRunning) {
      try {
        // Check if we can process more tasks
        if (this.processing.size >= this.config.maxConcurrency) {
          await this.sleep(500);
          continue;
        }

        // Get next batch of tasks
        const batch = this.getNextBatch();
        if (batch.length === 0) {
          await this.sleep(1000);
          continue;
        }

        // Process batch
        await this.processBatch(batch);
        
      } catch (error) {
        logger.error('Queue processor error', error as Error);
        await this.sleep(2000);
      }
    }
  }

  private getNextBatch(): QueuedTask[] {
    // Sort by priority and creation time
    this.queue.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    // Take tasks that can be batched together
    const batch: QueuedTask[] = [];
    const maxBatchSize = Math.min(
      this.config.maxBatchSize,
      this.config.maxConcurrency - this.processing.size
    );

    for (let i = 0; i < this.queue.length && batch.length < maxBatchSize; i++) {
      const task = this.queue[i];
      if (!task) continue;
      
      // Check if task can be added to current batch
      if (this.canBatchWith(task, batch)) {
        batch.push(task);
        this.queue.splice(i, 1);
        i--; // Adjust index after removal
      }
    }

    return batch;
  }

  private canBatchWith(task: QueuedTask, batch: QueuedTask[]): boolean {
    const firstTask = batch[0];
    if (!firstTask) return true;
    
    // Can batch tasks of the same type with similar priority
    return task.type === firstTask.type && 
           task.priority === firstTask.priority &&
           task.options.provider === firstTask.options.provider;
  }

  private async processBatch(batch: QueuedTask[]): Promise<void> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('Processing AI task batch', { 
      batchId, 
      size: batch.length, 
      type: batch[0]?.type 
    });

    // Mark tasks as processing
    batch.forEach(task => {
      task.status = 'processing';
      task.startedAt = new Date();
      task.progress = 0;
      this.processing.set(task.id, task);
      
      if (task.callbacks.onProgress) {
        task.callbacks.onProgress(0);
      }
    });

    try {
      // Check rate limits
      const canProceed = await this.checkRateLimits(batch);
      if (!canProceed) {
        // Requeue tasks
        batch.forEach(task => {
          task.status = 'queued';
          this.processing.delete(task.id);
          this.queue.unshift(task);
        });
        return;
      }

      // Process based on task type
      const results = await this.executeBatch(batch);
      
      // Handle results
      results.forEach((result, index) => {
        const task = batch[index];
        if (!task) return;
        
        if (result.success) {
          this.completeTask(task, result.data);
        } else {
          this.failTask(task, result.error);
        }
      });

    } catch (error) {
      // Fail all tasks in batch
      batch.forEach(task => {
        this.failTask(task, error instanceof Error ? error.message : 'Batch processing failed');
      });
    }
  }

  private async checkRateLimits(batch: QueuedTask[]): Promise<boolean> {
    try {
      // Check rate limits for the provider that would be used
      const provider = batch[0]?.options.provider || 'auto';
      const endpoint = this.getEndpointForTaskType(batch[0]?.type);
      
      const rateCheck = await rateLimiter.checkLimit(
        `ai_${provider}`,
        'batch',
        endpoint,
        { maxRequests: 10, windowMs: 60000 }
      );

      return rateCheck.allowed;
    } catch (error) {
      logger.warn('Rate limit check failed', error);
      return true; // Allow by default if check fails
    }
  }

  private async executeBatch(batch: QueuedTask[]): Promise<Array<{ success: boolean; data?: any; error?: string }>> {
    const taskType = batch[0]?.type;
    
    // Progress tracking
    const updateProgress = (taskIndex: number, progress: number) => {
      const task = batch[taskIndex];
      if (!task) return;
      task.progress = progress;
      if (task.callbacks.onProgress) {
        task.callbacks.onProgress(progress);
      }
    };

    try {
      switch (taskType) {
        case 'scoring':
          return await this.executeContactScoring(batch, updateProgress);
        case 'enrichment':
          return await this.executeContactEnrichment(batch, updateProgress);
        case 'insights':
          return await this.executeInsightsGeneration(batch, updateProgress);
        case 'email':
          return await this.executeEmailGeneration(batch, updateProgress);
        case 'analysis':
          return await this.executeAnalysis(batch, updateProgress);
        default:
          throw new Error(`Unknown task type: ${taskType}`);
      }
    } catch (error) {
      return batch.map(() => ({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Execution failed' 
      }));
    }
  }

  private async executeContactScoring(
    batch: QueuedTask[], 
    updateProgress: (index: number, progress: number) => void
  ): Promise<Array<{ success: boolean; data?: any; error?: string }>> {
    const results = [];
    
    for (const [i, task] of batch.entries()) {
      updateProgress(i, 25);
      
      try {
        updateProgress(i, 75);
        
        const score = await this.runScoring(task.data.contact);
        updateProgress(i, 100);
        
        results.push({ success: true, data: score });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Scoring failed' 
        });
      }
    }
    
    return results;
  }

  private async executeContactEnrichment(
    batch: QueuedTask[], 
    updateProgress: (index: number, progress: number) => void
  ): Promise<Array<{ success: boolean; data?: any; error?: string }>> {
    const results = [];
    
    for (const [i, task] of batch.entries()) {
      updateProgress(i, 30);
      
      try {
        updateProgress(i, 80);
        
        const enrichment = await this.runEnrichment(task.data.contact);
        updateProgress(i, 100);
        
        results.push({ success: true, data: enrichment });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Enrichment failed' 
        });
      }
    }
    
    return results;
  }

  private async executeInsightsGeneration(
    batch: QueuedTask[], 
    updateProgress: (index: number, progress: number) => void
  ): Promise<Array<{ success: boolean; data?: any; error?: string }>> {
    const results = [];
    
    for (const [i, task] of batch.entries()) {
      updateProgress(i, 20);
      
      try {
        updateProgress(i, 90);
        
        const insights = await this.runInsights(task.data.contact);
        updateProgress(i, 100);
        
        results.push({ success: true, data: insights });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Insights generation failed' 
        });
      }
    }
    
    return results;
  }

  private async executeEmailGeneration(
    batch: QueuedTask[], 
    updateProgress: (index: number, progress: number) => void
  ): Promise<Array<{ success: boolean; data?: any; error?: string }>> {
    const results = [];
    
    for (const [i, task] of batch.entries()) {
      updateProgress(i, 15);
      
      try {
        updateProgress(i, 85);
        
        const email = await this.runEmail(task.data.contact, task.data.purpose);
        updateProgress(i, 100);
        
        results.push({ success: true, data: email });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Email generation failed' 
        });
      }
    }
    
    return results;
  }

  private async executeAnalysis(
    batch: QueuedTask[], 
    updateProgress: (index: number, progress: number) => void
  ): Promise<Array<{ success: boolean; data?: any; error?: string }>> {
    const results = [];
    
    for (const [i, task] of batch.entries()) {
      updateProgress(i, 35);
      
      try {
        updateProgress(i, 95);
        
        const analysis = await this.runAnalysis(task.data);
        updateProgress(i, 100);
        
        results.push({ success: true, data: analysis });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Analysis failed' 
        });
      }
    }
    
    return results;
  }

  private completeTask(task: QueuedTask, result: any): void {
    task.status = 'completed';
    task.completedAt = new Date();
    task.progress = 100;
    task.result = result;
    
    this.processing.delete(task.id);
    this.completed.push(task);
    
    if (task.callbacks.onComplete) {
      task.callbacks.onComplete(result);
    }
    
    logger.debug('Task completed successfully', { 
      taskId: task.id, 
      type: task.type,
      processingTime: task.completedAt.getTime() - (task.startedAt?.getTime() || 0)
    });
  }

  private failTask(task: QueuedTask, error: string | undefined): void {
    task.attempts++;
    
    // Retry if attempts haven't exceeded max
    if (task.attempts < this.config.maxRetries) {
      task.status = 'queued';
      this.processing.delete(task.id);
      
      // Add delay before retry
      setTimeout(() => {
        this.queue.push(task);
      }, this.config.retryDelayMs * task.attempts);
      
      logger.info('Retrying failed task', { 
        taskId: task.id, 
        attempt: task.attempts, 
        error 
      });
      return;
    }
    
    // Max retries exceeded
    task.status = 'failed';
    task.completedAt = new Date();
    task.error = error;
    
    this.processing.delete(task.id);
    this.failed.push(task);
    
    if (task.callbacks.onError) {
      task.callbacks.onError(new Error(error));
    }
    
    logger.error('Task failed after max retries', new Error(error), { 
      taskId: task.id, 
      type: task.type,
      attempts: task.attempts
    });
  }

  private cleanup(): void {
    const oneHourAgo = new Date(Date.now() - 3600000);
    
    // Remove old completed tasks
    this.completed = this.completed.filter(task => 
      task.completedAt && task.completedAt > oneHourAgo
    );
    
    // Remove old failed tasks
    this.failed = this.failed.filter(task => 
      task.completedAt && task.completedAt > oneHourAgo
    );
    
    logger.debug('Task queue cleanup completed', {
      completedTasks: this.completed.length,
      failedTasks: this.failed.length
    });
  }

  private getEndpointForTaskType(taskType: string | undefined): string {
    const endpoints: Record<string, string> = {
      'scoring': '/smart-score',
      'enrichment': '/smart-enrichment',
      'insights': '/ai-insights',
      'email': '/email-composer',
      'analysis': '/email-analyzer'
    };
    
    return (taskType !== undefined ? endpoints[taskType] : undefined) || '/ai-generic';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timer = globalThis.setTimeout ? globalThis.setTimeout : setTimeout;
      timer(resolve, ms);
    });
  }

  // INTENTIONALLY NON-STREAMING: queued background workers (retry/priority queue, no UI is attached to a single
  // run), so these keep the plain aiJson request. User-visible AI goes through the streaming-capable services.
  // Real AI calls (Responses API via the server proxy). Failures reject and flow into the task's retry/error handling.
  private static readonly GROUND =
    'Use ONLY the supplied data. Never invent values; use null / empty lists when the data does not support a field. ' +
    'Confidence values are 0-100 integers justified by the supplied evidence, or null.';

  private contactJson(contact: any): string {
    return JSON.stringify({ today: new Date().toISOString().slice(0, 10), contact });
  }

  private async runScoring(contact: any): Promise<any> {
    const raw = await aiJson<unknown>({
      role: 'default', effort: 'low',
      instructions: `Score ONE sales lead. ${AITaskQueueService.GROUND}`,
      input: this.contactJson(contact), schema: SCORE_SCHEMA, schemaName: 'lead_score', maxOutputTokens: 1500,
    });
    return normalizeScore(raw);
  }

  private async runEnrichment(contact: any): Promise<any> {
    const raw = await aiJson<unknown>({
      role: 'thinking', effort: 'low',
      instructions: `Enrich ONE contact using web_search. ${AITaskQueueService.GROUND} Profile URLs must come from search results.`,
      input: this.contactJson(contact), schema: TASK_ENRICHMENT_SCHEMA, schemaName: 'task_enrichment',
      tools: [{ type: 'web_search' }], maxOutputTokens: 2500,
    });
    return normalizeTaskEnrichment(raw);
  }

  private async runInsights(contact: any): Promise<any> {
    const raw = await aiJson<unknown>({
      role: 'default', effort: 'low',
      instructions: `Give insights about ONE contact. ${AITaskQueueService.GROUND} Return an empty list if nothing is supported.`,
      input: this.contactJson(contact), schema: TASK_INSIGHTS_SCHEMA, schemaName: 'task_insights', maxOutputTokens: 2000,
    });
    return normalizeTaskInsights(raw);
  }

  private async runEmail(contact: any, purpose: string): Promise<any> {
    const raw = await aiJson<unknown>({
      role: 'default', effort: 'low',
      instructions: 'Write a concise, personalised outreach email. Use only facts from the supplied contact; do not invent news, mutual connections or statistics.',
      input: JSON.stringify({ purpose, contact }), schema: TASK_EMAIL_SCHEMA, schemaName: 'task_email', maxOutputTokens: 1500,
    });
    const email = normalizeTaskEmail(raw);
    if (!email) throw new AIError('The model returned an empty email', 502);
    return email;
  }

  private async runAnalysis(data: any): Promise<any> {
    const raw = await aiJson<unknown>({
      role: 'default', effort: 'low',
      instructions: `Analyse the supplied content. ${AITaskQueueService.GROUND}`,
      input: JSON.stringify(data ?? {}), schema: TASK_ANALYSIS_SCHEMA, schemaName: 'task_analysis', maxOutputTokens: 1500,
    });
    return normalizeTaskAnalysis(raw);
  }

  // Public API
  addTask(
    type: QueuedTask['type'],
    priority: QueuedTask['priority'],
    data: any,
    context: QueuedTask['context'] = {},
    options: Partial<QueuedTask['options']> = {},
    callbacks: QueuedTask['callbacks'] = {}
  ): string {
    const task: QueuedTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority,
      data,
      context,
      options: {
        timeout: 30000,
        retries: this.config.maxRetries,
        ...options
      },
      callbacks,
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
      attempts: 0
    };

    this.queue.push(task);
    
    logger.info('Task added to AI queue', { 
      taskId: task.id, 
      type: task.type, 
      priority: task.priority 
    });
    
    return task.id;
  }

  getTaskStatus(taskId: string): QueuedTask | null {
    return this.processing.get(taskId) || 
           this.completed.find(t => t.id === taskId) || 
           this.failed.find(t => t.id === taskId) || 
           this.queue.find(t => t.id === taskId) || 
           null;
  }

  cancelTask(taskId: string): boolean {
    const queueIndex = this.queue.findIndex(t => t.id === taskId);
    if (queueIndex >= 0) {
      this.queue.splice(queueIndex, 1);
      logger.info('Task cancelled from queue', { taskId });
      return true;
    }
    
    return false;
  }

  getMetrics(): QueueMetrics {
    const total = this.queue.length + this.processing.size + this.completed.length + this.failed.length;
    const recentCompleted = this.completed.filter(t => 
      t.completedAt && t.completedAt > new Date(Date.now() - 3600000)
    );
    
    const avgProcessingTime = recentCompleted.length > 0 ? 
      recentCompleted.reduce((sum, t) => 
        sum + ((t.completedAt?.getTime() || 0) - (t.startedAt?.getTime() || 0)), 0
      ) / recentCompleted.length : 0;

    return {
      totalTasks: total,
      queuedTasks: this.queue.length,
      processingTasks: this.processing.size,
      completedTasks: this.completed.length,
      failedTasks: this.failed.length,
      averageProcessingTime: avgProcessingTime,
      throughputPerMinute: recentCompleted.length,
      successRate: total > 0 ? this.completed.length / total : 0,
      currentLoad: this.processing.size / this.config.maxConcurrency
    };
  }

  updateConfiguration(newConfig: Partial<BatchConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('AI task queue configuration updated', newConfig);
  }

  getConfiguration(): BatchConfiguration {
    return { ...this.config };
  }
}

export const aiTaskQueue = new AITaskQueueService();