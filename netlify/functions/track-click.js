/**
 * GET /.netlify/functions/track-click?e=<emailId>&u=<url-encoded http(s) url>
 * Records the first click (and implies an open) then 302-redirects. Not an open redirect: the target must be an
 * http(s) URL that appears in the stored body (body_html / body_text) of the outbound email `e`; an unknown email id
 * or a URL that email never contained is a 400. (send-email stores the body before tracking links are injected, so
 * the stored body holds the original URLs.)
 */
const { supabase } = require('./_supabaseClient');
const { isUuid, isHttpUrl, isLikelyBot } = require('./_messaging/tracking');

const URL_TOKEN_RE = /https?:\/\/[^\s"'<>()\[\]]+/gi;
const HREF_RE = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

function decodeAmp(v) { return String(v).replace(/&amp;/gi, '&'); }

/** Every http(s) URL present in an email body: anchor hrefs plus bare URLs in html/text. */
function urlsInBody(row) {
  const found = new Set();
  for (const raw of [row.body_html, row.body_text]) {
    if (typeof raw !== 'string' || !raw) continue;
    let m;
    HREF_RE.lastIndex = 0;
    while ((m = HREF_RE.exec(raw))) found.add(decodeAmp((m[1] ?? m[2] ?? '').trim()));
    const text = decodeAmp(raw);
    for (const t of text.match(URL_TOKEN_RE) || []) {
      found.add(t);
      found.add(t.replace(/[.,;:!?]+$/, '')); // bare URL followed by sentence punctuation
    }
  }
  return found;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method not allowed' };
  const q = event.queryStringParameters || {};
  const target = q.u;
  if (!isHttpUrl(target)) return { statusCode: 400, body: 'Invalid url' };

  if (!isUuid(q.e)) return { statusCode: 400, body: 'Invalid link' };

  let row;
  try {
    const { data, error } = await supabase.from('emails').select('id, body_html, body_text').eq('id', q.e).eq('is_inbound', false).maybeSingle();
    if (error) throw error;
    row = data;
  } catch (_) {
    return { statusCode: 503, headers: { 'Cache-Control': 'no-store' }, body: 'Temporarily unavailable' };
  }
  if (!row || !urlsInBody(row).has(target)) return { statusCode: 400, body: 'Invalid link' };

  const ua = event.headers?.['user-agent'] || event.headers?.['User-Agent'];
  if (!isLikelyBot(ua)) {
    try {
      const now = new Date().toISOString();
      await supabase.from('emails').update({ clicked_at: now, updated_at: now }).eq('id', q.e).eq('is_inbound', false).is('clicked_at', null);
      await supabase.from('emails').update({ opened_at: now }).eq('id', q.e).eq('is_inbound', false).is('opened_at', null);
    } catch (_) { /* still redirect */ }
  }
  return { statusCode: 302, headers: { Location: target, 'Cache-Control': 'no-store' }, body: '' };
};
