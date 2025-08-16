import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

interface TimelineEvent {
  id: string;
  type: 'first_contact' | 'meeting' | 'proposal' | 'demo' | 'contract' | 'milestone' | 'communication' | 'deal_stage';
  title: string;
  description: string;
  date: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  outcome?: 'positive' | 'neutral' | 'negative';
  value?: number;
  participants?: string[];
  attachments?: string[];
  nextActions?: string[];
}

interface ContactTimeline {
  contactId: string;
  events: TimelineEvent[];
  milestones: Array<{
    date: string;
    milestone: string;
    significance: string;
    impact: number;
  }>;
  patterns: {
    communicationFrequency: number; // per week
    responseRate: number; // percentage
    engagementTrend: 'increasing' | 'stable' | 'decreasing';
    preferredInteractionTypes: string[];
  };
  predictions: {
    nextLikelyAction: string;
    timeline: string;
    confidence: number;
  };
  relationshipHealth: {
    score: number;
    trend: 'improving' | 'stable' | 'declining';
    keyFactors: string[];
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
      const { contactId, timeframe = '1y', includeEvents = true } = await req.json();
      
      if (!contactId) {
        return new Response(
          JSON.stringify({ error: 'contactId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch contact data
      const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      // Fetch all related data for timeline generation
      const [
        { data: communications },
        { data: deals },
        { data: appointments },
        { data: activities }
      ] = await Promise.all([
        supabase.from('communications').select('*').eq('contact_id', contactId).order('created_at', { ascending: true }),
        supabase.from('deals').select('*').eq('contact_id', contactId).order('created_at', { ascending: true }),
        supabase.from('appointments').select('*').eq('contact_id', contactId).order('start_time', { ascending: true }),
        supabase.from('sales_activities').select('*').eq('contact_id', contactId).order('created_at', { ascending: true })
      ]);

      // Generate timeline
      const timeline = await generateTimeline(
        contactId,
        contact,
        communications || [],
        deals || [],
        appointments || [],
        activities || [],
        timeframe,
        includeEvents,
        hasAI,
        openaiApiKey,
        geminiApiKey
      );

      return new Response(
        JSON.stringify(timeline),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Timeline generator error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateTimeline(
  contactId: string,
  contact: any,
  communications: any[],
  deals: any[],
  appointments: any[],
  activities: any[],
  timeframe: string,
  includeEvents: boolean,
  hasAI: boolean,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<ContactTimeline> {
  // Combine all events into chronological timeline
  const allEvents: TimelineEvent[] = [];

  // Add contact creation as first event
  allEvents.push({
    id: 'contact_created',
    type: 'first_contact',
    title: 'Contact Added',
    description: `${contact.name} was added to the CRM`,
    date: contact.created_at,
    importance: 'medium',
    outcome: 'positive'
  });

  // Add communications
  communications.forEach(comm => {
    allEvents.push({
      id: comm.id,
      type: 'communication',
      title: `${comm.type.charAt(0).toUpperCase() + comm.type.slice(1)} ${comm.direction}`,
      description: comm.subject || comm.content?.substring(0, 100) || 'Communication logged',
      date: comm.created_at,
      importance: comm.type === 'meeting' ? 'high' : 'medium',
      outcome: determineOutcome(comm)
    });
  });

  // Add deals
  deals.forEach(deal => {
    allEvents.push({
      id: deal.id,
      type: 'deal_stage',
      title: `Deal: ${deal.title}`,
      description: `Deal value: $${deal.value?.toLocaleString()} - Stage: ${deal.stage_id}`,
      date: deal.created_at,
      importance: 'critical',
      value: deal.value,
      outcome: deal.status === 'won' ? 'positive' : deal.status === 'lost' ? 'negative' : 'neutral'
    });
  });

  // Add appointments
  appointments.forEach(apt => {
    allEvents.push({
      id: apt.id,
      type: 'meeting',
      title: apt.title,
      description: apt.description || 'Meeting scheduled',
      date: apt.start_time,
      importance: 'high',
      outcome: apt.status === 'completed' ? 'positive' : 'neutral',
      participants: apt.attendees ? JSON.parse(apt.attendees) : []
    });
  });

  // Sort events chronologically
  allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Generate milestones
  const milestones = identifyMilestones(allEvents);

  // Analyze patterns
  const patterns = analyzeInteractionPatterns(communications, activities);

  // Generate predictions
  const predictions = hasAI 
    ? await generateAIPredictions(contact, allEvents, openaiApiKey, geminiApiKey)
    : generateRuleBasedPredictions(contact, allEvents);

  // Calculate relationship health
  const relationshipHealth = calculateRelationshipHealth(allEvents, communications, deals);

  return {
    contactId,
    events: includeEvents ? allEvents : [],
    milestones,
    patterns,
    predictions,
    relationshipHealth
  };
}

function determineOutcome(communication: any): 'positive' | 'neutral' | 'negative' {
  if (communication.direction === 'inbound') return 'positive';
  if (communication.status === 'delivered' || communication.status === 'read') return 'neutral';
  if (communication.status === 'failed') return 'negative';
  return 'neutral';
}

function identifyMilestones(events: TimelineEvent[]): ContactTimeline['milestones'] {
  const milestones = [];

  // First contact milestone
  const firstEvent = events[0];
  if (firstEvent) {
    milestones.push({
      date: firstEvent.date,
      milestone: 'First Contact',
      significance: 'Initial relationship established',
      impact: 20
    });
  }

  // First meeting milestone
  const firstMeeting = events.find(e => e.type === 'meeting');
  if (firstMeeting) {
    milestones.push({
      date: firstMeeting.date,
      milestone: 'First Meeting',
      significance: 'Direct engagement achieved',
      impact: 40
    });
  }

  // Deal creation milestone
  const firstDeal = events.find(e => e.type === 'deal_stage');
  if (firstDeal) {
    milestones.push({
      date: firstDeal.date,
      milestone: 'Opportunity Created',
      significance: 'Sales opportunity identified',
      impact: 60
    });
  }

  // Major communication milestones
  const communications = events.filter(e => e.type === 'communication');
  if (communications.length >= 10) {
    milestones.push({
      date: communications[9].date,
      milestone: '10th Interaction',
      significance: 'Strong engagement established',
      impact: 50
    });
  }

  return milestones;
}

function analyzeInteractionPatterns(communications: any[], activities: any[]): ContactTimeline['patterns'] {
  const totalInteractions = communications.length + activities.length;
  const timeSpan = getTimeSpanInWeeks(communications);
  
  return {
    communicationFrequency: timeSpan > 0 ? totalInteractions / timeSpan : 0,
    responseRate: calculateResponseRate(communications),
    engagementTrend: 'stable', // Simplified
    preferredInteractionTypes: getPreferredTypes(communications)
  };
}

async function generateAIPredictions(
  contact: any,
  events: TimelineEvent[],
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<ContactTimeline['predictions']> {
  const prompt = `Analyze this contact timeline and predict next actions:

Contact: ${JSON.stringify(contact, null, 2)}
Recent Events: ${JSON.stringify(events.slice(-10), null, 2)}

Predict:
- nextLikelyAction: what will likely happen next
- timeline: when it will happen
- confidence: 0-100 confidence level

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
            { role: 'system', content: 'You are a predictive analytics expert for sales relationship management.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.4,
          response_format: { type: "json_object" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        return JSON.parse(data.choices[0].message.content);
      }
    }
  } catch (error) {
    console.warn('AI prediction failed:', error);
  }

  return generateRuleBasedPredictions(contact, events);
}

function generateRuleBasedPredictions(contact: any, events: TimelineEvent[]): ContactTimeline['predictions'] {
  const lastEvent = events[events.length - 1];
  
  return {
    nextLikelyAction: 'Follow-up communication',
    timeline: '3-7 days',
    confidence: 65
  };
}

function calculateRelationshipHealth(
  events: TimelineEvent[],
  communications: any[],
  deals: any[]
): ContactTimeline['relationshipHealth'] {
  let score = 50; // Base health score

  // Recent activity boost
  const recentEvents = events.filter(e => {
    const eventDate = new Date(e.date);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return eventDate >= thirtyDaysAgo;
  });

  if (recentEvents.length > 5) score += 20;
  else if (recentEvents.length > 2) score += 10;
  else if (recentEvents.length === 0) score -= 30;

  // Deal presence
  if (deals.some(d => d.status === 'open')) score += 25;
  if (deals.some(d => d.status === 'won')) score += 15;

  // Communication consistency
  const commFrequency = communications.length / Math.max(getTimeSpanInWeeks(communications), 1);
  if (commFrequency > 2) score += 15;
  else if (commFrequency < 0.5) score -= 15;

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    trend: score > 60 ? 'improving' : score < 40 ? 'declining' : 'stable',
    keyFactors: [
      recentEvents.length > 0 ? 'Recent activity present' : 'No recent activity',
      deals.length > 0 ? 'Active deals in pipeline' : 'No active deals',
      `Communication frequency: ${commFrequency.toFixed(1)}/week`
    ]
  };
}

function getTimeSpanInWeeks(communications: any[]): number {
  if (communications.length < 2) return 1;
  
  const first = new Date(communications[0].created_at);
  const last = new Date(communications[communications.length - 1].created_at);
  const diffWeeks = (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24 * 7);
  
  return Math.max(1, diffWeeks);
}

function calculateResponseRate(communications: any[]): number {
  const outbound = communications.filter(c => c.direction === 'outbound').length;
  const inbound = communications.filter(c => c.direction === 'inbound').length;
  
  return outbound > 0 ? (inbound / outbound) * 100 : 0;
}

function getPreferredTypes(communications: any[]): string[] {
  const typeCounts = communications.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(typeCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([type]) => type);
}