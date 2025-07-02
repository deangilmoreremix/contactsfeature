/**
 * AI Integration Service
 * Unified AI service orchestrating different AI providers for contact enrichment and analysis
 */

import { httpClient } from './http-client.service';
import { validationService } from './validation.service';
import { cacheService } from './cache.service';
import { logger } from './logger.service';
import { rateLimiter } from './rate-limiter.service';
import { Contact } from '../types/contact';
import { ContactEnrichmentData } from './aiEnrichmentService';
import apiConfig from '../config/api.config';

export interface AIAnalysisRequest {
  contactId: string;
  contact: Contact;
  analysisTypes: ('scoring' | 'enrichment' | 'categorization' | 'tagging' | 'relationships')[];
  options?: {
    forceRefresh?: boolean;
    provider?: 'openai' | 'gemini' | 'anthropic';
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
  
  private async makeAIRequest<T>(
    provider: { name: string; config: any },
    endpoint: string,
    data: any,
    timeout = 45000
  ): Promise<T> {
    const rateLimitKey = `ai_${provider.name}`;
    
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
      const response = await httpClient.post<T>(url, data, {
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
    const cacheKey = `${request.contactId}_${request.analysisTypes.join('_')}`;
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
      
      logger.info(`Starting AI analysis with ${provider.name}`, {
        contactId: request.contactId,
        analysisTypes: request.analysisTypes,
        provider: provider.name,
      });
      
      // Prepare AI request payload
      const aiPayload = {
        contact: {
          name: request.contact.name,
          email: request.contact.email,
          title: request.contact.title,
          company: request.contact.company,
          industry: request.contact.industry,
          sources: request.contact.sources,
          interestLevel: request.contact.interestLevel,
          status: request.contact.status,
          notes: request.contact.notes,
          tags: request.contact.tags,
          socialProfiles: request.contact.socialProfiles,
        },
        analysisTypes: request.analysisTypes,
        options: {
          includeConfidence: request.options?.includeConfidence !== false,
          includeRecommendations: true,
          includeEnrichment: request.analysisTypes.includes('enrichment'),
          includeRelationships: request.analysisTypes.includes('relationships'),
        },
      };
      
      // Make AI request based on provider
      let response: any;
      
      switch (provider.name) {
        case 'openai':
          response = await this.makeAIRequest(
            provider,
            '/chat/completions',
            {
              model: 'gpt-4',
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert CRM analyst. Analyze the provided contact and return structured insights.',
                },
                {
                  role: 'user',
                  content: `Analyze this contact: ${JSON.stringify(aiPayload)}`,
                },
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
            }
          );
          break;
          
        case 'gemini':
          response = await this.makeAIRequest(
            provider,
            '/models/gemini-pro:generateContent',
            {
              contents: [{
                parts: [{
                  text: `Analyze this contact and provide structured insights in JSON format: ${JSON.stringify(aiPayload)}`,
                }],
              }],
            }
          );
          break;
          
        case 'anthropic':
          response = await this.makeAIRequest(
            provider,
            '/messages',
            {
              model: 'claude-3-sonnet-20240229',
              max_tokens: 1000,
              messages: [{
                role: 'user',
                content: `Analyze this contact and provide structured insights: ${JSON.stringify(aiPayload)}`,
              }],
            }
          );
          break;
          
        default:
          throw new Error(`Unsupported AI provider: ${provider.name}`);
      }
      
      // Parse and structure response
      const analysisResult = this.parseAIResponse(response, provider.name);
      
      const aiAnalysisResponse: AIAnalysisResponse = {
        contactId: request.contactId,
        ...analysisResult,
        provider: provider.name,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
      };
      
      // Cache the result
      cacheService.setAIAnalysis(cacheKey, aiAnalysisResponse, 3600000); // Cache for 1 hour
      
      logger.info('AI analysis completed successfully', {
        contactId: request.contactId,
        provider: provider.name,
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
  
  private parseAIResponse(response: any, provider: string): Partial<AIAnalysisResponse> {
    try {
      let parsedData: any;
      
      switch (provider) {
        case 'openai':
          if (response.choices?.[0]?.message?.function_call?.arguments) {
            parsedData = JSON.parse(response.choices[0].message.function_call.arguments);
          } else {
            throw new Error('Invalid OpenAI response format');
          }
          break;
          
        case 'gemini':
          if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
            const textResponse = response.candidates[0].content.parts[0].text;
            parsedData = JSON.parse(textResponse);
          } else {
            throw new Error('Invalid Gemini response format');
          }
          break;
          
        case 'anthropic':
          if (response.content?.[0]?.text) {
            parsedData = JSON.parse(response.content[0].text);
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
      logger.error('Failed to parse AI response', error as Error, { provider, response });
      
      // Return default response on parse failure
      return {
        score: 0,
        confidence: 0,
        insights: ['Analysis parsing failed'],
        recommendations: ['Unable to provide recommendations'],
        categories: [],
        tags: [],
      };
    }
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
  async getProviderStatus(): Promise<Array<{ name: string; status: 'available' | 'rate_limited' | 'error'; remaining?: number }>> {
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
        });
      } catch (error) {
        status.push({
          name: provider.name,
          status: 'error',
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
}

export const aiIntegration = new AIIntegrationService();