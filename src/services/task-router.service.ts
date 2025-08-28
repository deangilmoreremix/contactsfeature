/**
 * Task Router Service
 * Intelligent routing between Gemma and OpenAI models based on task requirements
 */

import { logger } from './logger.service';
import { rateLimiter } from './rate-limiter.service';
import { cacheService } from './cache.service';
import apiConfig, { AIModel, getModelsByCapability } from '../config/api.config';

export interface TaskRequirements {
  accuracy: 'low' | 'medium' | 'high' | 'critical';
  speed: 'slow' | 'medium' | 'fast' | 'realtime';
  cost: 'high' | 'medium' | 'low' | 'free';
  complexity: 'simple' | 'medium' | 'complex' | 'expert';
  volume: 'single' | 'batch' | 'bulk' | 'streaming';
}

export interface TaskContext {
  taskType: 'contact_scoring' | 'contact_enrichment' | 'categorization' | 'tagging' | 
            'relationship_mapping' | 'sentiment_analysis' | 'lead_qualification' | 
            'opportunity_analysis' | 'risk_assessment' | 'engagement_prediction';
  requirements: TaskRequirements;
  contactData?: any;
  businessContext?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  batchSize?: number;
  retryCount?: number;
}

export interface ModelSelection {
  provider: 'openai' | 'gemini';
  model: string;
  reasoning: string;
  expectedCost: number;
  expectedLatency: number;
  confidenceScore: number;
  fallbackOptions: Array<{ provider: string; model: string; reasoning: string }>;
}

export interface TaskPerformanceMetrics {
  taskType: string;
  modelUsed: string;
  executionTime: number;
  accuracy: number;
  cost: number;
  success: boolean;
  timestamp: string;
}

class TaskRouterService {
  private performanceHistory: TaskPerformanceMetrics[] = [];
  private modelPerformance: Map<string, { avgTime: number; successRate: number; avgCost: number }> = new Map();
  
