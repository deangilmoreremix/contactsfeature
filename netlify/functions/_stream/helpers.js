/**
 * Small helpers for converting legacy AI functions to dual mode (see ./dual.js).
 *  - S: compact JSON-schema builders (strictify() in _responses.js adds required/additionalProperties)
 *  - callOptions(messages, config): same request callOpenAI() would send, plus schema/schemaName
 *  - sdrOptions({...}): request options for the hand-written SDR functions
 *  - parseJsonOr(text, fallback): tolerant JSON extraction (regex fallback like the old functions)
 */
const { buildCallOptions } = require('../_fetchWithRetry');
const { normalizeModel } = require('../_validation');

const str = { type: 'string' };
const num = { type: 'number' };
const int = { type: 'integer' };
const bool = { type: 'boolean' };
const S = {
  str,
  num,
  int,
  bool,
  strArr: { type: 'array', items: str },
  arr: (items) => ({ type: 'array', items }),
  obj: (properties) => ({ type: 'object', properties }),
  oneOf: (...values) => ({ type: 'string', enum: values }),
};

/** Schema shared by every "subject + body" email draft. */
const EMAIL_DRAFT_SCHEMA = S.obj({ subject: str, body: str });

function callOptions(messages, config) {
  return buildCallOptions(messages, config);
}

/** Options for createResponse/streamResponse from the SDR functions' (instructions, input) pair. */
function sdrOptions({ instructions, input, model, temperature, maxTokens = 1000, schema, schemaName, effort }) {
  return {
    model: normalizeModel(model) || 'default',
    effort: effort || 'low',
    instructions,
    input,
    temperature,
    maxOutputTokens: maxTokens + 2000, // reasoning tokens share the budget
    store: false,
    schema,
    schemaName,
  };
}

function parseJsonOr(content, fallback) {
  try {
    const m = String(content).match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : content);
  } catch {
    return fallback;
  }
}

module.exports = { S, EMAIL_DRAFT_SCHEMA, callOptions, sdrOptions, parseJsonOr };
