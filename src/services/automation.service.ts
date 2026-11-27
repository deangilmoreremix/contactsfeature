/**
 * Contact Automation Service
 * Rules live in `automation_rules`, executions in `automation_runs` (owner-only RLS).
 * Conditions use the shared pure evaluator; actions are performed through the user's own
 * email provider / tables. Unsupported action types fail loudly and are recorded as failed runs.
 */

import { supabase } from '../lib/supabase';
import { contactAPI } from './contact-api.service';
import { messagingProviderService } from './messagingProviderService';
import { sdrAuthHeaders } from './sdrClient';
import { logger } from './logger.service';
import { evaluateCondition } from '../utils/conditionEvaluator';
import { Contact } from '../types';
import { ContactAutomation, AutomationExecution } from '../types/automation';

type RuleRow = {
  id: string; name: string; type: string; trigger: any; conditions: any; actions: any; is_active: boolean; created_at: string; updated_at: string;
};
type RunRow = {
  id: string; rule_id: string | null; contact_id: string | null; trigger: string | null; status: string; results: any; error: string | null; executed_at: string;
};

const rowToAutomation = (r: RuleRow): ContactAutomation => ({
  id: r.id, name: r.name, type: r.type as ContactAutomation['type'], trigger: r.trigger || { type: 'manual' },
  conditions: r.conditions || [], actions: r.actions || [], isActive: r.is_active, createdAt: r.created_at, updatedAt: r.updated_at,
});

const merge = (text: string, c: any) =>
  String(text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => {
    const v = ({ firstName: c.firstName ?? c.firstname, lastName: c.lastName ?? c.lastname, name: c.name, company: c.company, email: c.email } as Record<string, unknown>)[k];
    return v == null ? m : String(v);
  });

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Please sign in');
  return data.user.id;
}

export class AutomationService {
  private static instance: AutomationService;

  static getInstance(): AutomationService {
    if (!AutomationService.instance) AutomationService.instance = new AutomationService();
    return AutomationService.instance;
  }

  /** Process contact automation based on trigger and conditions */
  async processContactAutomation(contact: Contact, trigger: string, changedFields?: string[]): Promise<void> {
    try {
      let automations = await this.getActiveAutomations(trigger);
      if (trigger === 'contact_updated' && changedFields?.length) {
        const fieldRules = await this.getActiveAutomations('field_changed');
        automations = [...automations, ...fieldRules.filter((a) => a.trigger.field && changedFields.includes(a.trigger.field))];
      }
      for (const automation of automations) {
        if (this.evaluateConditions(contact, automation)) {
          await this.executeActions(contact, automation, trigger);
        }
      }
    } catch (error) {
      logger.error('Automation processing failed', error as Error, { contactId: contact.id, trigger });
    }
  }

  private evaluateConditions(contact: Contact, automation: ContactAutomation): boolean {
    try {
      return evaluateCondition(automation.conditions as any, contact);
    } catch (error) {
      logger.error('Automation condition invalid', error as Error, { automationId: automation.id });
      return false;
    }
  }

  private async executeActions(contact: Contact, automation: ContactAutomation, trigger: string): Promise<void> {
    const results: Array<{ type: string; ok: boolean; error?: string }> = [];
    for (const action of automation.actions) {
      try {
        await this.executeAction(contact, action);
        results.push({ type: action.type, ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ type: action.type, ok: false, error: message });
        logger.error('Automation action failed', error as Error, { contactId: contact.id, automationId: automation.id, actionType: action.type });
      }
    }
    const failed = results.filter((r) => !r.ok);
    await this.recordRun(automation.id, contact.id, trigger, failed.length ? 'failed' : 'completed', { actions: results }, failed[0]?.error);
  }

  private async recordRun(ruleId: string, contactId: string, trigger: string, status: string, results: unknown, error?: string): Promise<void> {
    try {
      const userId = await currentUserId();
      const { error: insErr } = await supabase.from('automation_runs').insert({
        user_id: userId, rule_id: ruleId, contact_id: contactId, trigger, status, results, error: error ?? null,
      } as never);
      if (insErr) throw new Error(insErr.message);
    } catch (e) {
      logger.error('Could not record automation run', e as Error, { ruleId });
    }
  }

