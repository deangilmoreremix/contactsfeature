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
  if (opts.conversationId) params.conversation = opts.conversationId;
  else if (opts.previousResponseId) params.previous_response_id = opts.previousResponseId;
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

const { parsePartialJson } = require('./_stream/partialJson');

const TOOL_LABELS = {
  web_search: { in_progress: 'Starting web search…', searching: 'Searching the web…', completed: 'Finished searching the web' },
  file_search: { in_progress: 'Searching documents…', searching: 'Searching documents…', completed: 'Finished searching documents' },
  image_generation: { in_progress: 'Starting image generation…', generating: 'Generating image…', completed: 'Image ready' },
};

/**
 * Pure mapper: Responses stream events -> our UI events (see docs/STREAMING.md).
 *   { type:'status', tool?, phase, label } | { type:'delta', text } | { type:'partial', json }
 *   { type:'reasoning', text } | { type:'image', index, b64, partial } | { type:'done', ... } | { type:'error', message }
 * Every emitted event carries `seq` (the Responses sequence_number) so a client can resume
 * with `starting_after`. State lives in the returned closure.
 */
function createStreamMapper(opts = {}) {
  let full = '';
  let started = false;
  let lastPartial = '';

  function map(event) {
    const out = [];
    const seq = typeof event.sequence_number === 'number' ? event.sequence_number : undefined;
    const emit = (e) => out.push(seq === undefined ? e : { ...e, seq });
    const type = event.type || '';

    switch (type) {
      case 'response.created':
      case 'response.queued':
      case 'response.in_progress':
        if (!started) {
          started = true;
          emit({ type: 'status', phase: 'started', label: 'Thinking…', id: event.response && event.response.id });
        }
        break;
      case 'response.output_text.delta':
        full += event.delta || '';
        emit({ type: 'delta', text: event.delta || '' });
        if (opts.schema) {
          const json = parsePartialJson(full);
          const key = json === undefined ? '' : JSON.stringify(json);
          if (key && key !== lastPartial) { lastPartial = key; emit({ type: 'partial', json }); }
        }
        break;
      case 'response.reasoning_summary_text.delta':
        if (opts.reasoningSummary && event.delta) emit({ type: 'reasoning', text: event.delta });
        break;
      case 'response.output_item.added': {
        const item = event.item || {};
        if (item.type === 'reasoning') emit({ type: 'status', phase: 'reasoning', label: 'Thinking it through…' });
        else if (item.type === 'function_call') emit({ type: 'status', tool: item.name, phase: 'calling', label: `Running ${item.name}…` });
        else if (item.type === 'mcp_call') emit({ type: 'status', tool: item.name, phase: 'calling', label: `Running ${item.name}…` });
        break;
      }
      case 'response.output_item.done': {
        const item = event.item || {};
        if (item.type === 'image_generation_call' && typeof item.result === 'string' && item.result) {
          emit({ type: 'image', index: event.output_index || 0, b64: item.result, partial: false });
        }
        break;
      }
      case 'response.image_generation_call.partial_image':
        emit({ type: 'image', index: event.partial_image_index || 0, b64: event.partial_image_b64, partial: true });
        break;
      default: {
        const m = /^response\.(web_search|file_search|image_generation)_call\.(in_progress|searching|generating|completed)$/.exec(type);
        if (m) emit({ type: 'status', tool: m[1], phase: m[2], label: (TOOL_LABELS[m[1]] || {})[m[2]] || `${m[1]} ${m[2]}` });
        break;
      }
      case 'response.completed':
      case 'response.incomplete': {
        const r = event.response || {};
        const { citations } = extractCitations(r);
        const text = full || extractText(r);
        emit({
          type: 'done', id: r.id || null, text, usage: r.usage || null, citations,
          json: opts.schema ? parseJson(text) : null,
          ...(type === 'response.incomplete' ? { incomplete: (r.incomplete_details && r.incomplete_details.reason) || true } : {}),
        });
        break;
      }
      case 'response.failed':
        emit({ type: 'error', message: (event.response && event.response.error && event.response.error.message) || 'Response failed' });
        break;
      case 'error':
        emit({ type: 'error', message: event.message || 'Stream error' });
        break;
    }
    return out;
  }
  return { map, get text() { return full; } };
}

/**
 * Streaming call. Async generator of the UI events above.
 * opts: everything buildParams() takes, plus
 *   reasoningSummary: true            -> request reasoning summaries ('reasoning' events)
 *   resume: { responseId, startingAfter } -> re-attach to a background response stream
 */
