/**
 * Meeting optimizer. Old contract: { originalData, optimizationType, optimizedSchedule{recommendedTime,recommendedDate,duration,timeZone,
 * alternatives[],reasoning,confidence}, optimizedAgenda[{item,duration,presenter,purpose}], participantOptimization{required[],optional[],roles{},
 * preparation{},communication{}}, recommendations[], predictedOutcomes{…}, riskFactors[], optimizedAt }.
 * Slots are NEVER invented by the model: candidate slots come from the caller's calendar_events via _availability.js and the model only picks
 * by index, so a recommended time can never collide with an existing event.
 */
const { computeFreeSlots, hasConflict } = require('../_availability');
const { userCalendarEvents, capJson, obj, DAY } = require('./_ctxAnalysis');

const TYPES = ['schedule', 'agenda', 'participants', 'comprehensive'];

function validTz(tz) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

function localParts(iso, tz) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(iso));
  const g = (t) => p.find((x) => x.type === t).value;
  return { date: `${g('year')}-${g('month')}-${g('day')}`, time: `${g('hour')}:${g('minute')}` };
}

/** Spread up to `n` candidates over distinct days, chronological, indexed for the model. */
function pickCandidates(slots, n, tz) {
  const byDay = new Map();
  for (const s of slots) {
    const k = localParts(s.start, tz).date;
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(s);
  }
  const out = [];
  const lists = [...byDay.values()];
  for (let round = 0; out.length < n && lists.some((l) => l.length); round++) {
    for (const l of lists) {
      if (out.length >= n) break;
      const idx = Math.min(l.length - 1, Math.floor(l.length / 3) + round);
      if (l[idx]) out.push(...l.splice(idx, 1));
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

const md = (params) => (params.meetingData && typeof params.meetingData === 'object' ? params.meetingData : params);

module.exports = {
  id: 'meeting-optimizer',
  role: 'default',
  effort: 'low',
  schema: {
    type: 'object',
    properties: {
      scheduleChoice: {
        type: 'object',
        properties: {
          slotIndex: { type: ['integer', 'null'], description: 'index into the candidate slots; null when none fit' },
          alternativeIndexes: { type: 'array', items: { type: 'integer' } },
          reasoning: { type: 'string' },
          confidence: { type: 'integer', description: '0-100' },
        },
      },
      agenda: {
        type: 'array',
        items: { type: 'object', properties: { item: { type: 'string' }, minutes: { type: 'integer' }, presenter: { type: 'string' }, purpose: { type: 'string' } } },
      },
      participants: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            participantIndex: { type: 'integer', description: 'index in the participants list given' },
            necessity: { type: 'string', enum: ['required', 'optional'] },
            suggestedRole: { type: 'string' },
            preparation: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      communication: {
        type: 'object',
        properties: {
          primaryChannel: { type: 'string' },
          backupChannels: { type: 'array', items: { type: 'string' } },
          materials: { type: 'array', items: { type: 'string' } },
          reminders: { type: 'array', items: { type: 'object', properties: { timing: { type: 'string' }, message: { type: 'string' } } } },
        },
      },
      recommendations: { type: 'array', items: { type: 'string' } },
      predictedOutcomes: {
        type: 'object',
        properties: {
          successProbability: { type: 'integer', description: '0-100' },
          expectedEngagement: { type: 'string', enum: ['High', 'Medium', 'Low'] },
          likelyOutcomes: { type: 'array', items: { type: 'string' } },
          potentialChallenges: { type: 'array', items: { type: 'string' } },
          followUpNeeded: { type: 'boolean' },
        },
      },
      riskFactors: { type: 'array', items: { type: 'string' } },
    },
  },
  async load({ user, params }) {
    const m = md(params);
    const duration = Math.max(10, Math.min(480, Number(m.duration) || 60));
    const tzRaw = m.timeZone || (Array.isArray(m.participants) && m.participants.map((p) => p && p.timeZone).find(Boolean)) || 'UTC';
    const timeZone = validTz(tzRaw) ? tzRaw : 'UTC';
    const from = new Date();
    const to = new Date(from.getTime() + 14 * DAY);
    const events = await userCalendarEvents(user, { from, to });
    const free = computeFreeSlots(events, {
      from, to, timeZone, durationMinutes: duration, slotMinutes: 30, bufferMinutes: 10, minNoticeMinutes: 60,
      workStartHour: Number.isFinite(Number(m.workStartHour)) ? Number(m.workStartHour) : 9,
      workEndHour: Number.isFinite(Number(m.workEndHour)) ? Number(m.workEndHour) : 17, limit: 400,
    });
    return { events, duration, timeZone, candidates: pickCandidates(free, 8, timeZone) };
  },
  buildInput(ctx, params) {
    const m = md(params);
    const participants = (Array.isArray(m.participants) ? m.participants : []).slice(0, 30).map((p, i) => ({ index: i, ...obj(p) }));
    return {
      instructions: 'You optimise meetings for a seller. Choose the best slot ONLY from the numbered candidate slots (they are already free on the user\'s calendar); '
        + 'if none are given, set slotIndex null. Build a time-boxed agenda whose minutes sum to at most the meeting duration. Classify each listed participant by index; never invent people. '
        + 'Do not claim facts about participants that are not in the data. Risks must follow from the data (time zones, size, missing agenda, no candidate slots).',
      input: `Optimization type: ${TYPES.includes(params.optimizationType) ? params.optimizationType : 'comprehensive'}\nDuration: ${ctx.duration} min\nTime zone: ${ctx.timeZone}\n`
        + `Topic: ${String(m.topic || 'not given').slice(0, 300)}\nObjectives: ${capJson(m.objectives, 1500)}\nExisting agenda: ${capJson(m.agenda, 1500)}\nPreferred times: ${capJson(m.preferredTimes, 600)}\n`
        + `Participants: ${capJson(participants, 5000)}\n\nCandidate free slots (local ${ctx.timeZone}):\n`
        + (ctx.candidates.map((s, i) => `${i}: ${localParts(s.start, ctx.timeZone).date} ${localParts(s.start, ctx.timeZone).time}`).join('\n') || 'none'),
    };
  },
  finalize(parsed, ctx, params) {
    const m = md(params);
    const type = TYPES.includes(params.optimizationType) ? params.optimizationType : 'comprehensive';
    const wants = (k) => type === 'comprehensive' || type === k;
    const slotAt = (i) => (Number.isInteger(i) && ctx.candidates[i] ? ctx.candidates[i] : null);
    const choice = parsed.scheduleChoice || {};
    const main = slotAt(choice.slotIndex);
    const fmt = (s) => ({ ...localParts(s.start, ctx.timeZone), start: s.start, end: s.end });
    // Defence in depth: a candidate must still be conflict-free.
    const safe = (s) => s && !hasConflict(ctx.events, s.start, ctx.duration);

    const schedule = wants('schedule') ? {
      recommendedTime: safe(main) ? fmt(main).time : '',
      recommendedDate: safe(main) ? fmt(main).date : '',
      recommendedStart: safe(main) ? main.start : null,
      duration: ctx.duration, timeZone: ctx.timeZone,
      alternatives: [...new Set(choice.alternativeIndexes || [])].map(slotAt).filter((s) => safe(s) && s !== main).slice(0, 5).map(fmt),
      reasoning: choice.reasoning || '',
      confidence: safe(main) ? Math.max(0, Math.min(100, Math.round(choice.confidence || 0))) : 0,
    } : {};

    const agenda = wants('agenda') ? (parsed.agenda || []).map((a) => ({ item: a.item, duration: a.minutes, presenter: a.presenter, purpose: a.purpose })) : [];

    let partOpt = {};
    if (wants('participants')) {
      const list = Array.isArray(m.participants) ? m.participants : [];
      partOpt = { required: [], optional: [], roles: {}, preparation: {}, communication: parsed.communication || {} };
      for (const p of parsed.participants || []) {
        const src = list[p.participantIndex];
        if (!src || typeof src !== 'object') continue;
        const id = String(src.id !== undefined ? src.id : p.participantIndex);
        (p.necessity === 'required' ? partOpt.required : partOpt.optional).push({ ...src, role: p.suggestedRole, preparation: p.preparation });
        partOpt.roles[id] = p.suggestedRole;
        partOpt.preparation[id] = p.preparation;
      }
    }
    return {
      originalData: params.meetingData || params, optimizationType: type,
      optimizedSchedule: schedule, optimizedAgenda: agenda, participantOptimization: partOpt,
      recommendations: parsed.recommendations || [], predictedOutcomes: parsed.predictedOutcomes || {}, riskFactors: parsed.riskFactors || [],
      freeSlotsConsidered: ctx.candidates.length, optimizedAt: new Date().toISOString(),
    };
  },
};
