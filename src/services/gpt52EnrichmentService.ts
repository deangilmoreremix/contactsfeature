/**
 * Contact enrichment through the Responses API (via the server-side AI proxy).
 *
 * Uses the hosted web_search tool + strict Structured Outputs. Anything the model cannot verify
 * comes back as null / [] and is shown as "No data" by the UI - nothing is ever invented.
 * Failures throw AIError (surfaced by AIErrorToaster); there is no canned fallback result.
 */

import { logger } from './logger.service';
import { aiRespond, AIError, type AICitation } from './aiClient';
import { contextManager } from '../../lib/core/contextManager';
import {
  ENRICHMENT_SCHEMA,
  normalizeEnrichment,
  isEmptyEnrichment,
  type EnrichmentNews,
} from './enrichmentSchema';

export type { EnrichmentNews };

export interface EnrichmentResult {
  contact: {
    firstName: string | null;
    lastName: string | null;
    title: string | null;
    company: string | null;
    industry: string | null;
    location: { city: string | null; state: string | null; country: string | null };
    socialProfiles: { linkedin: string | null; twitter: string | null; website: string | null };
    bio: string | null;
  };
  company: {
    name: string | null;
    industry: string | null;
    size: string | null;
    revenue: string | null;
    growth: string | null;
    keyProducts: string[];
    recentNews: EnrichmentNews[];
    competitors: string[];
  };
  insights: {
    painPoints: string[];
    opportunities: string[];
    decisionFactors: string[];
    timeline: string | null;
    budget: string | null;
  };
  sdrRecommendations: {
    approach: string | null;
    talkingPoints: string[];
    objections: string[];
    nextSteps: string[];
  };
  metadata: {
    /** 0-100 integer justified by evidence, or null when the model had no evidence. */
    confidence: number | null;
    confidenceRationale: string | null;
    reasoningEffort: string;
    toolsUsed: string[];
    processingTime: number;
    model: string;
    citations: AICitation[];
  };
}

export interface EnrichmentOptions {
  reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh';
  includeCompanyResearch?: boolean;
  includeContactResearch?: boolean;
  includeSDRInsights?: boolean;
  useContext?: boolean;
  previousResponseId?: string;
}

interface ContactInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  company?: string;
  title?: string;
  linkedin?: string;
}

const INSTRUCTIONS = `You are a sales-intelligence researcher. Research the given contact and company with the web_search tool and report ONLY what sources support.
Rules:
- Never guess or estimate. If a fact (size, revenue, budget, timeline, URLs, news) is not supported by a source, return null (or an empty list).
- Do not invent profile URLs; only return URLs you found.
- "confidence" is an integer 0-100 for the whole result, based on how much reliable, matching evidence you found (identity match, source quality, recency). Use null if you found no evidence. Explain it in confidenceRationale.
- Insights and SDR recommendations must follow from the findings; leave them empty if there is not enough to go on.`;

class GPT52EnrichmentService {
  async enrichContact(contactData: ContactInput, options: EnrichmentOptions = {}): Promise<EnrichmentResult> {
    const startTime = Date.now();
    const contactName = contactData.name || `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim();
    if (!contactName && !contactData.email && !contactData.company) {
      throw new AIError('Add a name, email or company before enriching', 400);
    }
    const effort = options.reasoningEffort === 'low' ? 'low' : options.reasoningEffort === 'medium' ? 'medium' : 'high';

    logger.info('Starting AI enrichment', { contact: contactName, company: contactData.company, effort });

    try {
      const ai = await aiRespond({
        role: 'thinking',
        effort,
        instructions: INSTRUCTIONS,
        input: `Research this contact and return the structured result:\n${JSON.stringify(contactData, null, 2)}`,
        schema: ENRICHMENT_SCHEMA,
        schemaName: 'contact_enrichment',
        tools: [{ type: 'web_search' }],
        maxOutputTokens: 6000,
        previousResponseId: options.useContext ? options.previousResponseId : undefined,
      });
      if (ai.json == null) throw new AIError('Enrichment returned no structured result', 502);

      const payload = normalizeEnrichment(ai.json);
      if (isEmptyEnrichment(payload)) throw new AIError('No public information found for this contact', 404);

      const result: EnrichmentResult = {
        contact: {
          firstName: payload.contact.firstName, lastName: payload.contact.lastName, title: payload.contact.title,
          company: payload.contact.company, industry: payload.contact.industry,
          location: { city: payload.contact.city, state: payload.contact.state, country: payload.contact.country },
          socialProfiles: { linkedin: payload.contact.linkedin, twitter: payload.contact.twitter, website: payload.contact.website },
          bio: payload.contact.bio,
        },
        company: payload.company,
        insights: payload.insights,
        sdrRecommendations: payload.sdrRecommendations,
        metadata: {
          confidence: payload.confidence,
          confidenceRationale: payload.confidenceRationale,
          reasoningEffort: effort,
          toolsUsed: ai.citations.length ? ['web_search'] : [],
          processingTime: Date.now() - startTime,
          model: 'thinking',
          citations: ai.citations,
        },
      };

      if (options.useContext) {
        contextManager.addItem({
          type: 'assistant',
          content: JSON.stringify({ responseId: ai.id, result }),
          metadata: { importance: 0.8, confidence: result.metadata.confidence ?? 0 },
        });
      }

      logger.info('AI enrichment completed', {
        contact: contactName, confidence: result.metadata.confidence, processingTime: result.metadata.processingTime,
      });
      return result;
    } catch (error) {
      logger.error('AI enrichment failed', error as Error, { contact: contactName });
      if (error instanceof AIError) throw error;
      throw new AIError(error instanceof Error ? error.message : 'Enrichment failed', 502);
    }
  }

  async generateSDRInsights(contactName: string, companyName: string): Promise<EnrichmentResult> {
    return this.enrichContact({ name: contactName, company: companyName }, { reasoningEffort: 'high' });
  }

  /** Same schema on the fast role; no deep research, so expect more nulls. */
  async quickEnrich(contactData: { email?: string; name?: string; company?: string }): Promise<EnrichmentResult> {
    return this.enrichContact(contactData, { reasoningEffort: 'low' });
  }
}

export const gpt52EnrichmentService = new GPT52EnrichmentService();
