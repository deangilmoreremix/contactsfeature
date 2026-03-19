/**
 * Event Bus Implementation
 * 
 * A robust event bus with idempotency enforcement, database persistence,
 * and comprehensive error handling for the event-driven architecture.
 */

import { supabase } from "../core/supabaseClient";
import { logger } from "../core/logger";
import { v4 as uuidv4 } from 'uuid';
import { 
  EventType, 
  ProcessedEvent,
  EventPriority,
  getEventPriority 
} from './types';

// Export types
export type { EventType, ProcessedEvent };
export { EventPriority };

/**
 * Event Handler type - async function that processes events
 */
export interface EventHandler {
  (event: ProcessedEvent): Promise<void>;
}

/**
 * Event Handler with priority support
 */
export interface PrioritizedEventHandler extends EventHandler {
  priority: EventPriority;
  name?: string;
}

/**
 * Configuration options for the EventBus
 */
export interface EventBusConfig {
  maxRetries: number;
  retryDelayMs: number;
  enablePersistence: boolean;
  enableIdempotencyDbCheck: boolean;
  processingTimeoutMs: number;
}

const DEFAULT_CONFIG: EventBusConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  enablePersistence: true,
  enableIdempotencyDbCheck: true,
  processingTimeoutMs: 30000
};

/**
 * Main EventBus class
 */
class EventBus {
  private handlers = new Map<EventType, PrioritizedEventHandler[]>();
  private processing = new Set<string>();
  private config: EventBusConfig;
  private eventListeners = new Map<string, Set<(event: ProcessedEvent) => void>>();

  constructor(config: Partial<EventBusConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Emit a new event with idempotency support
   */
  async emit(
    type: EventType, 
    payload: any, 
    idempotencyKey?: string,
    options?: {
      source?: string;
      correlationId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<ProcessedEvent> {
    const key = idempotencyKey || uuidv4();
    
    // Check idempotency - database level
    if (this.config.enableIdempotencyDbCheck) {
      const existingEvent = await this.checkIdempotencyKey(key);
      if (existingEvent) {
        logger.info('Event already exists with idempotency key, returning existing event', { 
          idempotencyKey: key,
          existingEventId: existingEvent.id 
        });
        return existingEvent;
      }
    }

    // Check idempotency - in-memory level
    if (this.processing.has(key)) {
      logger.info('Event already processing in memory, skipping', { idempotencyKey: key });
      throw new Error(`Event with idempotency key ${key} is already being processed`);
    }

    const event: ProcessedEvent = {
      id: uuidv4(),
      type,
      idempotencyKey: key,
      timestamp: new Date(),
      source: options?.source || 'unknown',
      correlationId: options?.correlationId,
      metadata: options?.metadata,
      payload,
      processed: false,
      retryCount: 0
    };

    // Persist event to database
    if (this.config.enablePersistence) {
      try {
        await this.persistEvent(event);
      } catch (error) {
        logger.error('Failed to persist event', { error, event });
        // Continue processing even if persistence fails
      }
    }

    // Process event
    await this.processEvent(event);

    // Emit internal event for listeners
    this.emitInternalEvent('event.emitted', event);

    return event;
  }

  /**
   * Check if an event with the given idempotency key already exists
   */
  private async checkIdempotencyKey(idempotencyKey: string): Promise<ProcessedEvent | null> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .limit(1)
        .single();

      if (error) {
        // Not found or other error - continue to create new event
        return null;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        type: data.type as EventType,
        idempotencyKey: data.idempotency_key,
        timestamp: new Date(data.timestamp),
        source: data.source || 'unknown',
        correlationId: data.correlation_id,
        metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
        payload: typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload,
        processed: data.processed,
        processedAt: data.processed_at ? new Date(data.processed_at) : undefined,
        error: data.error,
        retryCount: data.retry_count || 0
      };
    } catch (error) {
      logger.error('Failed to check idempotency key', { error, idempotencyKey });
      return null;
    }
  }

  /**
   * Persist event to database
   */
  private async persistEvent(event: ProcessedEvent): Promise<void> {
    const { error } = await supabase
      .from('events')
      .insert({
        id: event.id,
        type: event.type,
        payload: JSON.stringify(event.payload),
        idempotency_key: event.idempotencyKey,
        timestamp: event.timestamp.toISOString(),
        source: event.source,
        correlation_id: event.correlationId,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        processed: event.processed,
        priority: getEventPriority(event.type),
        retry_count: event.retryCount || 0
      });

    if (error) {
      logger.error('Failed to insert event into database', { error, event });
      throw error;
    }
  }

  /**
   * Subscribe to an event type
   */
  subscribe(type: EventType, handler: EventHandler, options?: { priority?: EventPriority; name?: string }): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    
    const prioritizedHandler = Object.assign(handler, {
      priority: options?.priority ?? EventPriority.NORMAL,
      name: options?.name || handler.name || 'anonymous'
    });
    
    const handlers = this.handlers.get(type)!;
    handlers.push(prioritizedHandler);
    
    // Sort handlers by priority (highest first)
    handlers.sort((a, b) => b.priority - a.priority);
    
    logger.debug('Handler subscribed', { type, name: prioritizedHandler.name, priority: prioritizedHandler.priority });
  }

