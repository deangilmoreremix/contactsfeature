/**
 * Persistence for the contact AutomationPanel rules (table `automation_rules`, history in
 * `automation_runs`). Panel rules are descriptive (free-text trigger, typed action list) and are
 * stored with trigger.type = 'manual' and trigger.panel = true so the rule engine never fires them
 * implicitly. Success rate / trigger count / last triggered come from real `automation_runs` rows.
 */
import { supabase } from '../lib/supabase';
import { aiJson } from './aiClient';
import type { LiveOptions } from './liveOptions';

export interface PanelAction {
  id: string;
  type: 'email' | 'sms' | 'call' | 'task' | 'wait' | 'tag' | 'webhook' | 'notification';
  description: string;
  delay?: string;
  template?: string;
  config?: any;
  isActive?: boolean;
}
export interface PanelRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  actions: PanelAction[];
  isActive: boolean;
  lastTriggered?: string | undefined;
  triggerCount: number;
  /** null when the rule has never run (no fabricated number). */
  successRate: number | null;
  category?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RunStat { rule_id: string | null; status: string; executed_at: string }

/** Pure: aggregate run rows into per-rule stats. Skipped runs do not count as attempts. */
export function summarizeRuns(runs: RunStat[]): Map<string, { count: number; successRate: number | null; last: string | undefined }> {
  const acc = new Map<string, { ok: number; total: number; last: string | undefined }>();
  for (const r of runs) {
    if (!r.rule_id || r.status === 'skipped') continue;
    const a = acc.get(r.rule_id) || { ok: 0, total: 0, last: undefined };
    a.total++;
    if (r.status === 'completed') a.ok++;
    if (!a.last || r.executed_at > a.last) a.last = r.executed_at;
    acc.set(r.rule_id, a);
  }
  return new Map([...acc].map(([k, v]) => [k, { count: v.total, successRate: v.total ? Math.round((v.ok / v.total) * 100) : null, last: v.last }]));
}

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

type Row = { id: string; name: string; description: string | null; trigger: any; actions: any; is_active: boolean; created_at: string; updated_at: string };

export const automationPanelService = {
  async list(): Promise<PanelRule[]> {
    const [{ data: rules, error }, { data: runs }] = await Promise.all([
      supabase.from('automation_rules').select('*').order('created_at', { ascending: true }),
      supabase.from('automation_runs').select('rule_id,status,executed_at').order('executed_at', { ascending: false }).limit(2000),
    ]);
    if (error) throw new Error(error.message);
    const stats = summarizeRuns((runs || []) as unknown as RunStat[]);
    return ((rules || []) as unknown as Row[]).filter((r) => r.trigger?.panel === true).map((r) => {
      const s = stats.get(r.id);
      return {
        id: r.id, name: r.name, description: r.description || '', trigger: r.trigger?.label || '', actions: r.actions || [],
        isActive: r.is_active, lastTriggered: s?.last, triggerCount: s?.count ?? 0, successRate: s?.successRate ?? null,
        category: r.trigger?.category, tags: r.trigger?.tags || [], createdAt: r.created_at, updatedAt: r.updated_at,
      };
    });
  },

  /** Insert or update; returns the persisted id (replaces client-side temp ids). */
  async save(rule: PanelRule): Promise<string> {
    const fields = {
      name: rule.name, description: rule.description || null, type: 'followup', is_active: rule.isActive, actions: rule.actions, conditions: [],
      trigger: { type: 'manual', panel: true, label: rule.trigger, category: rule.category || 'Custom', tags: rule.tags || [] },
      updated_at: new Date().toISOString(),
    };
    if (isUuid(rule.id)) {
      const { error } = await supabase.from('automation_rules').update(fields as never).eq('id', rule.id);
      if (error) throw new Error(error.message);
      return rule.id;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error('Please sign in');
    const { data, error } = await supabase.from('automation_rules').insert({ ...fields, user_id: auth.user.id } as never).select('id').maybeSingle();
    if (error || !data) throw new Error(error?.message || 'Could not save rule');
    return (data as unknown as { id: string }).id;
  },

  async remove(id: string): Promise<void> {
    if (!isUuid(id)) return;
    const { error } = await supabase.from('automation_rules').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

export interface AiSuggestion {
  id: string;
  title: string;
  type: 'new_rule' | 'optimize_existing' | 'merge_rules';
  priority: 'high' | 'medium' | 'low';
  description: string;
  trigger: string;
  reasoning: string[];
  createdAt: string;
}

const SUGGESTION_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['suggestions'],
  properties: {
    suggestions: {
      type: 'array', maxItems: 4,
      items: {
        type: 'object', additionalProperties: false, required: ['title', 'type', 'priority', 'description', 'trigger', 'reasoning'],
        properties: {
          title: { type: 'string' }, type: { type: 'string', enum: ['new_rule', 'optimize_existing', 'merge_rules'] },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] }, description: { type: 'string' }, trigger: { type: 'string' },
          reasoning: { type: 'array', items: { type: 'string' }, maxItems: 3 },
        },
      },
    },
  },
} as const;

/** Real AI suggestions (OpenAI Responses via the ai-respond proxy). No scores are invented. */
export async function generateAutomationSuggestions(input: { contactSummary: string; webContext?: string; existingRules: string[] }, live?: LiveOptions): Promise<AiSuggestion[]> {
  const out = await aiJson<{ suggestions: Array<Omit<AiSuggestion, 'id' | 'createdAt'>> }>({
    role: 'default',
    schemaName: 'automation_suggestions',
    schema: SUGGESTION_SCHEMA as unknown as Record<string, unknown>,
    instructions: 'You are a CRM automation strategist for a solo salesperson. Suggest at most 4 concrete, practical automation rules for this contact. Base reasoning only on the supplied facts; do not invent statistics.',
    input: `Contact:\n${input.contactSummary}\n\nExisting rules: ${input.existingRules.join('; ') || 'none'}\n\n${input.webContext ? `Research notes:\n${input.webContext.slice(0, 3000)}` : ''}`,
    effort: 'low',
  }, live);
  const now = new Date().toISOString();
  return (out.suggestions || []).map((s, i) => ({ ...s, id: `suggestion-${Date.now()}-${i}`, createdAt: now }));
}

/** AI review of one rule; returns improvement notes (never changes the rule or its stats). */
export async function reviewRule(rule: PanelRule, live?: LiveOptions): Promise<{ summary: string; improvements: string[] }> {
  return aiJson({
    role: 'fast',
    schemaName: 'rule_review',
    schema: { type: 'object', additionalProperties: false, required: ['summary', 'improvements'], properties: { summary: { type: 'string' }, improvements: { type: 'array', items: { type: 'string' }, maxItems: 5 } } },
    instructions: 'Review this CRM automation rule for gaps (missing waits, no stop condition, weak follow-up). Be specific and brief.',
    input: JSON.stringify({ name: rule.name, trigger: rule.trigger, actions: rule.actions.map((a) => ({ type: a.type, description: a.description, delay: a.delay })) }),
  }, live);
}
