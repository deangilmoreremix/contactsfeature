const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_MODELS = new Set([
  'gpt-5.2',
  'gpt-5.2-thinking',
  'gpt-5.2-instant',
  'gpt-5.2-pro',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
]);

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
  const trimmed = model.trim();
  if (ALLOWED_MODELS.has(trimmed)) return trimmed;
  return null;
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
  isValidUUID,
  validateContactId,
  sanitizeModel,
  clampTemperature,
  clampMaxTokens,
  sanitizeString,
  parseBody,
  ALLOWED_MODELS,
};
