/**
 * Pure helpers that turn partial structured output (from `onPartial`) into UI-ready values.
 * Every function tolerates missing / half-written fields: the model fills JSON in order, so most keys are absent early on.
 */

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export const asArray = <T = unknown>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
export const asString = (v: unknown): string => (typeof v === 'string' ? v : '');
export const asNumber = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** Strings only, trimmed, empties dropped (the last list item is often half-written but is still shown). */
export const stringList = (v: unknown): string[] => asArray(v).filter((x): x is string => typeof x === 'string' && x.trim() !== '');

/** Objects only (array items appear as `{}` / partially filled objects while streaming). */
export const objectList = <T extends Record<string, unknown>>(v: unknown): T[] => asArray(v).filter(isObj) as T[];

export interface PreviewSource { url: string; title: string }

const HTTP = /^https?:\/\//i;

/** Unique http(s) sources named so far in a partial enrichment result (evidence pages + news links). */
export function enrichmentSources(partial: unknown): PreviewSource[] {
  if (!isObj(partial)) return [];
  const out: PreviewSource[] = [];
  const seen = new Set<string>();
  const add = (url: unknown, title: unknown) => {
    const u = asString(url);
    if (!HTTP.test(u) || seen.has(u)) return;
    seen.add(u);
    let host = u;
    try { host = new URL(u).hostname; } catch { /* partial URL: keep as typed */ }
    out.push({ url: u, title: asString(title) || host });
  };
  objectList(partial['evidence']).forEach((e) => add(e['sourceUrl'], ''));
  objectList(partial['recentNews']).forEach((n) => add(n['url'], n['headline']));
  return out;
}

/** Readable text of what an enrichment run has found so far (shown inside the streaming card). */
export function enrichmentPreview(partial: unknown): string {
  if (!isObj(partial)) return '';
  const lines: string[] = [];
  const summary = asString(partial['summary']);
  if (summary) lines.push(summary);
  const p = isObj(partial['profile']) ? partial['profile'] : {};
  const role = [asString(p['jobTitle']), asString(p['company'])].filter(Boolean).join(' at ');
  if (role) lines.push(role);
  const industry = asString(p['industry']);
  if (industry) lines.push(`Industry: ${industry}`);
  const location = asString(p['location']);
  if (location) lines.push(`Location: ${location}`);
  stringList(partial['talkingPoints']).forEach((t) => lines.push(`• ${t}`));
  return lines.join('\n');
}

// ---- Deal health ---------------------------------------------------------------------------------------------

export interface HealthView {
  healthScore: number | null;
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | null;
  indicators: Array<{ name: string; score: number; status: 'good' | 'warning' | 'critical'; rationale: string }>;
  risks: Array<{ factor: string; severity: 'low' | 'medium' | 'high'; mitigation: string }>;
  recommendations: string[];
  nextActions: Array<{ action: string; priority: 'high' | 'medium' | 'low'; timeline: string }>;
  dataGaps: string[];
}

const RISKS = ['low', 'medium', 'high', 'critical'] as const;
const STATUSES = ['good', 'warning', 'critical'] as const;
const SEVERITIES = ['low', 'medium', 'high'] as const;
const PRIORITIES = ['high', 'medium', 'low'] as const;
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);

/** Partial deal-health JSON -> the shape DealHealthPanel renders (absent score/risk stay null until written). */
export function healthFromPartial(partial: unknown): HealthView {
  const p = isObj(partial) ? partial : {};
  return {
    healthScore: typeof p['healthScore'] === 'number' ? Math.max(0, Math.min(100, Math.round(p['healthScore']))) : null,
    riskLevel: RISKS.includes(p['riskLevel'] as never) ? (p['riskLevel'] as HealthView['riskLevel']) : null,
    // an indicator is shown as soon as its name starts streaming; its score fills in afterwards
    indicators: objectList(p['indicators']).filter((i) => asString(i['name'])).map((i) => ({
      name: asString(i['name']), score: Math.max(0, Math.min(100, Math.round(asNumber(i['score'])))), status: pick(i['status'], STATUSES, 'warning'), rationale: asString(i['rationale']),
    })),
    risks: objectList(p['risks']).filter((r) => asString(r['factor'])).map((r) => ({ factor: asString(r['factor']), severity: pick(r['severity'], SEVERITIES, 'medium'), mitigation: asString(r['mitigation']) })),
    recommendations: stringList(p['recommendations']),
    nextActions: objectList(p['nextActions']).filter((a) => asString(a['action'])).map((a) => ({ action: asString(a['action']), priority: pick(a['priority'], PRIORITIES, 'medium'), timeline: asString(a['timeline']) })),
    dataGaps: stringList(p['dataGaps']),
  };
}

// ---- Sales forecast ------------------------------------------------------------------------------------------

export interface ForecastView {
  projected: { low: number | null; expected: number | null; high: number | null };
  confidence: 'low' | 'medium' | 'high' | null;
  insights: string[];
  risks: string[];
  recommendedActions: string[];
  caveats: string[];
}

