/**
 * Scheduled (every 5 minutes, see netlify.toml) driver that delivers queued / scheduled emails
 * for all users through their own configured providers.
 */
const { processQueue } = require('./process-email-queue');

exports.handler = async () => {
  try {
    const out = await processQueue();
    return { statusCode: 200, body: JSON.stringify(out) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
