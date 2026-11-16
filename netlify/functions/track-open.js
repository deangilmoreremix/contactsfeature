/**
 * GET /.netlify/functions/track-open?id=<emailId>
 * Returns a 1x1 transparent gif and records the first open. No auth (loaded by mail clients).
 * Only first open is stored; bots / link scanners are ignored.
 */
const { supabase } = require('./_supabaseClient');
const { isUuid, isLikelyBot } = require('./_messaging/tracking');

const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

function gif() {
  return {
    statusCode: 200,
    isBase64Encoded: true,
    headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', 'Content-Length': String(GIF.length) },
    body: GIF.toString('base64'),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method not allowed' };
  const id = event.queryStringParameters?.id;
  const ua = event.headers?.['user-agent'] || event.headers?.['User-Agent'];
  if (isUuid(id) && !isLikelyBot(ua)) {
    try {
      const now = new Date().toISOString();
      await supabase.from('emails').update({ opened_at: now, updated_at: now }).eq('id', id).eq('is_inbound', false).is('opened_at', null);
    } catch (_) { /* never break image delivery */ }
  }
  return gif();
};
exports.GIF = GIF;
