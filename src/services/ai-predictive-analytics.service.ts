/**
 * AI Predictive Analytics Service
 *
 * Every number here comes from a Responses API call over the data we actually hold for the contact.
 * There is no synthetic history, random factor or canned default: when the data does not support a
 * value the field is null (UI shows "No data"), and failures throw AIError.
 */

import { logger } from './logger.service';
import { Contact } from '../types';
import { aiJson } from './aiClient';
import {
  PREDICTIONS_SCHEMA, RISK_SCHEMA, TRENDS_SCHEMA, CONVERSION_SCHEMA, RESPONSE_TIME_SCHEMA, DEAL_SIZE_SCHEMA,
  normalizePredictions, normalizeRisk, normalizeTrends, normalizeConversion, normalizeResponseTime, normalizeDealSize,
  type PredictionType,
} from './predictiveSchemas';

export interface PredictiveModel {
  id: string;
  name: string;
  type: PredictionType;
  /** Only meaningful for trained models; this service does not train any, so it is never populated. */
  accuracy: number | null;
  lastTrained: string | null;
  features: string[];
  performance: { precision: number | null; recall: number | null; f1Score: number | null };
}

export interface Prediction {
  id: string;
  contactId: string;
  modelId: string;
  predictionType: PredictiveModel['type'];
  /** Predicted value (percent / hours / amount) or null when the data does not support one. */
  value: number | null;
  confidence: number | null;
  reasoning: string[];
  factors: Array<{ factor: string; impact: number | null; weight: number | null }>;
  timeframe: string;
  createdAt: string;
  validUntil: string;
}

export interface TrendAnalysis {
  contactId: string;
  trends: Array<{
    metric: string;
    direction: 'increasing' | 'decreasing' | 'stable' | null;
    strength: number | null; // 0 to 1
    significance: 'high' | 'medium' | 'low' | null;
    dataPoints: number;
    timeframe: string;
    evidence: string;
  }>;
  seasonality: { detected: boolean | null; pattern?: string; confidence: number | null };
  /** Always empty: no time series is stored for contacts, so none is fabricated. */
  anomalies: Array<{ date: string; metric: string; expectedValue: number; actualValue: number; deviation: number }>;
  /** Always empty for the same reason. */
  forecast: Array<{ date: string; metric: string; predictedValue: number; confidence: number | null }>;
}

export interface RiskAssessment {
  contactId: string;
  overallRisk: 'low' | 'medium' | 'high' | 'critical' | null;
  riskScore: number | null; // 0-100
  riskFactors: Array<{
    factor: string;
    impact: 'low' | 'medium' | 'high' | null;
    probability: number | null;
    description: string;
    mitigation: string[];
  }>;
  opportunities: Array<{
    opportunity: string;
    potential: 'low' | 'medium' | 'high' | null;
    probability: number | null;
    description: string;
    actions: string[];
  }>;
  recommendations: string[];
}

const GROUNDING =
  'Use ONLY the supplied data. Never use defaults, industry averages you cannot cite, or typical values. ' +
  'If the data does not support a value return null (or an empty list). Confidence values are 0-100 integers reflecting ' +
  'how much supplied evidence supports the value, or null.';

function snapshot(contact: Contact, extra?: unknown): string {
  const c = contact as any;
  return JSON.stringify({
    today: new Date().toISOString().slice(0, 10),
    contact: {
      name: c.name, title: c.title, company: c.company, industry: c.industry, interestLevel: c.interestLevel, status: c.status,
      aiScore: c.aiScore, lastConnected: c.lastConnected, sources: c.sources, hasEmail: !!c.email, hasPhone: !!c.phone,
      notes: typeof c.notes === 'string' ? c.notes.slice(0, 1500) : undefined,
    },
    extra: extra ?? null,
  });
}

class AIPredictiveAnalyticsService {
  private predictions: Map<string, Prediction[]> = new Map();

  async generatePredictions(
    contact: Contact,
    predictionTypes: PredictiveModel['type'][] = ['conversion', 'response_time', 'engagement']
  ): Promise<Prediction[]> {
    logger.info('Generating predictions for contact', { contactId: contact.id, types: predictionTypes });
    const raw = await aiJson<unknown>({
      role: 'thinking',
      effort: 'low',
      instructions: `Predict the requested metrics for ONE sales contact. ${GROUNDING}`,
      input: snapshot(contact, { predictionTypes }),
      schema: PREDICTIONS_SCHEMA,
      schemaName: 'contact_predictions',
      maxOutputTokens: 3000,
    });
    const now = Date.now();
    const created = new Date(now).toISOString();
    const validUntil = new Date(now + 24 * 60 * 60 * 1000).toISOString();
    const predictions: Prediction[] = normalizePredictions(raw, predictionTypes).map((p, i) => ({
      id: `pred_${now}_${i}`,
      contactId: contact.id,
      modelId: 'responses-api',
      predictionType: p.predictionType,
      value: p.value,
      confidence: p.confidence,
      reasoning: p.reasoning,
      factors: p.factors,
      timeframe: p.timeframe ?? '',
      createdAt: created,
      validUntil,
    }));
    this.predictions.set(contact.id, predictions);
    return predictions;
  }