  // Task-specific model preferences
  private taskProfiles: Record<string, { 
    gemmaModels: Array<{ model: string; score: number; reasoning: string }>;
    openaiModels: Array<{ model: string; score: number; reasoning: string }>;
    defaultRequirements: TaskRequirements;
  }> = {
    contact_scoring: {
      gemmaModels: [
        { model: 'gemma-2-9b-it', score: 85, reasoning: 'Excellent balance of speed and accuracy for scoring' },
        { model: 'gemma-2-27b-it', score: 90, reasoning: 'Higher accuracy for complex scoring scenarios' },
        { model: 'gemma-2-2b-it', score: 75, reasoning: 'Fast scoring for simple cases' }
      ],
      openaiModels: [
        { model: 'gpt-4o-mini', score: 88, reasoning: 'Optimal cost-performance for contact scoring' },
        { model: 'gpt-4o', score: 95, reasoning: 'Highest accuracy for critical scoring decisions' },
        { model: 'gpt-3.5-turbo', score: 78, reasoning: 'Cost-effective for basic scoring' }
      ],
      defaultRequirements: { accuracy: 'high', speed: 'fast', cost: 'low', complexity: 'medium', volume: 'single' }
    },
    
    contact_enrichment: {
      gemmaModels: [
        { model: 'gemma-2-27b-it', score: 88, reasoning: 'Comprehensive data analysis and inference' },
        { model: 'gemma-2-9b-it', score: 82, reasoning: 'Good balance for standard enrichment' }
      ],
      openaiModels: [
        { model: 'gpt-4o', score: 95, reasoning: 'Superior reasoning for complex data enrichment' },
        { model: 'gpt-4o-mini', score: 85, reasoning: 'Cost-effective enrichment with good quality' }
      ],
      defaultRequirements: { accuracy: 'high', speed: 'medium', cost: 'medium', complexity: 'complex', volume: 'single' }
    },
    
    categorization: {
      gemmaModels: [
        { model: 'gemma-2-2b-it', score: 90, reasoning: 'Optimized for classification tasks' },
        { model: 'gemini-1.5-flash-8b', score: 92, reasoning: 'Fastest categorization with good accuracy' },
        { model: 'gemma-2-9b-it', score: 85, reasoning: 'More nuanced categorization' }
      ],
      openaiModels: [
        { model: 'gpt-4o-mini', score: 88, reasoning: 'Reliable categorization with consistency' },
        { model: 'gpt-3.5-turbo', score: 82, reasoning: 'Basic categorization at low cost' }
      ],
      defaultRequirements: { accuracy: 'medium', speed: 'fast', cost: 'free', complexity: 'simple', volume: 'batch' }
    },
    
    tagging: {
      gemmaModels: [
        { model: 'gemma-2-2b-it', score: 88, reasoning: 'Excellent for simple tagging tasks' },
        { model: 'gemini-1.5-flash-8b', score: 90, reasoning: 'Ultra-fast tagging with good precision' }
      ],
      openaiModels: [
        { model: 'gpt-4o-mini', score: 85, reasoning: 'Consistent tagging quality' },
        { model: 'gpt-3.5-turbo', score: 80, reasoning: 'Cost-effective basic tagging' }
      ],
      defaultRequirements: { accuracy: 'medium', speed: 'realtime', cost: 'free', complexity: 'simple', volume: 'bulk' }
    },
    
    relationship_mapping: {
      gemmaModels: [
        { model: 'gemma-2-27b-it', score: 85, reasoning: 'Complex reasoning for relationship analysis' }
      ],
      openaiModels: [
        { model: 'gpt-4o', score: 95, reasoning: 'Superior reasoning for complex relationship mapping' },
        { model: 'gpt-4o-mini', score: 80, reasoning: 'Good relationship detection with efficiency' }
      ],
      defaultRequirements: { accuracy: 'critical', speed: 'medium', cost: 'medium', complexity: 'expert', volume: 'single' }
    },
    
    lead_qualification: {
      gemmaModels: [
        { model: 'gemma-2-9b-it', score: 88, reasoning: 'Good business logic understanding' },
        { model: 'gemma-2-27b-it', score: 92, reasoning: 'Advanced qualification criteria analysis' }
      ],
      openaiModels: [
        { model: 'gpt-4o', score: 95, reasoning: 'Best-in-class qualification accuracy' },
        { model: 'gpt-4o-mini', score: 87, reasoning: 'Efficient qualification with good accuracy' }
      ],
      defaultRequirements: { accuracy: 'high', speed: 'fast', cost: 'low', complexity: 'medium', volume: 'batch' }
    },
    
    sentiment_analysis: {
      gemmaModels: [
        { model: 'gemma-2-9b-it', score: 85, reasoning: 'Good sentiment understanding' },
        { model: 'gemini-1.5-flash', score: 88, reasoning: 'Fast sentiment analysis with accuracy' }
      ],
      openaiModels: [
        { model: 'gpt-4o-mini', score: 90, reasoning: 'Nuanced sentiment detection' },
        { model: 'gpt-4o', score: 95, reasoning: 'Superior emotional intelligence' }
      ],
      defaultRequirements: { accuracy: 'high', speed: 'fast', cost: 'low', complexity: 'medium', volume: 'batch' }
    }
  };

  constructor() {
    this.loadPerformanceHistory();
    this.updateModelPerformance();
  }

  async selectOptimalModel(taskContext: TaskContext): Promise<ModelSelection> {
    const { taskType, requirements, urgency = 'medium', batchSize = 1 } = taskContext;
    
    logger.info(`Selecting optimal model for task: ${taskType}`, {
      requirements,
      urgency,
      batchSize
    });

    // Get task profile
    const profile = this.taskProfiles[taskType];
    if (!profile) {
      throw new Error(`Unsupported task type: ${taskType}`);
    }

    // Merge requirements with defaults
    const finalRequirements = { ...profile.defaultRequirements, ...requirements };

    // Check provider availability and rate limits
    const providerAvailability = await this.checkProviderAvailability();
    
    // Score all available models
    const gemmaOptions = await this.scoreModels('gemini', profile.gemmaModels, finalRequirements, providerAvailability.gemini);
    const openaiOptions = await this.scoreModels('openai', profile.openaiModels, finalRequirements, providerAvailability.openai);
    
    // Combine and sort all options
    const allOptions = [...gemmaOptions, ...openaiOptions].sort((a, b) => b.score - a.score);
    
    if (allOptions.length === 0) {
      throw new Error('No available models for the specified task');
    }

    const bestOption = allOptions[0];
    const fallbackOptions = allOptions.slice(1, 4).map(option => ({
      provider: option.provider,
      model: option.model,
      reasoning: option.reasoning
    }));

    const selection: ModelSelection = {
      provider: bestOption.provider as 'openai' | 'gemini',
      model: bestOption.model,
      reasoning: bestOption.reasoning,
      expectedCost: bestOption.estimatedCost,
      expectedLatency: bestOption.estimatedLatency,
      confidenceScore: bestOption.score,
      fallbackOptions
    };

    logger.info(`Selected model: ${selection.provider}/${selection.model}`, {
      score: selection.confidenceScore,
      reasoning: selection.reasoning,
      fallbacksAvailable: fallbackOptions.length
    });

    return selection;
  }

