/**
 * AI Task Queue Service
 * Manages AI operations efficiently with batching, prioritization, and progress tracking
 */

import { logger } from './logger.service';
import { rateLimiter } from './rate-limiter.service';

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
    provider?: 'openai' | 'gemini' | 'auto';
  };
  callbacks: {
    onProgress?: (progress: number) => void;
    onComplete?: (result: any) => void;
    onError?: (error: Error) => void;
  };
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
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
    if (batch.length === 0) return true;
    
    // Can batch tasks of the same type with similar priority
    const firstTask = batch[0];
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
    const taskType = batch[0].type;
    
    // Progress tracking
    const updateProgress = (taskIndex: number, progress: number) => {
      const task = batch[taskIndex];
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
    
    for (let i = 0; i < batch.length; i++) {
      const task = batch[i];
      updateProgress(i, 25);
      
      try {
        // Simulate AI scoring API call
        await this.sleep(1000 + Math.random() * 1000);
        updateProgress(i, 75);
        
        const score = this.generateMockScore(task.data.contact);
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
    
    for (let i = 0; i < batch.length; i++) {
      const task = batch[i];
      updateProgress(i, 30);
      
      try {
        // Simulate AI enrichment API call
        await this.sleep(1500 + Math.random() * 1000);
        updateProgress(i, 80);
        
        const enrichment = this.generateMockEnrichment(task.data.contact);
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
    
    for (let i = 0; i < batch.length; i++) {
      const task = batch[i];
      updateProgress(i, 20);
      
      try {
        // Simulate AI insights generation
        await this.sleep(2000 + Math.random() * 1500);
        updateProgress(i, 90);
        
        const insights = this.generateMockInsights(task.data.contact);
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
    
    for (let i = 0; i < batch.length; i++) {
      const task = batch[i];
      updateProgress(i, 15);
      
      try {
        // Simulate email generation
        await this.sleep(1800 + Math.random() * 1200);
        updateProgress(i, 85);
        
        const email = this.generateMockEmail(task.data.contact, task.data.purpose);
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
    
    for (let i = 0; i < batch.length; i++) {
      const task = batch[i];
      updateProgress(i, 35);
      
      try {
        // Simulate analysis
        await this.sleep(1200 + Math.random() * 800);
        updateProgress(i, 95);
        
        const analysis = this.generateMockAnalysis(task.data);
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

  private failTask(task: QueuedTask, error: string): void {
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

  private getEndpointForTaskType(taskType: string): string {
    const endpoints: Record<string, string> = {
      'scoring': '/smart-score',
      'enrichment': '/smart-enrichment',
      'insights': '/ai-insights',
      'email': '/email-composer',
      'analysis': '/email-analyzer'
    };
    
    return endpoints[taskType] || '/ai-generic';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timer = globalThis.setTimeout ? globalThis.setTimeout : setTimeout;
      timer(resolve, ms);
    });
  }

  // Mock data generators for development
  private generateMockScore(contact: any): any {
    return {
      overall: Math.floor(Math.random() * 40) + 60,
      breakdown: {
        fitScore: Math.floor(Math.random() * 30) + 70,
        engagementScore: Math.floor(Math.random() * 40) + 60,
        conversionProbability: Math.floor(Math.random() * 50) + 50,
        urgencyScore: Math.floor(Math.random() * 30) + 40
      },
      reasoning: [`Strong profile at ${contact.company}`, 'Good engagement indicators'],
      recommendations: ['Schedule follow-up call', 'Share case studies'],
      nextBestActions: ['Email outreach', 'LinkedIn connection']
    };
  }

  private generateMockEnrichment(contact: any): any {
    return {
      socialProfiles: {
        linkedin: `https://linkedin.com/in/${contact.firstName?.toLowerCase()}${contact.lastName?.toLowerCase()}`,
        twitter: `https://twitter.com/${contact.firstName?.toLowerCase()}`
      },
      additionalInfo: {
        jobLevel: 'Senior',
        departmentSize: '50-100',
        decisionMakingPower: 'High'
      },
      confidence: 85
    };
  }

  private generateMockInsights(contact: any): any {
    return [
      {
        type: 'opportunity',
        title: 'High Conversion Potential',
        description: `${contact.name} shows strong indicators for conversion`,
        confidence: 85,
        impact: 'high'
      },
      {
        type: 'recommendation',
        title: 'Optimal Outreach Timing',
        description: 'Best contacted on Tuesday-Thursday, 2-4 PM',
        confidence: 75,
        impact: 'medium'
      }
    ];
  }

  private generateMockEmail(contact: any, purpose: string): any {
    return {
      subject: `${purpose} - ${contact.company}`,
      body: `Hi ${contact.firstName},\n\nI hope this email finds you well...`,
      personalization: {
        elements: ['company_name', 'industry', 'recent_news'],
        confidence: 80
      }
    };
  }

  private generateMockAnalysis(data: any): any {
    return {
      score: Math.floor(Math.random() * 30) + 70,
      insights: ['Good structure', 'Clear call to action'],
      suggestions: ['Consider shorter subject line', 'Add more personalization']
    };
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