import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Validate required environment variables
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

  if (!hasOpenAI && !hasGemini) {
    console.warn('No AI provider API keys configured');
    return new Response(
      JSON.stringify({
        error: 'AI providers not configured',
        details: 'OpenAI or Gemini API keys are required for AI reasoning'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    if (req.method === 'POST') {
      const { contact, type } = await req.json();

      if (!contact) {
        return new Response(
          JSON.stringify({
            error: 'Missing contact data',
            details: 'Contact object is required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      let result;

      switch (type) {
        case 'score-explanation':
          result = await generateScoreExplanation(contact, openaiApiKey, geminiApiKey);
          break;
        case 'next-best-action':
          result = await generateNextBestAction(contact, openaiApiKey, geminiApiKey);
          break;
        case 'engagement-status':
          result = await generateEngagementStatus(contact, openaiApiKey, geminiApiKey);
          break;
        case 'communication-strategy':
          result = await generateCommunicationStrategy(contact, openaiApiKey, geminiApiKey);
          break;
        default:
          return new Response(
            JSON.stringify({
              error: 'Invalid reasoning type',
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
        details: 'Only POST requests are supported'
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Unhandled error in ai-reasoning function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function generateScoreExplanation(contact: any, openaiApiKey?: string, geminiApiKey?: string) {
  const prompt = `Analyze this contact's profile and explain why they received their AI score of ${contact.aiScore || 'unscored'}.

Contact Profile:
- Name: ${contact.name}
- Title: ${contact.title}
- Company: ${contact.company}
- Industry: ${contact.industry || 'Unknown'}
- Interest Level: ${contact.interestLevel}
- Status: ${contact.status}
- Sources: ${contact.sources?.join(', ') || 'Unknown'}
- Last Connected: ${contact.lastConnected || 'Never'}
- Notes: ${contact.notes || 'No notes'}
- AI Score: ${contact.aiScore || 'Not scored'}
${contact.inferredPersonalityTraits ? `- Personality Traits: ${JSON.stringify(contact.inferredPersonalityTraits)}` : ''}
${contact.communicationStyle ? `- Communication Style: ${contact.communicationStyle}` : ''}
${contact.professionalDemeanor ? `- Professional Demeanor: ${contact.professionalDemeanor}` : ''}

Provide 2-3 concise bullet points explaining the key factors that contributed to this AI score. Each bullet should be 10-15 words maximum.

Return a JSON object with:
- reasons: array of 2-3 short explanation strings
- confidence: number from 1-100 indicating confidence in the explanation

ONLY return the JSON object, nothing else.`;

  if (openaiApiKey) {
    return await callOpenAI(prompt, openaiApiKey);
  } else if (geminiApiKey) {
    return await callGemini(prompt, geminiApiKey);
  }

  throw new Error('No AI provider available');
}

async function generateNextBestAction(contact: any, openaiApiKey?: string, geminiApiKey?: string) {
  const prompt = `As a sales coach, recommend the single most effective next action for engaging with this contact.

Contact Profile:
- Name: ${contact.name}
- Title: ${contact.title}
- Company: ${contact.company}
- Industry: ${contact.industry || 'Unknown'}
- Interest Level: ${contact.interestLevel}
- Status: ${contact.status}
- Last Connected: ${contact.lastConnected || 'Never'}
- AI Score: ${contact.aiScore || 'Not scored'}
${contact.communicationStyle ? `- Communication Style: ${contact.communicationStyle}` : ''}
${contact.professionalDemeanor ? `- Professional Demeanor: ${contact.professionalDemeanor}` : ''}

Return a JSON object with:
- action: single recommended action (e.g., "Send personalized email", "Schedule discovery call")
- justification: brief reason for this recommendation (10-20 words)
- priority: "high", "medium", or "low"
- confidence: number from 1-100

ONLY return the JSON object, nothing else.`;

  if (openaiApiKey) {
    return await callOpenAI(prompt, openaiApiKey);
  } else if (geminiApiKey) {
    return await callGemini(prompt, geminiApiKey);
  }

  throw new Error('No AI provider available');
}

async function generateEngagementStatus(contact: any, openaiApiKey?: string, geminiApiKey?: string) {
  const prompt = `Analyze this contact's engagement status based on their profile and interaction history.

Contact Profile:
- Name: ${contact.name}
- Interest Level: ${contact.interestLevel}
- Status: ${contact.status}
- Last Connected: ${contact.lastConnected || 'Never'}
- AI Score: ${contact.aiScore || 'Not scored'}
- Lead Score: ${contact.leadScore || 0}
- Engagement Score: ${contact.engagementScore || 0}
${contact.communicationStyle ? `- Communication Style: ${contact.communicationStyle}` : ''}

Return a JSON object with:
- status: one of "Highly Engaged", "Moderately Engaged", "Low Engagement", "At Risk", "Disengaged"
- reasoning: brief explanation (15-25 words)
- recommendation: suggested action based on the status
- confidence: number from 1-100

ONLY return the JSON object, nothing else.`;

  if (openaiApiKey) {
    return await callOpenAI(prompt, openaiApiKey);
  } else if (geminiApiKey) {
    return await callGemini(prompt, geminiApiKey);
  }

  throw new Error('No AI provider available');
}

async function generateCommunicationStrategy(contact: any, openaiApiKey?: string, geminiApiKey?: string) {
  const prompt = `As a sales communication expert, create a comprehensive communication strategy for this contact.

Contact Profile:
- Name: ${contact.name}
- Title: ${contact.title}
- Company: ${contact.company}
- Industry: ${contact.industry || 'Unknown'}
- Interest Level: ${contact.interestLevel}
- Status: ${contact.status}
- Last Connected: ${contact.lastConnected || 'Never'}
- AI Score: ${contact.aiScore || 'Not scored'}
- Lead Score: ${contact.leadScore || 0}
- Engagement Score: ${contact.engagementScore || 0}
${contact.communicationStyle ? `- Communication Style: ${contact.communicationStyle}` : ''}
${contact.professionalDemeanor ? `- Professional Demeanor: ${contact.professionalDemeanor}` : ''}

Create a strategic communication plan that includes:

Return a JSON object with:
- strategy: object containing:
  - primaryChannel: preferred communication method ("email", "phone", "linkedin")
  - tone: recommended tone ("professional", "casual", "consultative")  
  - timing: best time to contact ("morning", "afternoon", "evening")
  - frequency: contact frequency ("daily", "weekly", "bi-weekly", "monthly")
- messaging: object containing:
  - keyPoints: array of 3-4 main talking points
  - valueProposition: personalized value proposition (20-30 words)
  - callToAction: specific next step to propose
- tactics: object containing:
  - followUpSequence: array of 3 follow-up touchpoints with timing
  - personalizedElements: ways to personalize the outreach
  - objectionHandling: anticipated objections and responses
- confidence: number from 1-100 indicating strategy confidence

ONLY return the JSON object, nothing else.`;

  if (openaiApiKey) {
    return await callOpenAI(prompt, openaiApiKey);
  } else if (geminiApiKey) {
    return await callGemini(prompt, geminiApiKey);
  }

  throw new Error('No AI provider available');
}

async function callOpenAI(prompt: string, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-5-omni', // Updated model to GPT-5 Omni
      messages: [
        {
          role: 'system',
          content: 'You are an expert sales AI analyst who provides clear, concise reasoning for contact assessments.'
        },
        {
          role: 'user',
          content: prompt
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

  return JSON.parse(content);
}

async function callGemini(prompt: string, apiKey: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
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
        temperature: 0.2,
        response_mime_type: "application/json"
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