  private async scoreModels(
    provider: string,
    models: Array<{ model: string; score: number; reasoning: string }>,
    requirements: TaskRequirements,
    isAvailable: boolean
  ): Promise<Array<{
    provider: string;
    model: string;
    score: number;
    reasoning: string;
    estimatedCost: number;
    estimatedLatency: number;
  }>> {
    if (!isAvailable) {
      return [];
    }

    const scoredModels = [];

    for (const modelInfo of models) {
      try {
        const modelConfig = this.getModelConfig(provider, modelInfo.model);
        if (!modelConfig) continue;

        // Base score from task profile
        let score = modelInfo.score;

        // Adjust score based on requirements
        score = this.adjustScoreForRequirements(score, modelConfig, requirements);

        // Adjust for historical performance
        score = this.adjustScoreForPerformance(score, `${provider}/${modelInfo.model}`);

        // Adjust for current load and rate limits
        score = await this.adjustScoreForAvailability(score, provider, modelInfo.model);

        const estimatedCost = this.estimateCost(modelConfig, requirements);
        const estimatedLatency = this.estimateLatency(modelConfig, requirements);

        scoredModels.push({
          provider,
          model: modelInfo.model,
          score,
          reasoning: `${modelInfo.reasoning} (adjusted score: ${score.toFixed(1)})`,
          estimatedCost,
          estimatedLatency
        });

      } catch (error) {
        logger.warn(`Error scoring model ${provider}/${modelInfo.model}`, error);
        continue;
      }
    }

    return scoredModels;
  }

  private adjustScoreForRequirements(baseScore: number, modelConfig: AIModel, requirements: TaskRequirements): number {
    let score = baseScore;

    // Accuracy requirement adjustment
    if (requirements.accuracy === 'critical' && modelConfig.id.includes('gpt-4o')) {
      score += 15; // Boost OpenAI GPT-4o for critical accuracy
    } else if (requirements.accuracy === 'critical' && modelConfig.id.includes('gemma-2-27b')) {
      score += 10; // Boost largest Gemma for critical accuracy
    } else if (requirements.accuracy === 'low' && modelConfig.id.includes('2b')) {
      score += 5; // Boost smaller models for low accuracy needs
    }

    // Speed requirement adjustment
    if (requirements.speed === 'realtime') {
      if (modelConfig.id.includes('flash-8b') || modelConfig.id.includes('2b')) {
        score += 20; // Significant boost for fastest models
      } else if (modelConfig.id.includes('mini') || modelConfig.id.includes('flash')) {
        score += 10;
      } else if (modelConfig.id.includes('gpt-4o') && !modelConfig.id.includes('mini')) {
        score -= 10; // Penalize slower models for realtime needs
      }
    }

    // Cost requirement adjustment
    if (requirements.cost === 'free') {
      if (modelConfig.id.includes('gemma') || modelConfig.id.includes('gemini')) {
        score += 25; // Strong preference for free Gemini/Gemma models
      } else {
        score -= 30; // Heavy penalty for paid models when free is required
      }
    } else if (requirements.cost === 'low') {
      if (modelConfig.costPer1kTokens && modelConfig.costPer1kTokens < 0.001) {
        score += 15;
      } else if (modelConfig.id.includes('mini')) {
        score += 10;
      }
    }

    // Volume adjustment
    if (requirements.volume === 'bulk' || requirements.volume === 'streaming') {
      if (modelConfig.id.includes('flash') || modelConfig.id.includes('2b') || modelConfig.id.includes('9b')) {
        score += 15; // Prefer faster models for bulk processing
      }
    }

    // Complexity adjustment
    if (requirements.complexity === 'expert') {
      if (modelConfig.id.includes('gpt-4o') && !modelConfig.id.includes('mini')) {
        score += 20; // Strong preference for GPT-4o for expert tasks
      } else if (modelConfig.id.includes('27b') || modelConfig.id.includes('1.5-pro')) {
        score += 15; // Boost larger models for complex tasks
      }
    } else if (requirements.complexity === 'simple') {
      if (modelConfig.id.includes('2b') || modelConfig.id.includes('8b') || modelConfig.id.includes('3.5')) {
        score += 10; // Prefer smaller/simpler models for simple tasks
      }
    }

    return Math.max(0, Math.min(100, score)); // Clamp between 0-100
  }

