/**
 * Data Synchronization Service
 *
 * Handles offline-to-online data synchronization, conflict resolution,
 * and ensures data consistency across different storage backends.
 */

import { supabase } from './supabaseClient';
import { contactAPI } from './contact-api.service';
import { cacheService } from './cache.service';
import { logger } from './logger.service';
import { Contact } from '../types';

interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: 'contact' | 'file' | 'automation';
  entityId: string;
  data?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
  errors: string[];
}

class DataSyncService {
  private readonly SYNC_QUEUE_KEY = 'sync_queue';
  private readonly LAST_SYNC_KEY = 'last_sync_timestamp';
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.setupOnlineOfflineListeners();
    this.startPeriodicSync();
  }

  /**
   * Setup online/offline event listeners
   */
  private setupOnlineOfflineListeners(): void {
    window.addEventListener('online', () => {
      logger.info('Network connection restored');
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      logger.warn('Network connection lost');
      this.isOnline = false;
    });
  }

  /**
   * Start periodic synchronization
   */
  private startPeriodicSync(): void {
    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.processSyncQueue();
      }
    }, this.SYNC_INTERVAL);
  }

  /**
   * Stop periodic synchronization
   */
  stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Queue an operation for synchronization
   */
  async queueOperation(
    type: SyncOperation['type'],
    entityType: SyncOperation['entityType'],
    entityId: string,
    data?: any
  ): Promise<void> {
    const operation: SyncOperation = {
      id: `${type}_${entityType}_${entityId}_${Date.now()}`,
      type,
      entityType,
      entityId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.MAX_RETRY_ATTEMPTS
    };

    const queue = this.getSyncQueue();
    queue.push(operation);
    this.saveSyncQueue(queue);

    logger.info('Operation queued for sync', { operationId: operation.id, type, entityType, entityId });

    // Try to sync immediately if online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  /**
   * Process the synchronization queue
   */
  async processSyncQueue(): Promise<SyncResult> {
    if (this.syncInProgress || !this.isOnline) {
      return { success: false, synced: 0, failed: 0, conflicts: 0, errors: ['Sync not available'] };
    }

    this.syncInProgress = true;
    const queue = this.getSyncQueue();
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: 0,
      errors: []
    };

    try {
      logger.info('Starting sync queue processing', { queueSize: queue.length });

      for (let i = 0; i < queue.length; i++) {
        const operation = queue[i];
        if (!operation) continue;

        try {
          await this.processOperation(operation);
          result.synced++;
          queue.splice(i, 1); // Remove successful operation
          i--; // Adjust index after removal
        } catch (error) {
          operation.retryCount++;

          if (operation.retryCount >= operation.maxRetries) {
            logger.error('Operation failed permanently', {
              operationId: operation.id,
              error: error instanceof Error ? error.message : String(error)
            } as any);
            result.failed++;
            result.errors.push(`${operation.id}: ${error instanceof Error ? error.message : String(error)}`);
            queue.splice(i, 1); // Remove failed operation
            i--; // Adjust index after removal
          } else {
            logger.warn('Operation failed, will retry', {
              operationId: operation.id,
              retryCount: operation.retryCount,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }

      this.saveSyncQueue(queue);
      this.updateLastSyncTimestamp();

      logger.info('Sync queue processing completed', result);

    } catch (error) {
      logger.error('Sync queue processing failed', error instanceof Error ? error : new Error(String(error)));
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Process a single sync operation
   */
  private async processOperation(operation: SyncOperation): Promise<void> {
    switch (operation.entityType) {
      case 'contact':
        await this.processContactOperation(operation);
        break;
      case 'file':
        await this.processFileOperation(operation);
        break;
      case 'automation':
        await this.processAutomationOperation(operation);
        break;
      default:
        throw new Error(`Unknown entity type: ${operation.entityType}`);
    }
  }

  /**
   * Process contact operations
   */
  private async processContactOperation(operation: SyncOperation): Promise<void> {
    switch (operation.type) {
      case 'create':
        await contactAPI.createContact(operation.data);
        break;
      case 'update':
        await contactAPI.updateContact(operation.entityId, operation.data);
        break;
      case 'delete':
        await contactAPI.deleteContact(operation.entityId);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Process file operations
   */
  private async processFileOperation(operation: SyncOperation): Promise<void> {
    // File operations would be handled by fileStorageService
    // For now, just log the operation
    logger.info('File operation processed', operation);
  }

  /**
   * Process automation operations
   */
  private async processAutomationOperation(operation: SyncOperation): Promise<void> {
    // Automation operations would be handled by automationService
    // For now, just log the operation
    logger.info('Automation operation processed', operation);
  }

  /**
   * Get the current sync queue
   */
  private getSyncQueue(): SyncOperation[] {
    try {
      const stored = localStorage.getItem(this.SYNC_QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logger.error('Failed to get sync queue', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Save the sync queue
   */
  private saveSyncQueue(queue: SyncOperation[]): void {
    try {
      localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      logger.error('Failed to save sync queue', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Update the last sync timestamp
   */
  private updateLastSyncTimestamp(): void {
    try {
      localStorage.setItem(this.LAST_SYNC_KEY, Date.now().toString());
    } catch (error) {
      logger.error('Failed to update last sync timestamp', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get the last sync timestamp
   */
  getLastSyncTimestamp(): number | null {
    try {
      const stored = localStorage.getItem(this.LAST_SYNC_KEY);
      return stored ? parseInt(stored, 10) : null;
    } catch (error) {
      logger.error('Failed to get last sync timestamp', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Force a sync operation
   */
  async forceSync(): Promise<SyncResult> {
    return this.processSyncQueue();
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    isOnline: boolean;
    syncInProgress: boolean;
    queueSize: number;
    lastSyncTimestamp: number | null;
  } {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      queueSize: this.getSyncQueue().length,
      lastSyncTimestamp: this.getLastSyncTimestamp()
    };
  }

  /**
   * Clear the sync queue (use with caution)
   */
  clearSyncQueue(): void {
    this.saveSyncQueue([]);
    logger.info('Sync queue cleared');
  }

  /**
   * Handle conflict resolution
   */
  async resolveConflict(
    operation: SyncOperation,
    serverData: any,
    localData: any,
    strategy: 'server-wins' | 'local-wins' | 'merge' | 'manual'
  ): Promise<any> {
    switch (strategy) {
      case 'server-wins':
        return serverData;
      case 'local-wins':
        return localData;
      case 'merge':
        return this.mergeData(serverData, localData);
      case 'manual':
        // In a real implementation, this would prompt the user
        throw new Error('Manual conflict resolution not implemented');
      default:
        throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
    }
  }

  /**
   * Merge conflicting data
   */
  private mergeData(serverData: any, localData: any): any {
    // Simple merge strategy - local changes take precedence for non-conflicting fields
    const merged = { ...serverData };

    for (const [key, value] of Object.entries(localData)) {
      if (value !== undefined && value !== null) {
        merged[key] = value;
      }
    }

    // Add conflict resolution metadata
    merged._conflictResolved = true;
    merged._resolvedAt = new Date().toISOString();

    return merged;
  }

  /**
   * Cleanup old sync operations
   */
  cleanupOldOperations(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    const queue = this.getSyncQueue();
    const cutoffTime = Date.now() - maxAge;

    const filteredQueue = queue.filter(operation => operation.timestamp > cutoffTime);

    if (filteredQueue.length !== queue.length) {
      this.saveSyncQueue(filteredQueue);
      logger.info('Cleaned up old sync operations', {
        removed: queue.length - filteredQueue.length,
        remaining: filteredQueue.length
      });
    }
  }
}

export const dataSyncService = new DataSyncService();