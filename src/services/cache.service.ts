/**
 * Cache Service
 * In-memory caching with TTL support for API responses
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
  tags: string[];
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry>();
  private defaultTTL = 300000; // 5 minutes
  private maxSize = 1000;
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, hitRate: 0 };
  
  constructor(maxSize = 1000, defaultTTL = 300000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;

    // Cleanup expired entries every 5 minutes
    const cleanupInterval = setInterval(() => this.cleanup(), 300000);

    // Store interval reference for cleanup
    (this as any).cleanupInterval = cleanupInterval;
  }

  /**
   * Cleanup method to clear intervals and prevent memory leaks
   */
  destroy(): void {
    if ((this as any).cleanupInterval) {
      clearInterval((this as any).cleanupInterval);
      (this as any).cleanupInterval = null;
    }
    this.clear();
  }
  
  private generateKey(namespace: string, identifier: string | object): string {
    const keyBase = typeof identifier === 'string' ? identifier : JSON.stringify(identifier);
    return `${namespace}:${keyBase}`;
  }
  
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }
  
  private evictOldest(): void {
    if (this.cache.size === 0) return;
    
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
  
  private updateStats(): void {
    this.stats.size = this.cache.size;
    this.stats.hitRate = this.stats.hits + this.stats.misses > 0 
      ? this.stats.hits / (this.stats.hits + this.stats.misses) 
      : 0;
  }
  
  set<T>(
    namespace: string,
    identifier: string | object,
    data: T,
    ttl?: number,
    tags: string[] = []
  ): void {
    const key = this.generateKey(namespace, identifier);

    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      key,
      tags,
    };

    this.cache.set(key, entry);
    this.updateStats();
  }
  
  get<T>(namespace: string, identifier: string | object): T | null {
    const key = this.generateKey(namespace, identifier);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateStats();
      return null;
    }
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateStats();
      return null;
    }
    
    this.stats.hits++;
    this.updateStats();
    return entry.data as T;
  }
  
  has(namespace: string, identifier: string | object): boolean {
    const key = this.generateKey(namespace, identifier);
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  delete(namespace: string, identifier: string | object): boolean {
    const key = this.generateKey(namespace, identifier);
    const result = this.cache.delete(key);
    this.updateStats();
    return result;
  }
  
  deleteByTag(tag: string): number {
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags?.includes(tag)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    this.updateStats();
    return deletedCount;
  }
  
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, size: 0, hitRate: 0 };
  }
  
  cleanup(): void {
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
    this.updateStats();
    
    if (expiredKeys.length > 0) {
      console.log(`Cache cleanup: removed ${expiredKeys.length} expired entries`);
    }
  }
  
  getStats(): CacheStats {
    return { ...this.stats };
  }
  
  // Namespace-specific methods for contacts
  setContact(contactId: string, contact: any, ttl?: number): void {
    this.set('contact', contactId, contact, ttl, ['contact']);
  }
  
  getContact(contactId: string): any | null {
    return this.get('contact', contactId);
  }
  
  setContactList(filters: object, contacts: any[], ttl?: number): void {
    this.set('contact_list', filters, contacts, ttl, ['contact', 'list']);
  }
  
  getContactList(filters: object): any[] | null {
    return this.get('contact_list', filters);
  }
  
  setAIAnalysis(contactId: string, analysis: any, ttl?: number): void {
    this.set('ai_analysis', contactId, analysis, ttl, ['ai', 'analysis']);
  }
  
  getAIAnalysis(contactId: string): any | null {
    return this.get('ai_analysis', contactId);
  }
  
  invalidateContact(contactId: string): void {
    // Only delete the specific contact, not all contact-related cache
    this.delete('contact', contactId);
    // Clear AI analysis for this contact
    this.delete('ai_analysis', contactId);
  }

  /**
   * Invalidate all contact-related cache entries
   */
  invalidateAllContacts(): void {
    this.deleteByTag('contact');
    this.deleteByTag('list');
    this.deleteByTag('ai');
  }

  // File-related cache methods
  setFileMetadata(fileId: string, metadata: any, ttl?: number): void {
    this.set('file', fileId, metadata, ttl, ['file']);
  }

  getFileMetadata(fileId: string): any | null {
    return this.get('file', fileId);
  }

  invalidateFile(fileId: string): void {
    this.delete('file', fileId);
  }

  invalidateAllFiles(): void {
    this.deleteByTag('file');
  }

  /**
   * Get cache size for a specific namespace
   */
  getNamespaceSize(namespace: string): number {
    let count = 0;
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`${namespace}:`)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Set maximum cache size
   */
  setMaxSize(maxSize: number): void {
    this.maxSize = maxSize;
    // If current size exceeds new max, evict oldest entries
    while (this.cache.size > this.maxSize) {
      this.evictOldest();
    }
  }

  /**
   * Force cleanup of expired entries
   */
  forceCleanup(): void {
    this.cleanup();
  }
}

export const cacheService = new CacheService();