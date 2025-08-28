import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

interface RelationshipInsight {
  contactId: string;
  relationshipStrength: number; // 0-100
  relationshipStage: 'cold' | 'warming' | 'engaged' | 'committed' | 'advocate';
  trustLevel: number; // 0-100
  influenceLevel: number; // 0-100
  networkConnections: Array<{
    contactId: string;
    name: string;
    relationship: 'colleague' | 'manager' | 'peer' | 'subordinate' | 'external';
    strength: number;
  }>;
  interactionRecommendations: Array<{
    type: 'email' | 'call' | 'meeting' | 'social' | 'content';
    recommendation: string;
    timing: string;
    priority: 'high' | 'medium' | 'low';
    expectedOutcome: string;
  }>;
  relationshipRisks: Array<{
    risk: string;
    likelihood: number;
    impact: 'high' | 'medium' | 'low';
    mitigation: string[];
  }>;
  growthOpportunities: Array<{
    opportunity: string;
    potential: number;
    actions: string[];
    timeline: string;
  }>;
  nextBestActions: Array<{
    action: string;
    timing: string;
    context: string;
    expectedResult: string;
  }>;
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
      const { contactId, contact, analysisDepth = 'standard' } = await req.json();
      
      if (!contactId || !contact) {
        return new Response(
          JSON.stringify({ error: 'contactId and contact data are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Gather relationship data
      const { data: communications } = await supabase
        .from('communications')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      const { data: deals } = await supabase
        .from('deals')
        .select('*')
        .eq('contact_id', contactId);

      const { data: activities } = await supabase
        .from('sales_activities')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      // Generate relationship insights
      const insights = await analyzeRelationship(
        contactId,
        contact,
        communications || [],
        deals || [],
        activities || [],
        analysisDepth,
        hasAI,
        openaiApiKey,
        geminiApiKey
      );

      return new Response(
        JSON.stringify(insights),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Relationship insights error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzeRelationship(
  contactId: string,
  contact: any,
  communications: any[],
  deals: any[],
  activities: any[],
  depth: string,
  hasAI: boolean,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<RelationshipInsight> {
  if (hasAI) {
    return await performAIRelationshipAnalysis(contactId, contact, communications, deals, activities, depth, openaiApiKey, geminiApiKey);
  } else {
    return performRuleBasedRelationshipAnalysis(contactId, contact, communications, deals, activities);
  }
}

async function performAIRelationshipAnalysis(
  contactId: string,
  contact: any,
  communications: any[],
  deals: any[],
  activities: any[],
  depth: string,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<RelationshipInsight> {
  const prompt = `Analyze the relationship strength and provide insights:

Contact: ${JSON.stringify(contact, null, 2)}
Communications: ${JSON.stringify(communications.slice(0, 10), null, 2)}
Deals: ${JSON.stringify(deals, null, 2)}
Activities: ${JSON.stringify(activities.slice(0, 10), null, 2)}

Provide relationship analysis with:
- relationshipStrength: 0-100 score
- relationshipStage: cold/warming/engaged/committed/advocate
- trustLevel: 0-100 score
- influenceLevel: 0-100 score
- interactionRecommendations: array of recommendations with type, timing, priority
- relationshipRisks: array of risks with likelihood and mitigation
- growthOpportunities: array of opportunities with potential and actions
- nextBestActions: array of specific next actions

Return JSON object only.`;

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
            { role: 'system', content: 'You are an expert relationship analyst specializing in business relationship assessment and optimization.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.4,
          response_format: { type: "json_object" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        return formatRelationshipResult(contactId, result);
      }
    } else if (geminiApiKey) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, response_mime_type: "application/json" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          const result = JSON.parse(content);
          return formatRelationshipResult(contactId, result);
        }
      }
    }
  } catch (error) {
    console.warn('AI relationship analysis failed:', error);
  }

  return performRuleBasedRelationshipAnalysis(contactId, contact, communications, deals, activities);
}

function performRuleBasedRelationshipAnalysis(
  contactId: string,
  contact: any,
  communications: any[],
  deals: any[],
  activities: any[]
): RelationshipInsight {
  // Calculate relationship strength based on interaction frequency and recency
  let relationshipStrength = 50; // Base score

  if (communications.length > 10) relationshipStrength += 20;
  else if (communications.length > 5) relationshipStrength += 10;

  if (deals.length > 0) relationshipStrength += 15;
  if (activities.length > 5) relationshipStrength += 10;

  // Check recency
  const lastInteraction = communications[0]?.created_at;
  if (lastInteraction) {
    const daysSince = (Date.now() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) relationshipStrength += 15;
    else if (daysSince < 30) relationshipStrength += 5;
    else if (daysSince > 90) relationshipStrength -= 20;
  }

  relationshipStrength = Math.max(0, Math.min(100, relationshipStrength));

  // Determine relationship stage
  let stage: RelationshipInsight['relationshipStage'] = 'cold';
  if (relationshipStrength >= 80) stage = 'advocate';
  else if (relationshipStrength >= 60) stage = 'committed';
  else if (relationshipStrength >= 40) stage = 'engaged';
  else if (relationshipStrength >= 20) stage = 'warming';

  return {
    contactId,
    relationshipStrength,
    relationshipStage: stage,
    trustLevel: Math.min(relationshipStrength + 10, 100),
    influenceLevel: contact.title?.includes('CEO') || contact.title?.includes('VP') ? 90 : 60,
    networkConnections: [],
    interactionRecommendations: [
      {
        type: 'email',
        recommendation: 'Send personalized follow-up email',
        timing: 'Within 48 hours',
        priority: 'high',
        expectedOutcome: 'Maintain engagement momentum'
      },
      {
        type: 'content',
        recommendation: 'Share relevant industry insights',
        timing: 'Weekly',
        priority: 'medium',
        expectedOutcome: 'Position as thought leader'
      }
    ],
    relationshipRisks: relationshipStrength < 40 ? [
      {
        risk: 'Low engagement level',
        likelihood: 70,
        impact: 'medium',
        mitigation: ['Increase touchpoint frequency', 'Provide more value-driven content']
      }
    ] : [],
    growthOpportunities: [
      {
        opportunity: 'Expand relationship network',
        potential: 75,
        actions: ['Request introductions to colleagues', 'Attend company events'],
        timeline: '30-60 days'
      }
    ],
    nextBestActions: [
      {
        action: 'Schedule check-in call',
        timing: 'This week',
        context: 'Maintain relationship momentum',
        expectedResult: 'Stronger engagement and trust'
      }
    ]
  };
}

function formatRelationshipResult(contactId: string, aiResult: any): RelationshipInsight {
  return {
    contactId,
    relationshipStrength: aiResult.relationshipStrength || 50,
    relationshipStage: aiResult.relationshipStage || 'warming',
    trustLevel: aiResult.trustLevel || 50,
    influenceLevel: aiResult.influenceLevel || 50,
    networkConnections: aiResult.networkConnections || [],
    interactionRecommendations: aiResult.interactionRecommendations || [],
    relationshipRisks: aiResult.relationshipRisks || [],
    growthOpportunities: aiResult.growthOpportunities || [],
    nextBestActions: aiResult.nextBestActions || []
  };
}