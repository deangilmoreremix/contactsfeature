/**
 * Outbound content guard. Flagged content is blocked; the guard fails OPEN only when the
 * moderation call itself errors (logged), so an OpenAI outage never stops legitimate sending.
 */
const { moderate } = require('./_responses');
const { createLogger } = require('./_logger');

const log = createLogger('moderation');

function toTexts(texts) {
  return (Array.isArray(texts) ? texts : [texts])
    .map((t) => (t == null ? '' : String(t).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()))
    .filter(Boolean)
    .slice(0, 20)
    .map((t) => t.slice(0, 30000));
}

/** -> { ok:true } | { ok:false, categories:[...] } */
async function checkOutbound({ texts, userId, endpoint, client } = {}) {
  const input = toTexts(texts);
  if (!input.length) return { ok: true };
  try {
    const r = await moderate(input, client ? { client } : {});
    if (!r.flagged) return { ok: true };
    const categories = Object.keys(r.categories).filter((k) => r.categories[k]);
    log.warn('Outbound content blocked', { userId, endpoint, categories });
    return { ok: false, categories };
  } catch (err) {
    log.error('Moderation call failed; failing open', { userId, endpoint, error: err && err.message });
    return { ok: true };
  }
}

function flaggedResponse(categories, headers = {}) {
  return {
    statusCode: 422,
    headers,
    body: JSON.stringify({
      success: false,
      code: 'CONTENT_FLAGGED',
      categories,
      error: `This message was blocked by content moderation${categories.length ? `: ${categories.join(', ')}` : ''}. Edit it and try again.`,
    }),
  };
}

module.exports = { checkOutbound, flaggedResponse, toTexts };
