/**
 * Rate Limiter Service
 * Implements rate limiting for API calls to prevent abuse and respect API limits
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiterService {
  private limiters = new Map<string, Map<string, RateLimitEntry>>();
  
  constructor() {
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }
  
  private getKey(identifier: string, endpoint: string): string {
    return `${identifier}:${endpoint}`;
  }
  
  private getLimiter(limiterId: string): Map<string, RateLimitEntry> {
    if (!this.limiters.has(limiterId)) {
      this.limiters.set(limiterId, new Map());
    }
    return this.limiters.get(limiterId)!;
  }
  
  private cleanup(): void {
    const now = Date.now();
    
    for (const [limiterId, limiter] of this.limiters.entries()) {
      for (const [key, entry] of limiter.entries()) {
        if (now > entry.resetTime) {
          limiter.delete(key);
        }
      }
      
      // Remove empty limiters
      if (limiter.size === 0) {
        this.limiters.delete(limiterId);
      }
    }
  }
  
  async checkLimit(
    limiterId: string,
    identifier: string,
    endpoint: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; resetTime: number; remaining: number }> {
    const limiter = this.getLimiter(limiterId);
    const key = this.getKey(identifier, endpoint);
    const now = Date.now();
    const resetTime = now + config.windowMs;
    
    let entry = limiter.get(key);
    
    // Create new entry if doesn't exist or if window has expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime,
      };
      limiter.set(key, entry);
    }
    
    const allowed = entry.count < config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);
    
    if (allowed) {
      entry.count++;
    }
    
    return {
      allowed,
      resetTime: entry.resetTime,
      remaining,
    };
  }
  
  async increment(
    limiterId: string,
    identifier: string,
    endpoint: string,
    success: boolean,
    config: RateLimitConfig
  ): Promise<void> {
    // Skip counting based on configuration
    if ((success && config.skipSuccessfulRequests) || 
        (!success && config.skipFailedRequests)) {
      return;
    }
    
    const limiter = this.getLimiter(limiterId);
    const key = this.getKey(identifier, endpoint);
    
    const entry = limiter.get(key);
    if (entry) {
      entry.count++;
    }
  }
  
  async getRemainingRequests(
    limiterId: string,
    identifier: string,
    endpoint: string,
    config: RateLimitConfig
  ): Promise<number> {
    const limiter = this.getLimiter(limiterId);
    const key = this.getKey(identifier, endpoint);
    
    const entry = limiter.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      return config.maxRequests;
    }
    
    return Math.max(0, config.maxRequests - entry.count);
  }
  
  async getResetTime(
    limiterId: string,
    identifier: string,
    endpoint: string
  ): Promise<number | null> {
    const limiter = this.getLimiter(limiterId);
    const key = this.getKey(identifier, endpoint);
    
    const entry = limiter.get(key);
    return entry ? entry.resetTime : null;
  }
  
  // Utility method to wait until rate limit resets
  async waitForReset(
    limiterId: string,
    identifier: string,
    endpoint: string
  ): Promise<void> {
    const resetTime = await this.getResetTime(limiterId, identifier, endpoint);
    
    if (resetTime) {
      const waitTime = Math.max(0, resetTime - Date.now());
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // Clear all rate limit data for a specific identifier
  clearIdentifier(limiterId: string, identifier: string): void {
    const limiter = this.getLimiter(limiterId);
    
    for (const key of limiter.keys()) {
      if (key.startsWith(`${identifier}:`)) {
        limiter.delete(key);
      }
    }
  }
  
  // Get stats for monitoring
  getStats(): { [limiterId: string]: { entries: number; totalRequests: number } } {
    const stats: { [limiterId: string]: { entries: number; totalRequests: number } } = {};
    
    for (const [limiterId, limiter] of this.limiters.entries()) {
      let totalRequests = 0;
      
      for (const entry of limiter.values()) {
        totalRequests += entry.count;
      }
      
      stats[limiterId] = {
        entries: limiter.size,
        totalRequests,
      };
    }
    
    return stats;
  }
}

export const rateLimiter = new RateLimiterService();