interface AIToolUsage {
  toolName: string;
  action: string;
  contactId?: string | undefined;
  dealId?: string | undefined;
  startTime: number;
  endTime?: number | undefined;
  success: boolean;
  error?: string | undefined;
  responseTime?: number | undefined;
  aiProvider?: string | undefined;
  model?: string | undefined;
}

interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  toolUsage: Record<string, number>;
  providerUsage: Record<string, number>;
  errorRates: Record<string, number>;
}

class AnalyticsService {
  private metrics: PerformanceMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    toolUsage: {},
    providerUsage: {},
    errorRates: {}
  };

  private currentSessions: Map<string, AIToolUsage> = new Map();

  // Track the start of an AI tool usage
  startTracking(toolName: string, action: string, contactId?: string, dealId?: string): string {
    const sessionId = `${toolName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const usage: AIToolUsage = {
      toolName,
      action,
      contactId,
      dealId,
      startTime: Date.now(),
      success: false
    };

    this.currentSessions.set(sessionId, usage);
    this.metrics.totalRequests++;

    // Update tool usage count
    this.metrics.toolUsage[toolName] = (this.metrics.toolUsage[toolName] || 0) + 1;

    console.log(`[Analytics] Started tracking ${toolName} - ${action}`, { sessionId, contactId, dealId });
    return sessionId;
  }

  // Track the completion of an AI tool usage
  endTracking(sessionId: string, success: boolean, error?: string, aiProvider?: string, model?: string): void {
    const usage = this.currentSessions.get(sessionId);
    if (!usage) {
      console.warn(`[Analytics] Session ${sessionId} not found`);
      return;
    }

    usage.endTime = Date.now();
    usage.success = success;
    usage.error = error;
    usage.responseTime = usage.endTime - usage.startTime;
    usage.aiProvider = aiProvider;
    usage.model = model;

    // Update metrics
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
      this.metrics.errorRates[usage.toolName] = (this.metrics.errorRates[usage.toolName] || 0) + 1;
    }

    // Update provider usage
    if (aiProvider) {
      this.metrics.providerUsage[aiProvider] = (this.metrics.providerUsage[aiProvider] || 0) + 1;
    }

    // Update average response time
    const totalResponseTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + (usage.responseTime || 0);
    this.metrics.averageResponseTime = totalResponseTime / this.metrics.totalRequests;

    this.currentSessions.delete(sessionId);

    console.log(`[Analytics] Completed tracking ${usage.toolName} - ${usage.action}`, {
      sessionId,
      success,
      responseTime: usage.responseTime,
      error,
      aiProvider
    });

    // Send to external analytics service (e.g., Supabase, Google Analytics)
    this.sendToAnalytics(usage);
  }

  // Get current performance metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Get tool-specific metrics
  getToolMetrics(toolName: string): {
    usageCount: number;
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
  } {
    const usageCount = this.metrics.toolUsage[toolName] || 0;
    const errorCount = this.metrics.errorRates[toolName] || 0;
    const successCount = usageCount - errorCount;

    return {
      usageCount,
      successRate: usageCount > 0 ? (successCount / usageCount) * 100 : 0,
      averageResponseTime: this.calculateAverageResponseTime(toolName),
      errorRate: usageCount > 0 ? (errorCount / usageCount) * 100 : 0
    };
  }

  // Send analytics data to external service
  private async sendToAnalytics(usage: AIToolUsage): Promise<void> {
    try {
      // Send to Supabase for persistent storage
      const { supabase } = await import('../lib/supabase');

      await supabase.from('ai_tool_analytics').insert({
        tool_name: usage.toolName,
        action: usage.action,
        contact_id: usage.contactId,
        deal_id: usage.dealId,
        start_time: new Date(usage.startTime).toISOString(),
        end_time: usage.endTime ? new Date(usage.endTime).toISOString() : null,
        response_time: usage.responseTime,
        success: usage.success,
        error: usage.error,
        ai_provider: usage.aiProvider,
        model: usage.model,
        user_agent: navigator.userAgent,
        session_id: this.generateSessionId()
      });

      console.log(`[Analytics] Sent data to Supabase for ${usage.toolName}`);
    } catch (error) {
      console.error('[Analytics] Failed to send data to Supabase:', error);
    }
  }

  // Calculate average response time for a specific tool
  private calculateAverageResponseTime(toolName: string): number {
    // This would ideally query the database for historical data
    // For now, return the global average
    return this.metrics.averageResponseTime;
  }

  // Generate a session ID for tracking
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Reset metrics (useful for testing)
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      toolUsage: {},
      providerUsage: {},
      errorRates: {}
    };
    this.currentSessions.clear();
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

// Export types for use in components
export type { AIToolUsage, PerformanceMetrics };