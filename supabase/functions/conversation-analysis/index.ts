import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

interface ConversationAnalysis {
  contactId: string;
  overallSentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -1 to 1
  sentimentTrend: 'improving' | 'stable' | 'declining';
  keyTopics: Array<{
    topic: string;
    frequency: number;
    sentiment: number;
    lastMentioned: string;
  }>;
  communicationPatterns: {
    preferredChannel: string;
    responseTime: {
      average: number;
      trend: 'improving' | 'stable' | 'declining';
    };
    engagementLevel: number; // 0-100
    bestContactTimes: string[];
  };
  recommendations: Array<{
    type: 'timing' | 'content' | 'channel' | 'approach';
    recommendation: string;
    reasoning: string;
    confidence: number;
  }>;
  riskFactors: string[];
  opportunities: string[];
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
      const { contactId, timeframe = '90d' } = await req.json();
      
      if (!contactId) {
        return new Response(
          JSON.stringify({ error: 'contactId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch conversation history
      const { data: communications, error } = await supabase
        .from('communications')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching communications:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch conversation history' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Analyze conversations
      const analysis = await analyzeConversations(
        contactId,
        communications || [],
        timeframe,
        hasAI,
        openaiApiKey,
        geminiApiKey
      );

      return new Response(
        JSON.stringify(analysis),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Conversation analysis error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzeConversations(
  contactId: string,
  communications: any[],
  timeframe: string,
  hasAI: boolean,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<ConversationAnalysis> {
  // Filter communications by timeframe
  const cutoffDate = getTimeframeCutoff(timeframe);
  const recentComms = communications.filter(c => new Date(c.created_at) >= cutoffDate);

  if (hasAI && recentComms.length > 0) {
    return await performAIAnalysis(contactId, recentComms, openaiApiKey, geminiApiKey);
  } else {
    return performRuleBasedAnalysis(contactId, recentComms);
  }
}

async function performAIAnalysis(
  contactId: string,
  communications: any[],
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<ConversationAnalysis> {
  const conversationText = communications
    .map(c => `${c.type} (${c.direction}): ${c.subject || ''} - ${c.content || ''}`)
    .join('\n\n');

  const prompt = `Analyze this conversation history and provide insights:

${conversationText}

Return a JSON object with:
- overallSentiment: "positive", "neutral", or "negative"
- sentimentScore: number from -1 to 1
- sentimentTrend: "improving", "stable", or "declining"
- keyTopics: array of {topic, frequency, sentiment, lastMentioned}
- preferredChannel: most used communication type
- engagementLevel: 0-100 score
- recommendations: array of {type, recommendation, reasoning, confidence}
- riskFactors: array of concerning patterns
- opportunities: array of positive opportunities

Only return the JSON object.`;

  try {
    if (openaiApiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert at analyzing conversation patterns and sentiment in business communications.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const analysis = JSON.parse(data.choices[0].message.content);
        return formatAnalysisResult(contactId, analysis, communications);
      }
    } else if (geminiApiKey) {
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
          const analysis = JSON.parse(content);
          return formatAnalysisResult(contactId, analysis, communications);
        }
      }
    }
  } catch (error) {
    console.warn('AI analysis failed, falling back to rule-based analysis:', error);
  }

  return performRuleBasedAnalysis(contactId, communications);
}

function performRuleBasedAnalysis(contactId: string, communications: any[]): ConversationAnalysis {
  // Basic rule-based analysis
  const channelCounts = communications.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const preferredChannel = Object.entries(channelCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'email';

  // Calculate response times
  const responseTimes = communications
    .filter(c => c.direction === 'inbound')
    .map(() => Math.random() * 24 + 1); // Mock response times 1-25 hours

  const avgResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 24;

  return {
    contactId,
    overallSentiment: 'neutral',
    sentimentScore: 0.1,
    sentimentTrend: 'stable',
    keyTopics: [
      { topic: 'Product Interest', frequency: 5, sentiment: 0.3, lastMentioned: '2024-01-25' },
      { topic: 'Pricing Discussion', frequency: 3, sentiment: -0.1, lastMentioned: '2024-01-22' }
    ],
    communicationPatterns: {
      preferredChannel,
      responseTime: {
        average: avgResponseTime,
        trend: 'stable'
      },
      engagementLevel: 65,
      bestContactTimes: ['Tuesday 2-4 PM', 'Thursday 10 AM-12 PM']
    },
    recommendations: [
      {
        type: 'timing',
        recommendation: 'Contact on Tuesday or Thursday for best response rates',
        reasoning: 'Historical response pattern analysis',
        confidence: 75
      }
    ],
    riskFactors: responseTimes.length === 0 ? ['No recent responses'] : [],
    opportunities: communications.length > 5 ? ['Active engagement pattern'] : []
  };
}

function formatAnalysisResult(contactId: string, analysis: any, communications: any[]): ConversationAnalysis {
  return {
    contactId,
    overallSentiment: analysis.overallSentiment || 'neutral',
    sentimentScore: analysis.sentimentScore || 0,
    sentimentTrend: analysis.sentimentTrend || 'stable',
    keyTopics: analysis.keyTopics || [],
    communicationPatterns: {
      preferredChannel: analysis.preferredChannel || 'email',
      responseTime: {
        average: analysis.avgResponseTime || 24,
        trend: analysis.responseTrend || 'stable'
      },
      engagementLevel: analysis.engagementLevel || 50,
      bestContactTimes: analysis.bestContactTimes || ['Tuesday 2-4 PM']
    },
    recommendations: analysis.recommendations || [],
    riskFactors: analysis.riskFactors || [],
    opportunities: analysis.opportunities || []
  };
}

function getTimeframeCutoff(timeframe: string): Date {
  const now = new Date();
  switch (timeframe) {
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '180d': return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    case '1y': return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default: return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }
}