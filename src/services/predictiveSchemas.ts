/** Pure schema + normalisation helpers for ai-predictive-analytics (no invented values). */
import { cleanString, cleanStringArray, cleanConfidence, nullable, CONFIDENCE_SCHEMA } from './aiNormalize';

export type PredictionType = 'conversion' | 'response_time' | 'deal_size' | 'churn_risk' | 'engagement';
export const PREDICTION_TYPES: readonly PredictionType[] = ['conversion', 'response_time', 'deal_size', 'churn_risk', 'engagement'];

const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | null => (allowed.includes(v as T) ? (v as T) : null);
const clamp = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null;

// ---- predictions ----
export interface NormalizedPrediction {
  predictionType: PredictionType; value: number | null; unit: string | null; confidence: number | null; timeframe: string | null;
  reasoning: string[]; factors: Array<{ factor: string; impact: number | null; weight: number | null }>;
}

export const PREDICTIONS_SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  properties: {
    predictions: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          predictionType: { type: 'string', enum: [...PREDICTION_TYPES] },
          value: nullable('number', 'conversion/engagement/churn_risk: 0-100 percent; response_time: hours; deal_size: currency amount. null if the data does not support an estimate'),
          unit: nullable('string', 'percent | hours | currency'),
          confidence: CONFIDENCE_SCHEMA,
          timeframe: nullable('string'),
          reasoning: { type: 'array', items: { type: 'string' }, description: 'Each item cites supplied data' },
          factors: {
            type: 'array',
            items: {
              type: 'object', additionalProperties: false,
              properties: { factor: { type: 'string' }, impact: nullable('number', '-1..1'), weight: nullable('number', '0..1') },
              required: ['factor', 'impact', 'weight'],
            },
          },
        },
        required: ['predictionType', 'value', 'unit', 'confidence', 'timeframe', 'reasoning', 'factors'],
      },
    },
  },
  required: ['predictions'],
};

export function normalizePredictions(raw: unknown, wanted: readonly PredictionType[]): NormalizedPrediction[] {
  const list = (raw as any)?.predictions;
  if (!Array.isArray(list)) return [];
  const seen = new Set<PredictionType>();
  const out: NormalizedPrediction[] = [];
  for (const p of list) {
    const predictionType = pick(p?.predictionType, wanted);
    if (!predictionType || seen.has(predictionType)) continue;
    seen.add(predictionType);
    const isPct = predictionType === 'conversion' || predictionType === 'engagement' || predictionType === 'churn_risk';
    const value = typeof p?.value === 'number' && Number.isFinite(p.value) ? (isPct ? clamp(p.value, 0, 100) : Math.max(0, p.value)) : null;
    out.push({
      predictionType, value, unit: cleanString(p?.unit), confidence: cleanConfidence(p?.confidence), timeframe: cleanString(p?.timeframe),
      reasoning: cleanStringArray(p?.reasoning),
      factors: (Array.isArray(p?.factors) ? p.factors : [])
        .map((f: any) => ({ factor: cleanString(f?.factor), impact: clamp(f?.impact, -1, 1), weight: clamp(f?.weight, 0, 1) }))
        .filter((f: any) => f.factor),
    });
  }
  return out;
}

// ---- risk ----
export const RISK_SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  properties: {
    overallRisk: { type: ['string', 'null'], enum: ['low', 'medium', 'high', 'critical', null] },
    riskScore: nullable('integer', '0-100 only if justified by evidenced risk factors'),
    riskFactors: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          factor: { type: 'string' }, impact: { type: ['string', 'null'], enum: ['low', 'medium', 'high', null] },
          probability: CONFIDENCE_SCHEMA, description: { type: 'string', description: 'Cites supplied data' }, mitigation: { type: 'array', items: { type: 'string' } },
        },
        required: ['factor', 'impact', 'probability', 'description', 'mitigation'],
      },
    },
    opportunities: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          opportunity: { type: 'string' }, potential: { type: ['string', 'null'], enum: ['low', 'medium', 'high', null] },
          probability: CONFIDENCE_SCHEMA, description: { type: 'string', description: 'Cites supplied data' }, actions: { type: 'array', items: { type: 'string' } },
        },
        required: ['opportunity', 'potential', 'probability', 'description', 'actions'],
      },
    },
    recommendations: { type: 'array', items: { type: 'string' } },
  },
  required: ['overallRisk', 'riskScore', 'riskFactors', 'opportunities', 'recommendations'],
};

export interface NormalizedRisk {
  overallRisk: 'low' | 'medium' | 'high' | 'critical' | null; riskScore: number | null;
  riskFactors: Array<{ factor: string; impact: 'low' | 'medium' | 'high' | null; probability: number | null; description: string; mitigation: string[] }>;
  opportunities: Array<{ opportunity: string; potential: 'low' | 'medium' | 'high' | null; probability: number | null; description: string; actions: string[] }>;
  recommendations: string[];
}

