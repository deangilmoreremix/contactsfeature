/** Pure schema + normalisation helpers for ai-intelligence-engine (no invented values). */
import { cleanString, cleanStringArray, cleanConfidence, nullable, CONFIDENCE_SCHEMA } from './aiNormalize';

type Level3 = 'low' | 'medium' | 'high';
export type Urgency = 'immediate' | 'this_week' | 'this_month' | 'future';
export type RecType = 'action' | 'communication' | 'automation' | 'content';

export interface NormalizedRecommendation {
  type: RecType; title: string; description: string; reasoning: string[]; expectedOutcome: string | null;
  priority: number | null; urgency: Urgency | null; effort: Level3 | null; impact: Level3 | null; confidence: number | null;
}

export const RECOMMENDATIONS_SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          type: { type: 'string', enum: ['action', 'communication', 'automation', 'content'] },
          title: { type: 'string' }, description: { type: 'string' },
          reasoning: { type: 'array', items: { type: 'string' }, description: 'Each reason must cite a field of the supplied contact data' },
          expectedOutcome: nullable('string', 'Qualitative outcome only; no invented percentages'),
          priority: nullable('integer', '0-100 ranking of importance, or null'),
          urgency: { type: ['string', 'null'], enum: ['immediate', 'this_week', 'this_month', 'future', null] },
          effort: { type: ['string', 'null'], enum: ['low', 'medium', 'high', null] },
          impact: { type: ['string', 'null'], enum: ['low', 'medium', 'high', null] },
          confidence: CONFIDENCE_SCHEMA,
        },
        required: ['type', 'title', 'description', 'reasoning', 'expectedOutcome', 'priority', 'urgency', 'effort', 'impact', 'confidence'],
      },
    },
  },
  required: ['recommendations'],
};

const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | null => (allowed.includes(v as T) ? (v as T) : null);

export function normalizeRecommendations(raw: unknown, max = 8): NormalizedRecommendation[] {
  const list = (raw as any)?.recommendations;
  if (!Array.isArray(list)) return [];
  const out: NormalizedRecommendation[] = [];
  for (const r of list) {
    const type = pick(r?.type, ['action', 'communication', 'automation', 'content'] as const);
    const title = cleanString(r?.title);
    const description = cleanString(r?.description);
    const reasoning = cleanStringArray(r?.reasoning);
    // A recommendation with no stated evidence is not shown.
    if (!type || !title || !description || reasoning.length === 0) continue;
    out.push({
      type, title, description, reasoning, expectedOutcome: cleanString(r?.expectedOutcome),
      priority: cleanConfidence(r?.priority),
      urgency: pick(r?.urgency, ['immediate', 'this_week', 'this_month', 'future'] as const),
      effort: pick(r?.effort, ['low', 'medium', 'high'] as const),
      impact: pick(r?.impact, ['low', 'medium', 'high'] as const),
      confidence: cleanConfidence(r?.confidence),
    });
  }
  const rank = (r: NormalizedRecommendation) => r.priority ?? -1;
  return out.sort((a, b) => rank(b) - rank(a)).slice(0, max);
}

export interface NormalizedPredictive {
  conversionProbability: number | null;
  optimalContactTime: string | null;
  recommendedActions: string[];
  riskFactors: string[];
  opportunities: string[];
  timeline: Array<{ date: string; prediction: string; confidence: number | null }>;
  confidence: number | null;
}

export const PREDICTIVE_SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  properties: {
    conversionProbability: nullable('integer', '0-100 only if the supplied data supports an estimate; otherwise null'),
    optimalContactTime: nullable('string', 'Only if supplied interaction data shows a pattern; otherwise null'),
    recommendedActions: { type: 'array', items: { type: 'string' } },
    riskFactors: { type: 'array', items: { type: 'string' }, description: 'Risks evidenced in the supplied data' },
    opportunities: { type: 'array', items: { type: 'string' }, description: 'Opportunities evidenced in the supplied data' },
    timeline: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: { date: { type: 'string', description: 'YYYY-MM-DD' }, prediction: { type: 'string' }, confidence: CONFIDENCE_SCHEMA },
        required: ['date', 'prediction', 'confidence'],
      },
    },
    confidence: CONFIDENCE_SCHEMA,
  },
  required: ['conversionProbability', 'optimalContactTime', 'recommendedActions', 'riskFactors', 'opportunities', 'timeline', 'confidence'],
};

export function normalizePredictive(raw: unknown): NormalizedPredictive {
  const r = (raw && typeof raw === 'object' ? raw : {}) as any;
  const timeline = (Array.isArray(r.timeline) ? r.timeline : [])
    .map((t: any) => ({ date: cleanString(t?.date), prediction: cleanString(t?.prediction), confidence: cleanConfidence(t?.confidence) }))
    .filter((t: any) => t.date && /^\d{4}-\d{2}-\d{2}/.test(t.date) && t.prediction)
    .map((t: any) => ({ date: t.date.slice(0, 10), prediction: t.prediction, confidence: t.confidence }));
  return {
    conversionProbability: cleanConfidence(r.conversionProbability),
    optimalContactTime: cleanString(r.optimalContactTime),
    recommendedActions: cleanStringArray(r.recommendedActions),
    riskFactors: cleanStringArray(r.riskFactors),
    opportunities: cleanStringArray(r.opportunities),
    timeline,
    confidence: cleanConfidence(r.confidence),
  };
}
