/**
 * GET /.netlify/functions/track-click?e=<emailId>&u=<url-encoded http(s) url>
 * Records the first click (and implies an open) then 302-redirects. Only http/https targets are
 * allowed, so this can't be used for javascript:/data: redirects.
 */
const { supabase } = require('./_supabaseClient');
const { isUuid, isHttpUrl, isLikelyBot } = require('./_messaging/tracking');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method not allowed' };
  const q = event.queryStringParameters || {};
  const target = q.u;
  if (!isHttpUrl(target)) return { statusCode: 400, body: 'Invalid url' };

  const ua = event.headers?.['user-agent'] || event.headers?.['User-Agent'];
  if (isUuid(q.e) && !isLikelyBot(ua)) {
    try {
      const now = new Date().toISOString();
      await supabase.from('emails').update({ clicked_at: now, updated_at: now }).eq('id', q.e).eq('is_inbound', false).is('clicked_at', null);
      await supabase.from('emails').update({ opened_at: now }).eq('id', q.e).eq('is_inbound', false).is('opened_at', null);
    } catch (_) { /* still redirect */ }
  }
  return { statusCode: 302, headers: { Location: target, 'Cache-Control': 'no-store' }, body: '' };
};
