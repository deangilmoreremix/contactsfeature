import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

interface ContactDetailAI {
  contactId: string;
  comprehensiveAnalysis: {
    overallScore: number;
    detailedBreakdown: {
      fitScore: number;
      engagementScore: number;
      conversionProbability: number;
      relationshipStrength: number;
      communicationEffectiveness: number;
    };
    confidenceLevel: number;
  };
  strategicInsights: Array<{
    category: 'business' | 'personal' | 'competitive' | 'timing';
    insight: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
    suggestedActions?: string[];
  }>;
  communicationStrategy: {
    optimalApproach: string;
    recommendedChannels: string[];
    messagingThemes: string[];
    avoidanceTopics: string[];
    toneSuggestions: string;
  };
  dealStrategy: {
    approachRecommendation: string;
    keyValueProps: string[];
    expectedObjections: string[];
    closingStrategy: string;
    timelineRecommendation: string;
  };
  riskAssessment: {
    churnRisk: number;
    competitorRisk: number;
    delayRisk: number;
    mitigationStrategies: string[];
  };
  personalization: {
    communicationStyle: string;
    decisionMakingStyle: string;
    motivators: string[];
    concerns: string[];
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
      const { contactId, contact, includeStrategy = true, includePersonalization = true } = await req.json();
      
      if (!contactId || !contact) {
        return new Response(
          JSON.stringify({ error: 'contactId and contact data are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch comprehensive contact data
      const [
        { data: communications },
        { data: deals },
        { data: appointments },
        { data: activities }
      ] = await Promise.all([
        supabase.from('communications').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }).limit(20),
        supabase.from('deals').select('*').eq('contact_id', contactId),
        supabase.from('appointments').select('*').eq('contact_id', contactId).order('start_time', { ascending: false }).limit(10),
        supabase.from('sales_activities').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }).limit(15)
      ]);

      // Generate comprehensive AI analysis
      const detailAI = await generateDetailedAI(
        contactId,
        contact,
        communications || [],
        deals || [],
        appointments || [],
        activities || [],
        includeStrategy,
        includePersonalization,
        hasAI,
        openaiApiKey,
        geminiApiKey
      );

      return new Response(
        JSON.stringify(detailAI),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Contact detail AI error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateDetailedAI(
  contactId: string,
  contact: any,
  communications: any[],
  deals: any[],
  appointments: any[],
  activities: any[],
  includeStrategy: boolean,
  includePersonalization: boolean,
  hasAI: boolean,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<ContactDetailAI> {
  if (hasAI) {
    return await performComprehensiveAIAnalysis(
      contactId, contact, communications, deals, appointments, activities,
      includeStrategy, includePersonalization, openaiApiKey, geminiApiKey
    );
  } else {
    return performComprehensiveRuleBasedAnalysis(
      contactId, contact, communications, deals, appointments, activities
    );
  }
}

async function performComprehensiveAIAnalysis(
  contactId: string,
  contact: any,
  communications: any[],
  deals: any[],
  appointments: any[],
  activities: any[],
  includeStrategy: boolean,
  includePersonalization: boolean,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<ContactDetailAI> {
  const contextData = {
    contact,
    communications: communications.slice(0, 15),
    deals,
    appointments: appointments.slice(0, 10),
    activities: activities.slice(0, 10)
  };

  const prompt = `Perform comprehensive contact analysis:

${JSON.stringify(contextData, null, 2)}

Provide detailed analysis with:
- comprehensiveAnalysis: overall score and detailed breakdown (fitScore, engagementScore, conversionProbability, relationshipStrength, communicationEffectiveness) with confidenceLevel
- strategicInsights: business/personal/competitive/timing insights with impact and actions
- communicationStrategy: optimal approach, channels, themes, avoidance topics, tone
- dealStrategy: approach, value props, objections, closing strategy, timeline
- riskAssessment: churn/competitor/delay risks with mitigation strategies
- personalization: communication style, decision style, motivators, concerns

Return comprehensive JSON object only.`;

  try {
    if (openaiApiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Use full GPT-4o for comprehensive analysis
          messages: [
            { role: 'system', content: 'You are a comprehensive sales intelligence analyst providing detailed strategic insights for contact management.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.4,
          response_format: { type: "json_object" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        return formatDetailAIResult(contactId, result);
      }
    } else if (geminiApiKey) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`, {
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
          return formatDetailAIResult(contactId, result);
        }
      }
    }
  } catch (error) {
    console.warn('Comprehensive AI analysis failed:', error);
  }

  return performComprehensiveRuleBasedAnalysis(contactId, contact, communications, deals, appointments, activities);
}

function performComprehensiveRuleBasedAnalysis(
  contactId: string,
  contact: any,
  communications: any[],
  deals: any[],
  appointments: any[],
  activities: any[]
): ContactDetailAI {
  // Comprehensive rule-based analysis
  let overallScore = 60;
  
  // Interaction analysis
  if (communications.length > 10) overallScore += 15;
  if (appointments.length > 3) overallScore += 10;
  if (deals.length > 0) overallScore += 20;

  // Title analysis
  if (contact.title?.includes('CEO') || contact.title?.includes('Founder')) overallScore += 15;
  else if (contact.title?.includes('VP') || contact.title?.includes('Director')) overallScore += 10;

  overallScore = Math.max(0, Math.min(100, overallScore));

  return {
    contactId,
    comprehensiveAnalysis: {
      overallScore,
      detailedBreakdown: {
        fitScore: Math.min(100, overallScore + 5),
        engagementScore: Math.min(100, overallScore - 10),
        conversionProbability: Math.min(100, overallScore - 5),
        relationshipStrength: Math.min(100, overallScore),
        communicationEffectiveness: Math.min(100, overallScore + 10)
      },
      confidenceLevel: 75
    },
    strategicInsights: [
      {
        category: 'business',
        insight: `${contact.name} holds ${contact.title} position with significant influence`,
        impact: 'high',
        actionable: true,
        suggestedActions: ['Focus on business value proposition', 'Prepare executive-level presentation']
      }
    ],
    communicationStrategy: {
      optimalApproach: 'Professional and direct',
      recommendedChannels: ['email', 'phone'],
      messagingThemes: ['Business value', 'ROI focus', 'Efficiency gains'],
      avoidanceTopics: ['Technical details without context'],
      toneSuggestions: 'Professional with data-driven insights'
    },
    dealStrategy: {
      approachRecommendation: 'Value-focused with clear ROI demonstration',
      keyValueProps: ['Efficiency improvement', 'Cost reduction', 'Competitive advantage'],
      expectedObjections: ['Budget constraints', 'Timeline concerns', 'Integration complexity'],
      closingStrategy: 'Executive summary with clear next steps',
      timelineRecommendation: '30-60 day decision cycle'
    },
    riskAssessment: {
      churnRisk: communications.length === 0 ? 70 : 30,
      competitorRisk: 40,
      delayRisk: 35,
      mitigationStrategies: [
        'Increase touchpoint frequency',
        'Provide competitive differentiation',
        'Create urgency with limited-time offers'
      ]
    },
    personalization: {
      communicationStyle: 'Data-driven professional',
      decisionMakingStyle: 'Analytical with stakeholder input',
      motivators: ['Business growth', 'Efficiency', 'Innovation'],
      concerns: ['ROI justification', 'Implementation complexity', 'Team adoption']
    }
  };
}

function formatDetailAIResult(contactId: string, aiResult: any): ContactDetailAI {
  return {
    contactId,
    comprehensiveAnalysis: aiResult.comprehensiveAnalysis || {
      overallScore: 60,
      detailedBreakdown: { fitScore: 60, engagementScore: 60, conversionProbability: 60, relationshipStrength: 60, communicationEffectiveness: 60 },
      confidenceLevel: 75
    },
    strategicInsights: aiResult.strategicInsights || [],
    communicationStrategy: aiResult.communicationStrategy || {
      optimalApproach: 'Professional',
      recommendedChannels: ['email'],
      messagingThemes: ['Business value'],
      avoidanceTopics: [],
      toneSuggestions: 'Professional'
    },
    dealStrategy: aiResult.dealStrategy || {
      approachRecommendation: 'Value-focused',
      keyValueProps: [],
      expectedObjections: [],
      closingStrategy: 'Direct approach',
      timelineRecommendation: '30-60 days'
    },
    riskAssessment: aiResult.riskAssessment || {
      churnRisk: 30, competitorRisk: 40, delayRisk: 35,
      mitigationStrategies: []
    },
    personalization: aiResult.personalization || {
      communicationStyle: 'Professional',
      decisionMakingStyle: 'Analytical',
      motivators: [], concerns: []
    }
  };
}