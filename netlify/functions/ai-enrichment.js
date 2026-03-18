const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { createLogger, generateCorrelationId } = require('./_logger');
const { getGTMPrompt } = require('./_gtmPrompts');

const log = createLogger('ai-enrichment');

exports.handler = withAuth(async (event, user) => {
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
    
    const enrichmentData = {
      contactId,
      contact: {
        name: `${contact.firstname || ''} ${contact.lastname || ''}`.trim(),
        email: contact.email,
        company: contact.company,
        title: contact.title,
        industry: contact.industry,
        notes: contact.notes,
      },
      operation: operation || 'enrichment',
      gtmPromptUsed: !!gtmPrompt,
      enrichedAt: new Date().toISOString(),
    };

    log.info('AI enrichment completed', { contactId, operation, gtmPromptUsed: !!gtmPrompt });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(enrichmentData),
    };
  } catch (error) {
    log.error('AI enrichment failed', { contactId, error: error.message });
    return errorResponse(500, 'AI enrichment failed');
  }
});
