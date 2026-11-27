/**
 * Netlify handler factory shared by the 8 Agents-SDK SDR functions.
 * POST { contactId, personaId?, goal?, preferences?, conversationId? } -> { contactId, agent, ...output, model }
 * Dual mode: with `Accept: text/event-stream` / body.stream:true / ?stream=true the same payload is delivered as
 * SSE (status/delta/partial events from the Agents SDK run, then `result` = the JSON payload, then `done`).
 */
const { supabase } = require('../_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('../_auth');
const { validateContactId, parseBody } = require('../_validation');
const { extractPreferences } = require('../_sdrPreferences');
const { createLogger, generateCorrelationId } = require('../_logger');
const { stream } = require('@netlify/functions');
const { runSdrAgent, streamSdrAgent, PERSONA_IDS } = require('./factory');
const { isStreamRequested } = require('../_stream/dual');
const { SSE_HEADERS, toSseReadable } = require('../_stream/sse');
const { conversationBelongsToLead, CONVERSATION_ID_RE } = require('../_conversations');

function createSdrHandler(slug) {
  const log = createLogger(slug);
  return stream(withAuth(async (event, user) => {
    log.setCorrelationId(generateCorrelationId());

    const body = parseBody(event);
    if (!body) return errorResponse(400, 'Invalid JSON body');

    const idError = validateContactId(body.contactId);
    if (idError) return errorResponse(400, idError);

    const personaId = body.personaId || body.preferences?.personaId || null;
    if (personaId && !PERSONA_IDS.has(personaId)) return errorResponse(400, 'Unknown personaId');
    const goal = typeof body.goal === 'string' ? body.goal.slice(0, 500) : undefined;

    let conversationId;
    if (body.conversationId !== undefined && body.conversationId !== null && body.conversationId !== '') {
      if (typeof body.conversationId !== 'string' || !CONVERSATION_ID_RE.test(body.conversationId)) return errorResponse(400, 'conversationId must start with conv_');
      conversationId = body.conversationId;
    }

    try {
      const { data: contact, error } = await supabase
        .from('contacts').select('*').eq('id', body.contactId).eq('user_id', user.id).maybeSingle();
      if (error) throw new Error(`Database error: ${error.message}`);
      if (!contact) return errorResponse(404, 'Contact not found');

      // The thread must be this lead's own agent_threads row (contact ownership was checked above).
      if (conversationId && !(await conversationBelongsToLead(contact.id, conversationId))) return errorResponse(404, 'Conversation not found');

      const agentCtx = {
        supabase, userId: user.id, contact, personaId, goal, conversationId,
        preferences: extractPreferences(body),
      };
      const toPayload = (result) => ({ contactId: contact.id, agent: slug, ...result.output, model: result.model, persona: result.persona, conversationId: result.conversationId, usage: result.usage });

      if (isStreamRequested(event, body)) {
        // Ownership/validation above already ran; only the model run itself streams.
        async function* events() {
          try {
            for await (const ev of streamSdrAgent(slug, agentCtx)) {
              if (ev.type !== 'final') { yield ev; continue; }
              log.info('SDR agent completed (stream)', { contactId: contact.id, model: ev.model });
              const data = toPayload(ev);
              yield { type: 'result', data };
              yield { type: 'done', id: ev.lastResponseId, text: JSON.stringify(ev.output), usage: ev.usage, citations: [], json: ev.output };
            }
          } catch (err) {
            log.error('SDR agent failed (stream)', { error: err.message });
            yield { type: 'error', message: 'Agent run failed' };
          }
        }
        return { statusCode: 200, headers: { ...CORS_HEADERS, ...SSE_HEADERS }, body: toSseReadable(events()) };
      }

      const result = await runSdrAgent(slug, agentCtx);

      log.info('SDR agent completed', { contactId: contact.id, model: result.model });
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(toPayload(result)),
      };
    } catch (err) {
      log.error('SDR agent failed', { error: err.message });
      return errorResponse(500, 'Agent run failed');
    }
  }));
}

module.exports = { createSdrHandler };
