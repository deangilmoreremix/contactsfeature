const { responsesFetch } = require('./_responses');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const {
      contact,
      currentStage = 'prospect',
      businessGoals = [],
      automationType = 'comprehensive',
      playbookType = 'comprehensive',
      aiProvider = 'openai'
    } = JSON.parse(event.body);

    // Validate all inputs
    validateInput(contact, currentStage, businessGoals, automationType, playbookType, aiProvider);

    console.log('Adaptive playbook request:', {
      contactId: contact.id,
      currentStage,
      automationType,
      playbookType,
      aiProvider
    });

    let result;

    // Route to appropriate AI provider
    switch (aiProvider) {
      case 'openai':
        result = await generateWithOpenAI(contact, currentStage, businessGoals, automationType, playbookType);
        break;
      default:
        result = await generateWithOpenAI(contact, currentStage, businessGoals, automationType, playbookType);
    }

    // Store playbook suggestions
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
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        data: result,
        provider: aiProvider,
        timestamp: new Date().toISOString()
      })
    };
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
};

async function generateWithOpenAI(contact, currentStage, businessGoals, automationType, playbookType) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

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

    const response = await responsesFetch({
        model: 'gpt-5.2',
        instructions: systemPrompt,
        input: userPrompt,
        temperature: 0.3,
        text: {
          format: {
            type: 'json_object'
          }
        }
      });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI Responses API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();

    const content = JSON.parse(data.output_text);

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
  } catch (error) {
    console.error('OpenAI adaptive playbook generation failed:', error);
    throw error;
  }
}