async function* streamResponse(opts = {}) {
  const client = opts.client || getClient();
  const mapper = createStreamMapper(opts);
  let sawTerminal = false;
  try {
    let stream;
    if (opts.resume && opts.resume.responseId) {
      stream = await withRetry(() => client.responses.retrieve(opts.resume.responseId, {
        stream: true,
        ...(Number.isInteger(opts.resume.startingAfter) ? { starting_after: opts.resume.startingAfter } : {}),
      }), { retries: 1 });
    } else {
      const params = buildParams({ ...opts, stream: true });
      if (opts.reasoningSummary && params.reasoning) params.reasoning = { ...params.reasoning, summary: 'auto' };
      stream = await withRetry(() => client.responses.create(params), { retries: 1 });
    }
    for await (const event of stream) {
      for (const e of mapper.map(event)) {
        if (e.type === 'done' || e.type === 'error') sawTerminal = true;
        yield e;
      }
      if (sawTerminal) return;
    }
    if (!sawTerminal) yield { type: 'done', id: null, text: mapper.text, usage: null, citations: [], json: opts.schema ? parseJson(mapper.text) : null };
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

/**
 * Moderation guard for outbound content. input: string | string[].
 * Returns { flagged, categories, results } where `categories` is the legacy category->boolean map
 * merged (OR) across all inputs and `results` is the raw per-input result list.
 */
async function moderate(input, opts = {}) {
  const client = opts.client || getClient();
  const res = await withRetry(() => client.moderations.create({
    model: process.env.SMARTCRM_MODERATION_MODEL || models.moderation.model,
    input,
  }));
  const results = (res && res.results) || [];
  const categories = {};
  for (const r of results) {
    for (const [k, v] of Object.entries((r && r.categories) || {})) categories[k] = !!categories[k] || !!v;
  }
  return { flagged: results.some((r) => r && r.flagged), categories, results };
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

/**
 * Drop-in replacement for `fetch('https://api.openai.com/v1/responses', { body: JSON.stringify(body) })`
 * used by older functions. Takes the raw Responses request body, normalises the model through the
 * model map (legacy ids -> roles), applies the reasoning-model rules, calls the SDK, and returns a
 * fetch-like object whose json() is the Response plus a reliable `output_text`.
 */
async function responsesFetch(body, opts = {}) {
  const { normalizeModel } = require('./_validation');
  const role = normalizeModel(body.model) || 'default';
  const { model, effort } = resolveModel(role, opts.effort || 'low');
  const params = { model, input: body.input, store: false };
  if (body.instructions) params.instructions = body.instructions;
  if (effort) params.reasoning = { effort };
  if (effort === 'none' && typeof body.temperature === 'number') params.temperature = body.temperature;
  if (body.max_output_tokens) params.max_output_tokens = body.max_output_tokens;
  if (body.tools) params.tools = body.tools;
  if (body.text) {
    params.text = body.text.format && body.text.format.type === 'json_schema'
      ? { ...body.text, format: { ...body.text.format, strict: true, schema: strictify(body.text.format.schema) } }
      : body.text;
  }
  const client = opts.client || getClient();
  const response = await withRetry(() => client.responses.create(params), opts.retry);
  const text = extractText(response);
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ ...response, output_text: text }),
    text: async () => text,
  };
}

// ---------------------------------------------------------------------------------------------
// Additional OpenAI endpoints (Conversations, Files, Batches, Realtime, Webhooks, token counting)
// ---------------------------------------------------------------------------------------------

/** Server-side conversation (replaces hand-rolled previous_response_id chains). Returns { id }. */
async function createConversation(opts = {}) {
  const client = opts.client || getClient();
  const res = await withRetry(() => client.conversations.create({
    ...(opts.items ? { items: opts.items } : {}),
    ...(opts.metadata ? { metadata: opts.metadata } : {}),
  }));
  return { id: res.id };
}

async function deleteConversation(id, opts = {}) {
  const client = opts.client || getClient();
  try {
    await withRetry(() => client.conversations.delete(id));
    return true;
  } catch (err) {
    if (err && err.status === 404) return false; // already gone
    throw err;
  }
}

/**
 * Upload a file to the Files API. `file` is whatever the SDK accepts (use `toFile` from 'openai'
 * for Buffers). purpose: 'user_data' (input_file) | 'batch' | 'assistants'.
 */
async function uploadFile(file, purpose = 'user_data', opts = {}) {
  const client = opts.client || getClient();
  const res = await withRetry(() => client.files.create({ file, purpose }));
  return { id: res.id, bytes: res.bytes, filename: res.filename };
}

async function deleteFile(id, opts = {}) {
  const client = opts.client || getClient();
  try {
    await client.files.delete(id);
    return true;
  } catch (err) {
    if (err && err.status === 404) return false;
    throw err;
  }
}

/** Download a file's text content (batch output). */
async function fileText(id, opts = {}) {
  const client = opts.client || getClient();
  const res = await withRetry(() => client.files.content(id));
  return typeof res.text === 'function' ? res.text() : String(res);
}

