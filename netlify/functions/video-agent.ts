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
    const { contactId, productUrl, goal } = JSON.parse(event.body || '{}');

    if (!contactId || !productUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: contactId and productUrl' })
      };
    }

    console.log('Video agent request:', { contactId, productUrl, goal });

    // Get contact information
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Contact not found' })
      };
    }

    // Generate video script and storyboard using OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an expert video content creator specializing in B2B sales videos. Create compelling video scripts and storyboards for product demos, follow-ups, and educational content. Focus on:
- Clear narrative structure
- Visual storytelling
- Strong calls-to-action
- Professional presentation
- Keep scripts concise (30-60 seconds)`;

    const userPrompt = `Create a video script and storyboard for this contact:

Contact: ${contact.name} (${contact.title} at ${contact.company})
Product URL: ${productUrl}
Video Goal: ${goal || 'demo'}

Return JSON with:
- "script": The full video script text
- "storyboard": Array of scene descriptions with timing
- "estimatedDuration": Total video length in seconds
- "keyMessages": Array of 3-5 key points to convey
- "visualStyle": Recommended visual approach`;

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
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);

    // Generate video URL (placeholder - would integrate with video generation service)
    const videoUrl = `https://api.example.com/video/generate?script=${encodeURIComponent(content.script)}&style=${content.visualStyle}`;

    // Store video record
    await supabase
      .from('videos')
      .insert({
        contact_id: contactId,
        product_url: productUrl,
        goal: goal || 'demo',
        script: content.script,
        storyboard: content.storyboard,
        video_url: videoUrl,
        estimated_duration: content.estimatedDuration,
        key_messages: content.keyMessages,
        visual_style: content.visualStyle,
        created_at: new Date().toISOString()
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
        storyboard: content.storyboard,
        script: content.script,
        videoUrl,
        estimatedDuration: content.estimatedDuration,
        keyMessages: content.keyMessages,
        visualStyle: content.visualStyle,
        debug: {
          processingTime: Date.now(),
          tokens: data.usage?.total_tokens
        }
      })
    };
  } catch (error: any) {
    console.error('Video agent failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Video agent request failed',
        details: error.message
      })
    };
  }
};