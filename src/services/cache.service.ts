/**
 * Cache Service
 * In-memory caching with TTL support for API responses
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
  tags?: string[];
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
    setInterval(() => this.cleanup(), 300000);
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
    tags?: string[]
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
    this.delete('contact', contactId);
    this.deleteByTag('contact'); // Also clear related lists
  }
}

export const cacheService = new CacheService();