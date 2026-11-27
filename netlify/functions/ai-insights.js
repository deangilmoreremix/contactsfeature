const { supabase } = require('./_supabaseClient');
const { withAuth, errorResponse } = require('./_auth');
const { parseJsonResponse, MODEL_CONFIG } = require('./_streamingUtils');
const { runDual } = require('./_stream/dual');
const { S, sdrOptions } = require('./_stream/helpers');
const { stream } = require('@netlify/functions');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('ai-insights');

const INSIGHTS_SCHEMA = S.obj({
  insights: S.arr(S.obj({
    type: S.oneOf('opportunity', 'risk', 'recommendation', 'prediction', 'pattern'),
    title: S.str,
    description: S.str,
    confidence: S.num,
    impact: S.oneOf('high', 'medium', 'low'),
    actionable: S.bool,
    suggestedActions: S.strArr,
    dataPoints: S.strArr,
  })),
});

// AI Insights system prompt
const INSIGHTS_SYSTEM_PROMPT = `You are SmartCRM's expert sales intelligence analyst, powered by GPT-5.2.

Your role: Generate actionable, data-driven insights for contact management and sales optimization.

Your expertise includes:
- Lead scoring and qualification analysis
- Engagement pattern recognition
- Opportunity identification
- Risk assessment and churn prediction
- Communication optimization
- Sales pipeline intelligence

Guidelines:
- Focus on actionable insights with clear next steps
- Provide confidence levels based on available data
- Identify patterns others might miss
- Suggest specific actions, not generic advice
- Consider industry context and role

Insight Types You Generate:
1. Opportunity - Potential deals, expansions, referrals
2. Risk - Churn indicators, engagement drops, competitive threats
3. Recommendation - Next best actions, timing suggestions
4. Prediction - Future outcomes based on patterns
5. Pattern - Trends, behaviors, anomalies`;

exports.handler = stream(withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  // Parse body
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

  const {
    contact,
    insightTypes = ['opportunity', 'recommendation'],
    context,
    aiProvider = 'openai',
    includeActivities = true,
  } = body;

  if (!contact || !contact.id) {
    return errorResponse(400, 'Contact object with id is required');
  }

  const model = MODEL_CONFIG.thinking; // Use thinking model for insights

  try {
    // Fetch contact with activities for context
    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contact.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (contactError) throw new Error(`Database error: ${contactError.message}`);
    if (!contactData) return errorResponse(404, 'Contact not found');

    // Fetch recent activities if requested
    let activities = [];
    if (includeActivities) {
      const { data: activitiesData } = await supabase
        .from('activities')
        .select('*')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false })
        .limit(20);
      activities = activitiesData || [];
    }

    // Fetch related deals
    const { data: deals } = await supabase
      .from('deals')
      .select('*')
      .eq('contact_id', contact.id)
      .order('created_at', { ascending: false })
      .limit(5);
    const dealList = deals || [];

    // Build context string
    const contactName = contactData.firstname || contactData.name || 'Unknown';
    const company = contactData.company || 'Unknown Company';

    const contextBlock = `
Contact Profile:
- Name: ${contactName}
- Title: ${contactData.title || 'Not specified'}
- Company: ${company}
- Industry: ${contactData.industry || 'Not specified'}
- Email: ${contactData.email || 'N/A'}
- Status: ${contactData.status || 'new'}
- Interest Level: ${contactData.interestLevel || 'Not specified'}
${contactData.aiScore ? `- AI Score: ${contactData.aiScore}/100` : ''}

Recent Activities (${activities.length}): ${activities.length > 0 ? activities.slice(0, 5).map(a => `${a.type} on ${new Date(a.created_at).toLocaleDateString()}`).join(', ') : 'No recent activities'}

Active Deals (${dealList.length}): ${dealList.length > 0 ? dealList.map(d => `${d.name} (${d.stage || d.status})`).join(', ') : 'No active deals'}

${context ? `Additional Context: ${context}` : ''}`;

    // Build user input for Responses API
    const userInput = `Generate ${insightTypes.length > 1 ? insightTypes.join(', ') : insightTypes[0]} insights for this contact.

Focus on generating insights related to: ${insightTypes.join(', ')}

${contextBlock}

For each insight, provide:
- type: The insight category (opportunity, risk, recommendation, prediction, pattern)
- title: Short, descriptive title
- description: Detailed explanation
- confidence: Confidence level 0-100
- impact: high/medium/low
- actionable: Whether this requires action
- suggestedActions: Array of 1-3 specific next steps
- dataPoints: Evidence supporting this insight

Return ONLY valid JSON with an "insights" array. Example: {"insights": [{"type": "opportunity", "title": "...", ...}]}`;

    return await runDual({
      event,
      body,
      options: sdrOptions({
        instructions: INSIGHTS_SYSTEM_PROMPT,
        input: userInput,
        model,
        temperature: 0.3,
        maxTokens: 2000,
        schema: INSIGHTS_SCHEMA,
        schemaName: 'contact_insights',
      }),
      // Insight rows are stored here (after the model finished), exactly once per request.
      finalize: async (text) => {
        const parsed = parseJsonResponse(text, { insights: [] });

        if (parsed.insights && parsed.insights.length > 0) {
          const insightsToStore = parsed.insights.map(insight => ({
            contact_id: contact.id,
            user_id: user.id,
            insight_type: insight.type,
            title: insight.title,
            description: insight.description,
            confidence: insight.confidence,
            impact: insight.impact,
            actionable: insight.actionable,
            suggested_actions: insight.suggestedActions,
            data_points: insight.dataPoints,
            ai_provider: 'openai',
            created_at: new Date().toISOString()
          }));

          await supabase.from('contact_insights').insert(insightsToStore);
        }

        log.info('AI insights generated', { contactId: contact.id, insightTypes, model });

        return {
          success: true,
          data: {
            insights: parsed.insights || [],
            insightTypes,
            generated: new Date().toISOString(),
          },
          provider: aiProvider,
          model,
          timestamp: new Date().toISOString(),
        };
      },
    });
  } catch (error) {
    log.error('AI insights generation failed', { contactId: contact?.id, error: error.message });
    return errorResponse(500, 'AI insights generation failed');
  }
}));
