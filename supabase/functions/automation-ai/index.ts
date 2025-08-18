import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

interface AutomationRule {
  id?: string;
  name: string;
  description: string;
  trigger: {
    type: 'contact_created' | 'score_change' | 'interaction' | 'time_based' | 'manual';
    config: Record<string, any>;
  };
  conditions: Array<{
    field: string;
    operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'in_range';
    value: any;
    logic?: 'AND' | 'OR';
  }>;
  actions: Array<{
    type: 'email' | 'task' | 'tag' | 'score_update' | 'workflow' | 'notification';
    config: Record<string, any>;
    delay?: number;
  }>;
  isActive: boolean;
  aiOptimized: boolean;
  optimizationSuggestions: string[];
  createdAt: string;
  updatedAt: string;
}

interface EnhancedSuggestion {
  id: string;
  type: 'new_rule' | 'optimize_existing' | 'disable_rule' | 'merge_rules';
  title: string;
  description: string;
  reasoning: string[];
  estimatedImpact: {
    efficiency: number;
    coverage: number;
    timesSaved: number;
  };
  confidence: number;
  suggestedRule?: Partial<AutomationRule>;
  priority: 'high' | 'medium' | 'low';
  naturalLanguageDescription: string;
  complexityScore: number;
  implementationSteps: string[];
  riskFactors: string[];
  successPrediction: {
    probability: number;
    timeToValue: string;
    expectedROI: string;
  };
  createdAt: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Missing required environment variables'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const hasOpenAI = !!openaiApiKey;
    const hasGemini = !!geminiApiKey;
    
