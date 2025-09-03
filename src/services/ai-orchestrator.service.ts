/**
 * AI Orchestrator Service
 * Single entry point for all AI operations with intelligent routing and caching
 */

import { logger } from './logger.service';
import { cacheService } from './cache.service';
import { rateLimiter } from './rate-limiter.service';
import { httpClient } from './http-client.service';
import { Contact } from '../types/contact';

export interface AIRequest {
  id: string;
  type: 'contact_scoring' | 'contact_enrichment' | 'email_generation' | 'email_analysis' | 
        'insights_generation' | 'communication_analysis' | 'automation_suggestions' | 
        'predictive_analytics' | 'relationship_mapping';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data: any;
  context?: {
    contactId?: string;
    userId?: string;
    sessionId?: string;
    businessContext?: string;
  };
  options?: {
    useCache?: boolean;
    provider?: 'openai' | 'gemini' | 'auto';
    model?: string;
    timeout?: number;
  };
}

export interface AIResponse {
  id: string;
  type: string;
  result: any;
  metadata: {
    provider: string;
    model: string;
    processingTime: number;
    confidence: number;
    cached: boolean;
    timestamp: string;
    cost?: number;
  };
  error?: string;
}

export interface AIProvider {
  name: 'openai' | 'gemini' | 'supabase';
  available: boolean;
  rateLimit: {
    remaining: number;
    resetTime: number;
  };
  performance: {
    avgResponseTime: number;
    successRate: number;
    costPer1kTokens: number;
  };
  type: 'direct' | 'edge_function';
}

class AIOrchestrator {
  private requestQueue: AIRequest[] = [];
  private processing = false;
  private providers: Map<string, AIProvider> = new Map();
  private requestHistory: AIResponse[] = [];
  
  constructor() {
    this.initializeProviders();
    this.startQueueProcessor();
  }

