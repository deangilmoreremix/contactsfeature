/**
 * Shared OpenAI Responses API helper (single source of truth for server-side AI calls).
 *
 * - Model ids/effort come from src/config/models.json (roles: default | thinking | fast | pro)
 * - Uses POST /v1/responses via the official SDK (never chat.completions)
 * - Reasoning-model safe: temperature/top_p are only sent when effort === 'none'
 * - Structured Outputs via text.format json_schema (strict) with automatic
 *   `additionalProperties: false` / `required` normalisation
 * - Hosted tools (web_search, file_search) + function tools in the flat Responses shape
 * - Streaming via typed events (response.output_text.delta, response.completed)
 * - Also exposes embeddings, moderation, transcription and image generation
 *
 * Pass `client` in options to inject a fake SDK client (used by unit tests).
 */
const models = require('../../src/config/models.json');

let OpenAI;
try {
  const mod = require('openai');
  OpenAI = mod.OpenAI || mod.default || mod;
} catch (_) {
  OpenAI = null;
}

let sharedClient = null;
function getClient() {
  if (sharedClient) return sharedClient;
  if (!OpenAI) throw new Error('[responses] openai SDK is not installed');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('[responses] OPENAI_API_KEY is not configured');
  sharedClient = new OpenAI({ apiKey, maxRetries: 0, timeout: 120000 });
  return sharedClient;
}

const EFFORTS = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']);

/** Resolve a role ('default'|'thinking'|'fast'|'pro') or raw model id to { model, effort }. */
function resolveModel(roleOrModel = 'default', effortOverride) {
  const roleKey = String(roleOrModel || 'default');
  const entry = models.text[roleKey];
  let model;
  let effort;
  if (entry) {
    const envPrefix = `SMARTCRM_${roleKey.toUpperCase()}`;
    model = process.env[`${envPrefix}_MODEL`] || (roleKey === 'default' && process.env.SMARTCRM_MODEL) ||
      (roleKey === 'thinking' && process.env.SMARTCRM_THINKING_MODEL) ||
      (roleKey === 'fast' && process.env.SMARTCRM_FAST_MODEL) || entry.model;
    effort = process.env[`${envPrefix}_EFFORT`] || entry.effort;
  } else {
    model = roleKey; // explicit model id
    effort = models.text.default.effort;
  }
  if (effortOverride) effort = effortOverride;
  if (!EFFORTS.has(effort)) effort = undefined;
  return { model, effort };
}

/** Allowed model ids for validating user-supplied overrides (roles + configured ids). */
function allowedModelIds() {
  const ids = new Set(Object.values(models.text).map((m) => m.model));
  ['SMARTCRM_MODEL', 'SMARTCRM_THINKING_MODEL', 'SMARTCRM_FAST_MODEL'].forEach((k) => {
    if (process.env[k]) ids.add(process.env[k]);
  });
  return ids;
}

/** Make a JSON schema OpenAI-strict: every object gets additionalProperties:false and all props required. */
function strictify(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  const out = Array.isArray(schema) ? schema.map(strictify) : { ...schema };
  if (Array.isArray(out)) return out;
  if (out.type === 'object' && out.properties) {
    const keys = Object.keys(out.properties);
    out.properties = Object.fromEntries(keys.map((k) => [k, strictify(out.properties[k])]));
    out.required = keys;
    out.additionalProperties = false;
  }
  if (out.items) out.items = strictify(out.items);
  ['anyOf', 'oneOf', 'allOf'].forEach((k) => {
    if (Array.isArray(out[k])) out[k] = out[k].map(strictify);
  });
  if (out.$defs) out.$defs = Object.fromEntries(Object.entries(out.$defs).map(([k, v]) => [k, strictify(v)]));
  return out;
}

/**
 * Build the /v1/responses request body.
 * opts: role, model, effort, instructions, input, schema, schemaName, tools, toolChoice,
 *       maxOutputTokens, previousResponseId, store, include, metadata, user, temperature, stream
 */
