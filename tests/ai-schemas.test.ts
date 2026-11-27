// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { cleanString, cleanConfidence, cleanUrl, cleanStringArray } from '../src/services/aiNormalize';
import { normalizeEnrichment, isEmptyEnrichment, ENRICHMENT_SCHEMA } from '../src/services/enrichmentSchema';
import { normalizeRecommendations, normalizePredictive, RECOMMENDATIONS_SCHEMA } from '../src/services/intelligenceSchemas';
import { normalizePredictions, normalizeRisk, normalizeTrends, normalizeDealSize, normalizeConversion } from '../src/services/predictiveSchemas';
import { normalizeScore, normalizeTaskEmail, normalizeTaskInsights } from '../src/services/taskQueueSchemas';

/** Every object must list all properties as required and forbid extras (OpenAI strict mode). */
function assertStrict(node: any, path = 'root') {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'object' || (Array.isArray(node.type) && node.type.includes('object'))) {
    expect(node.additionalProperties, path).toBe(false);
    expect([...(node.required || [])].sort(), path).toEqual(Object.keys(node.properties || {}).sort());
  }
  Object.entries(node.properties || {}).forEach(([k, v]) => assertStrict(v, `${path}.${k}`));
  if (node.items) assertStrict(node.items, `${path}[]`);
}

describe('aiNormalize', () => {
  it('rejects placeholder strings', () => {
    expect(cleanString('Unknown')).toBeNull();
    expect(cleanString(' N/A ')).toBeNull();
    expect(cleanString('  Acme ')).toBe('Acme');
    expect(cleanString(5)).toBeNull();
  });
  it('confidence is a clamped integer or null, never a default', () => {
    expect(cleanConfidence(undefined)).toBeNull();
    expect(cleanConfidence('80')).toBeNull();
    expect(cleanConfidence(NaN)).toBeNull();
    expect(cleanConfidence(120.4)).toBe(100);
    expect(cleanConfidence(-3)).toBe(0);
    expect(cleanConfidence(61.6)).toBe(62);
  });
  it('urls must be http(s)', () => {
    expect(cleanUrl('javascript:alert(1)')).toBeNull();
    expect(cleanUrl('https://a.io/x')).toBe('https://a.io/x');
    expect(cleanStringArray(['a', '', 'unknown', 3])).toEqual(['a']);
  });
});

describe('enrichment', () => {
  it('schema is strict', () => assertStrict(ENRICHMENT_SCHEMA));
  it('empty / garbage input yields nulls and no canned defaults', () => {
    const p = normalizeEnrichment({});
    expect(p.confidence).toBeNull();
    expect(p.company.size).toBeNull();
    expect(p.insights.budget).toBeNull();
    expect(p.sdrRecommendations.talkingPoints).toEqual([]);
    expect(isEmptyEnrichment(p)).toBe(true);
  });
  it('keeps supported data and drops bad values', () => {
    const p = normalizeEnrichment({
      contact: { title: 'CTO', linkedin: 'not a url', website: 'https://acme.io' },
      company: { size: '51-200', recentNews: [{ title: 'Raised', date: null, impact: 'bogus', url: 'https://n.io/1' }, { title: '' }] },
      confidence: 64.2,
    });
    expect(p.contact.linkedin).toBeNull();
    expect(p.contact.website).toBe('https://acme.io/');
    expect(p.company.recentNews).toEqual([{ title: 'Raised', date: null, impact: null, url: 'https://n.io/1' }]);
    expect(p.confidence).toBe(64);
    expect(isEmptyEnrichment(p)).toBe(false);
  });
});