  private async executeAction(contact: Contact, action: { type: string; config: Record<string, any> }): Promise<void> {
    const cfg = action.config || {};
    switch (action.type) {
      case 'update_field':
        await contactAPI.updateContact(contact.id, { [cfg['field']]: cfg['value'] });
        return;
      case 'send_email': {
        if (!contact.email) throw new Error('Contact has no email address');
        if (!cfg['subject'] || !cfg['body']) throw new Error('send_email action needs a subject and body');
        const body = merge(cfg['body'], contact);
        const r = await messagingProviderService.sendEmail({
          to: contact.email, subject: merge(cfg['subject'], contact), body_text: body,
          body_html: body.split(/\n{2,}/).map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`).join(''),
          contact_id: contact.id,
        });
        if (!r.success) throw new Error('Email was not accepted by the provider');
        return;
      }
      case 'create_task': {
        const userId = await currentUserId();
        const due = cfg['due_in_days'] != null ? new Date(Date.now() + Number(cfg['due_in_days']) * 86400000).toISOString() : null;
        const { error } = await supabase.from('contact_tasks').insert({
          user_id: userId, contact_id: contact.id, title: merge(cfg['title'] || 'Follow up', contact), description: cfg['description'] ?? null, due_at: due,
        } as never);
        if (error) throw new Error(error.message);
        return;
      }
      case 'webhook': {
        if (!cfg['endpoint_id']) throw new Error('webhook action needs an outbound endpoint');
        const res = await fetch('/.netlify/functions/webhook-dispatch', {
          method: 'POST', headers: await sdrAuthHeaders(),
          body: JSON.stringify({ endpoint_id: cfg['endpoint_id'], event: 'contact_automation', payload: { contact_id: contact.id, email: contact.email, name: contact.name } }),
        });
        if (!res.ok) throw new Error(`Webhook failed (${res.status})`);
        return;
      }
      default:
        throw new Error(`Action type "${action.type}" is not supported`);
    }
  }

  // ---- CRUD (automation_rules) ----
  async getActiveAutomations(trigger?: string): Promise<ContactAutomation[]> {
    const { data, error } = await supabase.from('automation_rules').select('*').eq('is_active', true).order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    const all = ((data || []) as unknown as RuleRow[]).map(rowToAutomation);
    return trigger ? all.filter((a) => a.trigger?.type === trigger) : all;
  }

  /** All rules including paused ones (for management screens). */
  async getAllAutomations(): Promise<ContactAutomation[]> {
    const { data, error } = await supabase.from('automation_rules').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data || []) as unknown as RuleRow[]).map(rowToAutomation);
  }

  async createAutomation(automation: Omit<ContactAutomation, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContactAutomation> {
    const userId = await currentUserId();
    const { data, error } = await supabase.from('automation_rules').insert({
      user_id: userId, name: automation.name, type: automation.type, trigger: automation.trigger,
      conditions: automation.conditions, actions: automation.actions, is_active: automation.isActive,
    } as never).select('*').maybeSingle();
    if (error || !data) throw new Error(error?.message || 'Could not create automation');
    return rowToAutomation(data as unknown as RuleRow);
  }

  async updateAutomation(id: string, updates: Partial<ContactAutomation>): Promise<ContactAutomation> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) patch['name'] = updates.name;
    if (updates.type !== undefined) patch['type'] = updates.type;
    if (updates.trigger !== undefined) patch['trigger'] = updates.trigger;
    if (updates.conditions !== undefined) patch['conditions'] = updates.conditions;
    if (updates.actions !== undefined) patch['actions'] = updates.actions;
    if (updates.isActive !== undefined) patch['is_active'] = updates.isActive;
    const { data, error } = await supabase.from('automation_rules').update(patch as never).eq('id', id).select('*').maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Automation not found');
    return rowToAutomation(data as unknown as RuleRow);
  }

  async deleteAutomation(id: string): Promise<void> {
    const { error } = await supabase.from('automation_rules').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  /** Real execution history from `automation_runs`. */
  async getAutomationHistory(contactId?: string, limit = 100): Promise<AutomationExecution[]> {
    let q = supabase.from('automation_runs').select('*').order('executed_at', { ascending: false }).limit(limit);
    if (contactId) q = q.eq('contact_id', contactId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return ((data || []) as unknown as RunRow[]).map((r) => ({
      id: r.id, automationId: r.rule_id || '', contactId: r.contact_id || '', trigger: r.trigger || '',
      status: (r.status === 'skipped' ? 'completed' : r.status) as AutomationExecution['status'],
      results: r.results, executedAt: r.executed_at, ...(r.error ? { error: r.error } : {}),
    }));
  }
}

export const automationService = AutomationService.getInstance();