function buildParams(opts = {}) {
  const { model, effort } = resolveModel(opts.model || opts.role || 'default', opts.effort);
  const params = { model, input: opts.input };
  if (opts.instructions) params.instructions = opts.instructions;
  if (effort) params.reasoning = { effort };
  // Reasoning models reject sampling params unless effort is 'none'.
  if (effort === 'none' && typeof opts.temperature === 'number') params.temperature = opts.temperature;
  if (opts.maxOutputTokens) params.max_output_tokens = opts.maxOutputTokens;
  if (opts.schema) {
    params.text = {
      format: {
        type: 'json_schema',
        name: String(opts.schemaName || 'result').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64),
        strict: true,
        schema: strictify(opts.schema),
      },
    };
  }
  if (opts.tools && opts.tools.length) params.tools = opts.tools;
  if (opts.toolChoice) params.tool_choice = opts.toolChoice;
  if (opts.previousResponseId) params.previous_response_id = opts.previousResponseId;
  if (opts.background) { params.background = true; params.store = true; } // long-running jobs: poll with retrieveResponse()
  else if (typeof opts.store === 'boolean') params.store = opts.store;
  const include = new Set(opts.include || []);
  if ((opts.tools || []).some((t) => t.type === 'web_search')) include.add('web_search_call.action.sources');
  if (include.size) params.include = [...include];
  if (opts.metadata) params.metadata = opts.metadata;
  if (opts.user) params.user = String(opts.user).slice(0, 64);
  if (opts.stream) params.stream = true;
  return params;
}

/** Concatenate output_text from a Responses result (skips reasoning / tool-call items). */
function extractText(response) {
  if (!response) return '';
  if (typeof response.output_text === 'string' && response.output_text) return response.output_text;
  const parts = [];
  for (const item of response.output || []) {
    if (item.type !== 'message') continue;
    for (const c of item.content || []) {
      if (c.type === 'output_text' && typeof c.text === 'string') parts.push(c.text);
    }
  }
  return parts.join('');
}

/** url_citation annotations (title/url) deduped, plus the full consulted source list if requested. */
function extractCitations(response) {
  const citations = [];
  const sources = [];
  const seen = new Set();
  for (const item of (response && response.output) || []) {
    if (item.type === 'message') {
      for (const c of item.content || []) {
        for (const a of c.annotations || []) {
          if (a.type === 'url_citation' && a.url && !seen.has(a.url)) {
            seen.add(a.url);
            citations.push({ url: a.url, title: a.title || a.url });
          }
        }
      }
    } else if (item.type === 'web_search_call' && item.action && Array.isArray(item.action.sources)) {
      for (const s of item.action.sources) {
        if (s && s.url) sources.push({ url: s.url, title: s.title || s.url });
      }
    }
  }
  return { citations, sources };
}

/** Pull function_call items so callers can run their own tools and send function_call_output. */
function extractFunctionCalls(response) {
  return ((response && response.output) || [])
    .filter((i) => i.type === 'function_call')
    .map((i) => {
      let args = {};
      try { args = JSON.parse(i.arguments || '{}'); } catch (_) { /* leave empty */ }
      return { callId: i.call_id, name: i.name, arguments: args, raw: i };
    });
}

/** Parse JSON model output; tolerate code fences or leading prose. */
function parseJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) { /* fall through */ }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch (_) { /* continue */ } }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) { try { return JSON.parse(text.slice(start, end + 1)); } catch (_) { /* continue */ } }
  return null;
}

function isRetryable(err) {
  const status = err && (err.status || err.statusCode);
  if (status === 429 || (status >= 500 && status < 600)) return true;
  const code = err && err.code;
  return ['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'EAI_AGAIN'].includes(code) || (err && err.name === 'APIConnectionError');
}

async function withRetry(fn, { retries = 2, baseDelayMs = 600 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isRetryable(err)) break;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
    }
  }
  throw lastErr;
}

/**
 * Non-streaming call. Returns { id, text, json, citations, sources, functionCalls, usage, status, response }.
 * If a schema is supplied and the model/tool combination rejects structured output, retries once
 * with plain text and parses JSON from the reply.
 */
async function createResponse(opts = {}) {
  const client = opts.client || getClient();
  let params = buildParams(opts);
  let response;
  try {
    response = await withRetry(() => client.responses.create(params), opts.retry);
  } catch (err) {
    const msg = String((err && err.message) || '');
    const schemaRejected = params.text && err && err.status === 400 && /json_schema|text\.format|structured/i.test(msg);
    if (!schemaRejected) throw err;
    const { text: _drop, ...rest } = params;
    rest.instructions = `${rest.instructions || ''}\n\nReturn ONLY a single valid JSON object matching this JSON Schema, no prose:\n${JSON.stringify(opts.schema)}`.trim();
    response = await withRetry(() => client.responses.create(rest), opts.retry);
  }
  const text = extractText(response);
  const { citations, sources } = extractCitations(response);
  return {
    id: response.id,
    status: response.status,
    text,
    json: opts.schema ? parseJson(text) : null,
    citations,
    sources,
    functionCalls: extractFunctionCalls(response),
    usage: response.usage || null,
    incomplete: response.incomplete_details || null,
    response,
  };
}

