/**
 * Netlify Function: manage the user's email / SMS providers.
 * POST { action: 'list' | 'save' | 'delete' | 'set_default' | 'test', ... }
 * Credentials are encrypted at rest and only ever returned masked.
 */
const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { encryptJson, decryptJson, mask } = require('./_messaging/crypto');
const adapters = require('./_messaging/adapters');

const ok = (data) => ({ statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(data) });
const channelOf = (provider) => (adapters.SMS_PROVIDERS.includes(provider) ? 'sms' : 'email');
const PUBLIC_COLS = 'id,channel,provider,display_name,from_address,from_name,credentials_hint,is_default,status,last_tested_at,last_test_ok,created_at';

function hintOf(creds) {
  return Object.fromEntries(Object.entries(creds).map(([k, v]) => [k, ['domain', 'region', 'accountSid'].includes(k) ? String(v) : mask(v)]));
}

async function runTest(userId, row, to) {
  const creds = decryptJson(row.credentials_encrypted);
  if (row.channel === 'email') {
    return adapters.email[row.provider](creds, { to, fromEmail: row.from_address, fromName: row.from_name || undefined, subject: 'SmartCRM test message', html: '<p>Your email provider is connected.</p>', text: 'Your email provider is connected.' });
  }
  return adapters.sms[row.provider](creds, { to, from: row.from_address, body: 'SmartCRM test message: your SMS provider is connected.' });
}

exports.handler = withAuth(async (event, user) => {
  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return errorResponse(400, 'Invalid JSON'); }

  try {
    switch (b.action) {
      case 'list': {
        const { data, error } = await supabase.from('messaging_providers').select(PUBLIC_COLS).eq('user_id', user.id).order('created_at');
        if (error) throw error;
        return ok({ providers: data, supported: { email: adapters.EMAIL_PROVIDERS, sms: adapters.SMS_PROVIDERS, fields: adapters.CREDENTIAL_FIELDS } });
      }
      case 'save': {
        const { provider, credentials = {}, from_address, from_name, display_name, make_default } = b;
        if (!adapters.CREDENTIAL_FIELDS[provider]) return errorResponse(400, 'Unsupported provider');
        const missing = adapters.CREDENTIAL_FIELDS[provider].filter((f) => !String(credentials[f] || '').trim());
        if (missing.length) return errorResponse(400, `Missing credential fields: ${missing.join(', ')}`);
        if (!from_address) return errorResponse(400, 'from_address is required');
        const channel = channelOf(provider);
        const clean = Object.fromEntries(adapters.CREDENTIAL_FIELDS[provider].concat(provider === 'mailgun' ? ['region'] : []).filter((k) => credentials[k] != null).map((k) => [k, String(credentials[k]).trim()]));
        const { count } = await supabase.from('messaging_providers').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('channel', channel);
        const isDefault = Boolean(make_default) || !count;
        if (isDefault) await supabase.from('messaging_providers').update({ is_default: false }).eq('user_id', user.id).eq('channel', channel);
        const { data, error } = await supabase.from('messaging_providers').insert({
          user_id: user.id, channel, provider, display_name: display_name || provider, from_address, from_name: from_name || null,
          credentials_encrypted: encryptJson(clean), credentials_hint: hintOf(clean), is_default: isDefault,
        }).select(PUBLIC_COLS).maybeSingle();
        if (error) throw error;
        return ok({ provider: data });
      }
      case 'set_default': {
        const { data: row } = await supabase.from('messaging_providers').select('id,channel').eq('id', b.id).eq('user_id', user.id).maybeSingle();
        if (!row) return errorResponse(404, 'Provider not found');
        await supabase.from('messaging_providers').update({ is_default: false }).eq('user_id', user.id).eq('channel', row.channel);
        await supabase.from('messaging_providers').update({ is_default: true, updated_at: new Date().toISOString() }).eq('id', row.id);
        return ok({ success: true });
      }
      case 'delete': {
        const { error } = await supabase.from('messaging_providers').delete().eq('id', b.id).eq('user_id', user.id);
        if (error) throw error;
        return ok({ success: true });
      }
      case 'test': {
        const { data: row } = await supabase.from('messaging_providers').select('*').eq('id', b.id).eq('user_id', user.id).maybeSingle();
        if (!row) return errorResponse(404, 'Provider not found');
        if (!b.to) return errorResponse(400, '"to" (email address or phone number) is required');
        let result; let success = true; let message = '';
        try { result = await runTest(user.id, row, b.to); } catch (e) { success = false; message = e.message; }
        await supabase.from('messaging_providers').update({ last_tested_at: new Date().toISOString(), last_test_ok: success }).eq('id', row.id);
        return ok({ success, message_id: result?.messageId, error: success ? undefined : message });
      }
      default:
        return errorResponse(400, 'Unknown action');
    }
  } catch (err) {
    return errorResponse(500, err.message || 'Provider operation failed');
  }
});
