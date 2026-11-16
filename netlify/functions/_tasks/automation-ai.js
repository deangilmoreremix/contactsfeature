/**
 * Automation AI: decides which automation actions a trigger should fire. Old contract: a bare ARRAY of actions
 * [{ type: send_email|add_to_sequence|assign_owner|schedule_followup|create_lead|notify_team|add_to_calendar|log, …type-specific fields }].
 * The model only decides WHICH of the allowed actions fit the trigger, the data and the user's rules (flags or free-text `instructions`);
 * recipients and ids are validated against the loaded data, owner assignment is always the caller, and nothing is sent here
 * (the actions are plans for the sequence/send pipeline).
 */
const { loadContact, describeContact } = require('./_ctx');
const { capJson, obj } = require('./_ctxAnalysis');
const { isValidUUID } = require('../_validation');

const TYPES = ['send_email', 'add_to_sequence', 'assign_owner', 'schedule_followup', 'create_lead', 'notify_team', 'add_to_calendar', 'log'];
const S = { type: ['string', 'null'] };

function contactIdOf(params) {
  const d = obj(params.data);
  const id = d.contactId || (params.trigger === 'contact_created' ? d.id : null);
  return isValidUUID(id) ? id : null;
}

module.exports = {
  id: 'automation-ai',
  role: 'fast',
  effort: 'low',
  maxOutputTokens: 2000,
  schema: {
    type: 'object',
    properties: {
      actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: TYPES },
            reason: { type: 'string', description: 'which rule/data point justifies this action' },
            template: { ...S, description: 'email template key: welcome, followup, meeting_confirmation, … (send_email, schedule_followup)' },
            to: { ...S, description: 'recipient email taken from the data (send_email)' },
            sequence: S,
            delay: { type: ['integer', 'null'], description: 'seconds' },
            message: S,
            channel: S,
            priority: { type: ['string', 'null'], enum: ['high', 'medium', 'low', null] },
          },
        },
      },
    },
  },
  async load({ user, params }) {
    const contactId = contactIdOf(params);
    return { userId: user.id, contact: contactId ? await loadContact(user, { contactId }, { allowInline: false }) : null };
  },
  buildInput(ctx, params) {
    return {
      instructions: 'You are a CRM automation planner. Given a trigger, its data and the user\'s rules, output ONLY the actions that the rules call for. '
        + 'A boolean rule set to true enables its action (sendWelcomeEmail, addToNurture, autoAssign, followUpSequence, notifyTeam, sendConfirmation, …); a rule that is absent or false must NOT fire. '
        + 'Free-text rules.instructions may add or restrict actions. For create_lead on form_submitted always include it. Use only emails/ids present in the data; never invent recipients. '
        + 'If nothing applies, return an empty list. A log action is only for an unrecognised trigger.',
      input: `Trigger: ${String(params.trigger || '').slice(0, 60)}\nData: ${capJson(params.data, 4000)}\nRules: ${capJson(params.rules, 2000)}\n${ctx.contact ? `\nContact on file:\n${describeContact(ctx.contact)}` : ''}`,
    };
  },
  finalize(parsed, ctx, params) {
    const d = obj(params.data);
    const form = obj(d.formData);
    const known = new Set([ctx.contact && ctx.contact.email, d.email, d.contactEmail, form.email].filter((e) => typeof e === 'string').map((e) => e.toLowerCase()));
    const contactId = ctx.contact ? ctx.contact.id : null;
    const now = new Date().toISOString();
    return (parsed.actions || []).map((a) => {
      const out = { type: a.type, reason: a.reason };
      if (a.type === 'send_email') Object.assign(out, { template: a.template, to: a.to && known.has(a.to.toLowerCase()) ? a.to : (ctx.contact && ctx.contact.email) || d.contactEmail || null, contactId, priority: a.priority || 'medium', ...(d.meeting ? { meeting: d.meeting } : {}) });
      else if (a.type === 'add_to_sequence') Object.assign(out, { sequence: a.sequence, contactId, delay: a.delay });
      else if (a.type === 'assign_owner') Object.assign(out, { contactId, ownerId: ctx.userId || null });
      else if (a.type === 'schedule_followup') Object.assign(out, { contactId, delay: a.delay, template: a.template || 'followup' });
      else if (a.type === 'create_lead') Object.assign(out, { data: form, source: 'form', priority: a.priority || 'medium' });
      else if (a.type === 'notify_team') Object.assign(out, { message: a.message, channel: a.channel || obj(params.rules).notificationChannel || 'leads' });
      else if (a.type === 'add_to_calendar') Object.assign(out, { meeting: d.meeting || null, contactId });
      else Object.assign(out, { message: a.message, timestamp: now });
      return out;
    });
  },
};
