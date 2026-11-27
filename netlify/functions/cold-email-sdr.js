const { supabase } = require('./_supabaseClient');
const { withAuth, errorResponse } = require('./_auth');
const { buildSdrSystemPrompt, parseJsonResponse } = require('./_streamingUtils');
const { runDual } = require('./_stream/dual');
const { sdrOptions, EMAIL_DRAFT_SCHEMA } = require('./_stream/helpers');
const { createLogger, generateCorrelationId } = require('./_logger');
const { getGTMPrompt } = require('./_gtmPrompts');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');

const log = createLogger('cold-email-sdr');

// Main handler - supports both streaming and non-streaming
const { stream } = require('@netlify/functions');

exports.handler = stream(withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  // Parse body - handle both JSON and form-encoded
  let body = {};
  if (event.body) {
    if (typeof event.body === 'string') {
      try {
        body = JSON.parse(event.body);
      } catch {
        return errorResponse(400, 'Invalid JSON body');
      }
    } else {
      body = event.body;
    }
  }

  const { contactId, preferences = {} } = body;

  if (!contactId) {
    return errorResponse(400, 'Contact ID is required');
  }

  try {
    // Fetch contact with proper user filtering
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (contactError) throw new Error(`Database error: ${contactError.message}`);
    if (!contact) return errorResponse(404, 'Contact not found');

    const prefs = extractPreferences({ preferences });
    const sdrModel = resolveModel(prefs, 'default', 'SMARTCRM_MODEL');
    const temperature = resolveTemperature(prefs, 0.7);
    const maxTokens = resolveMaxTokens(prefs, 1000);
    const contactName = contact.firstname || contact.name || 'there';
    const company = contact.company || 'your company';
    const title = contact.title || '';

    // Get GTM prompt for framework guidance
    const gtmPrompt = await getGTMPrompt('cold-email-sdr', contact.industry);
    const gtmBlock = gtmPrompt ? `${gtmPrompt}\n\n---\n\n` : '';

    // Build system prompt using the new builder
    const systemPrompt = buildSdrSystemPrompt({
      agentType: 'Cold Email SDR',
      persona: prefs.personaId || 'cold_saas_founder',
      contact,
      preferences: prefs,
    });

    // Build user input for Responses API
    const userInput = `${gtmBlock}Generate a personalized cold email for ${contactName}${title ? ` (${title})` : ''} at ${company}.

Contact details:
- Name: ${contactName}
- Company: ${company}
- Title: ${title}
- Email: ${contact.email || 'N/A'}
- Industry: ${contact.industry || 'Not specified'}
- Notes: ${contact.notes || 'None'}

Requirements:
- Attention-grabbing subject line (under 60 characters)
- Personalized opening referencing them or their company
- Clear value proposition
- Soft call-to-action (not pushy)
- Concise body (under 150 words)
- Human, conversational tone${buildPreferencesPromptBlock(prefs)}

Return ONLY valid JSON with "subject" and "body" fields. Example: {"subject": "Quick question about ${company}", "body": "Hi ${contactName}..."}`;

    // One code path for both modes: JSON (as before) or SSE status/delta/partial events followed by
    // `result` (exactly the JSON payload) when the client asks for a stream.
    return await runDual({
      event,
      body,
      options: sdrOptions({
        instructions: systemPrompt,
        input: userInput,
        model: sdrModel,
        temperature,
        maxTokens,
        schema: EMAIL_DRAFT_SCHEMA,
        schemaName: 'cold_email',
      }),
      finalize: (text) => {
        const parsed = parseJsonResponse(text, {
          subject: `Quick question for ${contactName} at ${company}`,
          body: text,
        });

        log.info('Cold email generated', { contactId, gtmPromptUsed: !!gtmPrompt, model: sdrModel });

        return {
          contactId,
          subject: parsed.subject,
          body: parsed.body,
          sent: false, // drafts only: nothing is emailed until the user saves or sends it
          gtmPromptUsed: !!gtmPrompt,
          model: sdrModel,
        };
      },
    });
  } catch (error) {
    log.error('Cold email generation failed', { contactId, error: error.message });
    return errorResponse(500, 'Cold email generation failed');
  }
}));
