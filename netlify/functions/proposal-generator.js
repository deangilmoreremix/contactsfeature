const { supabase } = require('./_supabaseClient');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { callOpenAI, parseJSONResponse } = require('./_fetchWithRetry');
const { createLogger, generateCorrelationId } = require('./_logger');
const { getGTMPrompt } = require('./_gtmPrompts');

const log = createLogger('proposal-generator');

exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { contactId, dealId, proposalType } = body;
  const idErr = validateContactId(contactId);
  if (idErr) return errorResponse(400, idErr);

  const prefs = extractPreferences(body);

  try {
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (contactError) throw new Error(`Database error: ${contactError.message}`);
    if (!contact) return errorResponse(404, 'Contact not found');

    let deal = null;
    if (dealId) {
      const { data: dealData } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .eq('user_id', user.id)
        .maybeSingle();
      deal = dealData;
    }

    const sdrModel = resolveModel(prefs, 'gpt-5.2', 'SMARTCRM_MODEL');
    const temperature = resolveTemperature(prefs, 0.6);
    const maxTokens = resolveMaxTokens(prefs, 2000);
    const contactName = contact.firstname || contact.name || 'there';
    const company = contact.company || 'your company';
    const title = contact.title || '';
    const prefsBlock = buildPreferencesPromptBlock(prefs);

    const gtmPrompt = await getGTMPrompt('proposal-generator', contact.industry);
    const gtmBlock = gtmPrompt 
      ? `Use this proven proposal framework as your guide:\n${gtmPrompt}\n\n---\n\n`
      : '';

    const prompt = `${gtmBlock}Generate a professional proposal for ${contactName}${title ? ` (${title})` : ''} at ${company}.

Contact details: ${JSON.stringify({
  name: contactName, company, title, email: contact.email, industry: contact.industry, notes: contact.notes,
})}

${deal ? `Deal context: ${JSON.stringify({ value: deal.value, stage: deal.stage, notes: deal.notes })}` : ''}

Proposal type: ${proposalType || 'standard'}

The proposal should include:
1. Executive summary - Brief overview of the proposal
2. Problem statement - The challenge they're facing
3. Proposed solution - Your approach and methodology
4. Timeline - Key milestones and delivery dates
5. Investment - Pricing options (3 tiers: Good/Better/Best)
6. Case study or social proof - Relevant success story
7. Next steps - Clear call to action

Make it compelling, professional, and tailored to their specific situation${prefsBlock}

Return JSON with "executiveSummary", "problemStatement", "solution", "timeline", "pricing" (array with "tier", "price", "features"), "caseStudy", "nextSteps".`;

    const content = await callOpenAI(
      [{ role: 'user', content: prompt }],
      { model: sdrModel, temperature, maxTokens }
    );

    const parsed = parseJSONResponse(content, {
      executiveSummary: 'Proposal summary...',
      problemStatement: 'The challenge...',
      solution: 'Our approach...',
      timeline: [],
      pricing: [],
      caseStudy: 'Success story...',
      nextSteps: 'Next steps...',
    });

    log.info('Proposal generated', { contactId, dealId, proposalType, gtmPromptUsed: !!gtmPrompt });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        contactId,
        dealId,
        proposalType: proposalType || 'standard',
        ...parsed,
        gtmPromptUsed: !!gtmPrompt,
      }),
    };
  } catch (error) {
    log.error('Proposal generation failed', { contactId, error: error.message });
    return errorResponse(500, 'Proposal generation failed');
  }
});
