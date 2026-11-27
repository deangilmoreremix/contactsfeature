/**
 * AES-256-GCM encryption for provider credentials stored in `messaging_providers`.
 * Key: MESSAGING_ENCRYPTION_KEY (32 bytes as 64 hex chars or base64). Server-side only.
 */
const crypto = require('crypto');

function getKey() {
  const raw = process.env.MESSAGING_ENCRYPTION_KEY || '';
  if (!raw) throw new Error('MESSAGING_ENCRYPTION_KEY is not configured');
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('MESSAGING_ENCRYPTION_KEY must decode to 32 bytes');
  return key;
}

function encryptJson(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${enc.toString('base64')}`;
}

function decryptJson(payload) {
  const [v, iv, tag, data] = String(payload || '').split(':');
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Invalid credential payload');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  const dec = Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]);
  return JSON.parse(dec.toString('utf8'));
}

/** Show only the last 4 characters of a secret. */
function mask(value) {
  const s = String(value || '');
  return s.length <= 4 ? '****' : `${'*'.repeat(Math.min(8, s.length - 4))}${s.slice(-4)}`;
}

module.exports = { encryptJson, decryptJson, mask };