  private adjustScoreForPerformance(baseScore: number, modelKey: string): number {
    const performance = this.modelPerformance.get(modelKey);
    if (!performance) return baseScore;

    // Adjust based on success rate
    const successRateMultiplier = performance.successRate;
    
    // Adjust based on relative speed (compared to average)
    const avgResponseTime = Array.from(this.modelPerformance.values())
      .reduce((sum, p) => sum + p.avgTime, 0) / this.modelPerformance.size;
    
    const speedMultiplier = performance.avgTime < avgResponseTime ? 1.1 : 0.9;

    return baseScore * successRateMultiplier * speedMultiplier;
  }

  private async adjustScoreForAvailability(baseScore: number, provider: string, model: string): Promise<number> {
    try {
      const remainingRequests = await rateLimiter.getRemainingRequests(
        `ai_${provider}`,
        'default',
        model,
        { maxRequests: 100, windowMs: 60000 }
      );

      // Reduce score if rate limited
      if (remainingRequests === 0) {
        return baseScore * 0.1; // Heavy penalty for rate limited
      } else if (remainingRequests < 10) {
        return baseScore * 0.7; // Moderate penalty for low remaining
      } else if (remainingRequests < 25) {
        return baseScore * 0.9; // Small penalty
      }

      return baseScore;
    } catch (error) {
      logger.warn(`Could not check availability for ${provider}/${model}`, error);
      return baseScore * 0.8; // Small penalty for unknown availability
    }
  }

  private async checkProviderAvailability(): Promise<{ openai: boolean; gemini: boolean }> {
    const availability = { openai: false, gemini: false };

    // Check OpenAI
    try {
      const openaiConfig = apiConfig.aiProviders.openai;
      availability.openai = openaiConfig.enabled && !!openaiConfig.apiKey;
    } catch (error) {
      logger.warn('OpenAI availability check failed', error);
    }

    // Check Gemini
    try {
      const geminiConfig = apiConfig.aiProviders.gemini;
      availability.gemini = geminiConfig.enabled && !!geminiConfig.apiKey;
    } catch (error) {
      logger.warn('Gemini availability check failed', error);
    }

    return availability;
  }

  private getModelConfig(provider: string, modelId: string): AIModel | null {
    const providerConfig = apiConfig.aiProviders[provider as keyof typeof apiConfig.aiProviders];
    return providerConfig?.models.find(m => m.id === modelId) || null;
  }

  private estimateCost(modelConfig: AIModel, requirements: TaskRequirements): number {
    // Estimate tokens based on task complexity
    let estimatedTokens = 100; // Base tokens

    switch (requirements.complexity) {
      case 'simple': estimatedTokens = 150; break;
      case 'medium': estimatedTokens = 300; break;
      case 'complex': estimatedTokens = 600; break;
      case 'expert': estimatedTokens = 1000; break;
    }

    if (requirements.volume === 'batch') estimatedTokens *= 5;
    if (requirements.volume === 'bulk') estimatedTokens *= 20;

    return (modelConfig.costPer1kTokens || 0) * (estimatedTokens / 1000);
  }

  private estimateLatency(modelConfig: AIModel, requirements: TaskRequirements): number {
    // Base latency estimates (in milliseconds)
    const baseLatencies: Record<string, number> = {
      'gemini-1.5-flash-8b': 800,
      'gemma-2-2b-it': 1000,
      'gemini-2.0-flash-exp': 1200,
      'gemini-1.5-flash': 1500,
      'gemma-2-9b-it': 2000,
      'gpt-4o-mini': 2200,
      'gpt-3.5-turbo': 1800,
      'gemma-2-27b-it': 3500,
      'gemini-1.5-pro': 3000,
      'gpt-4o': 4000
    };

    let latency = baseLatencies[modelConfig.id] || 2500;

    // Adjust for complexity
    switch (requirements.complexity) {
      case 'complex': latency *= 1.5; break;
      case 'expert': latency *= 2; break;
    }

    return latency;
  }