describe('intelligence', () => {
  it('schemas are strict', () => assertStrict(RECOMMENDATIONS_SCHEMA));
  it('drops recommendations without evidence and sorts by priority', () => {
    const recs = normalizeRecommendations({ recommendations: [
      { type: 'action', title: 'A', description: 'd', reasoning: [], priority: 90 },
      { type: 'action', title: 'B', description: 'd', reasoning: ['interestLevel=hot'], priority: 10, confidence: 'x' },
      { type: 'content', title: 'C', description: 'd', reasoning: ['industry=SaaS'], priority: 70, confidence: 55 },
      { type: 'nope', title: 'D', description: 'd', reasoning: ['x'] },
    ] });
    expect(recs.map((r) => r.title)).toEqual(['C', 'B']);
    expect(recs[1]!.confidence).toBeNull();
  });
  it('predictive result never defaults values', () => {
    const p = normalizePredictive({ timeline: [{ date: 'soon', prediction: 'x', confidence: 5 }, { date: '2026-12-01T00:00:00Z', prediction: 'y', confidence: null }] });
    expect(p.conversionProbability).toBeNull();
    expect(p.optimalContactTime).toBeNull();
    expect(p.timeline).toEqual([{ date: '2026-12-01', prediction: 'y', confidence: null }]);
  });
});

describe('predictive analytics', () => {
  it('only keeps requested, de-duplicated prediction types and clamps values', () => {
    const out = normalizePredictions({ predictions: [
      { predictionType: 'conversion', value: 140, confidence: 70, reasoning: ['r'], factors: [{ factor: 'f', impact: 5, weight: -1 }] },
      { predictionType: 'conversion', value: 1 },
      { predictionType: 'deal_size', value: 5 },
      { predictionType: 'response_time', value: null },
    ] }, ['conversion', 'response_time']);
    expect(out.map((p) => p.predictionType)).toEqual(['conversion', 'response_time']);
    expect(out[0]!.value).toBe(100);
    expect(out[0]!.factors[0]).toEqual({ factor: 'f', impact: 1, weight: 0 });
    expect(out[1]!.value).toBeNull();
  });
  it('risk with nothing evidenced is all null/empty', () => {
    expect(normalizeRisk(null)).toEqual({ overallRisk: null, riskScore: null, riskFactors: [], opportunities: [], recommendations: [] });
  });
  it('trends need evidence', () => {
    const t = normalizeTrends({ trends: [{ metric: 'engagement', direction: 'up', strength: 3, significance: 'high', evidence: '' }], seasonality: { detected: 'yes' } });
    expect(t.trends).toEqual([]);
    expect(t.seasonality).toEqual({ detected: null, pattern: null, confidence: null });
  });
  it('deal size range is null without an estimate and ordered otherwise', () => {
    expect(normalizeDealSize({ estimatedDealSize: null, min: 1, max: 2 }).range).toEqual({ min: null, max: null });
    expect(normalizeDealSize({ estimatedDealSize: 5000.4, min: 9000, max: 1000 }).range).toEqual({ min: 1000, max: 9000 });
    expect(normalizeConversion({ items: [{ timeframe: '30d', probability: null, keyFactors: ['a', 'b', 'c', 'd', 'e', 'f'] }, { probability: 5 }] })).toEqual([
      { timeframe: '30d', probability: null, confidence: null, keyFactors: ['a', 'b', 'c', 'd', 'e'] },
    ]);
  });
});

describe('task queue', () => {
  it('score defaults to nulls', () => {
    const s = normalizeScore({});
    expect(s.overall).toBeNull();
    expect(s.breakdown.fitScore).toBeNull();
    expect(s.confidence).toBeNull();
  });
  it('rejects an empty email and keeps real ones', () => {
    expect(normalizeTaskEmail({ subject: '', body: 'x' })).toBeNull();
    expect(normalizeTaskEmail({ subject: 'S', body: 'B', personalizationElements: ['company'] })).toEqual({ subject: 'S', body: 'B', personalization: { elements: ['company'] } });
  });
  it('insights without type/title/description are dropped', () => {
    expect(normalizeTaskInsights({ insights: [{ type: 'risk', title: 't', description: 'd', confidence: 40, impact: 'x' }, { title: 'x' }] }))
      .toEqual([{ type: 'risk', title: 't', description: 'd', confidence: 40, impact: null }]);
  });
});
