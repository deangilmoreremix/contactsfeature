/**
 * Pure helpers for open/click tracking. No I/O.
 *  - isUuid:       validates tracking ids
 *  - isHttpUrl:    only http(s) targets may be redirected to (no open redirect to javascript:/data:)
 *  - isLikelyBot:  minimal user-agent check so link scanners / prefetchers don't count as engagement
 *  - injectTracking: adds a 1x1 open pixel and rewrites http(s) links in html
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT_RE = /(bot|crawler|spider|preview|prefetch|scanner|curl|wget|python-requests|headlesschrome|googleimageproxy|barracuda|proofpoint|mimecast)/i;

function isUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v);
}

function isHttpUrl(v) {
  if (typeof v !== 'string' || v.length > 2048) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isLikelyBot(userAgent) {
  if (!userAgent) return true; // real mail clients and browsers always send a UA
  return BOT_RE.test(String(userAgent));
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function trackedLink(baseUrl, emailId, url) {
  return `${baseUrl}/.netlify/functions/track-click?e=${emailId}&u=${encodeURIComponent(url)}`;
}

/**
 * @param {string} html
 * @param {{ emailId: string, baseUrl: string }} opts
 * Returns html unchanged when there is no html, no valid email id, or no base url.
 */
function injectTracking(html, { emailId, baseUrl } = {}) {
  if (!html || !isUuid(emailId) || !baseUrl) return html;
  const base = String(baseUrl).replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(base)) return html;

  // Rewrite <a href="http(s)://..."> (skip mailto:, tel:, anchors, already-tracked and unsubscribe links)
  let out = html.replace(/(<a\b[^>]*?\shref\s*=\s*)(["'])(.*?)\2/gi, (m, pre, q, href) => {
    const decoded = href.replace(/&amp;/g, '&');
    if (!isHttpUrl(decoded)) return m;
    if (decoded.startsWith(`${base}/.netlify/functions/track-`)) return m;
    if (/unsubscribe/i.test(decoded)) return m;
    return `${pre}${q}${escapeAttr(trackedLink(base, emailId, decoded))}${q}`;
  });

  const pixel = `<img src="${base}/.netlify/functions/track-open?id=${emailId}" width="1" height="1" alt="" style="display:none" />`;
  out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, `${pixel}</body>`) : `${out}${pixel}`;
  return out;
}

module.exports = { isUuid, isHttpUrl, isLikelyBot, injectTracking, trackedLink };
