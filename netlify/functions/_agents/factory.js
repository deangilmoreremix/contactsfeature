/**
 * Builds and runs SDR agents with the OpenAI Agents SDK (Responses API under the hood).
 *
 *   const out = await runSdrAgent('linkedin-sdr', { supabase, userId, contact, personaId, preferences });
 *
 * - model + reasoning effort come from src/config/models.json via _responses.resolveModel()
 * - persona system prompts come from the full 30-persona set (_agents/personas.json, generated from
 *   src/agents/personas.ts by scripts/export-personas.cjs)
 * - function tools are scoped to the signed-in user's rows; hosted web_search is enabled per agent
 */
const { Agent, run, tool, webSearchTool, setDefaultOpenAIKey, setOpenAIAPI, setTracingDisabled } = require('@openai/agents');
const { z } = require('zod');
const { resolveModel } = require('../_responses');
const { buildPreferencesPromptBlock } = require('../_sdrPreferences');
const { parsePartialJson } = require('../_stream/partialJson');
const personas = require('./personas.json');
const { DEFINITIONS } = require('./definitions');

let configured = false;
function configureSdk() {
  if (configured) return;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  setDefaultOpenAIKey(apiKey);
  setOpenAIAPI('responses');
  setTracingDisabled(true);
  configured = true;
}

const PERSONA_IDS = new Set(personas.map((p) => p.id));
function getPersona(id) {
  return personas.find((p) => p.id === id) || null;
}

function contactSummary(contact) {
  const pick = ['id', 'name', 'firstname', 'email', 'company', 'title', 'industry', 'status', 'interestLevel', 'interest_level', 'aiScore', 'ai_score', 'tags', 'notes', 'sources', 'last_connected'];
  return Object.fromEntries(pick.filter((k) => contact[k] != null && contact[k] !== '').map((k) => [k, contact[k]]));
}

function buildTools({ supabase, userId, contact, def }) {
  const tools = [
    tool({
      name: 'get_contact_context',
      description: 'Returns the profile fields stored for the contact you are writing to.',
      parameters: z.object({}),
      execute: async () => JSON.stringify(contactSummary(contact)),
    }),
    tool({
      name: 'get_recent_activity',
      description: 'Returns the most recent emails and timeline events for this contact (newest first).',
      parameters: z.object({ limit: z.number().describe('How many items per source, 1-10') }),
      execute: async ({ limit }) => {
        const n = Math.max(1, Math.min(10, Math.floor(limit || 5)));
        const [emails, timeline] = await Promise.all([
          supabase.from('emails').select('subject,status,is_inbound,created_at,opened_at,clicked_at').eq('contact_id', contact.id).eq('user_id', userId).order('created_at', { ascending: false }).limit(n),
          supabase.from('contact_timeline').select('event_type,title,created_at').eq('contact_id', contact.id).eq('user_id', userId).order('created_at', { ascending: false }).limit(n),
        ]);
        return JSON.stringify({ emails: emails.data || [], timeline: timeline.data || [] });
      },
    }),
  ];
  if (def.search) tools.push(webSearchTool({ searchContextSize: 'medium' }));
  return tools;
}

function buildAgent(slug, ctx) {
  const { supabase, userId, contact, personaId, preferences } = ctx;
  const def = DEFINITIONS[slug];
  if (!def) throw new Error(`Unknown SDR agent: ${slug}`);
  configureSdk();

  const persona = personaId ? getPersona(personaId) : null;
  const { model, effort } = resolveModel(def.thinking ? 'thinking' : 'default', def.thinking ? 'medium' : 'low');
  const prefsBlock = preferences ? buildPreferencesPromptBlock(preferences) : '';

  const instructions = [
    `You are the "${def.name}" for SmartCRM, writing on behalf of the signed-in user.`,
    def.instructions,
    persona ? `\nPersona to adopt — ${persona.name} (${persona.defaultTone}):\n${persona.systemPrompt}` : '',
    'Always call get_contact_context first. Never invent facts about the contact or their company; if data is missing, write around it.',
    prefsBlock,
  ].filter(Boolean).join('\n\n');

  return {
    def,
    model,
    agent: new Agent({
      name: def.name,
      instructions,
      model: ctx.modelOverride || model,
      modelSettings: effort && effort !== 'none' ? { reasoning: { effort } } : {},
      tools: buildTools({ supabase, userId, contact, def }),
      outputType: def.output,
    }),
  };
}

/**
 * Run options for the Agents SDK. `conversationId` (a server-side OpenAI Conversation, `conv_...`)
 * is supported by @openai/agents `run(..., { conversationId })` and takes precedence; otherwise
 * `previousResponseId` chains turns. The SDK then only sends the new input each turn.
 */
function buildRunOptions(ctx) {
  const opts = { maxTurns: 8 };
  if (ctx.conversationId) opts.conversationId = ctx.conversationId;
  else if (ctx.previousResponseId) opts.previousResponseId = ctx.previousResponseId;
  return opts;
}