  // Performance tracking
  recordTaskPerformance(metrics: TaskPerformanceMetrics): void {
    this.performanceHistory.push(metrics);
    
    // Keep only last 1000 records
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000);
    }

    this.updateModelPerformance();
    this.savePerformanceHistory();
  }

  private updateModelPerformance(): void {
    const modelStats = new Map<string, { times: number[]; successes: number; total: number; costs: number[] }>();

    this.performanceHistory.forEach(record => {
      const key = record.modelUsed;
      if (!modelStats.has(key)) {
        modelStats.set(key, { times: [], successes: 0, total: 0, costs: [] });
      }

      const stats = modelStats.get(key)!;
      stats.times.push(record.executionTime);
      stats.costs.push(record.cost);
      stats.total++;
      if (record.success) stats.successes++;
    });

    modelStats.forEach((stats, model) => {
      const avgTime = stats.times.reduce((a, b) => a + b, 0) / stats.times.length;
      const successRate = stats.successes / stats.total;
      const avgCost = stats.costs.reduce((a, b) => a + b, 0) / stats.costs.length;

      this.modelPerformance.set(model, { avgTime, successRate, avgCost });
    });
  }

  private loadPerformanceHistory(): void {
    try {
      const stored = localStorage.getItem('smartcrm_task_performance');
      if (stored) {
        this.performanceHistory = JSON.parse(stored);
        this.updateModelPerformance();
      }
    } catch (error) {
      logger.warn('Failed to load performance history', error);
    }
  }

  private savePerformanceHistory(): void {
    try {
      localStorage.setItem('smartcrm_task_performance', JSON.stringify(this.performanceHistory.slice(-500)));
    } catch (error) {
      logger.warn('Failed to save performance history', error);
    }
  }

  // Utility methods
  getTaskRecommendations(taskType: string): { 
    recommendedProvider: string; 
    recommendedModel: string; 
    reasoning: string;
    alternatives: Array<{ provider: string; model: string; reasoning: string }>;
  } | null {
    const profile = this.taskProfiles[taskType];
    if (!profile) return null;

    // Get top recommendations
    const allModels = [...profile.gemmaModels, ...profile.openaiModels].sort((a, b) => b.score - a.score);
    const top = allModels[0];
    const alternatives = allModels.slice(1, 4);

    return {
      recommendedProvider: profile.gemmaModels.find(m => m.model === top.model) ? 'gemini' : 'openai',
      recommendedModel: top.model,
      reasoning: top.reasoning,
      alternatives: alternatives.map(alt => ({
        provider: profile.gemmaModels.find(m => m.model === alt.model) ? 'gemini' : 'openai',
        model: alt.model,
        reasoning: alt.reasoning
      }))
    };
  }

  getPerformanceStats(): {
    totalTasks: number;
    overallSuccessRate: number;
    avgResponseTime: number;
    modelPerformance: Array<{ model: string; successRate: number; avgTime: number; avgCost: number }>;
  } {
    const totalTasks = this.performanceHistory.length;
    const successfulTasks = this.performanceHistory.filter(t => t.success).length;
    const overallSuccessRate = totalTasks > 0 ? successfulTasks / totalTasks : 0;
    const avgResponseTime = totalTasks > 0 
      ? this.performanceHistory.reduce((sum, t) => sum + t.executionTime, 0) / totalTasks 
      : 0;

    const modelPerformance = Array.from(this.modelPerformance.entries()).map(([model, stats]) => ({
      model,
      successRate: stats.successRate,
      avgTime: stats.avgTime,
      avgCost: stats.avgCost
    }));

    return {
      totalTasks,
      overallSuccessRate,
      avgResponseTime,
      modelPerformance
    };
  }

  // Create task contexts for common CRM operations
  static createContactScoringTask(urgency: 'low' | 'medium' | 'high' = 'medium'): TaskContext {
    return {
      taskType: 'contact_scoring',
      requirements: {
        accuracy: urgency === 'high' ? 'high' : 'medium',
        speed: urgency === 'high' ? 'fast' : 'medium',
        cost: 'low',
        complexity: 'medium',
        volume: 'single'
      },
      urgency
    };
  }

  static createBulkCategorizationTask(): TaskContext {
    return {
      taskType: 'categorization',
      requirements: {
        accuracy: 'medium',
        speed: 'fast',
        cost: 'free',
        complexity: 'simple',
        volume: 'bulk'
      },
      urgency: 'medium'
    };
  }

  static createCriticalEnrichmentTask(): TaskContext {
    return {
      taskType: 'contact_enrichment',
      requirements: {
        accuracy: 'critical',
        speed: 'medium',
        cost: 'medium',
        complexity: 'complex',
        volume: 'single'
      },
      urgency: 'high'
    };
  }
}

export const taskRouter = new TaskRouterService();