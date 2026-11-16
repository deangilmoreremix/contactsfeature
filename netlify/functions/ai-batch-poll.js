/**
 * Scheduled (every 15 minutes, netlify.toml): advances open OpenAI batches and applies finished
 * results exactly once. Failed/expired/cancelled batches are just marked.
 */
const { scheduledOnly } = require('./_scheduled');
const { supabase } = require('./_supabaseClient');
const { getBatch } = require('./_responses');
const { applyResults } = require('./_batch');
const { createLogger } = require('./_logger');

const log = createLogger('ai-batch-poll');
const TERMINAL_BAD = new Set(['failed', 'expired', 'cancelled']);

exports.handler = scheduledOnly(async () => {
  try {
    const { data: open, error } = await supabase
      .from('ai_batches').select('*').is('applied_at', null).not('status', 'in', '(failed,expired,cancelled)').limit(25);
    if (error) throw new Error(error.message);

    let applied = 0;
    for (const row of open || []) {
      try {
        const b = await getBatch(row.openai_batch_id, { withResults: true });
        const patch = {
          status: b.status,
          completed: (b.counts && b.counts.completed) || row.completed,
          failed: (b.counts && b.counts.failed) || row.failed,
          updated_at: new Date().toISOString(),
        };
        if (TERMINAL_BAD.has(b.status)) {
          patch.error = `Batch ${b.status}`;
        } else if (b.status === 'completed') {
          const { data: contacts } = await supabase.from('contacts').select('*').in('id', row.contact_ids).eq('user_id', row.user_id);
          const contactsById = new Map((contacts || []).map((c) => [c.id, c]));
          const res = await applyResults(row.kind, b.results, { supabase, userId: row.user_id, contactsById });
          patch.applied_at = new Date().toISOString();
          patch.completed = res.applied;
          patch.failed = res.failed + Math.max(0, row.total - b.results.length);
          applied++;
        }
        await supabase.from('ai_batches').update(patch).eq('id', row.id);
      } catch (err) {
        log.warn('Batch poll failed', { id: row.id, error: err.message });
      }
    }
    return { statusCode: 200, body: JSON.stringify({ checked: (open || []).length, applied }) };
  } catch (err) {
    log.error('Batch poll error', { error: err.message });
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
});
