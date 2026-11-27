const { stream } = require('@netlify/functions');
const { runDual } = require('./_stream/dual');
const { S } = require('./_stream/helpers');
const { supabase } = require('./_supabaseClient');
const { withAuth, errorResponse } = require('./_auth');
const { getOwnedContact } = require('./_ownership');

function getPlaybookTypeInstructions(playbookType) {
  const instructions = {
    comprehensive: 'Create a balanced, thorough sales strategy covering all aspects of the sales process. Include detailed phases, tactics, and risk mitigation.',
    aggressive: 'Create an aggressive, fast-paced sales strategy focused on quick wins and rapid deal progression. Emphasize urgency, competitive pressure, and accelerated timelines.',
    conservative: 'Create a conservative, relationship-focused sales strategy emphasizing trust-building, thorough qualification, and long-term partnership development.',
    relationship: 'Create a relationship-building focused strategy that prioritizes trust, value demonstration, and long-term partnership over immediate sales.',
    transactional: 'Create a transactional sales strategy focused on efficiency, clear value propositions, and streamlined decision-making processes.'
  };
  return instructions[playbookType] || instructions.comprehensive;
}

function validateInput(contact, currentStage, businessGoals, automationType, playbookType, aiProvider) {
  // Validate contact object
  if (!contact || typeof contact !== 'object') {
    throw new Error('Invalid contact: must be an object');
  }
  if (!contact.id || typeof contact.id !== 'string') {
    throw new Error('Invalid contact.id: must be a non-empty string');
  }
  if (!contact.name || typeof contact.name !== 'string') {
    throw new Error('Invalid contact.name: must be a non-empty string');
  }
  if (!contact.company || typeof contact.company !== 'string') {
    throw new Error('Invalid contact.company: must be a non-empty string');
  }

  // Validate currentStage
  const validStages = ['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
  if (!validStages.includes(currentStage)) {
    throw new Error(`Invalid currentStage: must be one of ${validStages.join(', ')}`);
  }

  // Validate businessGoals
  if (!Array.isArray(businessGoals)) {
    throw new Error('Invalid businessGoals: must be an array');
  }
  if (businessGoals.length > 10) {
    throw new Error('Invalid businessGoals: maximum 10 goals allowed');
  }
  for (const goal of businessGoals) {
    if (typeof goal !== 'string' || goal.length > 200) {
      throw new Error('Invalid businessGoals: each goal must be a string under 200 characters');
    }
  }

  // Validate automationType
  const validAutomationTypes = ['comprehensive', 'aggressive', 'conservative', 'relationship', 'transactional'];
  if (!validAutomationTypes.includes(automationType)) {
    throw new Error(`Invalid automationType: must be one of ${validAutomationTypes.join(', ')}`);
  }

  // Validate playbookType
  if (!validAutomationTypes.includes(playbookType)) {
    throw new Error(`Invalid playbookType: must be one of ${validAutomationTypes.join(', ')}`);
  }

  // Validate aiProvider
  const validProviders = ['openai'];
  if (!validProviders.includes(aiProvider)) {
    throw new Error(`Invalid aiProvider: must be one of ${validProviders.join(', ')}`);
  }
}

exports.handler = stream(withAuth(async (event, user) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const reqBody = JSON.parse(event.body);
    const {
      contact,
      currentStage = 'prospect',
      businessGoals = [],
      automationType = 'comprehensive',
      playbookType = 'comprehensive',
      aiProvider = 'openai'
    } = reqBody;

    // Validate all inputs
    validateInput(contact, currentStage, businessGoals, automationType, playbookType, aiProvider);

    if (!(await getOwnedContact(user.id, contact.id))) return errorResponse(404, 'Contact not found');

    console.log('Adaptive playbook request:', {
      contactId: contact.id,
      currentStage,
      automationType,
      playbookType,
      aiProvider
    });

    // Same URL, two modes: JSON (as before) or SSE (status/delta/partial events + final `result`).
    return await runDual({
      event,
      body: reqBody,
      headers: CORS_HEADERS,
      options: buildOptions(contact, currentStage, businessGoals, automationType, playbookType),
      finalize: async (text) => {
        const result = shapeResult(text, currentStage, automationType);

        const playbookData = {
          contact_id: contact.id,
          current_stage: currentStage,
          automation_type: automationType,
          recommended_actions: result.recommendedActions,
          automation_sequence: result.automationSequence,
          triggers: result.triggers,
          conditions: result.conditions,
          ai_provider: aiProvider,
          created_at: new Date().toISOString()
        };

        await supabase
          .from('adaptive_playbooks')
          .insert(playbookData);

        return {
          success: true,
          data: result,
          provider: aiProvider,
          timestamp: new Date().toISOString()
        };
      },
    });
  } catch (error) {
    console.error('Adaptive playbook generation failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Adaptive playbook generation failed',
        details: error.message
      })
    };
  }
}));

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const OUTPUT_SCHEMA = S.obj({
  strategy: S.obj({ name: S.str, description: S.str, confidence: S.num, rationale: S.str }),
  phases: S.arr(S.obj({
    id: S.str, name: S.str, timeline: S.str, objectives: S.strArr,
    tactics: S.arr(S.obj({ id: S.str, name: S.str, description: S.str, priority: S.oneOf('high', 'medium', 'low'), estimatedEffort: S.str, successMetrics: S.strArr, dependencies: S.strArr })),
    milestones: S.arr(S.obj({ id: S.str, name: S.str, description: S.str, dueDate: S.str, owner: S.str, status: S.str })),
  })),
  riskMitigation: S.arr(S.obj({ risk: S.str, probability: S.num, impact: S.str, mitigation: S.str })),
  successIndicators: S.arr(S.obj({ metric: S.str, target: S.str, current: S.str, status: S.str })),
  competitivePositioning: S.obj({ strengths: S.strArr, weaknesses: S.strArr, differentiation: S.strArr, winThemes: S.strArr }),
});

