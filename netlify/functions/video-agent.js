/**
 * video-agent — personalised sales-video SCRIPT and storyboard, streamed (lib/video/createVideoScript prompt: contact,
 * latest deal, agent memory, mood). NO video file is rendered: lib/video/renderVideo is a stub and there is no render
 * backend, so `videoUrl` is always null and `rendering.available` is false. Nothing is queued in video_jobs.
 * POST { contactId, productUrl, goal? = demo|followup|overview|onboarding }
 *   -> { contactId, goal, mood, title, script, storyboard[{scene,seconds,visual,narration}], call_to_action, videoUrl:null, rendering, citations }
 * The product page is looked up with web search; the script/narration is moderated.
 */
const { stream } = require('@netlify/functions');
const { withAuth } = require('./_auth');
const { createPanelHandler } = require('./_lib/panelHandler');
const { requireUuid, ownedContact, latestDealForContact, memoryRows, TaskError } = require('./_lib/ctx');
const { groupMemory } = require('./_lib/memory');
const { determineMood } = require('./_lib/mood');
const { videoPrompt } = require('./_lib/agentScripts');

const GOALS = { demo: 'demo', followup: 'followup', overview: 'overview', onboarding: 'onboarding' };
const str = { type: 'string' };
const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'working title of the video' },
    script: { type: 'string', description: 'the full 45-60 second narration, ready to read aloud' },
    storyboard: { type: 'array', items: { type: 'object', properties: { scene: { type: 'integer' }, seconds: { type: 'integer' }, visual: str, narration: str } } },
    call_to_action: str,
  },
};

function parseUrl(v) {
  let u;
  try { u = new URL(String(v || '').trim()); } catch { throw new TaskError(400, 'Enter a valid product or landing page URL.'); }
  if (!/^https?:$/.test(u.protocol)) throw new TaskError(400, 'The product URL must start with http:// or https://');
  return u.toString().slice(0, 500);
}

const createHandler = createPanelHandler({
  endpoint: 'video-agent',
  parse(body) {
    return {
      contactId: requireUuid(body.contactId, 'contactId'),
      productUrl: parseUrl(body.productUrl),
      goal: GOALS[body.goal] || 'demo',
    };
  },
  async load({ user, params }) {
    const contact = await ownedContact(user, params.contactId);
    const deal = await latestDealForContact(user, contact.id);
    const memory = groupMemory(await memoryRows(contact.id));
    return { contact, deal, memory, mood: determineMood(contact, deal) };
  },
  build(ctx, params) {
    const base = videoPrompt({ template: params.goal, contact: ctx.contact, deal: ctx.deal, memory: ctx.memory }, ctx.mood);
    return {
      role: 'default', effort: 'low', schema: SCHEMA, schemaName: 'video_script', tools: [{ type: 'web_search' }], maxOutputTokens: 3500,
      instructions: 'You write short personalised sales video scripts. Use only facts about the contact that are given. Look up the product page below and describe only what it actually says; if you cannot read it, say so in the script notes instead of inventing features.',
      input: `${base}\n\nProduct / landing page to feature: ${params.productUrl}\nAlso return a storyboard (4-6 scenes, with seconds and a visual description) that matches the script, and the closing call_to_action.`,
    };
  },
  finalize({ parsed, citations, ctx, params }) {
    return {
      contactId: ctx.contact.id, goal: params.goal, mood: ctx.mood,
      title: String(parsed.title || ''), script: String(parsed.script || '').trim(),
      storyboard: (Array.isArray(parsed.storyboard) ? parsed.storyboard : []).map((s, i) => ({
        scene: Number.isFinite(Number(s.scene)) ? Number(s.scene) : i + 1, seconds: Number(s.seconds) || null,
        visual: String(s.visual || ''), narration: String(s.narration || ''),
      })),
      call_to_action: String(parsed.call_to_action || ''),
      videoUrl: null,
      rendering: { available: false, note: 'Script and storyboard only. No video is rendered: no render backend is connected.' },
      citations,
    };
  },
  outboundText: (p) => [p.script, p.call_to_action, ...p.storyboard.map((s) => s.narration)],
});

exports.createHandler = createHandler;
exports.handler = stream(withAuth(createHandler()));