/**
 * Streaming call. Async generator yielding
 *   { type: 'delta', text } | { type: 'done', id, text, usage, citations } | { type: 'error', message }
 */
async function* streamResponse(opts = {}) {
  const client = opts.client || getClient();
  const params = buildParams({ ...opts, stream: true });
  let full = '';
  try {
    const stream = await withRetry(() => client.responses.create(params), { retries: 1 });
    for await (const event of stream) {
      switch (event.type) {
        case 'response.output_text.delta':
          full += event.delta;
          yield { type: 'delta', text: event.delta };
          break;
        case 'response.completed': {
          const { citations } = extractCitations(event.response);
          yield { type: 'done', id: event.response.id, text: full || extractText(event.response), usage: event.response.usage || null, citations };
          return;
        }
        case 'response.failed':
          yield { type: 'error', message: (event.response && event.response.error && event.response.error.message) || 'Response failed' };
          return;
        case 'error':
          yield { type: 'error', message: event.message || 'Stream error' };
          return;
        default:
          break;
      }
    }
    yield { type: 'done', id: null, text: full, usage: null, citations: [] };
  } catch (err) {
    yield { type: 'error', message: (err && err.message) || 'Stream failed' };
  }
}

/** Retrieve a stored/background response and normalise it like createResponse(). */
async function retrieveResponse(id, opts = {}) {
  const client = opts.client || getClient();
  const response = await withRetry(() => client.responses.retrieve(id));
  const text = extractText(response);
  const { citations, sources } = extractCitations(response);
  return {
    id: response.id,
    status: response.status, // queued | in_progress | completed | failed | incomplete | cancelled
    text,
    json: opts.schema || opts.parseJson ? parseJson(text) : null,
    citations,
    sources,
    error: response.error || null,
    metadata: response.metadata || {},
    usage: response.usage || null,
    response,
  };
}

/** Embeddings for semantic search. input: string | string[]. Returns number[][] */
async function embed(input, opts = {}) {
  const client = opts.client || getClient();
  const arr = Array.isArray(input) ? input : [input];
  const res = await withRetry(() => client.embeddings.create({
    model: process.env.SMARTCRM_EMBEDDING_MODEL || models.embedding.model,
    input: arr,
    ...(opts.dimensions ? { dimensions: opts.dimensions } : {}),
  }));
  return res.data.map((d) => d.embedding);
}

/** Moderation guard for AI-generated outbound content. Returns { flagged, categories }. */
async function moderate(text, opts = {}) {
  const client = opts.client || getClient();
  const res = await withRetry(() => client.moderations.create({
    model: process.env.SMARTCRM_MODERATION_MODEL || models.moderation.model,
    input: text,
  }));
  const r = res.results && res.results[0];
  return { flagged: !!(r && r.flagged), categories: (r && r.categories) || {} };
}

/** Speech-to-text for a Buffer/Readable (call recordings). */
async function transcribe(file, opts = {}) {
  const client = opts.client || getClient();
  const res = await withRetry(() => client.audio.transcriptions.create({
    file,
    model: process.env.SMARTCRM_TRANSCRIBE_MODEL || models.audio.transcribe,
    ...(opts.language ? { language: opts.language } : {}),
  }));
  return res.text;
}

/** Image generation (Images 2.6). quality/size/format passed through. Returns base64 strings. */
async function generateImage(opts = {}) {
  const client = opts.client || getClient();
  const model = opts.model || (opts.fast ? models.image.fast : models.image.default);
  const res = await withRetry(() => client.images.generate({
    model,
    prompt: opts.prompt,
    n: opts.n || 1,
    ...(opts.size ? { size: opts.size } : {}),
    ...(opts.quality ? { quality: opts.quality } : {}),
    ...(opts.outputFormat ? { output_format: opts.outputFormat } : {}),
  }));
  return (res.data || []).map((d) => d.b64_json || d.url).filter(Boolean);
}

module.exports = {
  models,
  getClient,
  resolveModel,
  allowedModelIds,
  strictify,
  buildParams,
  extractText,
  extractCitations,
  extractFunctionCalls,
  parseJson,
  createResponse,
  retrieveResponse,
  streamResponse,
  embed,
  moderate,
  transcribe,
  generateImage,
};
