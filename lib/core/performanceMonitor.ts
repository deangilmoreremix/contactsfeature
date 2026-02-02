/**
 * Performance Monitor for GPT-5.2
 * Tracks usage, costs, cache performance, and optimization metrics
 */

import { logger } from "./logger";

export interface PerformanceMetrics {
  requestId: string;
  timestamp: number;
  model: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  processingTime: number;
  reasoningEffort: string;
  verbosity: string;
  cacheHit: boolean;
  cost: number;
  error?: string;
}

export interface AggregatedMetrics {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageProcessingTime: number;
  cacheHitRate: number;
  errorRate: number;
  modelUsage: Record<string, number>;
  operationUsage: Record<string, number>;
  costByModel: Record<string, number>;
  tokensByModel: Record<string, number>;
  performanceByReasoningEffort: Record<string, {
    avgTokens: number;
    avgTime: number;
    avgCost: number;
    count: number;
  }>;
}

export interface CostConfig {
  [model: string]: {
    inputTokenCost: number;
    outputTokenCost: number;
    cachedInputTokenCost?: number;
  };
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 10000; // Keep last 10k requests
  private costConfig: CostConfig;

  constructor(costConfig?: Partial<CostConfig>) {
    this.costConfig = {
      "gpt-5.2-instant": { inputTokenCost: 0.0015, outputTokenCost: 0.0015, cachedInputTokenCost: 0.00075 },
      "gpt-5.2-thinking": { inputTokenCost: 0.003, outputTokenCost: 0.003, cachedInputTokenCost: 0.0015 },
      "gpt-5.2-pro": { inputTokenCost: 0.006, outputTokenCost: 0.006, cachedInputTokenCost: 0.003 },
      ...costConfig
    };
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetrics, 'cost'>): void {
    const cost = this.calculateCost(metric);
    const fullMetric: PerformanceMetrics = { ...metric, cost };

    this.metrics.push(fullMetric);

    // Maintain history limit
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    logger.debug("Performance metric recorded", {
      requestId: metric.requestId,
      model: metric.model,
      tokens: metric.totalTokens,
      time: metric.processingTime,
      cost: cost.toFixed(4),
      cacheHit: metric.cacheHit
    });
  }

  /**
   * Get aggregated metrics for a time period
   */
  getAggregatedMetrics(hoursBack: number = 24): AggregatedMetrics {
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return this.getEmptyMetrics();
    }

    const totalRequests = recentMetrics.length;
    const totalTokens = recentMetrics.reduce((sum, m) => sum + m.totalTokens, 0);
    const totalCost = recentMetrics.reduce((sum, m) => sum + m.cost, 0);
    const averageProcessingTime = recentMetrics.reduce((sum, m) => sum + m.processingTime, 0) / totalRequests;

    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = cacheHits / totalRequests;

    const errors = recentMetrics.filter(m => m.error).length;
    const errorRate = errors / totalRequests;