/** Run one agent for one contact. Returns { output, model, persona, usage }. */
async function runSdrAgent(slug, ctx) {
  const { agent, model } = buildAgent(slug, ctx);
  const result = await (ctx.runFn || run)(agent, agentInput(slug, ctx), buildRunOptions(ctx));
  if (!result.finalOutput) throw new Error('Agent returned no output');
  return {
    output: result.finalOutput,
    model,
    persona: ctx.personaId || null,
    conversationId: ctx.conversationId || null,
    lastResponseId: result.lastResponseId || null,
    usage: result.state?.usage ? { input_tokens: result.state.usage.inputTokens, output_tokens: result.state.usage.outputTokens } : null,
  };
}

function agentInput(slug, ctx) {
  const c = ctx.contact;
  return `Write the ${DEFINITIONS[slug].name} output for ${c.firstname || c.name || 'this contact'}${c.company ? ` at ${c.company}` : ''}.${ctx.goal ? `\nGoal: ${ctx.goal}` : ''}`;
}

function toolLabel(rawItem) {
  const name = (rawItem && rawItem.name) || '';
  if (/web_search/i.test(name) || (rawItem && /web_search/i.test(rawItem.type || ''))) return { tool: 'web_search', label: 'Searching the web…' };
  return { tool: name || undefined, label: `Running ${name || 'tool'}…` };
}

/**
 * Pure mapper: Agents SDK stream events -> our UI events (docs/STREAMING.md).
 *   raw_model_stream_event output_text_delta -> delta (+ partial: tolerant parse of the structured JSON so far)
 *   run_item_stream_event tool_called / tool_output / message_output_created -> status
 *   agent_updated_stream_event -> status
 * Text accumulation restarts at each model response (`response_started`), because an agent that calls
 * tools produces one response per turn and only the last holds the structured output.
 */
function createAgentEventMapper() {
  let full = '';
  let lastPartial = '';
  let started = false;
  return function map(ev) {
    const out = [];
    if (!ev) return out;
    if (ev.type === 'raw_model_stream_event') {
      const d = ev.data || {};
      if (d.type === 'response_started') {
        full = '';
        lastPartial = '';
        if (!started) { started = true; out.push({ type: 'status', phase: 'started', label: 'Thinking…' }); }
      } else if (d.type === 'output_text_delta' && d.delta) {
        full += d.delta;
        out.push({ type: 'delta', text: d.delta });
        const json = parsePartialJson(full);
        const key = json === undefined ? '' : JSON.stringify(json);
        if (key && key !== lastPartial) { lastPartial = key; out.push({ type: 'partial', json }); }
      }
    } else if (ev.type === 'run_item_stream_event') {
      const raw = (ev.item && ev.item.rawItem) || {};
      if (ev.name === 'tool_called') {
        const { tool: t, label } = toolLabel(raw);
        out.push({ type: 'status', phase: 'calling', ...(t ? { tool: t } : {}), label });
      } else if (ev.name === 'tool_output') {
        out.push({ type: 'status', phase: 'tool_done', ...(raw.name ? { tool: raw.name } : {}), label: 'Reading the results…' });
      } else if (ev.name === 'message_output_created') {
        out.push({ type: 'status', phase: 'writing', label: 'Writing…' });
      }
    } else if (ev.type === 'agent_updated_stream_event') {
      out.push({ type: 'status', phase: 'agent', label: `${(ev.agent && ev.agent.name) || 'Agent'} is working…` });
    }
    return out;
  };
}

/**
 * Streaming twin of runSdrAgent: async generator of UI events, ending with
 * { type: 'final', output, model, persona, conversationId, lastResponseId, usage } (not sent to the
 * client as-is: the handler turns it into `result` + `done`). Throws if the run fails or has no output.
 */
async function* streamSdrAgent(slug, ctx) {
  const { agent, model } = buildAgent(slug, ctx);
  const streamed = await (ctx.runFn || run)(agent, agentInput(slug, ctx), { ...buildRunOptions(ctx), stream: true });
  const map = createAgentEventMapper();
  const source = typeof streamed[Symbol.asyncIterator] === 'function' ? streamed : streamed.toStream();
  for await (const ev of source) {
    for (const e of map(ev)) yield e;
  }
  await streamed.completed;
  if (streamed.error) throw streamed.error;
  if (!streamed.finalOutput) throw new Error('Agent returned no output');
  yield {
    type: 'final',
    output: streamed.finalOutput,
    model,
    persona: ctx.personaId || null,
    conversationId: ctx.conversationId || null,
    lastResponseId: streamed.lastResponseId || null,
    usage: streamed.state?.usage ? { input_tokens: streamed.state.usage.inputTokens, output_tokens: streamed.state.usage.outputTokens } : null,
  };
}

module.exports = { runSdrAgent, streamSdrAgent, createAgentEventMapper, buildRunOptions, buildAgent, getPersona, PERSONA_IDS, DEFINITIONS };
