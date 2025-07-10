import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

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
      console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_ANON_KEY');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error: Missing required environment variables',
          details: 'SUPABASE_URL and SUPABASE_ANON_KEY must be configured'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const hasOpenAI = !!openaiApiKey;
    const hasGemini = !!geminiApiKey;
    
    // Log the environment variables (without showing full keys)
    console.log('Edge function environment variables:');
    console.log('- SUPABASE_URL:', supabaseUrl ? 'present' : 'missing');
    console.log('- SUPABASE_ANON_KEY:', supabaseKey ? 'present (truncated)' : 'missing');
    console.log('- OPENAI_API_KEY:', openaiApiKey ? `present (starts with: ${openaiApiKey.substring(0, 3)}...)` : 'missing');
    console.log('- GEMINI_API_KEY:', geminiApiKey ? `present (starts with: ${geminiApiKey.substring(0, 3)}...)` : 'missing');

    // Create a sample response to test connectivity
    if (req.method === 'OPTIONS') {
      return new Response("Edge function is responsive to OPTIONS", {
        status: 200,
        headers: corsHeaders
      });
    }
    
    if (req.method === 'POST') {
      const { contactId, contact, urgency = 'medium' } = await req.json();
      
      if (!contactId || !contact) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required parameters',
            details: 'contactId and contact data are required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      let result;
      
      // If we have OpenAI or Gemini API keys, use them
      if (hasOpenAI || hasGemini) {
        try {
          // Choose API based on availability and urgency
          // For high urgency, prefer OpenAI if available for higher accuracy
          const useOpenAI = hasOpenAI && (urgency === 'high' || !hasGemini);
          
          if (useOpenAI) {
            result = await scoreContactWithOpenAI(contactId, contact, urgency, openaiApiKey!);
          } else {
            result = await scoreContactWithGemini(contactId, contact, urgency, geminiApiKey!);
          }
        } catch (error) {
          console.error('AI scoring error:', error);
          // Fall back to mock scoring if AI APIs fail
          result = generateMockScore(contactId, contact);
        }
      } else {
        // Use mock data if no AI APIs are available
        result = generateMockScore(contactId, contact);
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
    console.error('Smart score error:', error);
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

// Score contact using OpenAI API
async function scoreContactWithOpenAI(contactId: string, contact: any, urgency: string, apiKey: string): Promise<any> {
  const model = urgency === 'high' ? 'gpt-4o' : 'gpt-4o-mini';
  
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
          content: `You are an expert CRM analyst with deep expertise in sales qualification and lead scoring. 
          Analyze contact data to produce a comprehensive lead score and insights. 
          Provide scores on a scale of 0-100, where higher scores indicate better sales opportunities.
          Be objective and data-driven in your analysis.`
        },
        {
          role: 'user',
          content: `Analyze this contact and provide a detailed lead score assessment:
          
          ${JSON.stringify(contact, null, 2)}
          
          Return a JSON object with the following fields:
          - score: numeric score from 0-100
          - confidence: your confidence in the assessment (0-100)
          - insights: array of 3-5 key insights about this contact's potential
          - recommendations: array of 3-5 actionable recommendations
          - categories: array of 2-4 categories this contact fits into
          - tags: array of 3-6 relevant tags for this contact
          
          Only return the JSON object, nothing else.`
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const result = await response.json();
  const content = result.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from OpenAI API');
  }
  
  try {
    const scoreData = JSON.parse(content);
    return {
      contactId,
      ...scoreData,
      provider: 'openai',
      model,
      timestamp: new Date().toISOString(),
      processingTime: Math.floor(Math.random() * 1000) + 500 // Simulated processing time
    };
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response: ${error.message}`);
  }
}

// Score contact using Gemini API
async function scoreContactWithGemini(contactId: string, contact: any, urgency: string, apiKey: string): Promise<any> {
  // For different urgency levels, we might use different models
  // but Gemini 1.5 Flash is suitable for most use cases
  const model = 'gemini-1.5-flash';
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Analyze this contact and provide a detailed lead score assessment:
          
          ${JSON.stringify(contact, null, 2)}
          
          Return a JSON object with the following fields:
          - score: numeric score from 0-100
          - confidence: your confidence in the assessment (0-100)
          - insights: array of 3-5 key insights about this contact's potential
          - recommendations: array of 3-5 actionable recommendations
          - categories: array of 2-4 categories this contact fits into
          - tags: array of 3-6 relevant tags for this contact
          
          Only return the JSON object, nothing else.`
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 0.8,
        maxOutputTokens: 1024
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
  
  try {
    // Extract JSON from text (Gemini might return markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const scoreData = JSON.parse(jsonMatch[0]);
    return {
      contactId,
      ...scoreData,
      provider: 'gemini',
      model,
      timestamp: new Date().toISOString(),
      processingTime: Math.floor(Math.random() * 800) + 300 // Simulated processing time
    };
  } catch (error) {
    throw new Error(`Failed to parse Gemini response: ${error.message}`);
  }
}

// Helper function to generate mock scores when AI APIs are unavailable
function generateMockScore(contactId: string, contact: any): any {
  // Generate a random but consistent score based on contact data
  const nameHash = hashString(contact.name || '');
  const emailHash = hashString(contact.email || '');
  const companyHash = hashString(contact.company || '');
  const combinedHash = (nameHash + emailHash + companyHash) % 100;
  
  // Base score 50-95
  const score = 50 + Math.floor(combinedHash * 0.45);
  
  return {
    contactId,
    score,
    confidence: 70,
    insights: [
      `Based on ${contact.industry || 'their industry'} background and role at ${contact.company}`,
      'Profile indicates some decision-making capability',
      'Engagement pattern suggests interest in solutions'
    ],
    recommendations: [
      'Schedule a follow-up call',
      'Share relevant case studies',
      'Connect on LinkedIn'
    ],
    categories: [
      contact.industry || 'General',
      getPositionCategory(contact.title || '')
    ],
    tags: [
      contact.interestLevel || 'medium',
      'needs-followup',
      contact.sources && contact.sources.length > 0 ? `source-${contact.sources[0].toLowerCase().replace(/\s+/g, '-')}` : 'manual-entry'
    ],
    provider: 'mock',
    model: 'mock-model',
    timestamp: new Date().toISOString(),
    processingTime: 800
  };
}

// Helper function to get position category based on title
function getPositionCategory(title: string): string {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('ceo') || lowerTitle.includes('cto') || lowerTitle.includes('cfo') || 
      lowerTitle.includes('president') || lowerTitle.includes('founder')) {
    return 'Executive';
  } else if (lowerTitle.includes('director') || lowerTitle.includes('vp') || 
             lowerTitle.includes('head')) {
    return 'Director';
  } else if (lowerTitle.includes('manager')) {
    return 'Manager';
  } else if (lowerTitle.includes('engineer') || lowerTitle.includes('developer')) {
    return 'Technical';
  }
  
  return 'Professional';
}

// Utility function for generating consistent hashes
function hashString(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}