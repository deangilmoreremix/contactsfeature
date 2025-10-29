interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  key: string;
  metadata?: {
    contactId?: string;
    dealId?: string;
    toolName: string;
    parameters: Record<string, any>;
  };
}

interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxEntries: number;
  storageKey: string;
}

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig = {
    defaultTTL: 30 * 60 * 1000, // 30 minutes default
    maxEntries: 100,
    storageKey: 'ai_tools_cache'
  };

  constructor() {
    this.loadFromStorage();
    this.startCleanupInterval();
  }

  // Generate a cache key based on tool name and parameters
  private generateKey(toolName: string, parameters: Record<string, any>): string {
    const sortedParams = Object.keys(parameters)
      .sort()
      .reduce((result, key) => {
        result[key] = parameters[key];
        return result;
      }, {} as Record<string, any>);

    const paramString = JSON.stringify(sortedParams);
    return `${toolName}_${btoa(paramString).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)}`;
  }

  // Check if cache entry is valid (not expired)
  private isValid(entry: CacheEntry<any>): boolean {
    return Date.now() < entry.expiresAt;
  }

  // Get data from cache
  get<T>(toolName: string, parameters: Record<string, any>): T | null {
    const key = this.generateKey(toolName, parameters);
    const entry = this.cache.get(key);

    if (!entry || !this.isValid(entry)) {
      if (entry) {
        this.cache.delete(key); // Remove expired entry
      }
      return null;
    }

    console.log(`[Cache] Cache hit for ${toolName}`, { key, age: Date.now() - entry.timestamp });
    return entry.data;
  }

  // Set data in cache
  set<T>(
    toolName: string,
    parameters: Record<string, any>,
    data: T,
    ttl?: number,
    metadata?: CacheEntry<T>['metadata']
  ): void {
    const key = this.generateKey(toolName, parameters);
    const now = Date.now();
    const expiresAt = now + (ttl || this.config.defaultTTL);

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt,
      key,
      metadata: {
        toolName,
        parameters,
        ...metadata
      }
    };

    // Check if we need to evict old entries
    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
    this.saveToStorage();

    console.log(`[Cache] Cached data for ${toolName}`, {
      key,
      ttl: ttl || this.config.defaultTTL,
      size: this.cache.size
    });
  }

  // Remove expired entries
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`[Cache] Cleaned up ${keysToDelete.length} expired entries`);
      this.saveToStorage();
    }
  }

  // Evict oldest entries when cache is full
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`[Cache] Evicted oldest entry: ${oldestKey}`);
    }
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.saveToStorage();
    console.log('[Cache] All cache cleared');
  }

  // Get cache statistics
  getStats(): {
    totalEntries: number;
    memoryUsage: string;
    hitRate: number;
    toolsCached: string[];
  } {
    const toolsCached = Array.from(new Set(
      Array.from(this.cache.values()).map(entry => entry.metadata?.toolName)
    )).filter(Boolean) as string[];

    return {
      totalEntries: this.cache.size,
      memoryUsage: `${Math.round(JSON.stringify([...this.cache.entries()]).length / 1024)}KB`,
      hitRate: 0, // Would need hit/miss tracking for this
      toolsCached
    };
  }

  // Save cache to localStorage
  private saveToStorage(): void {
    try {
      const cacheData = Array.from(this.cache.entries());
      localStorage.setItem(this.config.storageKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('[Cache] Failed to save to localStorage:', error);
    }
  }

  // Load cache from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const cacheData: [string, CacheEntry<any>][] = JSON.parse(stored);
        this.cache = new Map(cacheData);

        // Clean up expired entries on load
        this.cleanup();

        console.log(`[Cache] Loaded ${this.cache.size} entries from localStorage`);
      }
    } catch (error) {
      console.error('[Cache] Failed to load from localStorage:', error);
      this.cache.clear();
    }
  }

  // Start periodic cleanup
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }

  // Invalidate cache for specific tool or parameters
  invalidate(toolName?: string, parameters?: Record<string, any>): void {
    if (toolName && parameters) {
      const key = this.generateKey(toolName, parameters);
      this.cache.delete(key);
      console.log(`[Cache] Invalidated cache for ${toolName}`, { key });
    } else if (toolName) {
      const keysToDelete: string[] = [];
      for (const [key, entry] of this.cache.entries()) {
        if (entry.metadata?.toolName === toolName) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
      console.log(`[Cache] Invalidated ${keysToDelete.length} entries for ${toolName}`);
    } else {
      this.clear();
    }

    this.saveToStorage();
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Export types for use in components
export type { CacheEntry, CacheConfig };