/**
 * AI automation rule generation (OpenAI Responses API via the authenticated ai-respond proxy).
 * The schema is strict; the result is validated again before it is returned so a malformed model
 * answer is rejected instead of being saved.
 */
import { aiJson } from './aiClient';
import type { AutomationAction, AutomationCondition, AutomationTrigger } from '../types/automation';

export interface GeneratedRule {
  name: string;
  description: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

const TRIGGERS = ['contact_created', 'contact_updated', 'field_changed', 'score_changed', 'manual'] as const;
const OPERATORS = ['equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'] as const;
const ACTIONS = ['update_field', 'send_email', 'create_task'] as const;

export const RULE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'description', 'trigger', 'conditions', 'actions'],
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    trigger: {
      type: 'object', additionalProperties: false, required: ['type', 'field'],
      properties: { type: { type: 'string', enum: [...TRIGGERS] }, field: { type: ['string', 'null'] } },
    },
    conditions: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['field', 'operator', 'value'],
        properties: { field: { type: 'string' }, operator: { type: 'string', enum: [...OPERATORS] }, value: { type: 'string' } },
      },
    },
    actions: {
      type: 'array', minItems: 1,
      items: {
        type: 'object', additionalProperties: false, required: ['type', 'field', 'value', 'subject', 'body', 'title', 'due_in_days'],
        properties: {
          type: { type: 'string', enum: [...ACTIONS] },
          field: { type: ['string', 'null'] }, value: { type: ['string', 'null'] },
          subject: { type: ['string', 'null'] }, body: { type: ['string', 'null'] },
          title: { type: ['string', 'null'] }, due_in_days: { type: ['integer', 'null'] },
        },
      },
    },
  },
} as const;

type RawAction = { type: string; field: string | null; value: string | null; subject: string | null; body: string | null; title: string | null; due_in_days: number | null };

/** Pure: turn the schema-shaped model output into the app's rule shape (throws on invalid output). */
export function normalizeGeneratedRule(raw: any): GeneratedRule {
  if (!raw || typeof raw.name !== 'string' || !raw.trigger || !TRIGGERS.includes(raw.trigger.type) || !Array.isArray(raw.actions) || raw.actions.length === 0) {
    throw new Error('The AI returned an invalid automation rule');
  }
  const trigger: AutomationTrigger = { type: raw.trigger.type, ...(raw.trigger.field ? { field: raw.trigger.field } : {}) };
  const conditions = (raw.conditions || []).filter((c: any) => c?.field && OPERATORS.includes(c.operator)) as AutomationCondition[];
  const actions: AutomationAction[] = (raw.actions as RawAction[]).map((a) => {
    if (!ACTIONS.includes(a.type as any)) throw new Error(`Unsupported action type from AI: ${a.type}`);
    if (a.type === 'update_field') {
      if (!a.field) throw new Error('update_field action is missing a field');
      return { type: 'update_field', config: { field: a.field, value: a.value ?? '' } };
    }
    if (a.type === 'send_email') {
      if (!a.subject || !a.body) throw new Error('send_email action is missing subject or body');
      return { type: 'send_email', config: { subject: a.subject, body: a.body } };
    }
    return { type: 'create_task', config: { title: a.title || 'Follow up', ...(a.due_in_days != null ? { due_in_days: a.due_in_days } : {}) } };
  });
  return { name: raw.name.trim().slice(0, 120), description: String(raw.description || ''), trigger, conditions, actions };
}

export async function generateAutomationRule(prompt: string): Promise<GeneratedRule> {
  const raw = await aiJson<unknown>({
    role: 'default',
    schemaName: 'automation_rule',
    schema: RULE_SCHEMA as unknown as Record<string, unknown>,
    instructions:
      'You design CRM automation rules for a solo sales user. Use only the allowed triggers, operators and action types. ' +
      'Contact fields available: name, firstname, lastname, email, company, title, status, interestLevel, score. ' +
      'Email text may use {{firstName}} and {{company}}. Return exactly one rule; fields not relevant to an action must be null.',
    input: prompt,
    effort: 'low',
  });
  return normalizeGeneratedRule(raw);
}