  async analyzeTrends(
    contact: Contact,
    timeframe: '30d' | '90d' | '6m' | '1y' = '90d',
    metrics: string[] = ['engagement', 'response_time', 'interaction_frequency'],
    _options: { isMockData?: boolean; forceRealAI?: boolean; skipIfMock?: boolean } = {}
  ): Promise<TrendAnalysis> {
    const raw = await aiJson<unknown>({
      role: 'thinking',
      effort: 'low',
      instructions:
        `Describe qualitative trends for ONE contact. ${GROUNDING} No time series is available, so only report a trend when a ` +
        'supplied field (lastConnected, notes, interestLevel, status) directly evidences it, and quote that field in "evidence".',
      input: snapshot(contact, { timeframe, metrics }),
      schema: TRENDS_SCHEMA,
      schemaName: 'contact_trends',
      maxOutputTokens: 2000,
    });
    const n = normalizeTrends(raw);
    return {
      contactId: contact.id,
      trends: n.trends.map((t) => ({ ...t, dataPoints: 0, timeframe })),
      seasonality: { detected: n.seasonality.detected, ...(n.seasonality.pattern ? { pattern: n.seasonality.pattern } : {}), confidence: n.seasonality.confidence },
      anomalies: [],
      forecast: [],
    };
  }

  async assessRisk(
    contact: Contact,
    context?: { dealValue?: number; competitorActivity?: boolean; economicFactors?: string[] }
  ): Promise<RiskAssessment> {
    logger.info('Assessing risk for contact', { contactId: contact.id });
    const raw = await aiJson<unknown>({
      role: 'thinking',
      effort: 'low',
      instructions: `Assess deal/relationship risk for ONE contact. ${GROUNDING} riskScore must follow from the listed risk factors; null if none are evidenced.`,
      input: snapshot(contact, context),
      schema: RISK_SCHEMA,
      schemaName: 'risk_assessment',
      maxOutputTokens: 2500,
    });
    return { contactId: contact.id, ...normalizeRisk(raw) };
  }

  async predictConversionProbability(
    contact: Contact,
    timeframes: string[] = ['7d', '30d', '90d']
  ): Promise<{ timeframe: string; probability: number | null; confidence: number | null; keyFactors: string[] }[]> {
    const raw = await aiJson<unknown>({
      role: 'thinking',
      effort: 'low',
      instructions: `Estimate conversion probability per requested timeframe for ONE contact. ${GROUNDING}`,
      input: snapshot(contact, { timeframes }),
      schema: CONVERSION_SCHEMA,
      schemaName: 'conversion_probability',
      maxOutputTokens: 1500,
    });
    return normalizeConversion(raw);
  }

  async predictResponseTime(
    contact: Contact,
    communicationType: 'email' | 'call' | 'sms' = 'email'
  ): Promise<{ estimatedResponseTime: number | null; confidence: number | null; optimalSendTime: string | null; factors: string[] }> {
    const raw = await aiJson<unknown>({
      role: 'fast',
      instructions: `Estimate response time (hours) and best send time for ONE contact. ${GROUNDING} No interaction log is supplied, so these are usually null.`,
      input: snapshot(contact, { communicationType }),
      schema: RESPONSE_TIME_SCHEMA,
      schemaName: 'response_time',
      maxOutputTokens: 800,
    });
    return normalizeResponseTime(raw);
  }

  async predictDealSize(
    contact: Contact,
    context?: { industry?: string; companySize?: string; previousDeals?: number[] }
  ): Promise<{ estimatedDealSize: number | null; range: { min: number | null; max: number | null }; confidence: number | null; factors: string[] }> {
    const raw = await aiJson<unknown>({
      role: 'default',
      effort: 'low',
      instructions: `Estimate deal size (USD) for ONE contact. ${GROUNDING} Base it on previousDeals or explicit company facts only.`,
      input: snapshot(contact, context),
      schema: DEAL_SIZE_SCHEMA,
      schemaName: 'deal_size',
      maxOutputTokens: 800,
    });
    return normalizeDealSize(raw);
  }

  getPredictionsForContact(contactId: string): Prediction[] {
    return this.predictions.get(contactId) || [];
  }

  /** No models are trained or evaluated locally, so there is nothing to list. */
  getAvailableModels(): PredictiveModel[] {
    return [];
  }

  getModelPerformance(): Record<string, any> {
    return { totalModels: 0, avgAccuracy: null, modelBreakdown: [] };
  }
}

export const aiPredictiveAnalytics = new AIPredictiveAnalyticsService();
