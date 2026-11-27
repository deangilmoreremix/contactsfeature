const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MODEL_ROLES = ['default', 'thinking', 'fast', 'pro'];

/**
 * Legacy ids that older saved preferences / clients may still send, mapped to the configured
 * role (the real model ids live in src/config/models.json).
 */
const LEGACY_MODEL_ROLES = {
  'gpt-5.2': 'default',
  'gpt-5.2-thinking': 'thinking',
  'gpt-5.2-instant': 'fast',
  'gpt-5.2-pro': 'pro',
  'gpt-5.1': 'default',
  'gpt-4o': 'default',
  'gpt-4-turbo': 'default',
  'gpt-4o-mini': 'fast',
};

/** Role name or currently-configured model id -> allowed. Legacy ids are mapped to a role. */
function normalizeModel(model) {
  if (!model || typeof model !== 'string') return null;
  const m = model.trim();
  if (MODEL_ROLES.includes(m)) return m;
  if (LEGACY_MODEL_ROLES[m]) return LEGACY_MODEL_ROLES[m];
  try {
    const { allowedModelIds } = require('./_responses');
    if (allowedModelIds().has(m)) return m;
  } catch (_) { /* helper unavailable: roles only */ }
  return null;
}

function isValidUUID(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

function validateContactId(contactId) {
  if (!contactId) return 'contactId is required';
  if (!isValidUUID(contactId)) return 'contactId must be a valid UUID';
  return null;
}

function sanitizeModel(model) {
  if (!model || typeof model !== 'string') return null;
  return normalizeModel(model);
}

function clampTemperature(value) {
  if (typeof value !== 'number' || isNaN(value)) return null;
  return Math.max(0, Math.min(2.0, value));
}

function clampMaxTokens(value) {
  if (typeof value !== 'number' || isNaN(value)) return null;
  return Math.max(100, Math.min(16000, Math.floor(value)));
}

function sanitizeString(value, maxLength = 5000) {
  if (typeof value !== 'string') return '';
  return value.trim().substring(0, maxLength);
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || '{}');
  } catch {
    return null;
  }
}

module.exports = {
  normalizeModel,
  MODEL_ROLES,
  isValidUUID,
  validateContactId,
  sanitizeModel,
  clampTemperature,
  clampMaxTokens,
  sanitizeString,
  parseBody,
};