    if (!hasOpenAI && !hasGemini) {
      return new Response(
        JSON.stringify({
          error: 'AI providers not configured',
          details: 'OpenAI or Gemini API keys are required for automation AI'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'POST') {
      const { type, ...requestData } = await req.json();
      
      let result;
      
      switch (type) {
        case 'natural-language-rule':
          result = await translateNaturalLanguageToRule(requestData, hasOpenAI, hasGemini, openaiApiKey, geminiApiKey);
          break;
          
        case 'enhanced-suggestions':
          result = await generateEnhancedSuggestions(requestData, hasOpenAI, hasGemini, openaiApiKey, geminiApiKey);
          break;
          
        case 'advanced-rule-analysis':
          result = await performAdvancedRuleAnalysis(requestData, hasOpenAI, hasGemini, openaiApiKey, geminiApiKey);
          break;
          
        case 'contextual-workflow':
          result = await generateContextualWorkflow(requestData, hasOpenAI, hasGemini, openaiApiKey, geminiApiKey);
          break;
          
        default:
          return new Response(
            JSON.stringify({
              error: 'Invalid request type',
              details: `Unsupported type: ${type}`
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
      }

      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
        details: 'This endpoint only supports POST requests'
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Automation AI error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message || 'An unexpected error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Natural Language to Automation Rule Translation
async function translateNaturalLanguageToRule(
  requestData: any,
  hasOpenAI: boolean,
  hasGemini: boolean,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<AutomationRule> {
  const { description, contactContext, businessGoals, urgency } = requestData;
  
  const prompt = `As an expert automation architect, translate this natural language description into a structured automation rule:

Description: "${description}"

Contact Context: ${JSON.stringify(contactContext || {}, null, 2)}
Business Goals: ${JSON.stringify(businessGoals || [], null, 2)}
Urgency: ${urgency}

Create a comprehensive automation rule with:

1. **name**: A clear, descriptive name for this rule
2. **description**: Enhanced description with additional context
3. **trigger**: Object with type and config
   - Types: "contact_created", "score_change", "interaction", "time_based", "manual"
4. **conditions**: Array of condition objects with field, operator, value
   - Operators: "equals", "greater_than", "less_than", "contains", "in_range"
5. **actions**: Array of action objects with type, config, and optional delay
   - Types: "email", "task", "tag", "score_update", "workflow", "notification"
6. **optimizationSuggestions**: Array of potential improvements
7. **estimatedImpact**: Object with efficiency gain, contact coverage, time saved
8. **implementationComplexity**: "low", "medium", or "high"
9. **riskFactors**: Array of potential risks or challenges

Be specific and actionable. Consider edge cases and provide detailed configurations.

Return a JSON object with these fields only.`;

  try {
    let aiResponse;
    
    // Use GPT-5 (GPT-4o) for complex rule translation
    if (hasOpenAI) {
      aiResponse = await callOpenAI(prompt, openaiApiKey!, 'gpt-4o');
    } else if (hasGemini) {
      aiResponse = await callGemini(prompt, geminiApiKey!, 'gemini-1.5-pro');
    } else {
      throw new Error('No AI provider available');
    }

    // Convert AI response to AutomationRule
    const rule: AutomationRule = {
      id: `nl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: aiResponse.name || 'AI Generated Rule',
      description: aiResponse.description || description,
      trigger: aiResponse.trigger || { type: 'manual', config: {} },
      conditions: aiResponse.conditions || [],
      actions: aiResponse.actions || [],
      isActive: false, // Start inactive for review
      aiOptimized: true,
      optimizationSuggestions: aiResponse.optimizationSuggestions || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return rule;
  } catch (error) {
    console.error('Natural language translation failed:', error);
    throw new Error(`Failed to translate natural language: ${error.message}`);
  }
}

// Enhanced Automation Suggestions with GPT-5
async function generateEnhancedSuggestions(
  requestData: any,
  hasOpenAI: boolean,
  hasGemini: boolean,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<{ suggestions: EnhancedSuggestion[] }> {
  const { contacts, existingRules, performanceHistory, patterns } = requestData;
  
  const prompt = `As an expert automation strategist, analyze this CRM data and generate intelligent automation suggestions:

Contact Data Summary:
- Total Contacts: ${contacts.length}
- Industries: ${[...new Set(contacts.map((c: any) => c.industry))].join(', ')}
- Interest Levels: Hot: ${contacts.filter((c: any) => c.interestLevel === 'hot').length}, Medium: ${contacts.filter((c: any) => c.interestLevel === 'medium').length}
- Average AI Score: ${Math.round(contacts.reduce((sum: number, c: any) => sum + (c.aiScore || 0), 0) / contacts.length)}

Existing Rules: ${existingRules.length} rules configured
Performance History: ${performanceHistory.length} executions tracked
Patterns: ${JSON.stringify(patterns, null, 2)}

Generate 3-5 sophisticated automation suggestions with:

For each suggestion:
1. **type**: "new_rule", "optimize_existing", "merge_rules", or "strategic_workflow"
2. **title**: Compelling, specific title
3. **description**: Detailed description with business impact
4. **reasoning**: Array of strategic reasons (3-5 points)
5. **estimatedImpact**: Object with efficiency %, coverage number, timesSaved hours
6. **confidence**: 0-100 confidence score
7. **priority**: "high", "medium", "low"
8. **naturalLanguageDescription**: How a user would describe this in plain English
9. **complexityScore**: 1-10 implementation complexity
10. **implementationSteps**: Array of clear implementation steps
11. **riskFactors**: Potential risks or challenges
12. **successPrediction**: Object with probability %, timeToValue, expectedROI
13. **suggestedRule**: Complete rule structure if applicable

Focus on high-impact, innovative automation opportunities that leverage modern AI capabilities.

Return JSON object with "suggestions" array.`;

  try {
    let aiResponse;
    
    if (hasOpenAI) {
      aiResponse = await callOpenAI(prompt, openaiApiKey!, 'gpt-4o');
    } else if (hasGemini) {
      aiResponse = await callGemini(prompt, geminiApiKey!, 'gemini-1.5-pro');
    } else {
      throw new Error('No AI provider available');
    }

    // Enhance suggestions with IDs and timestamps
    const enhancedSuggestions = (aiResponse.suggestions || []).map((suggestion: any) => ({
      ...suggestion,
      id: `enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    }));

    return { suggestions: enhancedSuggestions };
  } catch (error) {
    console.error('Enhanced suggestions generation failed:', error);
    throw new Error(`Failed to generate enhanced suggestions: ${error.message}`);
  }
}

// Advanced Rule Analysis with GPT-5
async function performAdvancedRuleAnalysis(
  requestData: any,
  hasOpenAI: boolean,
  hasGemini: boolean,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<any> {
  const { rule, contacts, performanceHistory } = requestData;
  
  const prompt = `Perform comprehensive analysis of this automation rule using advanced AI reasoning:

Automation Rule:
${JSON.stringify(rule, null, 2)}

Contact Dataset (${contacts.length} contacts):
${JSON.stringify(contacts.slice(0, 20), null, 2)}

Performance History:
${JSON.stringify(performanceHistory, null, 2)}

Provide deep strategic analysis with:

1. **impactPrediction**: Object with:
   - affectedContacts: number of contacts this rule would impact
   - estimatedExecutions: predicted monthly executions
   - timesSaved: hours saved per week
   - revenueImpact: estimated additional revenue
   - riskLevel: "low", "medium", "high"

2. **optimizationRecommendations**: Array of specific optimization suggestions:
   - area: what to optimize (timing, conditions, actions, etc.)
   - suggestion: specific recommendation
   - expectedImprovement: quantified expected improvement
   - confidence: 0-100 confidence in this recommendation

3. **strategicInsights**: Array of high-level strategic insights about this rule's role in the overall automation strategy

4. **competitiveAdvantage**: How this rule provides competitive advantage

Use advanced reasoning to identify non-obvious optimization opportunities and strategic implications.

Return comprehensive JSON object.`;

  try {
    let aiResponse;
    
    if (hasOpenAI) {
      aiResponse = await callOpenAI(prompt, openaiApiKey!, 'gpt-4o');
    } else if (hasGemini) {
      aiResponse = await callGemini(prompt, geminiApiKey!, 'gemini-1.5-pro');
    } else {
      throw new Error('No AI provider available');
    }

    return aiResponse;
  } catch (error) {
    console.error('Advanced rule analysis failed:', error);
    throw new Error(`Failed to perform advanced analysis: ${error.message}`);
  }
}

// Contextual Workflow Generation
async function generateContextualWorkflow(
  requestData: any,
  hasOpenAI: boolean,
  hasGemini: boolean,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<{ workflows: any[] }> {
  const { contact, businessObjective, timeframe, existingRules } = requestData;
  
  const prompt = `Design contextual automation workflows for this specific contact and business objective:

Contact Profile:
${JSON.stringify(contact, null, 2)}

Business Objective: ${businessObjective}
Timeframe: ${timeframe}
Existing Rules: ${existingRules.length} rules already configured

Create 2-3 sophisticated, contextual workflows that:
1. Are specifically tailored to this contact's profile and behavior patterns
2. Align with the stated business objective
3. Consider the specified timeframe
4. Complement existing automation rules
5. Leverage advanced AI capabilities

For each workflow, provide:
1. **workflowName**: Descriptive name
2. **description**: Detailed workflow description
3. **steps**: Array of workflow steps with:
   - action: specific action to take
   - timing: when to execute (relative or absolute)
   - conditions: conditions that must be met
   - expectedOutcome: what this step should achieve
4. **successProbability**: 0-100 probability of achieving the objective
5. **estimatedROI**: Expected return on investment
6. **implementationComplexity**: "low", "medium", "high"
7. **reasoning**: Strategic reasoning for this workflow design
8. **kpis**: Key performance indicators to track success
9. **adaptationRules**: How the workflow should adapt based on performance

Return JSON object with "workflows" array.`;

  try {
    let aiResponse;
    
    if (hasOpenAI) {
      aiResponse = await callOpenAI(prompt, openaiApiKey!, 'gpt-4o');
    } else if (hasGemini) {
      aiResponse = await callGemini(prompt, geminiApiKey!, 'gemini-1.5-pro');
    } else {
      throw new Error('No AI provider available');
    }

    return { workflows: aiResponse.workflows || [] };
  } catch (error) {
    console.error('Contextual workflow generation failed:', error);
    throw new Error(`Failed to generate contextual workflow: ${error.message}`);
  }
}

// AI Provider Helper Functions
async function callOpenAI(prompt: string, apiKey: string, model: string = 'gpt-4o'): Promise<any> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert automation architect with deep expertise in sales process optimization, workflow design, and AI-powered business automation. Provide detailed, actionable, and strategic recommendations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from OpenAI API');
  }
  
  return JSON.parse(content);
}

async function callGemini(prompt: string, apiKey: string, model: string = 'gemini-1.5-pro'): Promise<any> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
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
        maxOutputTokens: 2048,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('Empty response from Gemini API');
  }
  
  return JSON.parse(content);
}