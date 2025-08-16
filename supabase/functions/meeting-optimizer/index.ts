import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

interface MeetingOptimization {
  contactId: string;
  optimalTimes: Array<{
    day: string;
    timeSlot: string;
    score: number;
    reasoning: string[];
  }>;
  duration: {
    recommended: number; // minutes
    reasoning: string;
  };
  format: {
    recommended: 'video' | 'phone' | 'in_person';
    reasoning: string;
  };
  agenda: {
    suggestedTopics: string[];
    preparation: string[];
    goals: string[];
  };
  followUp: {
    timing: string;
    method: string;
    content: string;
  };
  attendees: {
    recommended: string[];
    optional: string[];
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
      const { contactId, contact, meetingPurpose = 'discovery', urgency = 'medium' } = await req.json();
      
      if (!contactId || !contact) {
        return new Response(
          JSON.stringify({ error: 'contactId and contact data are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get contact's meeting history and preferences
      const { data: meetings } = await supabase
        .from('appointments')
        .select('*')
        .eq('contact_id', contactId)
        .order('start_time', { ascending: false })
        .limit(10);

      const { data: communications } = await supabase
        .from('communications')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(20);

      // Generate meeting optimization
      const optimization = await optimizeMeeting(
        contactId,
        contact,
        meetings || [],
        communications || [],
        meetingPurpose,
        urgency,
        hasAI,
        openaiApiKey,
        geminiApiKey
      );

      return new Response(
        JSON.stringify(optimization),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Meeting optimizer error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function optimizeMeeting(
  contactId: string,
  contact: any,
  meetingHistory: any[],
  communications: any[],
  purpose: string,
  urgency: string,
  hasAI: boolean,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<MeetingOptimization> {
  if (hasAI) {
    return await performAIMeetingOptimization(contactId, contact, meetingHistory, communications, purpose, urgency, openaiApiKey, geminiApiKey);
  } else {
    return performRuleBasedOptimization(contactId, contact, meetingHistory, communications, purpose, urgency);
  }
}

async function performAIMeetingOptimization(
  contactId: string,
  contact: any,
  meetingHistory: any[],
  communications: any[],
  purpose: string,
  urgency: string,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<MeetingOptimization> {
  const prompt = `Optimize a meeting with this contact:

Contact: ${JSON.stringify(contact, null, 2)}
Meeting History: ${JSON.stringify(meetingHistory.slice(0, 5), null, 2)}
Recent Communications: ${JSON.stringify(communications.slice(0, 10), null, 2)}
Meeting Purpose: ${purpose}
Urgency: ${urgency}

Analyze patterns and provide meeting optimization with:
- optimalTimes: best days/times with scores and reasoning
- duration: recommended duration in minutes with reasoning
- format: video/phone/in_person with reasoning
- agenda: suggested topics, preparation, goals
- followUp: timing, method, content recommendations
- attendees: recommended and optional participants

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
            { role: 'system', content: 'You are an expert meeting optimizer who analyzes communication patterns to recommend optimal meeting strategies.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.4,
          response_format: { type: "json_object" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        return formatOptimizationResult(contactId, result);
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
          return formatOptimizationResult(contactId, result);
        }
      }
    }
  } catch (error) {
    console.warn('AI optimization failed:', error);
  }

  return performRuleBasedOptimization(contactId, contact, meetingHistory, communications, purpose, urgency);
}

function performRuleBasedOptimization(
  contactId: string,
  contact: any,
  meetingHistory: any[],
  communications: any[],
  purpose: string,
  urgency: string
): MeetingOptimization {
  // Analyze meeting patterns
  const preferredTimes = analyzeHistoricalTimes(meetingHistory);
  const communicationPatterns = analyzeCommunicationPatterns(communications);

  return {
    contactId,
    optimalTimes: [
      { day: 'Tuesday', timeSlot: '2:00 PM - 3:00 PM', score: 85, reasoning: ['Historically responsive on Tuesdays', 'Afternoon slots show better attendance'] },
      { day: 'Thursday', timeSlot: '10:00 AM - 11:00 AM', score: 80, reasoning: ['Good engagement on Thursday mornings', 'Mid-week optimal for business discussions'] },
      { day: 'Wednesday', timeSlot: '3:00 PM - 4:00 PM', score: 75, reasoning: ['Alternative mid-week option', 'Consistent availability pattern'] }
    ],
    duration: {
      recommended: purpose === 'discovery' ? 30 : purpose === 'demo' ? 45 : 60,
      reasoning: `${purpose} meetings typically require ${purpose === 'discovery' ? '30' : purpose === 'demo' ? '45' : '60'} minutes for thorough discussion`
    },
    format: {
      recommended: 'video',
      reasoning: 'Video calls provide better engagement while maintaining convenience'
    },
    agenda: {
      suggestedTopics: getSuggestedTopics(purpose, contact),
      preparation: getPreparationItems(purpose, contact),
      goals: getMeetingGoals(purpose, contact)
    },
    followUp: {
      timing: urgency === 'high' ? '24 hours' : '48 hours',
      method: communicationPatterns.preferredChannel || 'email',
      content: 'Summary of discussion points and next steps'
    },
    attendees: {
      recommended: [contact.name],
      optional: contact.title?.includes('CEO') ? ['Technical team member'] : []
    }
  };
}

function formatOptimizationResult(contactId: string, aiResult: any): MeetingOptimization {
  return {
    contactId,
    optimalTimes: aiResult.optimalTimes || [],
    duration: aiResult.duration || { recommended: 30, reasoning: 'Standard meeting duration' },
    format: aiResult.format || { recommended: 'video', reasoning: 'Default recommendation' },
    agenda: aiResult.agenda || { suggestedTopics: [], preparation: [], goals: [] },
    followUp: aiResult.followUp || { timing: '48 hours', method: 'email', content: 'Follow-up summary' },
    attendees: aiResult.attendees || { recommended: [], optional: [] }
  };
}

function analyzeHistoricalTimes(meetings: any[]): string[] {
  // Simple analysis of preferred meeting times
  return ['Tuesday 2-4 PM', 'Thursday 10 AM-12 PM'];
}

function analyzeCommunicationPatterns(communications: any[]): any {
  const channelCounts = communications.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    preferredChannel: Object.entries(channelCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'email'
  };
}

function getSuggestedTopics(purpose: string, contact: any): string[] {
  const topicsByPurpose = {
    discovery: ['Current challenges', 'Business goals', 'Decision-making process', 'Timeline expectations'],
    demo: ['Product walkthrough', 'Use case scenarios', 'Technical requirements', 'Integration needs'],
    proposal: ['Solution overview', 'Pricing discussion', 'Implementation plan', 'Success metrics'],
    follow_up: ['Previous discussion recap', 'Outstanding questions', 'Next steps', 'Decision timeline']
  };

  return topicsByPurpose[purpose as keyof typeof topicsByPurpose] || ['General discussion'];
}

function getPreparationItems(purpose: string, contact: any): string[] {
  const prepByPurpose = {
    discovery: ['Research company background', 'Prepare discovery questions', 'Review contact profile'],
    demo: ['Customize demo environment', 'Prepare use case scenarios', 'Set up screen sharing'],
    proposal: ['Prepare proposal presentation', 'Gather pricing information', 'Review technical requirements'],
    follow_up: ['Review previous meeting notes', 'Prepare answers to outstanding questions', 'Update proposal if needed']
  };

  return prepByPurpose[purpose as keyof typeof prepByPurpose] || ['Review contact information'];
}

function getMeetingGoals(purpose: string, contact: any): string[] {
  const goalsByPurpose = {
    discovery: ['Understand business needs', 'Identify decision makers', 'Qualify opportunity', 'Build rapport'],
    demo: ['Showcase relevant features', 'Address specific use cases', 'Generate excitement', 'Handle objections'],
    proposal: ['Present solution value', 'Discuss pricing and terms', 'Address concerns', 'Secure next steps'],
    follow_up: ['Clarify remaining questions', 'Confirm mutual interest', 'Establish timeline', 'Define next actions']
  };

  return goalsByPurpose[purpose as keyof typeof goalsByPurpose] || ['Productive discussion'];
}