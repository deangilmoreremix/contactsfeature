/** Scheduled (every 5 minutes): queue the next step email for every due sequence enrollment. */
const { scheduledOnly } = require('./_scheduled');
const { supabase } = require('./_supabaseClient');
const { advanceDue } = require('./_sequences');

exports.handler = scheduledOnly(async () => {
  try {
    const results = await advanceDue(supabase);
    return { statusCode: 200, body: JSON.stringify({ processed: results.length, results }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
});
