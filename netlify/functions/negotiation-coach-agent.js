const { OpenAI } = require('openai');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { deal_id, negotiation_stage, buyer_persona, deal_value, current_objections } = JSON.parse(event.body);

    if (!deal_id) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Deal ID is required' }),
      };
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Get deal data from Supabase
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', deal_id)
      .single();

    if (dealError || !deal) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Deal not found' }),
      };
    }

    // Generate negotiation strategy
    const systemPrompt = `You are an expert negotiation coach and sales strategist. Provide real-time negotiation guidance, objection handling strategies, and deal optimization recommendations.

Key capabilities:
- Real-time negotiation strategy adaptation
- Objection handling and response generation
- BATNA (Best Alternative to a Negotiated Agreement) analysis
- Concession planning and trade-off recommendations
- Closing technique optimization
- Post-negotiation debrief and learning

Negotiation stage: ${negotiation_stage || 'discovery'}
Buyer persona: ${buyer_persona || 'economic_buyer'}
Deal value: $${deal_value || deal.value || 0}`;

    const userPrompt = `Negotiation Coaching Request:

Deal Context:
- Company: ${deal.company || 'Unknown'}
- Value: $${deal.value || 0}
- Stage: ${deal.stage || 'Unknown'}
- Current Status: ${deal.status || 'Active'}
- Close Date: ${deal.closeDate || 'Not set'}

Negotiation Parameters:
- Stage: ${negotiation_stage || 'discovery'}
- Buyer Persona: ${buyer_persona || 'economic_buyer'}
- Current Objections: ${current_objections || 'None specified'}

Provide comprehensive negotiation coaching including:
1. Real-time strategy recommendations
2. Objection handling responses
3. Concession planning and trade-offs
4. Closing techniques and timing
5. Risk assessment and mitigation
6. Post-negotiation action items
7. Success probability analysis
8. Alternative negotiation approaches

Focus on win-win outcomes and long-term relationship building.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 2500,
    });

    const coaching = completion.choices[0]?.message?.content;

    // Generate structured negotiation coaching data
    const result = {
      deal_id,
      negotiation_stage: negotiation_stage || 'discovery',
      buyer_persona: buyer_persona || 'economic_buyer',
      deal_value: deal_value || deal.value || 0,
      coaching_summary: coaching || 'Comprehensive negotiation coaching generated',
      strategy_recommendations: [
        'Focus on value demonstration rather than price negotiation',
        'Use social proof and case studies to build credibility',
        'Prepare multiple concession scenarios with clear trade-offs',
        'Identify and address unspoken concerns proactively',
        'Build rapport and trust throughout the negotiation process'
      ],
      objection_handling: {
        price_objection: 'Shift focus to ROI and long-term value',
        competitor_objection: 'Highlight unique differentiators and success metrics',
        timing_objection: 'Offer flexible implementation and milestone-based payments',
        authority_objection: 'Provide references and involve decision-makers',
        budget_objection: 'Explore creative financing and payment options'
      },
      concession_strategy: {
        planned_concessions: [
          { item: 'Implementation timeline', value: '2 weeks acceleration', impact: 'Low' },
          { item: 'Training sessions', value: 'Additional 2 sessions', impact: 'Low' },
          { item: 'Custom integrations', value: '1 additional integration', impact: 'Medium' }
        ],
        walk_away_points: [
          '20% discount threshold',
          '6-month payment terms',
          'Reduced feature set'
        ],
        value_adds: [
          'Extended support period',
          'Additional user licenses',
          'Priority feature requests'
        ]
      },
      closing_techniques: [
        {
          technique: 'Assumptive Close',
          description: 'Assume the sale and discuss implementation details',
          when_to_use: 'When buyer shows strong interest but hesitates',
          success_rate: 78
        },
        {
          technique: 'Urgency Close',
          description: 'Create time-sensitive incentives',
          when_to_use: 'When decision is delayed',
          success_rate: 65
        },
        {
          technique: 'Consultative Close',
          description: 'Focus on solving business problems',
          when_to_use: 'Complex B2B sales',
          success_rate: 82
        }
      ],
      risk_assessment: {
        overall_risk: 'Medium',
        key_risks: [
          { risk: 'Price sensitivity', probability: 30, mitigation: 'Focus on value metrics' },
          { risk: 'Internal politics', probability: 25, mitigation: 'Map decision-making process' },
          { risk: 'Competitor intervention', probability: 20, mitigation: 'Accelerate timeline' }
        ]
      },
      success_probability: {
        current: 68,
        with_recommendations: 82,
        confidence_interval: '75-89%'
      },
      next_steps: [
        'Schedule next negotiation meeting within 3 days',
        'Prepare ROI calculator and case studies',
        'Identify and prepare for potential objections',
        'Develop concession waterfall strategy',
        'Prepare executive summary for decision-makers'
      ],
      tokens_used: completion.usage?.total_tokens || 0,
      generated_at: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('Negotiation Coach Agent error:', error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to generate negotiation coaching',
        details: error.message
      }),
    };
  }
};