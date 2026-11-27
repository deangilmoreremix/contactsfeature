/**
 * Streaming / non-streaming helpers used by the SDR functions — a thin compatibility layer over the
 * shared Responses helper (_responses.js). Models come from src/config/models.json; legacy ids are
 * mapped to roles. There is no Assistants/Threads usage: multi-turn state uses
 * `previous_response_id` (see _responses.js) instead.
 */
const responses = require('./_responses');
const { normalizeModel } = require('./_validation');

// Role map exposed for callers that want the resolved model id for a role.
const MODEL_CONFIG = {
  get default() { return responses.resolveModel('default').model; },
  get thinking() { return responses.resolveModel('thinking').model; },
  get fast() { return responses.resolveModel('fast').model; },
  get pro() { return responses.resolveModel('pro').model; },
};

function toRoleOrModel(model) {
  return normalizeModel(model) || 'default';
}

/**
 * Async generator of { type: 'token', token } | { type: 'complete', content } | { type: 'error', error }.
 */
async function* createStreamingResponse({ instructions, input, model, temperature, maxTokens = 2000, effort }) {
  try {
    for await (const ev of responses.streamResponse({
      model: toRoleOrModel(model),
      effort: effort || 'low',
      instructions,
      input,
      temperature,
      maxOutputTokens: maxTokens + 2000, // reasoning tokens share the budget
      store: false,
    })) {
      if (ev.type === 'delta') yield { type: 'token', token: ev.text };
      else if (ev.type === 'done') yield { type: 'complete', content: ev.text };
      else if (ev.type === 'error') yield { type: 'error', error: ev.message };
    }
  } catch (err) {
    yield { type: 'error', error: err.message };
  }
}

/** Non-streaming: returns the output text. */
async function createResponse({ instructions, input, model, temperature, maxTokens = 2000, effort }) {
  const r = await responses.createResponse({
    model: toRoleOrModel(model),
    effort: effort || 'low',
    instructions,
    input,
    temperature,
    maxOutputTokens: maxTokens + 2000,
    store: false,
  });
  return r.text;
}

/** Model id for a task type (SDR/analysis -> thinking, summaries -> fast, ...). */
function getModelForTask(taskType) {
  switch (taskType) {
    case 'sdr':
    case 'autopilot':
    case 'analysis':
    case 'deep_reasoning':
      return MODEL_CONFIG.thinking;
    case 'analytics':
    case 'heavy_analytics':
      return MODEL_CONFIG.pro;
    case 'fast':
    case 'email':
    case 'summary':
    case 'quick':
      return MODEL_CONFIG.fast;
    default:
      return MODEL_CONFIG.default;
  }
}

module.exports = { MODEL_CONFIG, createStreamingResponse, createResponse, getModelForTask };