export function forecastFromPartial(partial: unknown): ForecastView {
  const p = isObj(partial) ? partial : {};
  const pr = isObj(p['projectedWonNext90Days']) ? p['projectedWonNext90Days'] : {};
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return {
    projected: { low: n(pr['low']), expected: n(pr['expected']), high: n(pr['high']) },
    confidence: ['low', 'medium', 'high'].includes(p['confidence'] as string) ? (p['confidence'] as ForecastView['confidence']) : null,
    insights: stringList(p['insights']),
    risks: stringList(p['risks']),
    recommendedActions: stringList(p['recommendedActions']),
    caveats: stringList(p['caveats']),
  };
}

// ---- Predictions ---------------------------------------------------------------------------------------------

export interface PredictionView {
  predictionType: string;
  value: number | null;
  confidence: number | null;
  timeframe: string;
  reasoning: string[];
}

/** Partial `{predictions:[…]}` -> prediction cards as each one starts streaming (type first, then value/reasoning). */
export function predictionsFromPartial(partial: unknown): PredictionView[] {
  const p = isObj(partial) ? partial : {};
  return objectList(p['predictions']).filter((x) => asString(x['predictionType'])).map((x) => ({
    predictionType: asString(x['predictionType']),
    value: typeof x['value'] === 'number' ? x['value'] : null,
    confidence: typeof x['confidence'] === 'number' ? x['confidence'] : null,
    timeframe: asString(x['timeframe']),
    reasoning: stringList(x['reasoning']),
  }));
}

// ---- Generic titled list items (insights, recommendations, suggestions) -------------------------------------

/** Items of `partial[key]` that already have a title: the card shows up as soon as its title starts streaming. */
export function titledItems<T extends Record<string, unknown>>(partial: unknown, key: string, titleKey = 'title'): T[] {
  if (!isObj(partial)) return [];
  return objectList<T>(partial[key]).filter((i) => asString(i[titleKey]));
}

// ---- Contact insights / smart recommendations ----------------------------------------------------------------

export interface InsightView {
  id: string;
  type: 'opportunity' | 'risk' | 'recommendation' | 'prediction';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  category: string;
  actionable: boolean;
  suggestedActions: string[];
  relatedContacts: string[];
  dataPoints: string[];
}

const INSIGHT_TYPES = ['opportunity', 'risk', 'recommendation', 'prediction'] as const;
const LEVELS = ['low', 'medium', 'high'] as const;

/** Partial `{insights:[…]}` -> insight cards (the same shape ContactInsight rows have) as each title streams in. */
export function insightsFromPartial(partial: unknown): InsightView[] {
  return titledItems(partial, 'insights').map((i, idx) => ({
    id: `live-insight-${idx}`,
    type: pick(i['type'], INSIGHT_TYPES, 'recommendation'),
    title: asString(i['title']),
    description: asString(i['description']),
    confidence: Math.max(0, Math.min(100, Math.round(asNumber(i['confidence'])))),
    impact: pick(i['impact'], LEVELS, 'medium'),
    category: asString(i['category']) || 'General',
    actionable: i['actionable'] === true,
    suggestedActions: stringList(i['suggestedActions']),
    relatedContacts: [],
    dataPoints: stringList(i['dataPoints']),
  }));
}

export interface RecommendationView {
  id: string;
  type: 'action' | 'communication' | 'automation' | 'content';
  title: string;
  description: string;
  reasoning: string[];
  expectedOutcome: string;
  priority: number;
  urgency: 'immediate' | 'this_week' | 'this_month' | 'future';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  confidence: number | null;
}

export function recommendationsFromPartial(partial: unknown): RecommendationView[] {
  return titledItems(partial, 'recommendations').map((r, idx) => ({
    id: `live-rec-${idx}`,
    type: pick(r['type'], ['action', 'communication', 'automation', 'content'] as const, 'action'),
    title: asString(r['title']),
    description: asString(r['description']),
    reasoning: stringList(r['reasoning']),
    expectedOutcome: asString(r['expectedOutcome']),
    priority: asNumber(r['priority']),
    urgency: pick(r['urgency'], ['immediate', 'this_week', 'this_month', 'future'] as const, 'future'),
    effort: pick(r['effort'], LEVELS, 'medium'),
    impact: pick(r['impact'], LEVELS, 'medium'),
    confidence: typeof r['confidence'] === 'number' ? r['confidence'] : null,
  }));
}

// ---- Automation suggestions ----------------------------------------------------------------------------------

export interface SuggestionView {
  id: string;
  title: string;
  type: 'new_rule' | 'optimize_existing' | 'merge_rules';
  priority: 'high' | 'medium' | 'low';
  description: string;
  trigger: string;
  reasoning: string[];
  createdAt: string;
}

export function suggestionsFromPartial(partial: unknown): SuggestionView[] {
  const now = new Date().toISOString();
  return titledItems(partial, 'suggestions').map((s, idx) => ({
    id: `live-suggestion-${idx}`,
    title: asString(s['title']),
    type: pick(s['type'], ['new_rule', 'optimize_existing', 'merge_rules'] as const, 'new_rule'),
    priority: pick(s['priority'], PRIORITIES, 'medium'),
    description: asString(s['description']),
    trigger: asString(s['trigger']),
    reasoning: stringList(s['reasoning']),
    createdAt: now,
  }));
}
