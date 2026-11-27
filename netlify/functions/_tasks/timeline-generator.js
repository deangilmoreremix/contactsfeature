/**
 * Timeline generator. Old contract: { entityId, entityType, events[{id,type,title,description,date,category,importance,metadata}], milestones[],
 * phases[{name,startDate,endDate,events,characteristics}], predictions[{type,description,predictedDate,confidence,factors}],
 * summary{totalEvents,dateRange,mostActivePeriod,keyMetrics,overallTrend,insights}, generatedAt }.
 * EVENTS ARE REAL: they are assembled from the caller's own timeline/emails/meetings/deal rows. The model only classifies them (by id),
 * marks milestones, groups phases and writes predictions/insights — it can not add events.
 */
const { supabase } = require('../_supabaseClient');
const { isValidUUID } = require('../_validation');
const { loadContact, TaskError, describeContact } = require('./_ctx');
const { loadDeal, capJson, obj } = require('./_ctxAnalysis');

const CATEGORIES = ['engagement', 'email', 'meeting', 'deal', 'milestone', 'note', 'other'];
const IMPORTANCE = ['critical', 'high', 'medium', 'low'];

async function rows(table, cols, filters, orderCol, limit) {
  let q = supabase.from(table).select(cols);
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { data } = await q.order(orderCol, { ascending: false }).limit(limit);
  return data || [];
}

function buildEvents({ timeline, emails, meetings, deal }) {
  const ev = [];
  for (const t of timeline) ev.push({ id: `timeline:${t.id}`, type: t.activity_type || 'activity', title: String(t.description || t.activity_type || 'Activity').slice(0, 160), description: t.description || '', date: t.created_at, metadata: { source: 'contact_timeline' } });
  for (const e of emails) ev.push({ id: `email:${e.id}`, type: e.is_inbound ? 'email_received' : 'email_sent', title: e.subject || '(no subject)', description: '', date: e.created_at, metadata: { source: 'emails', status: e.status || null, opened: !!e.opened_at, clicked: !!e.clicked_at } });
  for (const m of meetings) ev.push({ id: `meeting:${m.id}`, type: 'meeting', title: m.title || 'Meeting', description: '', date: m.scheduled_for, metadata: { source: 'calendar_events', status: m.status || null, durationMinutes: m.duration_minutes || null } });
  if (deal && deal.created_at) ev.push({ id: `deal:${deal.id}:created`, type: 'deal_created', title: `Deal created${deal.title ? `: ${deal.title}` : ''}`, description: '', date: deal.created_at, metadata: { source: 'deals', stage: deal.stage || null, value: deal.value ?? null } });
  if (deal && deal.closed_at) ev.push({ id: `deal:${deal.id}:closed`, type: 'deal_closed', title: 'Deal closed', description: '', date: deal.closed_at, metadata: { source: 'deals', stage: deal.stage || null } });
  return ev.filter((e) => e.date && !Number.isNaN(new Date(e.date).getTime())).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-60);
}

