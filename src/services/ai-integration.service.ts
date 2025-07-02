/**
 * AI Integration Service
 * Enhanced with proper Gemma and Gemini 2.5 Flash model support
 */

import { httpClient } from './http-client.service';
import { validationService } from './validation.service';
import { cacheService } from './cache.service';
import { logger } from './logger.service';
import { rateLimiter } from './rate-limiter.service';
import { Contact } from '../types/contact';
import { ContactEnrichmentData } from './aiEnrichmentService';
import apiConfig, { getDefaultModel, getBestModelForTask } from '../config/api.config';

export interface AIAnalysisRequest {
  contactId: string;
  contact: Contact;
  analysisTypes: ('scoring' | 'enrichment' | 'categorization' | 'tagging' | 'relationships')[];
  options?: {
    forceRefresh?: boolean;
    provider?: 'openai' | 'gemini' | 'anthropic';
    model?: string;
    includeConfidence?: boolean;
  };
}

export interface AIAnalysisResponse {
  contactId: string;
  score?: number;
  confidence: number;
  insights: string[];
  recommendations: string[];
  categories: string[];
  tags: string[];
  enrichmentData?: ContactEnrichmentData;
  relationships?: ContactRelationship[];
  provider: string;
  model: string;
  timestamp: string;
  processingTime: number;
}

export interface ContactRelationship {
  type: 'colleague' | 'competitor' | 'client' | 'vendor' | 'partner';
  contactId: string;
  contactName: string;
  company: string;
  strength: number; // 0-1
  reason: string;
}

export interface BulkAnalysisRequest {
  contactIds: string[];
  analysisTypes: AIAnalysisRequest['analysisTypes'];
  options?: AIAnalysisRequest['options'];
}

export interface BulkAnalysisResponse {
  results: AIAnalysisResponse[];
  failed: Array<{ contactId: string; error: string }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    averageScore: number;
    processingTime: number;
  };
}

class AIIntegrationService {
  private getAvailableProviders(): Array<{ name: string; config: any }> {
    return Object.entries(apiConfig.aiProviders)
      .filter(([_, config]) => config.enabled && config.apiKey)
      .map(([name, config]) => ({ name, config }))
      .sort((a, b) => a.config.priority - b.config.priority);
  }
  
  private async selectProvider(
    preferredProvider?: string,
    capability?: string
  ): Promise<{ name: string; config: any }> {
    const providers = this.getAvailableProviders();
    
    if (providers.length === 0) {
      throw new Error('No AI providers available');
    }
    
    // Use preferred provider if specified and available
    if (preferredProvider) {
      const provider = providers.find(p => p.name === preferredProvider);
      if (provider) {
        return provider;
      }
    }
    
    // Filter by capability if specified
    let filteredProviders = providers;
    if (capability) {
      filteredProviders = providers.filter(p => 
        p.config.capabilities.includes(capability)
      );
    }
    
    // Return highest priority provider
    return filteredProviders[0] || providers[0];
  }
  
  private selectModel(provider: any, options?: AIAnalysisRequest['options'], capability?: string): string {
    // Use specific model if requested
    if (options?.model) {
      const model = provider.config.models.find((m: any) => m.id === options.model);
      if (model) {
        return options.model;
      }
    }
    
    // Find best model for capability
    if (capability) {
      const capableModels = provider.config.models.filter((m: any) => 
        m.capabilities.includes(capability)
      );
      if (capableModels.length > 0) {
        return capableModels[0].id;
      }
    }
    
    // Use default model
    return provider.config.defaultModel;
  }
  
