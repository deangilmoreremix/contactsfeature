/**
 * Provider-agnostic sending. Looks up the user's default provider for a channel in
 * `messaging_providers` (credentials encrypted at rest). No provider => throws
 * NO_PROVIDER so callers never mark a message as sent when nothing was delivered.
 */
const { supabase } = require('../_supabaseClient');
const { decryptJson } = require('./crypto');
const adapters = require('./adapters');

class NoProviderError extends Error {
  constructor(channel) {
    super(`No ${channel} provider configured. Add one in Settings → Email & SMS providers.`);
    this.code = 'NO_PROVIDER';
  }
}

async function loadProvider(userId, channel) {
  const { data, error } = await supabase
    .from('messaging_providers')
    .select('*')
    .eq('user_id', userId)
    .eq('channel', channel)
    .eq('status', 'active')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to load provider: ${error.message}`);
  if (!data) throw new NoProviderError(channel);
  return { ...data, credentials: decryptJson(data.credentials_encrypted) };
}

/** message: { to, subject, html?, text?, fromEmail?, fromName? } */
async function sendEmail(userId, message) {
  const p = await loadProvider(userId, 'email');
  const send = adapters.email[p.provider];
  if (!send) throw new Error(`Unsupported email provider: ${p.provider}`);
  const result = await send(p.credentials, {
    ...message,
    fromEmail: message.fromEmail || p.from_address,
    fromName: message.fromName || p.from_name || undefined,
  });
  return { provider: p.provider, messageId: result.messageId };
}

/** message: { to, body, from? } */
async function sendSms(userId, message) {
  const p = await loadProvider(userId, 'sms');
  const send = adapters.sms[p.provider];
  if (!send) throw new Error(`Unsupported SMS provider: ${p.provider}`);
  const result = await send(p.credentials, { ...message, from: message.from || p.from_address });
  return { provider: p.provider, messageId: result.messageId };
}

module.exports = { sendEmail, sendSms, loadProvider, NoProviderError, ...adapters };