module.exports = {
  id: 'timeline-generator',
  role: 'default',
  effort: 'low',
  maxOutputTokens: 3500,
  schema: {
    type: 'object',
    properties: {
      classified: {
        type: 'array',
        items: { type: 'object', properties: { eventId: { type: 'string' }, category: { type: 'string', enum: CATEGORIES }, importance: { type: 'string', enum: IMPORTANCE }, isMilestone: { type: 'boolean' } } },
      },
      phases: {
        type: 'array',
        items: { type: 'object', properties: { name: { type: 'string' }, firstEventId: { type: 'string' }, lastEventId: { type: 'string' }, characteristics: { type: 'array', items: { type: 'string' } } } },
      },
      predictions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['next_interaction', 'deal_closure', 'engagement_forecast', 'risk'] },
            description: { type: 'string' }, predictedDate: { type: ['string', 'null'], description: 'ISO date or null' },
            confidence: { type: 'number', description: '0-1' }, factors: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      overallTrend: { type: 'string', enum: ['accelerating', 'stable', 'slowing', 'insufficient_data'] },
      insights: { type: 'array', items: { type: 'string' } },
    },
  },
  async load({ user, params }) {
    const opts = obj(params.options);
    const entityType = String(params.entityType || (params.dealId ? 'deal' : 'contact'));
    if (!['contact', 'deal'].includes(entityType)) throw new TaskError(400, 'entityType must be contact or deal');
    let deal = null;
    let contact = null;
    if (entityType === 'deal') {
      deal = await loadDeal(user, { dealId: params.dealId || params.entityId, dealData: params.dealData });
      if (isValidUUID(deal.contact_id)) contact = await loadContact(user, { contactId: deal.contact_id }, { allowInline: false });
    } else {
      contact = await loadContact(user, { contactId: params.contactId || params.entityId, contactData: params.contactData });
    }
    let timeline = []; let emails = []; let meetings = [];
    if (contact && isValidUUID(contact.id)) {
      const f = { contact_id: contact.id, user_id: user.id };
      timeline = await rows('contact_timeline', 'id,activity_type,description,created_at', f, 'created_at', 40);
      emails = await rows('emails', 'id,subject,status,is_inbound,created_at,opened_at,clicked_at', f, 'created_at', 40);
      meetings = await rows('calendar_events', 'id,title,scheduled_for,duration_minutes,status', f, 'scheduled_for', 20);
    }
    return { entityType, contact, deal, events: buildEvents({ timeline, emails, meetings, deal }), opts };
  },
  buildInput(ctx) {
    return {
      instructions: 'You turn a REAL list of CRM events into a story. Classify every event by its eventId (category, importance, whether it is a milestone: first contact, meeting, proposal, deal stage change, reply after silence). '
        + 'Group events into 1-5 chronological phases using existing event ids only. Predictions must follow from cadence/stage in the data; use null date when unsure and low confidence. '
        + 'Never add events, dates or facts that are not in the list. With fewer than 3 events use overallTrend insufficient_data.',
      input: `Entity: ${ctx.entityType}\n${ctx.contact ? `${describeContact(ctx.contact)}\n` : ''}${ctx.deal ? `Deal: ${capJson(ctx.deal, 1500)}\n` : ''}Today: ${new Date().toISOString().slice(0, 10)}\n\nEvents (oldest first):\n${capJson(ctx.events.map((e) => ({ eventId: e.id, type: e.type, title: e.title, date: e.date })), 9000)}`,
    };
  },
  finalize(parsed, ctx, params) {
    const byId = new Map((parsed.classified || []).map((c) => [c.eventId, c]));
    const events = ctx.events.map((e) => {
      const c = byId.get(e.id);
      return { ...e, category: c ? c.category : 'other', importance: c ? c.importance : 'low' };
    });
    const isMs = (e) => (byId.get(e.id) || {}).isMilestone || (byId.get(e.id) || {}).importance === 'critical';
    const milestones = events.filter(isMs).map((e) => ({ ...e, milestoneType: e.importance === 'critical' ? 'critical' : 'major' }));
    const idx = new Map(events.map((e, i) => [e.id, i]));
    const phases = (parsed.phases || []).map((p) => {
      const a = idx.get(p.firstEventId); const b = idx.get(p.lastEventId);
      if (a === undefined || b === undefined || b < a) return null;
      const slice = events.slice(a, b + 1);
      return { name: p.name, startDate: slice[0].date, endDate: slice[slice.length - 1].date, events: slice, characteristics: p.characteristics || [] };
    }).filter(Boolean);
    const byMonth = {};
    for (const e of events) { const k = e.date.slice(0, 7); byMonth[k] = (byMonth[k] || 0) + 1; }
    const top = Object.entries(byMonth).sort((a, b) => b[1] - a[1])[0];
    const entityId = ctx.entityType === 'deal' ? (ctx.deal && ctx.deal.id) || params.dealId || null : (ctx.contact && ctx.contact.id) || params.contactId || null;
    return {
      entityId, entityType: ctx.entityType, events, milestones, phases,
      predictions: (parsed.predictions || []).map((p) => ({ ...p, confidence: Math.max(0, Math.min(1, p.confidence || 0)) })),
      summary: {
        totalEvents: events.length,
        dateRange: events.length ? { start: events[0].date, end: events[events.length - 1].date } : {},
        mostActivePeriod: top ? top[0] : 'N/A',
        keyMetrics: { averageEventsPerMonth: events.length / Math.max(1, Object.keys(byMonth).length), milestoneCount: milestones.length, phaseCount: phases.length },
        overallTrend: events.length < 3 ? 'insufficient_data' : parsed.overallTrend,
        insights: parsed.insights || [],
      },
      generatedAt: new Date().toISOString(),
    };
  },
};
