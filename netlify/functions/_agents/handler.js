/**
 * Netlify handler factory shared by the 8 Agents-SDK SDR functions.
 * POST { contactId, personaId?, goal?, preferences? } -> { contactId, agent, ...output, model }
 */
const { supabase } = require('../_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('../_auth');
const { validateContactId, parseBody } = require('../_validation');
const { extractPreferences } = require('../_sdrPreferences');
const { createLogger, generateCorrelationId } = require('../_logger');
const { runSdrAgent, PERSONA_IDS } = require('./factory');

function createSdrHandler(slug) {
  const log = createLogger(slug);
  return withAuth(async (event, user) => {
    log.setCorrelationId(generateCorrelationId());

    const body = parseBody(event);
    if (!body) return errorResponse(400, 'Invalid JSON body');

    const idError = validateContactId(body.contactId);
    if (idError) return errorResponse(400, idError);

    const personaId = body.personaId || body.preferences?.personaId || null;
    if (personaId && !PERSONA_IDS.has(personaId)) return errorResponse(400, 'Unknown personaId');
    const goal = typeof body.goal === 'string' ? body.goal.slice(0, 500) : undefined;

    try {
      const { data: contact, error } = await supabase
        .from('contacts').select('*').eq('id', body.contactId).eq('user_id', user.id).maybeSingle();
      if (error) throw new Error(`Database error: ${error.message}`);
      if (!contact) return errorResponse(404, 'Contact not found');

      const result = await runSdrAgent(slug, {
        supabase, userId: user.id, contact, personaId, goal,
        preferences: extractPreferences(body),
      });

      log.info('SDR agent completed', { contactId: contact.id, model: result.model });
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ contactId: contact.id, agent: slug, ...result.output, model: result.model, persona: result.persona, usage: result.usage }),
      };
    } catch (err) {
      log.error('SDR agent failed', { error: err.message });
      return errorResponse(500, 'Agent run failed');
    }
  });
}

module.exports = { createSdrHandler };
