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
      case 'gemini':
        result = await generateWithGemini(contact, currentStage, businessGoals, automationType, playbookType);
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

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5',
        instructions: systemPrompt,
        input: userPrompt,
        temperature: 0.3,
        text: {
          format: {
            type: "json_schema",
            name: "playbook",
            strict: true,
            schema: {
              type: "object",
              properties: {
                strategy: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                    rationale: { type: "string" }
                  },
                  required: ["name", "description", "confidence", "rationale"]
                },
                phases: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      timeline: { type: "string" },
                      objectives: { type: "array", items: { type: "string" } },
                      tactics: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            description: { type: "string" },
                            priority: { type: "string", enum: ["high", "medium", "low"] },
                            estimatedEffort: { type: "string" },
                            successMetrics: { type: "array", items: { type: "string" } },
                            dependencies: { type: "array", items: { type: "string" } }
                          },
                          required: ["id", "name", "description", "priority", "estimatedEffort", "successMetrics"]
                        }
                      },
                      milestones: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            description: { type: "string" },
                            dueDate: { type: "string" },
                            owner: { type: "string" },
                            status: { type: "string", enum: ["pending", "in_progress", "completed"] }
                          },
                          required: ["id", "name", "description", "dueDate", "owner", "status"]
                        }
                      }
                    },
                    required: ["id", "name", "timeline", "objectives", "tactics", "milestones"]
                  }
                },
                riskMitigation: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      risk: { type: "string" },
                      probability: { type: "number", minimum: 0, maximum: 1 },
                      impact: { type: "string" },
                      mitigation: { type: "string" }
                    },
                    required: ["risk", "probability", "impact", "mitigation"]
                  }
                },
                successIndicators: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      metric: { type: "string" },
                      target: { type: "string" },
                      current: { type: "string" },
                      status: { type: "string", enum: ["on_track", "at_risk", "behind"] }
                    },
                    required: ["metric", "target", "current", "status"]
                  }
                },
                competitivePositioning: {
                  type: "object",
                  properties: {
                    strengths: { type: "array", items: { type: "string" } },
                    weaknesses: { type: "array", items: { type: "string" } },
                    differentiation: { type: "array", items: { type: "string" } },
                    winThemes: { type: "array", items: { type: "string" } }
                  },
                  required: ["strengths", "weaknesses", "differentiation", "winThemes"]
                },
                recommendedActions: { type: "array", items: { type: "string" } },
                automationSequence: { type: "array", items: { type: "object" } },
                triggers: { type: "array", items: { type: "object" } },
                conditions: { type: "array", items: { type: "object" } },
                successMetrics: { type: "array", items: { type: "string" } },
                fallbackActions: { type: "array", items: { type: "object" } },
                currentStage: { type: "string" },
                automationType: { type: "string" },
                generated: { type: "string" }
              },
              required: ["strategy", "phases", "riskMitigation", "successIndicators", "competitivePositioning"]
            }
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Handle Responses API format
    let content;
    if (data.output && data.output.length > 0) {
      const messageItem = data.output.find(item => item.type === 'message');
      if (messageItem && messageItem.content && messageItem.content.length > 0) {
        content = JSON.parse(messageItem.content[0].text);
      } else {
        throw new Error('No message content found in response output');
      }
    } else if (data.output_text) {
      content = JSON.parse(data.output_text);
    } else {
      throw new Error('No response content found');
    }

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

async function generateWithGemini(contact, currentStage, businessGoals, automationType, playbookType) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Create a ${playbookType} sales playbook for this contact:

Contact: ${contact.name} at ${contact.company}
Current Stage: ${currentStage}
Business Goals: ${businessGoals.join(', ')}
Playbook Type: ${playbookType}

${getPlaybookTypeInstructions(playbookType)}

Return JSON with strategy, phases, riskMitigation, successIndicators, competitivePositioning, and other playbook components.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 32,
          topP: 0.8,
          maxOutputTokens: 1000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const responseContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseContent) {
      throw new Error('Invalid response from Gemini');
    }

    // Extract JSON from the response text
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const playbook = JSON.parse(jsonMatch[0]);

    return {
      strategy: playbook.strategy,
      phases: playbook.phases || [],
      riskMitigation: playbook.riskMitigation || [],
      successIndicators: playbook.successIndicators || [],
      competitivePositioning: playbook.competitivePositioning || {},
      recommendedActions: playbook.recommendedActions || [],
      automationSequence: playbook.automationSequence || [],
      triggers: playbook.triggers || [],
      conditions: playbook.conditions || [],
      successMetrics: playbook.successMetrics || [],
      fallbackActions: playbook.fallbackActions || [],
      currentStage,
      automationType,
      generated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Gemini adaptive playbook generation failed:', error);
    throw error;
  }
}