  /**
   * Unsubscribe a handler from an event type
   */
  unsubscribe(type: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler as PrioritizedEventHandler);
      if (index !== -1) {
        handlers.splice(index, 1);
        logger.debug('Handler unsubscribed', { type });
      }
    }
  }

  /**
   * Add an event listener for lifecycle events
   */
  on(eventName: string, callback: (event: ProcessedEvent) => void): void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName)!.add(callback);
  }

  /**
   * Remove an event listener
   */
  off(eventName: string, callback: (event: ProcessedEvent) => void): void {
    this.eventListeners.get(eventName)?.delete(callback);
  }

  /**
   * Emit internal lifecycle event
   */
  private emitInternalEvent(eventName: string, event: ProcessedEvent): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          logger.error('Event listener error', { error, eventName, event });
        }
      }
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: ProcessedEvent): Promise<void> {
    if (this.processing.has(event.idempotencyKey)) {
      logger.warn('Event already being processed', { 
        idempotencyKey: event.idempotencyKey,
        eventId: event.id 
      });
      return;
    }

    this.processing.add(event.idempotencyKey);
    
    this.emitInternalEvent('event.processing', event);

    try {
      const handlers = this.handlers.get(event.type) || [];
      
      if (handlers.length === 0) {
        logger.debug('No handlers registered for event type', { type: event.type });
      }

      let handlerErrors: Error[] = [];
      
      for (const handler of handlers) {
        try {
          logger.debug('Executing handler', { 
            type: event.type, 
            handlerName: handler.name,
            eventId: event.id
          });
          
          // Execute with timeout
          await this.executeWithTimeout(handler, event, this.config.processingTimeoutMs);
          
        } catch (error: any) {
          logger.error('Handler failed for event', { 
            error, 
            event,
            handlerName: handler.name 
          });
          handlerErrors.push(error);
        }
      }

      if (handlerErrors.length > 0) {
        // Mark event as failed
        await this.markEventFailed(event.id, handlerErrors.map(e => e.message).join('; '));
        this.emitInternalEvent('event.failed', event);
        throw handlerErrors[0]; // Throw first error
      }

      // Mark as processed successfully
      await this.markEventProcessed(event.id);
      this.emitInternalEvent('event.completed', event);
      
    } catch (error) {
      logger.error('Event processing failed', { error, event });
      
      // Handle retry logic
      if ((event.retryCount || 0) < this.config.maxRetries) {
        await this.retryEvent(event);
      } else {
        await this.markEventFailed(event.id, `Max retries exceeded: ${error}`);
        this.emitInternalEvent('event.maxRetriesExceeded', event);
      }
      
      throw error;
    } finally {
      this.processing.delete(event.idempotencyKey);
    }
  }

  /**
   * Execute handler with timeout
   */
  private async executeWithTimeout(
    handler: PrioritizedEventHandler, 
    event: ProcessedEvent, 
    timeoutMs: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Handler ${handler.name} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      handler(event)
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Retry a failed event
   */
  private async retryEvent(event: ProcessedEvent): Promise<void> {
    const retryCount = (event.retryCount || 0) + 1;
    const delay = this.config.retryDelayMs * retryCount; // Exponential backoff
    
    logger.info('Scheduling event retry', { 
      eventId: event.id, 
      retryCount,
      delay 
    });

    // Update retry count in database
    await supabase
      .from('events')
      .update({ retry_count: retryCount })
      .eq('id', event.id);

    // Wait and retry
    setTimeout(async () => {
      try {
        await this.processEvent({ ...event, retryCount });
      } catch (error) {
        logger.error('Retry failed', { error, event });
      }
    }, delay);
  }

  /**
   * Mark event as processed
   */
  private async markEventProcessed(eventId: string): Promise<void> {
    try {
      await supabase
        .from('events')
        .update({ 
          processed: true, 
          processed_at: new Date().toISOString(),
          error: null
        })
        .eq('id', eventId);
    } catch (error) {
      logger.error('Failed to mark event as processed', { error, eventId });
    }
  }

  /**
   * Mark event as failed
   */
  private async markEventFailed(eventId: string, error: string): Promise<void> {
    try {
      await supabase
        .from('events')
        .update({ 
          error,
          processed: true, 
          processed_at: new Date().toISOString()
        })
        .eq('id', eventId);
    } catch (error) {
      logger.error('Failed to mark event as failed', { error, eventId });
    }
  }

  /**
   * Replay unprocessed events
   */
  async replayEvents(options?: { 
    types?: EventType[]; 
    since?: Date;
    limit?: number;
  }): Promise<{ processed: number; failed: number }> {
    let query = supabase
      .from('events')
      .select('*')
      .eq('processed', false)
      .eq('error', null) // Don't replay events that have permanent errors
      .order('timestamp', { ascending: true });

    if (options?.types?.length) {
      query = query.in('type', options.types);
    }

    if (options?.since) {
      query = query.gte('timestamp', options.since.toISOString());
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data: events, error } = await query;

    if (error) {
      logger.error('Failed to fetch unprocessed events', { error });
      return { processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;

    for (const eventData of events || []) {
      try {
        const event: ProcessedEvent = {
          id: eventData.id,
          type: eventData.type as EventType,
          idempotencyKey: eventData.idempotency_key,
          timestamp: new Date(eventData.timestamp),
          source: eventData.source || 'unknown',
          correlationId: eventData.correlation_id,
          metadata: eventData.metadata ? JSON.parse(eventData.metadata) : undefined,
          payload: typeof eventData.payload === 'string' 
            ? JSON.parse(eventData.payload) 
            : eventData.payload,
          processed: false,
          retryCount: eventData.retry_count || 0
        };

        await this.processEvent(event);
        processed++;
      } catch (error) {
        logger.error('Failed to replay event', { error, eventId: eventData.id });
        failed++;
      }
    }

    logger.info('Event replay completed', { processed, failed });
    return { processed, failed };
  }

  /**
   * Get event statistics
   */
  async getEventStats(options?: { since?: Date }): Promise<{
    total: number;
    processed: number;
    pending: number;
    failed: number;
    byType: Record<string, number>;
  }> {
    let query = supabase.from('events').select('type, processed, error');

    if (options?.since) {
      query = query.gte('timestamp', options.since.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get event stats', { error });
      return {
        total: 0,
        processed: 0,
        pending: 0,
        failed: 0,
        byType: {}
      };
    }

    const stats = {
      total: data?.length || 0,
      processed: 0,
      pending: 0,
      failed: 0,
      byType: {} as Record<string, number>
    };

    for (const event of data || []) {
      if (event.processed) {
        stats.processed++;
      } else if (event.error) {
        stats.failed++;
      } else {
        stats.pending++;
      }

      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clean up old processed events
   */
  async cleanupEvents(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { data, error } = await supabase
      .from('events')
      .delete()
      .eq('processed', true)
      .lt('timestamp', cutoffDate.toISOString())
      .select('id');

    if (error) {
      logger.error('Failed to cleanup events', { error });
      return 0;
    }

    const deletedCount = data?.length || 0;
    logger.info('Events cleaned up', { deletedCount, olderThanDays });
    return deletedCount;
  }

  /**
   * Get registered handlers for an event type
   */
  getHandlers(type: EventType): PrioritizedEventHandler[] {
    return this.handlers.get(type) || [];
  }

  /**
   * Check if event type has handlers
   */
  hasHandlers(type: EventType): boolean {
    const handlers = this.handlers.get(type);
    return handlers !== undefined && handlers.length > 0;
  }
}

// Create singleton instance
export const eventBus = new EventBus();
