import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { dealId } = JSON.parse(event.body || '{}');

    if (!dealId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required field: dealId' })
      };
    }

    console.log('Deal heatmap request:', { dealId });

    // Get deal information and related data
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Deal not found' })
      };
    }

    // Get related communications and activities
    const { data: communications } = await supabase
      .from('communications')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Analyze deal health using AI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const dealContext = {
      deal: {
        name: deal.name,
        value: deal.value,
        stage: deal.stage,
        created_at: deal.created_at,
        last_activity: deal.last_activity_at
      },
      communications: communications?.length || 0,
      activities: activities?.length || 0,
      recentActivity: communications?.slice(0, 5) || [],
      stageDuration: deal.created_at ? Math.floor((Date.now() - new Date(deal.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0
    };

    const systemPrompt = `You are an expert sales operations analyst. Analyze deal health and predict closing probability based on communication patterns, activity levels, and deal progression. Provide data-driven risk assessments.`;

    const userPrompt = `Analyze this deal's health and provide a risk score:

Deal Context: ${JSON.stringify(dealContext, null, 2)}

Analyze:
1. Communication frequency and quality
2. Deal progression pace
3. Activity levels
4. Time in current stage
5. Overall engagement patterns

Return JSON with:
- "risk_score": Number 0-100 (100 = highest risk)
- "reason": Brief explanation of the score
- "factors": Object with detailed analysis of each factor
- "recommendations": Array of 2-3 actionable recommendations`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    // Store heatmap analysis
    await supabase
      .from('deal_heatmaps')
      .insert({
        deal_id: dealId,
        risk_score: analysis.risk_score,
        reason: analysis.reason,
        factors: analysis.factors,
        recommendations: analysis.recommendations,
        analyzed_at: new Date().toISOString()
      });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        dealId,
        risk_score: analysis.risk_score,
        reason: analysis.reason,
        factors: analysis.factors,
        recommendations: analysis.recommendations,
        debug: {
          processingTime: Date.now(),
          tokens: data.usage?.total_tokens,
          dataPoints: {
            communications: communications?.length || 0,
            activities: activities?.length || 0,
            stageDuration: dealContext.stageDuration
          }
        }
      })
    };
  } catch (error: any) {
    console.error('Deal heatmap failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Deal heatmap analysis failed',
        details: error.message
      })
    };
  }
};