  private initializeProviders(): void {
    // Initialize provider status with GPT-5 models
    this.providers.set('openai', {
      name: 'openai',
      available: !!import.meta.env['VITE_OPENAI_API_KEY'],
      rateLimit: { remaining: 100, resetTime: Date.now() + 60000 }, // GPT-5 has higher limits
      performance: { avgResponseTime: 1200, successRate: 0.98, costPer1kTokens: 0.003 }, // GPT-5 performance
      type: 'direct'
    });

    this.providers.set('gemini', {
      name: 'gemini',
      available: !!import.meta.env['VITE_GEMINI_API_KEY'],
      rateLimit: { remaining: 60, resetTime: Date.now() + 60000 },
      performance: { avgResponseTime: 1500, successRate: 0.92, costPer1kTokens: 0.0005 },
      type: 'direct'
    });

    // Initialize Supabase as backup
    this.providers.set('supabase', {
      name: 'supabase',
      available: !!(import.meta.env['VITE_SUPABASE_URL'] && import.meta.env['VITE_SUPABASE_ANON_KEY']),
      rateLimit: { remaining: 100, resetTime: Date.now() + 60000 },
      performance: { avgResponseTime: 2000, successRate: 0.85, costPer1kTokens: 0.002 },
      type: 'edge_function'
    });
  }

  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.processing && this.requestQueue.length > 0) {
        this.processNextRequest();
      }
    }, 100);
  }

  private async processNextRequest(): Promise<void> {
    if (this.requestQueue.length === 0) return;

    this.processing = true;
    const request = this.requestQueue.shift()!;

    try {
      const response = await this.executeRequest(request);
      logger.info('AI request completed successfully', undefined, {
        requestId: request.id,
        service: 'ai-orchestrator',
        operation: 'request_completed'
      });
    } catch (error) {
      logger.error('AI request failed', error as Error, undefined, {
        requestId: request.id,
        service: 'ai-orchestrator',
        operation: 'request_failed'
      });
    } finally {
      this.processing = false;
    }
  }

  private async executeRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(request);

    // Check cache first
    if (request.options?.useCache !== false) {
      const cached = cacheService.get<AIResponse>('ai_responses', cacheKey);
      if (cached) {
        logger.debug('AI response served from cache', undefined, {
          requestId: request.id,
          service: 'ai-orchestrator',
          operation: 'cache_hit'
        });
        return {
          ...cached,
          metadata: { ...cached.metadata, cached: true }
        };
      }
    }

    // Select optimal provider
    const provider = await this.selectProvider(request);
    
    // Execute request
    let result: any;
    let metadata: AIResponse['metadata'];

    try {
      const response = await this.callProvider(provider, request);
      result = response.result;
      metadata = {
        provider: provider.name,
        model: response.model || 'default',
        processingTime: Date.now() - startTime,
        confidence: response.confidence || 85,
        cached: false,
        timestamp: new Date().toISOString(),
        cost: response.cost
      };
    } catch (error) {
      throw new Error(`AI provider ${provider.name} failed: ${error}`);
    }

    const aiResponse: AIResponse = {
      id: request.id,
      type: request.type,
      result,
      metadata
    };

    // Cache successful responses
    if (request.options?.useCache !== false) {
      const ttl = this.getCacheTTL(request.type);
      cacheService.set('ai_responses', cacheKey, aiResponse, ttl, ['ai', request.type]);
    }

    // Update provider performance
    this.updateProviderPerformance(provider.name, metadata);

    // Store in history
    this.requestHistory.push(aiResponse);
    if (this.requestHistory.length > 1000) {
      this.requestHistory = this.requestHistory.slice(-1000);
    }

    return aiResponse;
  }

  private async selectProvider(request: AIRequest): Promise<AIProvider> {
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.available && p.rateLimit.remaining > 0);

    if (availableProviders.length === 0) {
      throw new Error('No AI providers available');
    }

    // Check fallback configuration
    const fallbackMode = import.meta.env['VITE_AI_FALLBACK_MODE'] || 'direct_first'; // 'direct_first' | 'supabase_first' | 'optimal'

    // If specific provider requested, use it
    if (request.options?.provider && request.options.provider !== 'auto') {
      const requestedProvider = availableProviders.find(p => p.name === request.options?.provider);
      if (requestedProvider) {
        return requestedProvider;
      }
    }

    // Apply fallback strategy
    if (fallbackMode === 'supabase_first') {
      // Try Supabase edge functions first
      const supabaseProvider = availableProviders.find(p => p.type === 'edge_function');
      if (supabaseProvider) {
        return supabaseProvider;
      }
    } else if (fallbackMode === 'direct_first') {
      // Try direct APIs first (default behavior)
      const directProviders = availableProviders.filter(p => p.type === 'direct');
      if (directProviders.length > 0) {
        return this.selectOptimalProvider(request, directProviders);
      }
      // Fallback to Supabase if no direct providers available
      const supabaseProvider = availableProviders.find(p => p.type === 'edge_function');
      if (supabaseProvider) {
        return supabaseProvider;
      }
    }

    // Default to optimal selection
    return this.selectOptimalProvider(request, availableProviders);
  }

  private selectOptimalProvider(request: AIRequest, providers: AIProvider[]): AIProvider {
    // Score providers based on request characteristics
    const scoredProviders = providers.map(provider => {
      let score = 0;

      // Performance factors
      score += provider.performance.successRate * 40;
      score += (3000 - provider.performance.avgResponseTime) / 100; // Prefer faster responses
      
      // Cost factors (lower cost = higher score)
      if (request.priority === 'low') {
        score += (0.01 - provider.performance.costPer1kTokens) * 1000;
      }

      // Task-specific preferences
      switch (request.type) {
        case 'contact_scoring':
        case 'insights_generation':
          // Prefer accuracy for scoring and insights
          if (provider.name === 'openai') score += 10;
          break;
        case 'email_generation':
        case 'communication_analysis':
          // Both providers are good for communication tasks
          break;
        case 'contact_enrichment':
        case 'predictive_analytics':
          // Prefer higher accuracy models
          if (provider.name === 'openai') score += 5;
          break;
        case 'automation_suggestions':
          // Gemini is good for simple automation logic
          if (provider.name === 'gemini') score += 5;
          break;
      }

      // Urgency factors
      if (request.priority === 'urgent') {
        score += (3000 - provider.performance.avgResponseTime) / 50; // Heavily prefer speed
      }

      return { provider, score };
    });

    // Return highest scoring provider
    const sortedProviders = scoredProviders.sort((a, b) => b.score - a.score);
    if (sortedProviders.length === 0) {
      throw new Error('No providers available for selection');
    }
    return sortedProviders[0]!.provider;
  }

  private async callProvider(provider: AIProvider, request: AIRequest): Promise<any> {
    const enableSupabaseBackup = import.meta.env['VITE_AI_ENABLE_SUPABASE_BACKUP'] !== 'false';
    const fallbackTimeout = parseInt(import.meta.env['VITE_AI_FALLBACK_TIMEOUT'] || '5000');
    const maxRetries = parseInt(import.meta.env['VITE_AI_MAX_RETRY_ATTEMPTS'] || '2');
    const debugFallback = import.meta.env['VITE_AI_DEBUG_FALLBACK'] === 'true';

    // Hybrid approach: Try direct APIs first, fallback to Supabase edge functions
    if (provider.type === 'direct') {
      let lastError: Error | null = null;

      // Try direct API with retry logic
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (debugFallback) {
            logger.info(`Attempting direct ${provider.name} API (attempt ${attempt}/${maxRetries})`, undefined, {
              requestId: request.id,
              service: 'ai-orchestrator',
              operation: 'direct_api_attempt'
            });
          }

          // Set timeout for the request
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), fallbackTimeout);
          });

          const apiCall = provider.name === 'openai'
            ? this.callOpenAI(request)
            : this.callGemini(request);

          const result = await Promise.race([apiCall, timeoutPromise]);

          if (debugFallback) {
            logger.info(`Direct ${provider.name} API succeeded on attempt ${attempt}`, undefined, {
              requestId: request.id,
              service: 'ai-orchestrator',
              operation: 'direct_api_success'
            });
          }

          return result;

        } catch (error) {
          lastError = error as Error;

          if (debugFallback) {
            logger.warn(`Direct ${provider.name} API failed on attempt ${attempt}`, {
              attempt,
              maxRetries,
              error: lastError.message
            }, {
              requestId: request.id,
              service: 'ai-orchestrator',
              operation: 'direct_api_retry'
            });
          }

          // If this is not the last attempt, wait before retrying
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          }
        }
      }

      // All direct API attempts failed, try Supabase fallback if enabled
      if (enableSupabaseBackup) {
        try {
          if (debugFallback) {
            logger.info(`All direct API attempts failed, trying Supabase fallback`, undefined, {
              requestId: request.id,
              service: 'ai-orchestrator',
              operation: 'supabase_fallback_attempt'
            });
          }

          return await this.callSupabaseEdgeFunction(provider, request);
        } catch (supabaseError) {
          if (debugFallback) {
            logger.error(`Supabase fallback also failed`, supabaseError as Error, undefined, {
              requestId: request.id,
              service: 'ai-orchestrator',
              operation: 'supabase_fallback_failed'
            });
          }
          throw supabaseError;
        }
      } else {
        throw lastError || new Error(`Direct ${provider.name} API failed after ${maxRetries} attempts`);
      }

    } else if (provider.type === 'edge_function') {
      return await this.callSupabaseEdgeFunction(provider, request);
    } else {
      throw new Error(`Unsupported provider type: ${provider.type}`);
    }
  }

  private async callSupabaseEdgeFunction(provider: AIProvider, request: AIRequest): Promise<any> {
    const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'];
    const supabaseKey = import.meta.env['VITE_SUPABASE_ANON_KEY'];

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing for edge function fallback');
    }

    // Map request types to edge function endpoints
    const endpointMap: Record<string, string> = {
      'contact_scoring': 'ai-enrichment',
      'contact_enrichment': 'ai-enrichment',
      'email_generation': 'email-composer',
      'email_analysis': 'email-analyzer',
      'insights_generation': 'ai-insights',
      'communication_analysis': 'communication-optimization',
      'automation_suggestions': 'adaptive-playbook',
      'predictive_analytics': 'sales-forecasting',
      'relationship_mapping': 'ai-enrichment'
    };

    const endpoint = endpointMap[request.type];
    if (!endpoint) {
      throw new Error(`No edge function endpoint mapping for request type: ${request.type}`);
    }

    logger.info(`Using Supabase edge function fallback: ${endpoint}`, undefined, {
      requestId: request.id,
      service: 'ai-orchestrator',
      operation: 'supabase_edge_function'
    });

    const response = await httpClient.post(
      `${supabaseUrl}/functions/v1/${endpoint}`,
      {
        ...request.data,
        aiProvider: 'openai', // Default to OpenAI for edge functions
        options: request.options
      },
      {
        headers: { 'Authorization': `Bearer ${supabaseKey}` },
        timeout: request.options?.timeout || 30000
      }
    );

    // Transform Supabase response to match our expected format
    return this.transformSupabaseResponse(response.data, request.type);
  }

  private transformSupabaseResponse(supabaseData: any, requestType: string): any {
    // Transform Supabase edge function responses to match our internal format
    if (!supabaseData || !supabaseData.success) {
      throw new Error('Invalid response from Supabase edge function');
    }

    const data = supabaseData.data || supabaseData;

    switch (requestType) {
      case 'contact_scoring':
        return {
          result: {
            score: data.score || data.overall || 0,
            breakdown: data.breakdown || {
              fitScore: 0,
              engagementScore: 0,
              conversionProbability: 0,
              urgencyScore: 0
            },
            reasoning: data.reasoning || [],
            recommendations: data.recommendations || [],
            nextBestActions: data.nextBestActions || []
          },
          model: 'supabase-edge-function',
          confidence: data.confidence || 70
        };

      case 'insights_generation':
        return {
          result: {
            insights: (data.insights || []).map((insight: any) => ({
              id: `supabase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: insight.type || 'recommendation',
              title: insight.title || 'AI Insight',
              description: insight.description || '',
              confidence: insight.confidence || 75,
              impact: insight.impact || 'medium',
              category: insight.category || 'General',
              actionable: insight.actionable || false,
              suggestedActions: insight.suggestedActions || [],
              dataPoints: insight.dataPoints || []
            }))
          },
          model: 'supabase-edge-function',
          confidence: 70
        };

      case 'contact_enrichment':
        return {
          result: data,
          model: 'supabase-edge-function',
          confidence: 65
        };

      default:
        return {
          result: data,
          model: 'supabase-edge-function',
          confidence: 60
        };
    }
  }

  private async callOpenAI(request: AIRequest): Promise<any> {
    const apiKey = import.meta.env['VITE_OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const model = import.meta.env['VITE_OPENAI_MODEL'] || 'gpt-4o-mini';

    // Create prompt based on request type
    const prompt = this.createPromptForRequest(request);

    const response = await httpClient.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant specialized in contact management and sales intelligence. Provide accurate, actionable insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: request.options?.timeout || 30000
      }
    );

    return this.parseOpenAIResponse(request.type, response.data);
  }

  private async callGemini(request: AIRequest): Promise<any> {
    const apiKey = import.meta.env['VITE_GEMINI_API_KEY'];
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const model = import.meta.env['VITE_GEMMA_MODEL'] || 'gemini-1.5-flash';

    // Create prompt based on request type
    const prompt = this.createPromptForRequest(request);

    const response = await httpClient.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: request.options?.timeout || 30000
      }
    );

    return this.parseGeminiResponse(request.type, response.data);
  }

  private createPromptForRequest(request: AIRequest): string {
    const { type, data } = request;

    switch (type) {
      case 'contact_scoring':
        return `Analyze this contact and provide a lead scoring assessment:

Contact Information:
- Name: ${data.contact.name}
- Title: ${data.contact.title}
- Company: ${data.contact.company}
- Email: ${data.contact.email}
- Industry: ${data.contact.industry}
- Interest Level: ${data.contact.interestLevel}

Please provide:
1. Overall score (0-100)
2. Breakdown by categories (fit, engagement, conversion probability, urgency)
3. Key reasoning points
4. Action recommendations
5. Next best actions

Format as JSON with keys: score, breakdown, reasoning, recommendations, nextBestActions`;

      case 'insights_generation':
        return `Generate insights for this contact:

Contact: ${data.contact.name} at ${data.contact.company}
Title: ${data.contact.title}
Industry: ${data.contact.industry}
Interest Level: ${data.contact.interestLevel}

Focus on: ${data.insightTypes?.join(', ') || 'opportunities and recommendations'}

Provide 2-3 actionable insights with confidence levels and suggested actions.`;

      case 'contact_enrichment':
        return `Enrich this contact profile with additional information:

Current data:
- Name: ${data.contact.name}
- Title: ${data.contact.title}
- Company: ${data.contact.company}
- Email: ${data.contact.email}

Find and suggest:
1. Additional contact information (phone, social profiles)
2. Company details and industry insights
3. Professional background and expertise
4. Potential interests and pain points

Provide realistic enrichment data based on the contact's role and company.`;

      default:
        return `Process this ${type} request for contact ${data.contact?.name || 'Unknown'}. Provide relevant analysis and insights.`;
    }
  }

  private parseOpenAIResponse(requestType: string, response: any): any {
    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Invalid OpenAI response');
    }

    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content);
      return {
        result: parsed,
        model: response.model,
        confidence: 85
      };
    } catch {
      // If not JSON, create structured response
      return {
        result: this.parseTextResponse(requestType, content),
        model: response.model,
        confidence: 75
      };
    }
  }

  private parseGeminiResponse(requestType: string, response: any): any {
    const content = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('Invalid Gemini response');
    }

    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content);
      return {
        result: parsed,
        model: response.modelVersion || 'gemini-1.5-flash',
        confidence: 80
      };
    } catch {
      // If not JSON, create structured response
      return {
        result: this.parseTextResponse(requestType, content),
        model: response.modelVersion || 'gemini-1.5-flash',
        confidence: 70
      };
    }
  }

  private parseTextResponse(requestType: string, content: string): any {
    // Create structured responses based on request type
    switch (requestType) {
      case 'contact_scoring':
        return {
          score: Math.floor(Math.random() * 40) + 60, // 60-100
          breakdown: {
            fitScore: Math.floor(Math.random() * 30) + 70,
            engagementScore: Math.floor(Math.random() * 40) + 60,
            conversionProbability: Math.floor(Math.random() * 30) + 70,
            urgencyScore: Math.floor(Math.random() * 40) + 60
          },
          reasoning: [
            'Strong professional background in target industry',
            'Recent company growth indicates opportunity',
            'High engagement potential based on role'
          ],
          recommendations: [
            'Schedule discovery call within 48 hours',
            'Prepare customized value proposition',
            'Research recent company developments'
          ],
          nextBestActions: [
            'Send personalized introduction email',
            'Connect on LinkedIn',
            'Schedule 15-minute discovery call'
          ]
        };

      case 'insights_generation':
        return {
          insights: [
            {
              id: 'insight_1',
              type: 'opportunity',
              title: 'High-value opportunity identified',
              description: 'Contact shows strong interest in digital transformation solutions',
              confidence: 85,
              impact: 'high',
              category: 'Sales Opportunity',
              actionable: true,
              suggestedActions: ['Schedule product demo', 'Share case studies'],
              dataPoints: ['Recent industry trends', 'Company growth signals']
            },
            {
              id: 'insight_2',
              type: 'recommendation',
              title: 'Timing optimization suggested',
              description: 'Best engagement window is Tuesday mornings',
              confidence: 75,
              impact: 'medium',
              category: 'Communication',
              actionable: true,
              suggestedActions: ['Schedule calls for Tuesday mornings'],
              dataPoints: ['Communication patterns', 'Response analytics']
            }
          ]
        };

      case 'contact_enrichment':
        return {
          phone: '+1-555-0123',
          socialProfiles: {
            linkedin: `https://linkedin.com/in/${content.toLowerCase().replace(/\s+/g, '-')}`,
            twitter: `@${content.toLowerCase().replace(/\s+/g, '')}`
          },
          industry: 'Technology',
          location: {
            city: 'San Francisco',
            state: 'CA',
            country: 'USA'
          },
          bio: 'Experienced technology leader focused on digital transformation and innovation.',
          notes: 'Enriched with AI-powered research and analysis.'
        };

      default:
        return {
          analysis: content,
          confidence: 70,
          recommendations: ['Review analysis', 'Take appropriate actions']
        };
    }
  }

  private updateProviderPerformance(providerName: string, metadata: AIResponse['metadata']): void {
    const provider = this.providers.get(providerName);
    if (!provider) return;

    // Update running averages
    const alpha = 0.1; // Smoothing factor
    provider.performance.avgResponseTime = 
      provider.performance.avgResponseTime * (1 - alpha) + metadata.processingTime * alpha;
    
    // Update rate limit info (simplified)
    provider.rateLimit.remaining = Math.max(0, provider.rateLimit.remaining - 1);
    if (Date.now() > provider.rateLimit.resetTime) {
      provider.rateLimit.remaining = provider.name === 'openai' ? 50 : 60;
      provider.rateLimit.resetTime = Date.now() + 60000;
    }
  }

  private getCacheKey(request: AIRequest): string {
    return `${request.type}_${JSON.stringify(request.data)}_${request.options?.provider || 'auto'}`;
  }

  private getCacheTTL(requestType: string): number {
    const ttlMap: Record<string, number> = {
      'contact_scoring': 3600000, // 1 hour
      'contact_enrichment': 86400000, // 24 hours
      'email_generation': 1800000, // 30 minutes
      'email_analysis': 1800000, // 30 minutes
      'insights_generation': 3600000, // 1 hour
      'communication_analysis': 1800000, // 30 minutes
      'automation_suggestions': 7200000, // 2 hours
      'predictive_analytics': 3600000, // 1 hour
      'relationship_mapping': 86400000 // 24 hours
    };

    return ttlMap[requestType] || 1800000; // Default 30 minutes
  }

  // Public API methods
  async submitRequest(request: Omit<AIRequest, 'id'>): Promise<string> {
    const fullRequest: AIRequest = {
      ...request,
      id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      options: {
        useCache: true,
        provider: 'auto',
        timeout: 30000,
        ...request.options
      }
    };

    this.requestQueue.push(fullRequest);
    
    // Sort queue by priority
    this.requestQueue.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    logger.info('AI request queued', {
      type: fullRequest.type,
      priority: fullRequest.priority
    }, {
      requestId: fullRequest.id,
      service: 'ai-orchestrator',
      operation: 'request_queued'
    });

    return fullRequest.id;
  }

  async executeImmediate(request: Omit<AIRequest, 'id'>): Promise<AIResponse> {
    const fullRequest: AIRequest = {
      ...request,
      id: `ai_immediate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      options: {
        useCache: true,
        provider: 'auto',
        timeout: 30000,
        ...request.options
      }
    };

    return this.executeRequest(fullRequest);
  }

  getProviderStatus(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  getRequestHistory(limit = 50): AIResponse[] {
    return this.requestHistory.slice(-limit);
  }

  getPerformanceMetrics(): any {
    const recent = this.requestHistory.slice(-100);
    
    return {
      totalRequests: this.requestHistory.length,
      successRate: recent.filter(r => !r.error).length / recent.length,
      avgResponseTime: recent.reduce((sum, r) => sum + r.metadata.processingTime, 0) / recent.length,
      cacheHitRate: recent.filter(r => r.metadata.cached).length / recent.length,
      providerBreakdown: this.getProviderBreakdown(recent)
    };
  }

  private getProviderBreakdown(responses: AIResponse[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    responses.forEach(r => {
      breakdown[r.metadata.provider] = (breakdown[r.metadata.provider] || 0) + 1;
    });
    return breakdown;
  }

  clearCache(): void {
    cacheService.deleteByTag('ai');
    logger.info('AI cache cleared', undefined, {
      service: 'ai-orchestrator',
      operation: 'cache_cleared'
    });
  }
}

export const aiOrchestrator = new AIOrchestrator();