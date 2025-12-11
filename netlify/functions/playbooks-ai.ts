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
    const { contactId, dealId } = JSON.parse(event.body || '{}');

    if (!contactId && !dealId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'At least one of contactId or dealId is required' })
      };
    }

    console.log('Playbooks AI request:', { contactId, dealId });

    let contact = null;
    let deal = null;

    // Get contact information if provided
    if (contactId) {
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (contactError || !contactData) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Contact not found' })
        };
      }
      contact = contactData;
    }

    // Get deal information if provided
    if (dealId) {
      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .single();

      if (dealError || !dealData) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Deal not found' })
        };
      }
      deal = dealData;
    }

    // Get historical communications and activities
    let communications = [];
    let activities = [];

    if (contactId) {
      const { data: commData } = await supabase
        .from('communications')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(20);
      communications = commData || [];
    }

    if (dealId) {
      const { data: activityData } = await supabase
        .from('activities')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false })
        .limit(15);
      activities = activityData || [];
    }

    // Generate AI playbooks using OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const context = {
      contact: contact ? {
        name: contact.name,
        title: contact.title,
        company: contact.company,
        industry: contact.industry
      } : null,
      deal: deal ? {
        name: deal.name,
        value: deal.value,
        stage: deal.stage
      } : null,
      communications: communications.length,
      activities: activities.length,
      recentCommunications: communications.slice(0, 5).map(c => ({
        type: c.type,
        direction: c.direction,
        sentiment: c.sentiment,
        date: c.created_at
      }))
    };

    const systemPrompt = `You are an expert sales strategist and playbook creator. Generate comprehensive, actionable sales playbooks based on contact and deal data. Focus on:
- Objection handling strategies
- Follow-up sequences
- Script recommendations
- Deal-winning insights
- Personalized approaches based on contact history`;

    const userPrompt = `Generate a comprehensive sales playbook for this scenario:

Context: ${JSON.stringify(context, null, 2)}

Create a playbook that includes:
1. Top 3-5 recommended scripts for different situations
2. Common objections and specific responses
3. Follow-up patterns and timing
4. Overall strategy summary

Return JSON with:
- "summary": Brief strategy overview
- "top_scripts": Array of recommended scripts with context
- "objections": Array of common objections with responses
- "followups": Array of follow-up strategies with timing
- "insights": Key deal-winning insights`;

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
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const playbook = JSON.parse(data.choices[0].message.content);

    // Store playbook
    await supabase
      .from('playbooks')
      .insert({
        contact_id: contactId,
        deal_id: dealId,
        summary: playbook.summary,
        top_scripts: playbook.top_scripts,
        objections: playbook.objections,
        followups: playbook.followups,
        insights: playbook.insights,
        generated_at: new Date().toISOString()
      });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        contactId,
        dealId,
        summary: playbook.summary,
        top_scripts: playbook.top_scripts,
        objections: playbook.objections,
        followups: playbook.followups,
        insights: playbook.insights,
        debug: {
          processingTime: Date.now(),
          tokens: data.usage?.total_tokens,
          dataAnalyzed: {
            communications: communications.length,
            activities: activities.length
          }
        }
      })
    };
  } catch (error: any) {
    console.error('Playbooks AI failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Playbooks AI generation failed',
        details: error.message
      })
    };
  }
};