const { supabase } = require('./_supabaseClient');
const { withAuth, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { runDual } = require('./_stream/dual');
const { S, callOptions, parseJsonOr } = require('./_stream/helpers');
const { stream } = require('@netlify/functions');
const { createLogger, generateCorrelationId } = require('./_logger');
const { getGTMPrompt } = require('./_gtmPrompts');

const log = createLogger('ai-enrichment');

const nullableInt = { type: ['integer', 'null'] };
const OUTPUT_SCHEMA = S.obj({
  summary: S.str,
  leadScore: nullableInt,
  scoreReasons: S.strArr,
  intentSignals: S.strArr,
  recommendedActions: S.strArr,
  dataGaps: S.strArr,
});

/**
 * Lead scoring / enrichment brief from the contact's own CRM data (no web access here: use contact-enrich for
 * web research). Streams like every other AI function: SSE when `Accept: text/event-stream` or `stream:true`,
 * plain JSON otherwise.
 */
exports.handler = stream(withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { contactId, operation } = body;
  const idErr = validateContactId(contactId);
  if (idErr) return errorResponse(400, idErr);

  try {
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (contactError) throw new Error(`Database error: ${contactError.message}`);
    if (!contact) return errorResponse(404, 'Contact not found');

    const gtmPrompt = await getGTMPrompt('ai-enrichment', contact.industry);
    const gtmBlock = gtmPrompt ? `Use this framework as a guide:\n${gtmPrompt}\n\n---\n\n` : '';
    const snapshot = {
      name: `${contact.firstname || ''} ${contact.lastname || ''}`.trim() || contact.name || null,
      email: contact.email,
      company: contact.company,
      title: contact.title,
      industry: contact.industry,
      status: contact.status,
      interestLevel: contact.interest_level ?? contact.interestLevel,
      notes: contact.notes,
      lastConnected: contact.last_connected ?? contact.lastConnected,
    };

    const prompt = `${gtmBlock}Operation: ${operation || 'lead scoring'}.
Assess this lead using ONLY the CRM data below. Never invent facts. Use null for leadScore and list the missing
facts in dataGaps whenever the data does not support a score. leadScore is an integer 0-100 justified by scoreReasons.

${JSON.stringify(snapshot)}

Return JSON with "summary", "leadScore", "scoreReasons", "intentSignals", "recommendedActions" and "dataGaps".`;

    return await runDual({
      event,
      body,
      options: callOptions([{ role: 'user', content: prompt }], { model: 'default', maxTokens: 1200, schema: OUTPUT_SCHEMA, schemaName: 'lead_enrichment_brief' }),
      finalize: (content) => {
        const parsed = parseJsonOr(content, null);
        if (!parsed || typeof parsed !== 'object') throw new Error('AI did not return structured JSON');
        log.info('AI enrichment completed', { contactId, operation, gtmPromptUsed: !!gtmPrompt });
        return { contactId, operation: operation || 'enrichment', ...parsed, gtmPromptUsed: !!gtmPrompt, enrichedAt: new Date().toISOString() };
      },
    });
  } catch (error) {
    log.error('AI enrichment failed', { contactId, error: error.message });
    return errorResponse(500, 'AI enrichment failed');
  }
}));