function buildOptions(contact, currentStage, businessGoals, automationType, playbookType) {
    const systemPrompt = `You are an expert sales automation strategist. Create adaptive playbooks that respond to contact behavior and business objectives. Generate intelligent automation sequences with appropriate triggers and conditions.`;

    const userPrompt = `Create a ${playbookType} sales playbook for this contact:

Contact: ${contact.name} (${contact.title} at ${contact.company})
Current Stage: ${currentStage}
Business Goals: ${businessGoals.join(', ')}
Playbook Type: ${playbookType}
Automation Type: ${automationType}

${getPlaybookTypeInstructions(playbookType)}

Generate a detailed sales playbook with the following structure:
{
  "strategy": {
    "name": "Strategic sales approach name",
    "description": "Detailed strategy description",
    "confidence": 0.85,
    "rationale": "Why this strategy works for this contact"
  },
  "phases": [
    {
      "id": "phase-1",
      "name": "Phase name (e.g., Discovery & Research)",
      "timeline": "Week 1-2",
      "objectives": ["Objective 1", "Objective 2", "Objective 3"],
      "tactics": [
        {
          "id": "tactic-1",
          "name": "Tactic name",
          "description": "Detailed tactic description",
          "priority": "high|medium|low",
          "estimatedEffort": "2-3 hours",
          "successMetrics": ["Metric 1", "Metric 2"],
          "dependencies": []
        }
      ],
      "milestones": [
        {
          "id": "milestone-1",
          "name": "Milestone name",
          "description": "Milestone description",
          "dueDate": "2024-12-31T00:00:00.000Z",
          "owner": "Sales Rep",
          "status": "pending"
        }
      ]
    }
  ],
  "riskMitigation": [
    {
      "risk": "Risk description",
      "probability": 0.3,
      "impact": "High|Medium|Low",
      "mitigation": "Mitigation strategy"
    }
  ],
  "successIndicators": [
    {
      "metric": "Engagement Score",
      "target": "85%",
      "current": "72%",
      "status": "on_track|at_risk|behind"
    }
  ],
  "competitivePositioning": {
    "strengths": ["Strength 1", "Strength 2"],
    "weaknesses": [],
    "differentiation": ["Differentiation 1", "Differentiation 2"],
    "winThemes": ["Theme 1", "Theme 2"]
  }
}`;

  return {
    model: 'default',
    effort: 'low',
    instructions: systemPrompt,
    input: userPrompt,
    schema: OUTPUT_SCHEMA,
    schemaName: 'adaptive_playbook',
    store: false,
  };
}

function shapeResult(text, currentStage, automationType) {
  const content = JSON.parse(text);
  return {
      strategy: content.strategy,
      phases: content.phases || [],
      riskMitigation: content.riskMitigation || [],
      successIndicators: content.successIndicators || [],
      competitivePositioning: content.competitivePositioning || {},
      recommendedActions: content.recommendedActions || [],
      automationSequence: content.automationSequence || [],
      triggers: content.triggers || [],
      conditions: content.conditions || [],
      successMetrics: content.successMetrics || [],
      fallbackActions: content.fallbackActions || [],
      currentStage,
      automationType,
      generated: new Date().toISOString()
    };
}
