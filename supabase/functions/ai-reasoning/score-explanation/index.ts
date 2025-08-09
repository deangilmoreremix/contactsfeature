```typescript
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
    console.warn('No AI provider API keys configured. Cannot generate score explanation.');
    return new Response(
      JSON.stringify({
        explanation: 'AI providers not configured. Cannot generate detailed score explanation.',
        confidence: 0,
        model: 'none'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    if (req.method === 'POST') {
      const { contact } = await req.json();

      if (!contact || !contact.aiScore) {
        return new Response(
          JSON.stringify({
            error: 'Missing required parameters',
            details: 'contact data with aiScore is required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      let explanationResult;

      // Prefer OpenAI for reasoning tasks if available
      if (hasOpenAI) {
        explanationResult = await generateExplanationWithOpenAI(contact, openaiApiKey!);
      } else if (hasGemini) {
        explanationResult = await generateExplanationWithGemini(contact, geminiApiKey!);
      } else {
        // Fallback if somehow no AI is available (should be caught by earlier check)
        explanationResult = {
          explanation: `The AI score of ${contact.aiScore} indicates a good potential.`,
          confidence: 50,
          model: 'fallback'
        };
      }

      return new Response(
        JSON.stringify(explanationResult),
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
    console.error('Error in score-explanation function:', error);
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

async function generateExplanationWithOpenAI(contact: any, apiKey: string): Promise<any> {
  const prompt = `Given the following contact information and their AI score, provide a concise, 2-3 sentence explanation for why they received this score. Focus on key factors from their profile.

Contact:
${JSON.stringify(contact, null, 2)}

AI Score: ${contact.aiScore}

Explanation:`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Using gpt-4o-mini for cost-effectiveness in explanations
      messages: [
        {
          role: 'system',
          content: 'You are an expert sales analyst providing clear and concise reasoning for AI-generated lead scores.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 100
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
  }

  const result = await response.json();
  const explanation = result.choices[0]?.message?.content?.trim();

  return {
    explanation: explanation || `Could not generate a detailed explanation for score ${contact.aiScore}.`,
    confidence: 80, // Assume high confidence for explanation generation
    model: 'gpt-4o-mini'
  };
}

async function generateExplanationWithGemini(contact: any, apiKey: string): Promise<any> {
  const prompt = `Given the following contact information and their AI score, provide a concise, 2-3 sentence explanation for why they received this score. Focus on key factors from their profile.

Contact:
${JSON.stringify(contact, null, 2)}

AI Score: ${contact.aiScore}

Explanation:`;

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
        maxOutputTokens: 100
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  return {
    explanation: explanation || `Could not generate a detailed explanation for score ${contact.aiScore}.`,
    confidence: 75, // Slightly lower confidence for Gemini in this specific task
    model: 'gemini-1.5-flash'
  };
}
```