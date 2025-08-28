\\```typescript
import { createClient } from 'npm:@supabase/supabase-js@2\.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  /\/ Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return n\ew Response(null, {
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
    console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_ANON_KEY'\);
    retur\n new Response(
      JSON.stringify({
        error: 'Server configuration error: Missing required environment variables',
        details: 'SUPABASE_URL and SUPABASE_ANON_KEY must be configured'
      }),
      {
   \     status: 500,
  \      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const hasOpenAI = !!openaiApiKey;
  const hasGemini = !!geminiApiKey;

  if (!hasOpenAI && !hasGemini) {