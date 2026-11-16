const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { PERSONA_IDS } = require('./_agents/factory');

const FOLLOWUP = { 1: 'reply-only', 2: '2-step', 5: '5-step' };

/**
 * POST { contactId, autopilotEnabled, selectedAgent, selectedPersona, sequenceLength, channels, skills, inbox, quietHours }
 * Upserts the contact's agent settings (owner only).
 */
exports.handler = withAuth(async (event, user) => {
  const b = parseBody(event);
  if (!b) return errorResponse(400, 'Invalid JSON body');
  const bad = validateContactId(b.contactId);
  if (bad) return errorResponse(400, bad);
  if (b.selectedPersona && !PERSONA_IDS.has(b.selectedPersona)) return errorResponse(400, 'Unknown persona');

  const { data: contact } = await supabase.from('contacts').select('id').eq('id', b.contactId).eq('user_id', user.id).maybeSingle();
  if (!contact) return errorResponse(404, 'Contact not found');

  const seqLen = Math.max(1, Math.min(90, parseInt(b.sequenceLength, 10) || 30));
  const row = {
    contact_id: b.contactId,
    persona_id: b.selectedPersona || null,
    followup_mode: FOLLOWUP[seqLen] || (seqLen > 5 ? '5-step' : 'manual'),
    is_enabled: Boolean(b.autopilotEnabled),
    settings: {
      selectedAgent: b.selectedAgent || null,
      sequenceLength: seqLen,
      channels: b.channels || {},
      skills: b.skills || {},
      fromAddress: typeof b.inbox === 'string' ? b.inbox.slice(0, 200) : '',
      quietHours: b.quietHours || {},
    },
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('contact_agent_settings').upsert(row, { onConflict: 'contact_id' });
  if (error) return errorResponse(500, 'Could not save settings');
  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true }) };
});