export function normalizeRisk(raw: unknown): NormalizedRisk {
  const r = (raw && typeof raw === 'object' ? raw : {}) as any;
  const lvl = ['low', 'medium', 'high'] as const;
  return {
    overallRisk: pick(r.overallRisk, ['low', 'medium', 'high', 'critical'] as const),
    riskScore: cleanConfidence(r.riskScore),
    riskFactors: (Array.isArray(r.riskFactors) ? r.riskFactors : [])
      .map((f: any) => ({ factor: cleanString(f?.factor), impact: pick(f?.impact, lvl), probability: cleanConfidence(f?.probability), description: cleanString(f?.description), mitigation: cleanStringArray(f?.mitigation) }))
      .filter((f: any) => f.factor && f.description)
      .map((f: any) => f),
    opportunities: (Array.isArray(r.opportunities) ? r.opportunities : [])
      .map((o: any) => ({ opportunity: cleanString(o?.opportunity), potential: pick(o?.potential, lvl), probability: cleanConfidence(o?.probability), description: cleanString(o?.description), actions: cleanStringArray(o?.actions) }))
      .filter((o: any) => o.opportunity && o.description),
    recommendations: cleanStringArray(r.recommendations),
  };
}

// ---- trends ----
export const TRENDS_SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  properties: {
    trends: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          metric: { type: 'string' }, direction: { type: ['string', 'null'], enum: ['increasing', 'decreasing', 'stable', null] },
          strength: nullable('number', '0..1'), significance: { type: ['string', 'null'], enum: ['high', 'medium', 'low', null] },
          evidence: { type: 'string', description: 'The supplied data points the trend is based on' },
        },
        required: ['metric', 'direction', 'strength', 'significance', 'evidence'],
      },
    },
    seasonality: {
      type: 'object', additionalProperties: false,
      properties: { detected: { type: ['boolean', 'null'] }, pattern: nullable('string'), confidence: CONFIDENCE_SCHEMA },
      required: ['detected', 'pattern', 'confidence'],
    },
  },
  required: ['trends', 'seasonality'],
};

export interface NormalizedTrends {
  trends: Array<{ metric: string; direction: 'increasing' | 'decreasing' | 'stable' | null; strength: number | null; significance: 'high' | 'medium' | 'low' | null; evidence: string }>;
  seasonality: { detected: boolean | null; pattern: string | null; confidence: number | null };
}

export function normalizeTrends(raw: unknown): NormalizedTrends {
  const r = (raw && typeof raw === 'object' ? raw : {}) as any;
  const s = r.seasonality || {};
  return {
    trends: (Array.isArray(r.trends) ? r.trends : [])
      .map((t: any) => ({
        metric: cleanString(t?.metric), direction: pick(t?.direction, ['increasing', 'decreasing', 'stable'] as const),
        strength: clamp(t?.strength, 0, 1), significance: pick(t?.significance, ['high', 'medium', 'low'] as const), evidence: cleanString(t?.evidence),
      }))
      .filter((t: any) => t.metric && t.evidence),
    seasonality: {
      detected: typeof s.detected === 'boolean' ? s.detected : null,
      pattern: cleanString(s.pattern), confidence: cleanConfidence(s.confidence),
    },
  };
}

// ---- simple estimates ----
export const CONVERSION_SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: { timeframe: { type: 'string' }, probability: nullable('integer', '0-100'), confidence: CONFIDENCE_SCHEMA, keyFactors: { type: 'array', items: { type: 'string' } } },
        required: ['timeframe', 'probability', 'confidence', 'keyFactors'],
      },
    },
  },
  required: ['items'],
};

export function normalizeConversion(raw: unknown): Array<{ timeframe: string; probability: number | null; confidence: number | null; keyFactors: string[] }> {
  const list = (raw as any)?.items;
  if (!Array.isArray(list)) return [];
  return list
    .map((i: any) => ({ timeframe: cleanString(i?.timeframe), probability: cleanConfidence(i?.probability), confidence: cleanConfidence(i?.confidence), keyFactors: cleanStringArray(i?.keyFactors).slice(0, 5) }))
    .filter((i): i is typeof i & { timeframe: string } => !!i.timeframe);
}

export const RESPONSE_TIME_SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  properties: {
    estimatedResponseTime: nullable('number', 'hours; null unless supplied interaction data supports it'),
    confidence: CONFIDENCE_SCHEMA, optimalSendTime: nullable('string'), factors: { type: 'array', items: { type: 'string' } },
  },
  required: ['estimatedResponseTime', 'confidence', 'optimalSendTime', 'factors'],
};

export function normalizeResponseTime(raw: unknown) {
  const r = (raw && typeof raw === 'object' ? raw : {}) as any;
  return {
    estimatedResponseTime: typeof r.estimatedResponseTime === 'number' && Number.isFinite(r.estimatedResponseTime) ? Math.max(0, r.estimatedResponseTime) : null,
    confidence: cleanConfidence(r.confidence), optimalSendTime: cleanString(r.optimalSendTime), factors: cleanStringArray(r.factors),
  };
}

export const DEAL_SIZE_SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  properties: {
    estimatedDealSize: nullable('number', 'USD; only if supplied data (previous deals, company facts from search) supports it'),
    min: nullable('number'), max: nullable('number'), confidence: CONFIDENCE_SCHEMA, factors: { type: 'array', items: { type: 'string' } },
  },
  required: ['estimatedDealSize', 'min', 'max', 'confidence', 'factors'],
};

export function normalizeDealSize(raw: unknown) {
  const r = (raw && typeof raw === 'object' ? raw : {}) as any;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
  const est = n(r.estimatedDealSize);
  let min = n(r.min);
  let max = n(r.max);
  if (est === null) { min = null; max = null; }
  else if (min !== null && max !== null && min > max) [min, max] = [max, min];
  return { estimatedDealSize: est, range: { min, max }, confidence: cleanConfidence(r.confidence), factors: cleanStringArray(r.factors) };
}