/** Build the JSONL body for a Batch API run. requests: [{ customId, body }]. */
function buildBatchJsonl(endpoint, requests) {
  return requests
    .map((r) => JSON.stringify({ custom_id: r.customId, method: 'POST', url: endpoint, body: r.body }))
    .join('\n');
}

/** Create a batch from prepared requests (endpoint '/v1/responses' or '/v1/embeddings'). */
async function createBatch(endpoint, requests, opts = {}) {
  const { toFile } = require('openai');
  const client = opts.client || getClient();
  const jsonl = buildBatchJsonl(endpoint, requests);
  const file = await uploadFile(await toFile(Buffer.from(jsonl, 'utf8'), 'batch.jsonl'), 'batch', opts);
  const batch = await withRetry(() => client.batches.create({
    input_file_id: file.id,
    endpoint,
    completion_window: '24h',
    ...(opts.metadata ? { metadata: opts.metadata } : {}),
  }));
  return { id: batch.id, inputFileId: file.id, status: batch.status };
}

/** Retrieve batch status; when completed also returns parsed output lines. */
async function getBatch(id, opts = {}) {
  const client = opts.client || getClient();
  const batch = await withRetry(() => client.batches.retrieve(id));
  const out = {
    id: batch.id,
    status: batch.status, // validating | in_progress | finalizing | completed | failed | expired | cancelled
    counts: batch.request_counts || null,
    outputFileId: batch.output_file_id || null,
    errorFileId: batch.error_file_id || null,
    results: [],
  };
  if (opts.withResults && batch.status === 'completed' && batch.output_file_id) {
    const text = await fileText(batch.output_file_id, opts);
    out.results = parseBatchOutput(text);
  }
  return out;
}

/** Parse batch output JSONL -> [{ customId, ok, body, error }]. */
function parseBatchOutput(text) {
  return String(text || '')
    .split('\n')
    .filter((l) => l.trim())
    .map((line) => {
      const row = JSON.parse(line);
      const ok = !row.error && row.response && row.response.status_code === 200;
      return { customId: row.custom_id, ok, body: ok ? row.response.body : null, error: ok ? null : (row.error || row.response || null) };
    });
}

async function cancelBatch(id, opts = {}) {
  const client = opts.client || getClient();
  const batch = await withRetry(() => client.batches.cancel(id));
  return { id: batch.id, status: batch.status };
}

/**
 * Mint a short-lived Realtime client secret so the BROWSER can connect without our API key.
 * opts: { instructions, voice, tools, role: 'default'|'mini'|'voice', expiresAfterSeconds }
 * Returns { value, expiresAt, model }.
 */
async function createRealtimeSecret(opts = {}) {
  const client = opts.client || getClient();
  const model = opts.model || (models.realtime && models.realtime[opts.role || 'default']) || models.realtime.default;
  const session = {
    type: 'realtime',
    model,
    ...(opts.instructions ? { instructions: opts.instructions } : {}),
    ...(opts.voice ? { audio: { output: { voice: opts.voice } } } : {}),
    ...(opts.tools && opts.tools.length ? { tools: opts.tools, tool_choice: 'auto' } : {}),
  };
  const res = await withRetry(() => client.realtime.clientSecrets.create({
    ...(opts.expiresAfterSeconds ? { expires_after: { anchor: 'created_at', seconds: opts.expiresAfterSeconds } } : {}),
    session,
  }));
  return { value: res.value, expiresAt: res.expires_at || null, model };
}

/** Verify + parse an OpenAI webhook (signature check). Throws on an invalid signature. */
async function unwrapWebhook(rawBody, headers, opts = {}) {
  const client = opts.client || getClient();
  const secret = opts.secret || process.env.OPENAI_WEBHOOK_SECRET;
  if (!secret) throw new Error('OPENAI_WEBHOOK_SECRET is not configured');
  return client.webhooks.unwrap(rawBody, headers, secret);
}

/** Count input tokens for a prospective request (guards context size before sending). */
async function countInputTokens(opts = {}) {
  const client = opts.client || getClient();
  const { model } = resolveModel(opts.model || opts.role || 'default', opts.effort);
  const res = await withRetry(() => client.responses.inputTokens.count({
    model,
    input: opts.input,
    ...(opts.instructions ? { instructions: opts.instructions } : {}),
  }));
  return res.input_tokens;
}

/** Cancel a background response. */
async function cancelResponse(id, opts = {}) {
  const client = opts.client || getClient();
  const res = await withRetry(() => client.responses.cancel(id));
  return { id: res.id, status: res.status };
}


module.exports = {
  createStreamMapper,
  createConversation,
  deleteConversation,
  uploadFile,
  deleteFile,
  fileText,
  buildBatchJsonl,
  createBatch,
  getBatch,
  parseBatchOutput,
  cancelBatch,
  createRealtimeSecret,
  unwrapWebhook,
  countInputTokens,
  cancelResponse,
  responsesFetch,
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
