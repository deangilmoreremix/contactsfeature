/**
 * Netlify Function: mint a short-lived OpenAI Realtime client secret for the BROWSER.
 * POST { role: 'default'|'mini'|'voice', voice?, instructions? (<= 4000 chars), tools?: string[] }
 *   -> { value, expiresAt, model }
 *
 * The browser connects to OpenAI directly (WebRTC) with this ephemeral secret; the real API key never
 * leaves the server. `tools` are names from a fixed allow-list of CRM tools; their schemas are defined
 * here, and the browser executes them by calling our own authenticated endpoints.
 * Rate limited per user via ai_usage_log (endpoint 'realtime-token').
 */
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { createRealtimeSecret } = require('./_responses');
const { underEndpointLimit, logUsage } = require('./_aiProxy');

const ENDPOINT = 'realtime-token';
const MAX_PER_MINUTE = Number(process.env.REALTIME_TOKEN_MAX_PER_MINUTE || 6);
const MAX_INSTRUCTIONS = 4000;
const SECRET_TTL_SECONDS = 600;
const ROLES = ['default', 'mini', 'voice'];
const VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'marin', 'cedar'];

/** The only tools a realtime session may be given. Flat Realtime/Responses function shape. */
const TOOL_DEFINITIONS = {
  get_contact: {
    type: 'function',
    name: 'get_contact',
    description: 'Look up one of the user\'s CRM contacts by id and return their profile fields.',
    parameters: {
      type: 'object',
      properties: { contactId: { type: 'string', description: 'Contact UUID' } },
      required: ['contactId'],
    },
  },
  add_note: {
    type: 'function',
    name: 'add_note',
    description: 'Add a note to a contact.',
    parameters: {
      type: 'object',
      properties: {
        contactId: { type: 'string', description: 'Contact UUID' },
        content: { type: 'string', description: 'Note text' },
      },
      required: ['contactId', 'content'],
    },
  },
  create_task: {
    type: 'function',
    name: 'create_task',
    description: 'Create a follow-up task for a contact.',
    parameters: {
      type: 'object',
      properties: {
        contactId: { type: 'string', description: 'Contact UUID' },
        title: { type: 'string' },
        dueDate: { type: 'string', description: 'ISO 8601 date-time (optional)' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
      },
      required: ['contactId', 'title'],
    },
  },
  schedule_meeting: {
    type: 'function',
    name: 'schedule_meeting',
    description: 'Schedule a meeting with a contact. The contact is emailed only if the user has an email provider connected.',
    parameters: {
      type: 'object',
      properties: {
        contactId: { type: 'string', description: 'Contact UUID' },
        scheduledFor: { type: 'string', description: 'ISO 8601 start date-time' },
        durationMinutes: { type: 'number' },
        title: { type: 'string' },
      },
      required: ['contactId', 'scheduledFor'],
    },
  },
};
const ALLOWED_TOOLS = Object.keys(TOOL_DEFINITIONS);

/** Validate + normalise the request body. Returns { value } or { error }. */
function validateTokenRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Invalid JSON body' };

  const role = body.role === undefined ? 'default' : body.role;
  if (!ROLES.includes(role)) return { error: `role must be one of: ${ROLES.join(', ')}` };

  let voice;
  if (body.voice !== undefined && body.voice !== null && body.voice !== '') {
    if (typeof body.voice !== 'string' || !VOICES.includes(body.voice)) return { error: `voice must be one of: ${VOICES.join(', ')}` };
    voice = body.voice;
  }

  let instructions;
  if (body.instructions !== undefined && body.instructions !== null && body.instructions !== '') {
    if (typeof body.instructions !== 'string') return { error: 'instructions must be a string' };
    if (body.instructions.length > MAX_INSTRUCTIONS) return { error: `instructions must be at most ${MAX_INSTRUCTIONS} characters` };
    instructions = body.instructions;
  }

  let toolNames = [];
  if (body.tools !== undefined && body.tools !== null) {
    if (!Array.isArray(body.tools)) return { error: 'tools must be an array of tool names' };
    for (const t of body.tools) {
      if (typeof t !== 'string' || !ALLOWED_TOOLS.includes(t)) return { error: `Tool not allowed: ${typeof t === 'string' ? t : typeof t}` };
    }
    toolNames = [...new Set(body.tools)];
  }

  return { value: { role, voice, instructions, tools: toolNames.map((n) => TOOL_DEFINITIONS[n]) } };
}

/** deps.createSecret is injectable for tests. */
async function mint(user, body, deps = {}) {
  const { value, error } = validateTokenRequest(body);
  if (error) return errorResponse(400, error);

  if (!(await (deps.underLimit || underEndpointLimit)(user.id, ENDPOINT, MAX_PER_MINUTE))) {
    return errorResponse(429, 'Too many voice sessions. Please wait a moment.');
  }

  const log = deps.logUsage || logUsage;
  try {
    const secret = await (deps.createSecret || createRealtimeSecret)({ ...value, expiresAfterSeconds: SECRET_TTL_SECONDS });
    await log(user.id, ENDPOINT, { model: `realtime:${value.role}` }, null, 'ok');
    // Only the ephemeral value, its expiry and the model leave the server.
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ value: secret.value, expiresAt: secret.expiresAt, model: secret.model }),
    };
  } catch (err) {
    await log(user.id, ENDPOINT, { model: `realtime:${value.role}` }, null, 'error');
    console.error('realtime-token failed:', err && err.message);
    const status = err && err.status === 429 ? 429 : 502;
    return errorResponse(status, status === 429 ? 'AI provider is busy, try again shortly' : 'Could not start a voice session');
  }
}

exports.handler = withAuth(async (event, user) => {
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return errorResponse(400, 'Invalid JSON body'); }
  return mint(user, body);
});

exports._internals = { validateTokenRequest, mint, TOOL_DEFINITIONS, ALLOWED_TOOLS, ROLES, VOICES, MAX_INSTRUCTIONS };
