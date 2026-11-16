/**
 * Pure helpers for contact enrichment: the strict Structured Outputs schema and a normaliser.
 * Nothing here invents data: every value the model could not verify is null / an empty array.
 */

import { cleanString, cleanStringArray, cleanConfidence, cleanUrl } from './aiNormalize';

export interface EnrichmentNews { title: string; date: string | null; impact: 'high' | 'medium' | 'low' | null; url: string | null }

export interface EnrichmentPayload {
  contact: {
    firstName: string | null; lastName: string | null; title: string | null; company: string | null;
    industry: string | null; city: string | null; state: string | null; country: string | null;
    linkedin: string | null; twitter: string | null; website: string | null; bio: string | null;
  };
  company: {
    name: string | null; industry: string | null; size: string | null; revenue: string | null; growth: string | null;
    keyProducts: string[]; recentNews: EnrichmentNews[]; competitors: string[];
  };
  insights: {
    painPoints: string[]; opportunities: string[]; decisionFactors: string[];
    timeline: string | null; budget: string | null;
  };
  sdrRecommendations: { approach: string | null; talkingPoints: string[]; objections: string[]; nextSteps: string[] };
  confidence: number | null;
  confidenceRationale: string | null;
}

const nstr = (description: string) => ({ type: ['string', 'null'], description });
const strArr = (description: string) => ({ type: 'array', items: { type: 'string' }, description });

/** Strict JSON schema (all keys required; uncertain values nullable). */
export const ENRICHMENT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    contact: {
      type: 'object', additionalProperties: false,
      properties: {
        firstName: nstr('First name if verified'), lastName: nstr('Last name if verified'),
        title: nstr('Current job title if verified'), company: nstr('Current employer if verified'),
        industry: nstr('Industry if verified'), city: nstr('City or null'), state: nstr('State/region or null'),
        country: nstr('Country or null'), linkedin: nstr('Profile URL found via search, never guessed'),
        twitter: nstr('Profile URL found via search, never guessed'), website: nstr('Website URL found via search, never guessed'),
        bio: nstr('1-2 sentence factual bio from sources, or null'),
      },
      required: ['firstName', 'lastName', 'title', 'company', 'industry', 'city', 'state', 'country', 'linkedin', 'twitter', 'website', 'bio'],
    },
    company: {
      type: 'object', additionalProperties: false,
      properties: {
        name: nstr('Company name'), industry: nstr('Industry'), size: nstr('Employee count range only if a source states it'),
        revenue: nstr('Revenue only if a source states it'), growth: nstr('Growth only if a source states it'),
        keyProducts: strArr('Products named in sources; empty if unknown'),
        recentNews: {
          type: 'array',
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              title: { type: 'string' }, date: nstr('ISO date or null'),
              impact: { type: ['string', 'null'], enum: ['high', 'medium', 'low', null] }, url: nstr('Source URL'),
            },
            required: ['title', 'date', 'impact', 'url'],
          },
        },
        competitors: strArr('Competitors named in sources; empty if unknown'),
      },
      required: ['name', 'industry', 'size', 'revenue', 'growth', 'keyProducts', 'recentNews', 'competitors'],
    },
    insights: {
      type: 'object', additionalProperties: false,
      properties: {
        painPoints: strArr('Evidence-based pain points; empty if none supported'),
        opportunities: strArr('Evidence-based opportunities; empty if none supported'),
        decisionFactors: strArr('Likely decision factors supported by evidence'),
        timeline: nstr('Buying timeline only if evidenced, else null'),
        budget: nstr('Budget only if evidenced, else null'),
      },
      required: ['painPoints', 'opportunities', 'decisionFactors', 'timeline', 'budget'],
    },
    sdrRecommendations: {
      type: 'object', additionalProperties: false,
      properties: {
        approach: nstr('Recommended outreach approach grounded in the findings, or null'),
        talkingPoints: strArr('Talking points tied to findings'),
        objections: strArr('Objections likely given the findings'),
        nextSteps: strArr('Concrete next steps'),
      },
      required: ['approach', 'talkingPoints', 'objections', 'nextSteps'],
    },
    confidence: { type: ['integer', 'null'], description: '0-100 confidence in the overall result justified by the amount and quality of evidence found; null if no evidence' },
    confidenceRationale: nstr('One sentence naming the evidence behind the confidence number'),
  },
  required: ['contact', 'company', 'insights', 'sdrRecommendations', 'confidence', 'confidenceRationale'],
};

export function normalizeEnrichment(raw: unknown): EnrichmentPayload {
  const r = (raw && typeof raw === 'object' ? raw : {}) as any;
  const c = r.contact || {};
  const co = r.company || {};
  const i = r.insights || {};
  const s = r.sdrRecommendations || {};
  const impacts = ['high', 'medium', 'low'];
  return {
    contact: {
      firstName: cleanString(c.firstName), lastName: cleanString(c.lastName), title: cleanString(c.title),
      company: cleanString(c.company), industry: cleanString(c.industry), city: cleanString(c.city),
      state: cleanString(c.state), country: cleanString(c.country), linkedin: cleanUrl(c.linkedin),
      twitter: cleanUrl(c.twitter), website: cleanUrl(c.website), bio: cleanString(c.bio),
    },
    company: {
      name: cleanString(co.name), industry: cleanString(co.industry), size: cleanString(co.size),
      revenue: cleanString(co.revenue), growth: cleanString(co.growth),
      keyProducts: cleanStringArray(co.keyProducts), competitors: cleanStringArray(co.competitors),
      recentNews: (Array.isArray(co.recentNews) ? co.recentNews : [])
        .map((n: any) => ({
          title: cleanString(n?.title) || '', date: cleanString(n?.date),
          impact: impacts.includes(n?.impact) ? n.impact : null, url: cleanUrl(n?.url),
        }))
        .filter((n: EnrichmentNews) => n.title),
    },
    insights: {
      painPoints: cleanStringArray(i.painPoints), opportunities: cleanStringArray(i.opportunities),
      decisionFactors: cleanStringArray(i.decisionFactors), timeline: cleanString(i.timeline), budget: cleanString(i.budget),
    },
    sdrRecommendations: {
      approach: cleanString(s.approach), talkingPoints: cleanStringArray(s.talkingPoints),
      objections: cleanStringArray(s.objections), nextSteps: cleanStringArray(s.nextSteps),
    },
    confidence: cleanConfidence(r.confidence),
    confidenceRationale: cleanString(r.confidenceRationale),
  };
}

/** True when the model found nothing usable (all scalar fields null and all lists empty). */
export function isEmptyEnrichment(p: EnrichmentPayload): boolean {
  const scalars = [
    ...Object.values(p.contact), p.company.industry, p.company.size, p.company.revenue, p.company.growth,
    p.insights.timeline, p.insights.budget, p.sdrRecommendations.approach,
  ];
  const lists = [
    p.company.keyProducts, p.company.recentNews, p.company.competitors, p.insights.painPoints, p.insights.opportunities,
    p.insights.decisionFactors, p.sdrRecommendations.talkingPoints, p.sdrRecommendations.objections, p.sdrRecommendations.nextSteps,
  ];
  return scalars.every((v) => v == null) && lists.every((l) => l.length === 0);
}
