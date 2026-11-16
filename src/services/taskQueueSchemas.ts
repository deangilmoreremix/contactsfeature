/** Pure schema + normalisation helpers for ai-task-queue results (no invented values). */
import { cleanString, cleanStringArray, cleanConfidence, cleanUrl, nullable, CONFIDENCE_SCHEMA } from './aiNormalize';

const score = (d: string) => nullable('integer', d);

export const SCORE_SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  properties: {
    overall: score('0-100 overall lead score, null if the data is too thin'),
    breakdown: {
      type: 'object', additionalProperties: false,
      properties: { fitScore: score('0-100'), engagementScore: score('0-100'), conversionProbability: score('0-100'), urgencyScore: score('0-100') },
      required: ['fitScore', 'engagementScore', 'conversionProbability', 'urgencyScore'],
    },
    reasoning: { type: 'array', items: { type: 'string' }, description: 'Cite supplied contact fields' },
    recommendations: { type: 'array', items: { type: 'string' } },
    nextBestActions: { type: 'array', items: { type: 'string' } },
    confidence: CONFIDENCE_SCHEMA,
  },
  required: ['overall', 'breakdown', 'reasoning', 'recommendations', 'nextBestActions', 'confidence'],
};

export function normalizeScore(raw: unknown) {
  const r = (raw && typeof raw === 'object' ? raw : {}) as any;
  const b = r.breakdown || {};
  return {
    overall: cleanConfidence(r.overall),
    breakdown: {
      fitScore: cleanConfidence(b.fitScore), engagementScore: cleanConfidence(b.engagementScore),
      conversionProbability: cleanConfidence(b.conversionProbability), urgencyScore: cleanConfidence(b.urgencyScore),
    },
    reasoning: cleanStringArray(r.reasoning), recommendations: cleanStringArray(r.recommendations),
    nextBestActions: cleanStringArray(r.nextBestActions), confidence: cleanConfidence(r.confidence),
  };
}

export const TASK_ENRICHMENT_SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  properties: {
    socialProfiles: {
      type: 'object', additionalProperties: false,
      properties: { linkedin: nullable('string', 'URL found via search only'), twitter: nullable('string', 'URL found via search only') },
      required: ['linkedin', 'twitter'],
    },
    additionalInfo: {
      type: 'object', additionalProperties: false,
      properties: { jobLevel: nullable('string'), departmentSize: nullable('string'), decisionMakingPower: nullable('string') },
      required: ['jobLevel', 'departmentSize', 'decisionMakingPower'],
    },
    phone: nullable('string'), location: nullable('string'), bio: nullable('string'),
    confidence: CONFIDENCE_SCHEMA,
  },
  required: ['socialProfiles', 'additionalInfo', 'phone', 'location', 'bio', 'confidence'],
};

export function normalizeTaskEnrichment(raw: unknown) {
  const r = (raw && typeof raw === 'object' ? raw : {}) as any;
  const sp = r.socialProfiles || {};
  const ai = r.additionalInfo || {};
  return {
    socialProfiles: { linkedin: cleanUrl(sp.linkedin), twitter: cleanUrl(sp.twitter) },
    additionalInfo: { jobLevel: cleanString(ai.jobLevel), departmentSize: cleanString(ai.departmentSize), decisionMakingPower: cleanString(ai.decisionMakingPower) },
    phone: cleanString(r.phone), location: cleanString(r.location), bio: cleanString(r.bio), confidence: cleanConfidence(r.confidence),
  };
}

export const TASK_INSIGHTS_SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  properties: {
    insights: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          type: { type: 'string', enum: ['opportunity', 'risk', 'recommendation'] }, title: { type: 'string' },
          description: { type: 'string', description: 'Cites supplied contact fields' }, confidence: CONFIDENCE_SCHEMA,
          impact: { type: ['string', 'null'], enum: ['high', 'medium', 'low', null] },
        },
        required: ['type', 'title', 'description', 'confidence', 'impact'],
      },
    },
  },
  required: ['insights'],
};

export function normalizeTaskInsights(raw: unknown) {
  const list = (raw as any)?.insights;
  if (!Array.isArray(list)) return [];
  return list
    .map((i: any) => ({
      type: ['opportunity', 'risk', 'recommendation'].includes(i?.type) ? i.type : null, title: cleanString(i?.title), description: cleanString(i?.description),
      confidence: cleanConfidence(i?.confidence), impact: ['high', 'medium', 'low'].includes(i?.impact) ? i.impact : null,
    }))
    .filter((i: any) => i.type && i.title && i.description);
}

export const TASK_EMAIL_SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  properties: {
    subject: { type: 'string' }, body: { type: 'string' },
    personalizationElements: { type: 'array', items: { type: 'string' }, description: 'Which supplied facts were used' },
  },
  required: ['subject', 'body', 'personalizationElements'],
};

export function normalizeTaskEmail(raw: unknown): { subject: string; body: string; personalization: { elements: string[] } } | null {
  const r = (raw && typeof raw === 'object' ? raw : {}) as any;
  const subject = cleanString(r.subject);
  const body = cleanString(r.body);
  if (!subject || !body) return null;
  return { subject, body, personalization: { elements: cleanStringArray(r.personalizationElements) } };
}

export const TASK_ANALYSIS_SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  properties: {
    score: score('0-100 quality score of the supplied content; null if there is nothing to analyse'),
    insights: { type: 'array', items: { type: 'string' } }, suggestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['score', 'insights', 'suggestions'],
};

export function normalizeTaskAnalysis(raw: unknown) {
  const r = (raw && typeof raw === 'object' ? raw : {}) as any;
  return { score: cleanConfidence(r.score), insights: cleanStringArray(r.insights), suggestions: cleanStringArray(r.suggestions) };
}