  private async makeAIRequest<T>(
    provider: { name: string; config: any },
    model: string,
    payload: any,
    timeout = 45000
  ): Promise<T> {
    const rateLimitKey = `ai_${provider.name}`;
    const endpoint = this.getProviderEndpoint(provider.name, model);
    
    // Check rate limits
    const rateLimitResult = await rateLimiter.checkLimit(
      rateLimitKey,
      'default',
      endpoint,
      provider.config.endpoint.rateLimit
    );
    
    if (!rateLimitResult.allowed) {
      throw new Error(`Rate limit exceeded for ${provider.name}. Try again in ${Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)} seconds.`);
    }
    
    const url = `${provider.config.endpoint.baseURL}${endpoint}`;
    
    try {
      const response = await httpClient.post<T>(url, payload, {
        headers: {
          'Authorization': `Bearer ${provider.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout,
        retries: provider.config.endpoint.retries,
      });
      
      // Update rate limiter
      await rateLimiter.increment(rateLimitKey, 'default', endpoint, true, provider.config.endpoint.rateLimit);
      
      return response.data;
    } catch (error) {
      // Update rate limiter for failed request
      await rateLimiter.increment(rateLimitKey, 'default', endpoint, false, provider.config.endpoint.rateLimit);
      throw error;
    }
  }
  
  private getProviderEndpoint(providerName: string, model: string): string {
    switch (providerName) {
      case 'openai':
        return '/chat/completions';
      case 'gemini':
        // Handle different model types for Gemini/Gemma
        if (model.includes('gemma') || model.includes('codegemma')) {
          return `/models/${model}:generateContent`;
        } else {
          return `/models/${model}:generateContent`;
        }
      case 'anthropic':
        return '/messages';
      default:
        throw new Error(`Unsupported provider: ${providerName}`);
    }
  }
  
  private buildProviderPayload(
    providerName: string,
    model: string,
    contact: Contact,
    analysisTypes: string[],
    options?: AIAnalysisRequest['options']
  ): any {
    const systemPrompt = this.buildSystemPrompt(analysisTypes);
    const userPrompt = this.buildUserPrompt(contact, analysisTypes);
    
    switch (providerName) {
      case 'openai':
        return {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          functions: [{
            name: 'analyze_contact',
            description: 'Analyze contact and provide structured insights',
            parameters: {
              type: 'object',
              properties: {
                score: { type: 'number', minimum: 0, maximum: 100 },
                confidence: { type: 'number', minimum: 0, maximum: 100 },
                insights: { type: 'array', items: { type: 'string' } },
                recommendations: { type: 'array', items: { type: 'string' } },
                categories: { type: 'array', items: { type: 'string' } },
                tags: { type: 'array', items: { type: 'string' } },
              },
            },
          }],
          function_call: { name: 'analyze_contact' },
          temperature: 0.3,
        };
        
      case 'gemini':
        // Enhanced payload for Gemini/Gemma models
        if (model.includes('gemma') || model.includes('codegemma')) {
          // Gemma models optimized payload
          return {
            contents: [{
              parts: [{
                text: `${systemPrompt}\n\n${userPrompt}\n\nProvide analysis in JSON format with fields: score, confidence, insights, recommendations, categories, tags.`
              }]
            }],
            generationConfig: {
              temperature: 0.3,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
              candidateCount: 1,
            },
            safetySettings: [
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              }
            ]
          };
        } else {
          // Gemini models payload
          return {
            contents: [{
              parts: [{
                text: `${systemPrompt}\n\n${userPrompt}\n\nProvide a detailed JSON analysis with the following structure:
{
  "score": number (0-100),
  "confidence": number (0-100),
  "insights": string[],
  "recommendations": string[],
  "categories": string[],
  "tags": string[]
}`
              }]
            }],
            generationConfig: {
              temperature: 0.2,
              topK: 32,
              topP: 0.8,
              maxOutputTokens: 4096,
              candidateCount: 1,
            }
          };
        }
        
      case 'anthropic':
        return {
          model,
          max_tokens: 2048,
          temperature: 0.3,
          messages: [{
            role: 'user',
            content: `${systemPrompt}\n\n${userPrompt}\n\nProvide structured analysis in JSON format.`
          }],
        };
        
      default:
        throw new Error(`Unsupported provider: ${providerName}`);
    }
  }
  
  private buildSystemPrompt(analysisTypes: string[]): string {
    const basePrompt = "You are an expert CRM analyst with deep expertise in sales, marketing, and customer relationship management.";
    
    const typePrompts = {
      scoring: "Analyze lead quality and provide a score from 0-100 based on engagement potential, company fit, and buying signals.",
      enrichment: "Enhance contact data by inferring missing information from available context and industry patterns.",
      categorization: "Classify contacts into relevant business categories based on their profile and company.",
      tagging: "Generate relevant tags that help with contact management and segmentation.",
      relationships: "Identify potential relationships and connections between contacts within the same industry or network."
    };
    
    const activePrompts = analysisTypes.map(type => typePrompts[type as keyof typeof typePrompts]).filter(Boolean);
    
    return `${basePrompt}\n\nYour tasks:\n${activePrompts.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
  }
  
  private buildUserPrompt(contact: Contact, analysisTypes: string[]): string {
    return `Analyze this contact:

Name: ${contact.name}
Email: ${contact.email}
Title: ${contact.title}
Company: ${contact.company}
Industry: ${contact.industry || 'Unknown'}
Interest Level: ${contact.interestLevel}
Status: ${contact.status}
Sources: ${contact.sources.join(', ')}
${contact.notes ? `Notes: ${contact.notes}` : ''}
${contact.tags ? `Current Tags: ${contact.tags.join(', ')}` : ''}

Analysis Types Requested: ${analysisTypes.join(', ')}

Provide detailed insights and actionable recommendations based on this contact's profile.`;
  }
  
  async analyzeContact(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const startTime = Date.now();
    
    // Validate request
    if (!request.contactId || !request.contact) {
      throw new Error('Contact ID and contact data are required');
    }
    
    if (!request.analysisTypes || request.analysisTypes.length === 0) {
      throw new Error('At least one analysis type is required');
    }
    
    // Check cache first (unless force refresh)
    const cacheKey = `${request.contactId}_${request.analysisTypes.join('_')}_${request.options?.model || 'default'}`;
    if (!request.options?.forceRefresh) {
      const cached = cacheService.getAIAnalysis(cacheKey);
      if (cached) {
        logger.debug('AI analysis cache hit', { contactId: request.contactId });
        return cached;
      }
    }
    
    try {
      // Select AI provider
      const provider = await this.selectProvider(
        request.options?.provider,
        request.analysisTypes[0] // Use first analysis type for capability matching
      );
      
      // Select model
      const model = this.selectModel(provider, request.options, request.analysisTypes[0]);
      
      logger.info(`Starting AI analysis with ${provider.name}/${model}`, {
        contactId: request.contactId,
        analysisTypes: request.analysisTypes,
        provider: provider.name,
        model,
      });
      
      // Build provider-specific payload
      const payload = this.buildProviderPayload(
        provider.name,
        model,
        request.contact,
        request.analysisTypes,
        request.options
      );
      
      // Make AI request
      const response = await this.makeAIRequest(provider, model, payload);
      
      // Parse and structure response
      const analysisResult = this.parseAIResponse(response, provider.name, model);
      
      const aiAnalysisResponse: AIAnalysisResponse = {
        contactId: request.contactId,
        ...analysisResult,
        provider: provider.name,
        model,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
      };
      
      // Cache the result
      cacheService.setAIAnalysis(cacheKey, aiAnalysisResponse, 3600000); // Cache for 1 hour
      
      logger.info('AI analysis completed successfully', {
        contactId: request.contactId,
        provider: provider.name,
        model,
        processingTime: aiAnalysisResponse.processingTime,
        score: aiAnalysisResponse.score,
      });
      
      return aiAnalysisResponse;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('AI analysis failed', error as Error, {
        contactId: request.contactId,
        analysisTypes: request.analysisTypes,
        processingTime,
      });
      
      throw error;
    }
  }
  
  private parseAIResponse(response: any, provider: string, model: string): Partial<AIAnalysisResponse> {
    try {
      let parsedData: any;
      
      switch (provider) {
        case 'openai':
          if (response.choices?.[0]?.message?.function_call?.arguments) {
            parsedData = JSON.parse(response.choices[0].message.function_call.arguments);
          } else if (response.choices?.[0]?.message?.content) {
            const content = response.choices[0].message.content;
            parsedData = this.extractJSONFromText(content);
          } else {
            throw new Error('Invalid OpenAI response format');
          }
          break;
          
        case 'gemini':
          if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
            const textResponse = response.candidates[0].content.parts[0].text;
            parsedData = this.extractJSONFromText(textResponse);
          } else {
            throw new Error('Invalid Gemini/Gemma response format');
          }
          break;
          
        case 'anthropic':
          if (response.content?.[0]?.text) {
            const textResponse = response.content[0].text;
            parsedData = this.extractJSONFromText(textResponse);
          } else {
            throw new Error('Invalid Anthropic response format');
          }
          break;
          
        default:
          throw new Error(`Unsupported provider for parsing: ${provider}`);
      }
      
      // Validate parsed data
      const validation = validationService.validateAIAnalysis(parsedData);
      if (!validation.isValid) {
        logger.warn('AI response validation failed', validation.errors);
      }
      
      return {
        score: parsedData.score || 0,
        confidence: parsedData.confidence || 50,
        insights: Array.isArray(parsedData.insights) ? parsedData.insights : [],
        recommendations: Array.isArray(parsedData.recommendations) ? parsedData.recommendations : [],
        categories: Array.isArray(parsedData.categories) ? parsedData.categories : [],
        tags: Array.isArray(parsedData.tags) ? parsedData.tags : [],
        enrichmentData: parsedData.enrichmentData,
        relationships: parsedData.relationships,
      };
      
    } catch (error) {
      logger.error('Failed to parse AI response', error as Error, { provider, model, response });
      
      // Return default response on parse failure
      return {
        score: 0,
        confidence: 0,
        insights: [`Analysis parsing failed for ${provider}/${model}`],
        recommendations: ['Unable to provide recommendations due to parsing error'],
        categories: [],
        tags: [],
      };
    }
  }
  
  private extractJSONFromText(text: string): any {
    // Try to find JSON in the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        // If direct parsing fails, try cleaning the text
        const cleaned = text
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .replace(/^[^{]*/, '')
          .replace(/[^}]*$/, '');
        return JSON.parse(cleaned);
      }
    }
    
    throw new Error('No valid JSON found in response');
  }
  
  async analyzeBulk(request: BulkAnalysisRequest): Promise<BulkAnalysisResponse> {
    const startTime = Date.now();
    
    if (!request.contactIds || request.contactIds.length === 0) {
      throw new Error('Contact IDs are required');
    }
    
    if (request.contactIds.length > 50) {
      throw new Error('Bulk analysis is limited to 50 contacts at a time');
    }
    
    logger.info('Starting bulk AI analysis', {
      contactCount: request.contactIds.length,
      analysisTypes: request.analysisTypes,
    });
    
    const results: AIAnalysisResponse[] = [];
    const failed: Array<{ contactId: string; error: string }> = [];
    
    // Process contacts in parallel with concurrency limit
    const concurrencyLimit = 5;
    const batches = [];
    
    for (let i = 0; i < request.contactIds.length; i += concurrencyLimit) {
      batches.push(request.contactIds.slice(i, i + concurrencyLimit));
    }
    
    for (const batch of batches) {
      const promises = batch.map(async (contactId) => {
        try {
          // Get contact data (from cache or API)
          let contact = cacheService.getContact(contactId);
          if (!contact) {
            // Import contact service to get contact data
            const { contactAPI } = await import('./contact-api.service');
            contact = await contactAPI.getContact(contactId);
          }
          
          const analysisRequest: AIAnalysisRequest = {
            contactId,
            contact,
            analysisTypes: request.analysisTypes,
            options: request.options,
          };
          
          const result = await this.analyzeContact(analysisRequest);
          results.push(result);
          
        } catch (error) {
          failed.push({
            contactId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          
          logger.error('Bulk analysis failed for contact', error as Error, { contactId });
        }
      });
      
      await Promise.all(promises);
      
      // Small delay between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const processingTime = Date.now() - startTime;
    const averageScore = results.length > 0 
      ? results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length 
      : 0;
    
    const response: BulkAnalysisResponse = {
      results,
      failed,
      summary: {
        total: request.contactIds.length,
        successful: results.length,
        failed: failed.length,
        averageScore: Math.round(averageScore),
        processingTime,
      },
    };
    
    logger.info('Bulk AI analysis completed', response.summary);
    
    return response;
  }
  
  async enrichContact(
    contactId: string,
    enrichmentRequest: Partial<ContactEnrichmentData>
  ): Promise<ContactEnrichmentData> {
    const validation = validationService.validateEnrichmentRequest(enrichmentRequest);
    if (!validation.isValid) {
      throw new Error(`Enrichment request validation failed: ${Object.values(validation.errors).flat().join(', ')}`);
    }
    
    // Check cache first
    const cacheKey = `enrichment_${JSON.stringify(enrichmentRequest)}`;
    const cached = cacheService.get<ContactEnrichmentData>('enrichment', cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const provider = await this.selectProvider(undefined, 'enrichment');
      
      logger.info(`Starting contact enrichment with ${provider.name}`, {
        contactId,
        provider: provider.name,
      });
      
      // Use the existing enrichment service based on the request type
      let enrichmentData: ContactEnrichmentData;
      
      if (enrichmentRequest.email) {
        const { aiEnrichmentService } = await import('./aiEnrichmentService');
        enrichmentData = await aiEnrichmentService.enrichContactByEmail(enrichmentRequest.email);
      } else if (enrichmentRequest.firstName) {
        const { aiEnrichmentService } = await import('./aiEnrichmentService');
        enrichmentData = await aiEnrichmentService.enrichContactByName(
          enrichmentRequest.firstName,
          enrichmentRequest.lastName || '',
          enrichmentRequest.company
        );
      } else {
        throw new Error('Insufficient data for enrichment');
      }
      
      // Cache the result
      cacheService.set('enrichment', cacheKey, enrichmentData, 86400000); // Cache for 24 hours
      
      logger.info('Contact enrichment completed successfully', {
        contactId,
        provider: provider.name,
        confidence: enrichmentData.confidence,
      });
      
      return enrichmentData;
      
    } catch (error) {
      logger.error('Contact enrichment failed', error as Error, {
        contactId,
        enrichmentRequest,
      });
      throw error;
    }
  }
  
  // Utility methods
  async getProviderStatus(): Promise<Array<{ name: string; status: 'available' | 'rate_limited' | 'error'; remaining?: number; models?: string[] }>> {
    const providers = this.getAvailableProviders();
    const status = [];
    
    for (const provider of providers) {
      try {
        const remaining = await rateLimiter.getRemainingRequests(
          `ai_${provider.name}`,
          'default',
          'test',
          provider.config.endpoint.rateLimit
        );
        
        status.push({
          name: provider.name,
          status: remaining > 0 ? 'available' : 'rate_limited',
          remaining,
          models: provider.config.models.map((m: any) => m.id),
        });
      } catch (error) {
        status.push({
          name: provider.name,
          status: 'error',
          models: [],
        });
      }
    }
    
    return status;
  }
  
  async clearCache(contactId?: string): Promise<void> {
    if (contactId) {
      cacheService.deleteByTag('ai');
      cacheService.delete('ai_analysis', contactId);
    } else {
      cacheService.deleteByTag('ai');
      cacheService.deleteByTag('enrichment');
    }
    
    logger.info('AI cache cleared', { contactId });
  }
  
  // Model information methods
  getAvailableModels(capability?: string): Array<{ provider: string; model: string; name: string; capabilities: string[] }> {
    const models: Array<{ provider: string; model: string; name: string; capabilities: string[] }> = [];
    
    Object.entries(apiConfig.aiProviders).forEach(([providerName, provider]) => {
      if (provider.enabled) {
        provider.models.forEach(model => {
          if (!capability || model.capabilities.includes(capability)) {
            models.push({
              provider: providerName,
              model: model.id,
              name: model.name,
              capabilities: model.capabilities,
            });
          }
        });
      }
    });
    
    return models;
  }
  
  getModelInfo(providerName: string, modelId: string): any {
    const provider = apiConfig.aiProviders[providerName as keyof typeof apiConfig.aiProviders];
    if (!provider) return null;
    
    return provider.models.find(m => m.id === modelId) || null;
  }
}

export const aiIntegration = new AIIntegrationService();