/**
 * AI Integration Service
 * Contact analysis/enrichment via the server-side AI proxy (src/services/aiClient.ts).
 * Failures are thrown; no fabricated or random results are returned.
 */

import { validationService } from './validation.service';
import { cacheService } from './cache.service';
import { logger } from './logger.service';
import { Contact } from '../types';
import { ContactEnrichmentData, aiEnrichmentService } from './aiEnrichmentService';
import { aiRespond, type AIRole } from './aiClient';

export interface AIAnalysisRequest {
  contactId: string;
  contact: Contact;
  analysisTypes: ('scoring' | 'enrichment' | 'categorization' | 'tagging' | 'relationships')[];
  options?: {
    forceRefresh?: boolean;
    /** @deprecated Ignored: provider/model are resolved server-side. */
    provider?: 'openai';
    /** Model role (default | thinking | fast | pro). Other values are treated as 'default'. */
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

const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    score: { type: 'number' },
    confidence: { type: 'number' },
    insights: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    categories: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } }
  },
  required: ['score', 'confidence', 'insights', 'recommendations', 'categories', 'tags']
};

const ROLES: AIRole[] = ['default', 'thinking', 'fast', 'pro'];
const toRole = (m?: string): AIRole => (ROLES.includes(m as AIRole) ? (m as AIRole) : 'default');

class AIIntegrationService {
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
      logger.info(`Starting AI analysis for contact ${request.contactId}`, { analysisTypes: request.analysisTypes });

      const c = request.contact;
      const wants = request.analysisTypes;
      const profile = {
        name: c.name || `${c.firstName} ${c.lastName}`.trim(),
        title: c.title,
        company: c.company,
        industry: c.industry,
        status: c.status,
        interestLevel: c.interestLevel,
        tags: c.tags,
        notes: c.notes,
        lastConnected: c.lastConnected
      };

      const res = await aiRespond<{
        score: number; confidence: number; insights: string[]; recommendations: string[]; categories: string[]; tags: string[];
      }>({
        role: toRole(request.options?.model),
        instructions:
          'You are a sales intelligence analyst for a CRM. Analyze ONLY the data provided; do not invent facts about the person or company. ' +
          'score is a 0-100 lead quality score (only meaningful if scoring is requested, otherwise 0). confidence is 0-100 reflecting how much data you had. ' +
          'Return empty arrays for sections that were not requested.',
        input: `Requested analyses: ${wants.join(', ')}\n\nContact data:\n${JSON.stringify(profile)}`,
        schema: ANALYSIS_SCHEMA,
        schemaName: 'contact_analysis',
        maxOutputTokens: 1500
      });
      const j = res.json;
      if (!j) throw new Error('AI did not return a valid analysis');

      const result: AIAnalysisResponse = {
        contactId: request.contactId,
        ...(wants.includes('scoring') ? { score: Math.max(0, Math.min(100, Math.round(j.score))) } : {}),
        confidence: Math.max(0, Math.min(100, Math.round(j.confidence))),
        insights: j.insights || [],
        recommendations: j.recommendations || [],
        categories: wants.includes('categorization') ? j.categories || [] : [],
        tags: wants.includes('tagging') ? j.tags || [] : [],
        provider: 'openai',
        model: toRole(request.options?.model),
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };

      if (wants.includes('enrichment')) {
        result.enrichmentData = await this.enrichContact(request.contactId, {
          ...(c.email ? { email: c.email } : {}),
          ...(c.firstName ? { firstName: c.firstName } : {}),
          ...(c.lastName ? { lastName: c.lastName } : {}),
          ...(c.company ? { company: c.company } : {})
        });
      }
      // 'relationships' needs other contacts' data this service does not have; none are fabricated.

      cacheService.setAIAnalysis(cacheKey, result, 3600000); // Cache for 1 hour

      logger.info('AI analysis completed successfully', {
        contactId: request.contactId,
        processingTime: Date.now() - startTime,
        score: result.score
      });

      return result;
    } catch (error) {
      logger.error('AI analysis failed', error as Error, {
        contactId: request.contactId,
        analysisTypes: request.analysisTypes,
        processingTime: Date.now() - startTime
      });
      throw error;
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
      analysisTypes: request.analysisTypes
    });

    // Dynamic import avoids a services <-> store import cycle.
    const { useContactStore } = await import('../hooks/useContactStore');
    const all = useContactStore.getState().contacts as Contact[];

    const results: AIAnalysisResponse[] = [];
    const failed: Array<{ contactId: string; error: string }> = [];

    let next = 0;
    const worker = async () => {
      while (next < request.contactIds.length) {
        const contactId = request.contactIds[next++]!;
        const contact = all.find(c => c.id === contactId);
        if (!contact) {
          failed.push({ contactId, error: 'Contact not found' });
          continue;
        }
        try {
          results.push(await this.analyzeContact({
            contactId,
            contact,
            analysisTypes: request.analysisTypes,
            ...(request.options ? { options: request.options } : {})
          }));
        } catch (error) {
          failed.push({ contactId, error: (error as Error).message || 'Analysis failed' });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, request.contactIds.length) }, worker));

    const scored = results.filter(r => typeof r.score === 'number');
    const result: BulkAnalysisResponse = {
      results,
      failed,
      summary: {
        total: request.contactIds.length,
        successful: results.length,
        failed: failed.length,
        averageScore: scored.length ? scored.reduce((sum, r) => sum + (r.score || 0), 0) / scored.length : 0,
        processingTime: Date.now() - startTime
      }
    };

    logger.info('Bulk AI analysis completed', result.summary);
    return result;
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
      logger.info(`Starting contact enrichment for ${contactId}`);

      let result: ContactEnrichmentData;
      if (enrichmentRequest.socialProfiles?.linkedin) {
        result = await aiEnrichmentService.enrichContactByLinkedIn(enrichmentRequest.socialProfiles.linkedin);
      } else if (enrichmentRequest.firstName) {
        result = await aiEnrichmentService.enrichContactByName(
          enrichmentRequest.firstName,
          enrichmentRequest.lastName || '',
          enrichmentRequest.company
        );
      } else if (enrichmentRequest.email) {
        result = await aiEnrichmentService.enrichContactByEmail(enrichmentRequest.email);
      } else {
        throw new Error('Enrichment needs an email, name or LinkedIn URL');
      }

      cacheService.set('enrichment', cacheKey, result, 86400000); // Cache for 24 hours

      logger.info('Contact enrichment completed successfully', { contactId, confidence: result.confidence });
      return result;
    } catch (error) {
      logger.error('Contact enrichment failed', error as Error, { contactId });
      throw error;
    }
  }

  /** The proxy is a single server-side provider; status is "available" when a user is signed in. */
  async getProviderStatus(): Promise<Array<{ name: string; status: 'available' | 'rate_limited' | 'error'; remaining?: number }>> {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      return [{ name: 'openai', status: session ? 'available' : 'error' }];
    } catch (error) {
      logger.error('Failed to get AI provider status', error as Error);
      return [{ name: 'openai', status: 'error' }];
    }
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