    // Model usage breakdown
    const modelUsage = recentMetrics.reduce((acc, m) => {
      acc[m.model] = (acc[m.model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Operation usage breakdown
    const operationUsage = recentMetrics.reduce((acc, m) => {
      acc[m.operation] = (acc[m.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Cost by model
    const costByModel = recentMetrics.reduce((acc, m) => {
      acc[m.model] = (acc[m.model] || 0) + m.cost;
      return acc;
    }, {} as Record<string, number>);

    // Tokens by model
    const tokensByModel = recentMetrics.reduce((acc, m) => {
      acc[m.model] = (acc[m.model] || 0) + m.totalTokens;
      return acc;
    }, {} as Record<string, number>);

    // Performance by reasoning effort
    const performanceByReasoningEffort: Record<string, { avgTokens: number; avgTime: number; avgCost: number; count: number }> = {};

    recentMetrics.forEach(m => {
      const effort = m.reasoningEffort;
      if (!performanceByReasoningEffort[effort]) {
        performanceByReasoningEffort[effort] = { avgTokens: 0, avgTime: 0, avgCost: 0, count: 0 };
      }
      const data = performanceByReasoningEffort[effort];
      data.avgTokens += m.totalTokens;
      data.avgTime += m.processingTime;
      data.avgCost += m.cost;
      data.count += 1;
    });

    // Calculate averages
    Object.keys(performanceByReasoningEffort).forEach(effort => {
      const data = performanceByReasoningEffort[effort];
      if (data && data.count > 0) {
        data.avgTokens /= data.count;
        data.avgTime /= data.count;
        data.avgCost /= data.count;
      }
    });

    return {
      totalRequests,
      totalTokens,
      totalCost,
      averageProcessingTime,
      cacheHitRate,
      errorRate,
      modelUsage,
      operationUsage,
      costByModel,
      tokensByModel,
      performanceByReasoningEffort
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): Array<{
    type: 'cost' | 'performance' | 'cache' | 'model';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    potentialSavings?: number;
  }> {
    const metrics = this.getAggregatedMetrics(24); // Last 24 hours
    const recommendations: Array<{
      type: 'cost' | 'performance' | 'cache' | 'model';
      priority: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      potentialSavings?: number;
    }> = [];

    // Cost optimization
    if (metrics.cacheHitRate < 0.5) {
      recommendations.push({
        type: 'cache',
        priority: 'high',
        title: 'Improve Cache Utilization',
        description: `Cache hit rate is ${Math.round(metrics.cacheHitRate * 100)}%. Consider optimizing context management and request patterns.`,
        potentialSavings: metrics.totalCost * 0.25 // Estimate 25% savings
      });
    }

    // Model optimization
    const instantUsage = metrics.modelUsage['gpt-5.2-instant'] || 0;
    const thinkingUsage = metrics.modelUsage['gpt-5.2-thinking'] || 0;
    const proUsage = metrics.modelUsage['gpt-5.2-pro'] || 0;
    const totalUsage = instantUsage + thinkingUsage + proUsage;

    if (totalUsage > 0) {
      const proPercentage = proUsage / totalUsage;
      if (proPercentage > 0.3) {
        recommendations.push({
          type: 'model',
          priority: 'medium',
          title: 'Optimize Model Selection',
          description: `${Math.round(proPercentage * 100)}% of requests use gpt-5.2-pro. Consider using gpt-5.2-thinking for complex tasks.`,
          potentialSavings: (metrics.costByModel['gpt-5.2-pro'] || 0) * 0.5
        });
      }
    }

    // Reasoning effort optimization
    const highEffortData = metrics.performanceByReasoningEffort['xhigh'];
    if (highEffortData && highEffortData.count > 10) {
      const avgTokens = highEffortData.avgTokens;
      if (avgTokens > 10000) {
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          title: 'Review High Reasoning Effort Usage',
          description: `xhigh reasoning effort averaging ${Math.round(avgTokens)} tokens. Consider if lower effort levels suffice.`,
          potentialSavings: highEffortData.avgCost * highEffortData.count * 0.3
        });
      }
    }

    // Performance optimization
    if (metrics.averageProcessingTime > 5000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'High Processing Times Detected',
        description: `Average processing time is ${Math.round(metrics.averageProcessingTime)}ms. Consider optimizing prompts or reducing verbosity.`
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
    });
  }

  /**
   * Get cost breakdown for a specific time period
   */
  getCostBreakdown(hoursBack: number = 24): {
    totalCost: number;
    costByModel: Record<string, number>;
    costByOperation: Record<string, number>;
    projectedMonthlyCost: number;
  } {
    const metrics = this.getAggregatedMetrics(hoursBack);
    const hoursInPeriod = hoursBack;
    const hoursInMonth = 30 * 24;

    const costByOperation = this.metrics
      .filter(m => m.timestamp >= Date.now() - (hoursBack * 60 * 60 * 1000))
      .reduce((acc, m) => {
        acc[m.operation] = (acc[m.operation] || 0) + m.cost;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalCost: metrics.totalCost,
      costByModel: metrics.costByModel,
      costByOperation,
      projectedMonthlyCost: (metrics.totalCost / hoursInPeriod) * hoursInMonth
    };
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(daysToKeep: number = 30): number {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const originalLength = this.metrics.length;
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    const removedCount = originalLength - this.metrics.length;
    if (removedCount > 0) {
      logger.info("Cleared old performance metrics", { removedCount, daysToKeep });
    }

    return removedCount;
  }

  /**
   * Private methods
   */
  private calculateCost(metric: Omit<PerformanceMetrics, 'cost'>): number {
    const modelConfig = this.costConfig[metric.model];
    if (!modelConfig) {
      logger.warn("No cost config found for model", { model: metric.model });
      return 0;
    }

    const inputCost = metric.cacheHit && modelConfig.cachedInputTokenCost
      ? metric.inputTokens * modelConfig.cachedInputTokenCost
      : metric.inputTokens * modelConfig.inputTokenCost;

    const outputCost = metric.outputTokens * modelConfig.outputTokenCost;

    return inputCost + outputCost;
  }

  private getEmptyMetrics(): AggregatedMetrics {
    return {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      averageProcessingTime: 0,
      cacheHitRate: 0,
      errorRate: 0,
      modelUsage: {},
      operationUsage: {},
      costByModel: {},
      tokensByModel: {},
      performanceByReasoningEffort: {}
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();