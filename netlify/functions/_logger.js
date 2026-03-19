const LOG_LEVEL_MAP = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LOG_LEVEL_MAP[process.env.LOG_LEVEL || 'info'] || 1;

const PII_PATTERNS = [
  { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL_REDACTED]' },
  { regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE_REDACTED]' },
];

function redactPII(value) {
  if (typeof value !== 'string') return value;
  let result = value;
  for (const { regex, replacement } of PII_PATTERNS) {
    result = result.replace(regex, replacement);
  }
  return result;
}

function redactObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return redactPII(obj);
  if (Array.isArray(obj)) return obj.map(redactObject);
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('email') || lowerKey.includes('phone') || lowerKey === 'from' || lowerKey === 'to') {
        result[key] = typeof value === 'string' ? redactPII(value) : value;
      } else if (lowerKey.includes('key') || lowerKey.includes('secret') || lowerKey.includes('token') || lowerKey.includes('password')) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = typeof value === 'object' ? redactObject(value) : value;
      }
    }
    return result;
  }
  return obj;
}

let _correlationId = null;

function createLogger(functionName) {
  function emit(level, message, meta) {
    if (LOG_LEVEL_MAP[level] < MIN_LEVEL) return;

    const entry = {
      ts: new Date().toISOString(),
      level,
      fn: functionName,
      msg: redactPII(message),
    };

    if (_correlationId) entry.correlationId = _correlationId;
    if (meta) entry.meta = redactObject(meta);

    const method = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    method(JSON.stringify(entry));
  }

  return {
    debug: (msg, meta) => emit('debug', msg, meta),
    info: (msg, meta) => emit('info', msg, meta),
    warn: (msg, meta) => emit('warn', msg, meta),
    error: (msg, meta) => emit('error', msg, meta),
    setCorrelationId: (id) => { _correlationId = id; },
  };
}

function generateCorrelationId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${ts}-${rand}`;
}

module.exports = { createLogger, generateCorrelationId, redactPII, redactObject };
