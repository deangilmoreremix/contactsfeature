import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

interface ContactCardAI {
  contactId: string;
  quickScore: {
    overall: number;
    breakdown: {
      engagement: number;
      fit: number;
      urgency: number;
    };
    reasoning: string[];
  };
  quickInsights: Array<{
    type: 'opportunity' | 'risk' | 'action';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  nextBestAction: {
    action: string;
    timing: string;
    channel: string;
    reasoning: string;
  };
  cardMetadata: {
    priorityLevel: 'high' | 'medium' | 'low';
    statusSuggestion?: string;
    tagSuggestions: string[];
    lastAnalysis: string;
  };
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
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const hasAI = !!(openaiApiKey || geminiApiKey);

    if (req.method === 'POST') {
      const { contactId, contact, quickAnalysis = true } = await req.json();
      
      if (!contactId || !contact) {
        return new Response(
          JSON.stringify({ error: 'contactId and contact data are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate quick AI analysis for contact card
      const cardAI = await generateContactCardAI(
        contactId,
        contact,
        quickAnalysis,
        hasAI,
        openaiApiKey,
        geminiApiKey
      );

      return new Response(
        JSON.stringify(cardAI),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Contact card AI error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateContactCardAI(
  contactId: string,
  contact: any,
  quickAnalysis: boolean,
  hasAI: boolean,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<ContactCardAI> {
  if (hasAI && quickAnalysis) {
    return await performQuickAIAnalysis(contactId, contact, openaiApiKey, geminiApiKey);
  } else {
    return performQuickRuleBasedAnalysis(contactId, contact);
  }
}

async function performQuickAIAnalysis(
  contactId: string,
  contact: any,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<ContactCardAI> {
  const prompt = `Quickly analyze this contact for card display:

${JSON.stringify(contact, null, 2)}

Provide quick analysis with:
- quickScore: overall score 0-100 with engagement/fit/urgency breakdown and reasoning
- quickInsights: 2-3 key insights with type, title, description, priority
- nextBestAction: recommended action with timing, channel, reasoning
- priorityLevel: high/medium/low
- tagSuggestions: 3-5 relevant tags

Focus on actionable insights for immediate use. Return JSON object only.`;

  try {
    const apiKey = openaiApiKey || geminiApiKey;
    const isOpenAI = !!openaiApiKey;

    if (isOpenAI) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a sales intelligence assistant providing quick contact insights for CRM card views.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        return formatCardAIResult(contactId, result);
      }
    } else {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, response_mime_type: "application/json" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          const result = JSON.parse(content);
          return formatCardAIResult(contactId, result);
        }
      }
    }
  } catch (error) {
    console.warn('Quick AI analysis failed:', error);
  }

  return performQuickRuleBasedAnalysis(contactId, contact);
}

function performQuickRuleBasedAnalysis(contactId: string, contact: any): ContactCardAI {
  // Quick rule-based scoring
  let score = 50;
  
  if (contact.interest_level === 'hot') score += 25;
  else if (contact.interest_level === 'medium') score += 10;
  else if (contact.interest_level === 'cold') score -= 20;

  if (contact.title?.includes('CEO') || contact.title?.includes('VP')) score += 20;
  if (contact.industry === 'Technology') score += 10;

  score = Math.max(0, Math.min(100, score));

  return {
    contactId,
    quickScore: {
      overall: score,
      breakdown: {
        engagement: Math.min(100, score + 10),
        fit: Math.min(100, score - 5),
        urgency: contact.interest_level === 'hot' ? 90 : 50
      },
      reasoning: [
        `${contact.interest_level} interest level`,
        `${contact.title} at ${contact.company}`,
        'Industry alignment factor'
      ]
    },
    quickInsights: [
      {
        type: score > 70 ? 'opportunity' : 'action',
        title: score > 70 ? 'High Potential Contact' : 'Needs Follow-up',
        description: score > 70 
          ? 'Strong indicators for conversion potential'
          : 'Consider increasing engagement frequency',
        priority: score > 70 ? 'high' : 'medium'
      }
    ],
    nextBestAction: {
      action: score > 70 ? 'Schedule demo call' : 'Send follow-up email',
      timing: score > 70 ? 'Within 24 hours' : 'Within 48 hours',
      channel: 'email',
      reasoning: 'Based on contact priority and engagement level'
    },
    cardMetadata: {
      priorityLevel: score > 70 ? 'high' : score > 50 ? 'medium' : 'low',
      tagSuggestions: generateTagSuggestions(contact),
      lastAnalysis: new Date().toISOString()
    }
  };
}

function formatCardAIResult(contactId: string, aiResult: any): ContactCardAI {
  return {
    contactId,
    quickScore: aiResult.quickScore || { overall: 50, breakdown: { engagement: 50, fit: 50, urgency: 50 }, reasoning: [] },
    quickInsights: aiResult.quickInsights || [],
    nextBestAction: aiResult.nextBestAction || { action: 'Follow up', timing: '48 hours', channel: 'email', reasoning: 'Standard follow-up' },
    cardMetadata: {
      priorityLevel: aiResult.priorityLevel || 'medium',
      statusSuggestion: aiResult.statusSuggestion,
      tagSuggestions: aiResult.tagSuggestions || [],
      lastAnalysis: new Date().toISOString()
    }
  };
}

function generateTagSuggestions(contact: any): string[] {
  const tags = [];
  
  if (contact.industry) tags.push(contact.industry.toLowerCase());
  if (contact.title?.includes('CEO')) tags.push('decision-maker');
  if (contact.title?.includes('VP') || contact.title?.includes('Director')) tags.push('influencer');
  if (contact.interest_level === 'hot') tags.push('high-priority');
  if (contact.company?.includes('Corp') || contact.company?.includes('Inc')) tags.push('enterprise');
  
  return tags.slice(0, 5);
}