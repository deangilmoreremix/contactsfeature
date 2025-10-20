// Simple in-memory cache for AI operations
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class AICache {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes

  set(key: string, data: any, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Generate cache key for email enhancement
  getEmailCacheKey(emailData: { to: string; subject: string; body: string }): string {
    return `email_${btoa(emailData.to)}_${btoa(emailData.subject).slice(0, 10)}`;
  }

  // Generate cache key for SMS enhancement
  getSMSCacheKey(smsData: { to: string; message: string }): string {
    return `sms_${btoa(smsData.to)}_${btoa(smsData.message).slice(0, 10)}`;
  }

  // Generate cache key for call enhancement
  getCallCacheKey(callData: { to: string; notes?: string }): string {
    return `call_${btoa(callData.to)}_${btoa(callData.notes || '').slice(0, 10)}`;
  }
}

export const aiCache = new AICache();

// Clean up cache periodically
setInterval(() => {
  aiCache.cleanup();
}, 5 * 60 * 1000); // Clean every 5 minutes