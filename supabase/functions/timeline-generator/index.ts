import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { entityId, entityType, options } = await req.json()

    const timeline = await generateTimeline(entityId, entityType, options)

    return new Response(JSON.stringify(timeline), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function generateTimeline(entityId: string, entityType: string, options: any = {}) {
  const timeline = {
    entityId,
    entityType,
    events: [],
    milestones: [],
    phases: [],
    predictions: [],
    summary: {},
    generatedAt: new Date().toISOString()
  }

  switch (entityType) {
    case 'contact':
      timeline.events = await generateContactTimeline(entityId, options)
      break
    case 'deal':
      timeline.events = await generateDealTimeline(entityId, options)
      break
    case 'company':
      timeline.events = await generateCompanyTimeline(entityId, options)
      break
    case 'campaign':
      timeline.events = await generateCampaignTimeline(entityId, options)
      break
    default:
      timeline.events = await generateGenericTimeline(entityId, options)
  }

  // Identify milestones
  timeline.milestones = identifyMilestones(timeline.events)

  // Determine phases
  timeline.phases = determinePhases(timeline.events)

  // Generate predictions
  timeline.predictions = await generateTimelinePredictions(timeline.events, entityType)

  // Create summary
  timeline.summary = generateTimelineSummary(timeline)

  return timeline
}

async function generateContactTimeline(contactId: string, options: any) {
  const events = []

  // In a real implementation, these would come from database queries
  // For now, generating sample events based on contact lifecycle

  // First contact
  events.push({
    id: 'first_contact',
    type: 'contact',
    title: 'First Contact Made',
    description: 'Initial contact established through inbound inquiry',
    date: '2024-01-15T10:30:00Z',
    category: 'engagement',
    importance: 'high',
    metadata: {
      channel: 'website',
      source: 'organic_search'
    }
  })

  // Email engagement
  events.push({
    id: 'email_opened',
    type: 'engagement',
    title: 'Welcome Email Opened',
    description: 'Contact opened the welcome email campaign',
    date: '2024-01-16T14:22:00Z',
    category: 'engagement',
    importance: 'medium',
    metadata: {
      campaign: 'welcome_series',
      opened: true,
      clicked: false
    }
  })

  // Meeting booked
  events.push({
    id: 'meeting_booked',
    type: 'meeting',
    title: 'Discovery Call Scheduled',
    description: '30-minute discovery call booked for next week',
    date: '2024-01-20T15:00:00Z',
    category: 'meeting',
    importance: 'high',
    metadata: {
      duration: 30,
      agenda: ['Company overview', 'Pain points discussion', 'Solution exploration']
    }
  })

  // Meeting completed
  events.push({
    id: 'meeting_completed',
    type: 'meeting',
    title: 'Discovery Call Completed',
    description: 'Productive discussion about automation needs and current challenges',
    date: '2024-01-22T15:00:00Z',
    category: 'meeting',
    importance: 'high',
    metadata: {
      duration: 35,
      outcome: 'positive',
      nextSteps: ['Send proposal', 'Schedule follow-up']
    }
  })

  // Proposal sent
  events.push({
    id: 'proposal_sent',
    type: 'proposal',
    title: 'Custom Proposal Delivered',
    description: 'Tailored automation solution proposal sent with pricing',
    date: '2024-01-25T11:15:00Z',
    category: 'sales',
    importance: 'high',
    metadata: {
      value: 15000,
      validUntil: '2024-02-25',
      includes: ['Implementation', 'Training', 'Support']
    }
  })

  // Follow-up
  events.push({
    id: 'follow_up',
    type: 'followup',
    title: 'Proposal Follow-up',
    description: 'Called to discuss proposal and answer questions',
    date: '2024-02-01T10:45:00Z',
    category: 'followup',
    importance: 'medium',
    metadata: {
      channel: 'phone',
      duration: 15,
      outcome: 'needs_more_time'
    }
  })

  // Deal closed
  events.push({
    id: 'deal_closed',
    type: 'milestone',
    title: 'Deal Closed - Won',
    description: 'Contact signed the proposal and deal is now closed',
    date: '2024-02-15T16:30:00Z',
    category: 'milestone',
    importance: 'critical',
    metadata: {
      value: 15000,
      closeDate: '2024-02-15',
      paymentTerms: 'net_30'
    }
  })

  // Onboarding started
  events.push({
    id: 'onboarding_started',
    type: 'onboarding',
    title: 'Implementation Planning Begun',
    description: 'Kickoff meeting scheduled and implementation timeline created',
    date: '2024-02-20T13:00:00Z',
    category: 'implementation',
    importance: 'high',
    metadata: {
      kickoffDate: '2024-02-25',
      projectManager: 'Sarah Johnson',
      timeline: '6 weeks'
    }
  })

  // Sort events by date
  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

async function generateDealTimeline(dealId: string, options: any) {
  const events = []

  // Deal creation
  events.push({
    id: 'deal_created',
    type: 'creation',
    title: 'Deal Created',
    description: 'New deal opportunity identified and entered into pipeline',
    date: '2024-01-10T09:00:00Z',
    category: 'creation',
    importance: 'high',
    metadata: {
      source: 'inbound_inquiry',
      initialValue: 25000
    }
  })

  // Qualification
  events.push({
    id: 'qualification_started',
    type: 'qualification',
    title: 'Qualification Process Started',
    description: 'BANT qualification criteria being evaluated',
    date: '2024-01-12T11:30:00Z',
    category: 'qualification',
    importance: 'high',
    metadata: {
      bant: {
        budget: 'confirmed',
        authority: 'pending',
        need: 'confirmed',
        timeline: '3_months'
      }
    }
  })

  // Demo scheduled
  events.push({
    id: 'demo_scheduled',
    type: 'demo',
    title: 'Product Demo Scheduled',
    description: '45-minute product demonstration scheduled with key stakeholders',
    date: '2024-01-18T14:00:00Z',
    category: 'demo',
    importance: 'high',
    metadata: {
      attendees: ['CEO', 'CTO', 'VP Sales'],
      duration: 45,
      focus: 'automation_workflows'
    }
  })

  // Demo completed
  events.push({
    id: 'demo_completed',
    type: 'demo',
    title: 'Product Demo Completed',
    description: 'Demo went well, strong interest shown in automation features',
    date: '2024-01-18T14:45:00Z',
    category: 'demo',
    importance: 'high',
    metadata: {
      outcome: 'positive',
      feedback: 'Impressed with ease of use',
      objections: ['Integration timeline']
    }
  })

  // Proposal requested
  events.push({
    id: 'proposal_requested',
    type: 'proposal',
    title: 'Custom Proposal Requested',
    description: 'Client requested customized proposal with specific requirements',
    date: '2024-01-22T10:15:00Z',
    category: 'proposal',
    importance: 'high',
    metadata: {
      requirements: ['Custom integrations', 'Training', '24/7 support'],
      deadline: '2024-01-30'
    }
  })

  // Negotiation started
  events.push({
    id: 'negotiation_started',
    type: 'negotiation',
    title: 'Price Negotiation Begun',
    description: 'Client negotiating on pricing and contract terms',
    date: '2024-02-05T16:00:00Z',
    category: 'negotiation',
    importance: 'high',
    metadata: {
      initialOffer: 25000,
      clientCounter: 22000,
      stickingPoints: ['Annual contract', 'Custom development']
    }
  })

  // Contract signed
  events.push({
    id: 'contract_signed',
    type: 'milestone',
    title: 'Contract Signed',
    description: 'Deal successfully closed with agreed terms',
    date: '2024-02-12T12:00:00Z',
    category: 'milestone',
    importance: 'critical',
    metadata: {
      finalValue: 23500,
      contractLength: '12_months',
      paymentTerms: 'monthly'
    }
  })

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

async function generateCompanyTimeline(companyId: string, options: any) {
  const events = []

  // Company founded
  events.push({
    id: 'company_founded',
    type: 'milestone',
    title: 'Company Founded',
    description: 'Company established and began operations',
    date: '2018-03-15T00:00:00Z',
    category: 'foundation',
    importance: 'critical',
    metadata: {
      founders: ['John Smith', 'Jane Doe'],
      industry: 'SaaS',
      initialFocus: 'Business automation'
    }
  })

  // Funding rounds
  events.push({
    id: 'seed_funding',
    type: 'funding',
    title: 'Seed Funding Round',
    description: 'Raised $2M in seed funding from angel investors',
    date: '2019-01-20T00:00:00Z',
    category: 'funding',
    importance: 'high',
    metadata: {
      amount: 2000000,
      investors: ['Angel Investor Group'],
      valuation: 8000000
    }
  })

  // Product launches
  events.push({
    id: 'product_launch_v1',
    type: 'product',
    title: 'Version 1.0 Launch',
    description: 'First major product release with core automation features',
    date: '2019-06-01T00:00:00Z',
    category: 'product',
    importance: 'high',
    metadata: {
      version: '1.0',
      features: ['Workflow automation', 'API integrations'],
      users: 500
    }
  })

  // Growth milestones
  events.push({
    id: 'user_milestone_1000',
    type: 'growth',
    title: 'Reached 1,000 Users',
    description: 'Customer base reached 1,000 active users',
    date: '2019-12-15T00:00:00Z',
    category: 'growth',
    importance: 'high',
    metadata: {
      userCount: 1000,
      growthRate: '25%_monthly',
      churnRate: '5%'
    }
  })

  // Series A funding
  events.push({
    id: 'series_a_funding',
    type: 'funding',
    title: 'Series A Funding',
    description: 'Raised $15M in Series A funding led by top-tier VC',
    date: '2020-08-10T00:00:00Z',
    category: 'funding',
    importance: 'critical',
    metadata: {
      amount: 15000000,
      leadInvestor: 'Sequoia Capital',
      valuation: 60000000,
      useOfFunds: ['Product development', 'Market expansion', 'Team growth']
    }
  })

  // Major hires
  events.push({
    id: 'key_hire_cto',
    type: 'team',
    title: 'CTO Appointment',
    description: 'Hired experienced CTO to lead technical vision',
    date: '2020-09-01T00:00:00Z',
    category: 'team',
    importance: 'high',
    metadata: {
      position: 'CTO',
      name: 'Michael Chen',
      background: 'Former head of engineering at major SaaS company'
    }
  })

  // Expansion
  events.push({
    id: 'office_expansion',
    type: 'expansion',
    title: 'New Office Opening',
    description: 'Opened new office in San Francisco to support team growth',
    date: '2021-03-01T00:00:00Z',
    category: 'expansion',
    importance: 'medium',
    metadata: {
      location: 'San Francisco, CA',
      size: '10,000_sq_ft',
      headcount: 75
    }
  })

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

async function generateCampaignTimeline(campaignId: string, options: any) {
  const events = []

  // Campaign planning
  events.push({
    id: 'campaign_planning',
    type: 'planning',
    title: 'Campaign Planning Started',
    description: 'Team began planning the Q1 product launch campaign',
    date: '2024-01-05T09:00:00Z',
    category: 'planning',
    importance: 'high',
    metadata: {
      campaignType: 'product_launch',
      targetAudience: 'existing_customers',
      channels: ['email', 'social', 'website']
    }
  })

  // Content creation
  events.push({
    id: 'content_creation',
    type: 'content',
    title: 'Campaign Content Created',
    description: 'Email templates, social posts, and landing pages completed',
    date: '2024-01-12T17:00:00Z',
    category: 'content',
    importance: 'high',
    metadata: {
      assets: ['5_email_templates', '10_social_posts', '3_landing_pages'],
      creativeDirection: 'Modern and professional'
    }
  })

  // Testing phase
  events.push({
    id: 'testing_phase',
    type: 'testing',
    title: 'Campaign Testing Completed',
    description: 'A/B testing, link checking, and deliverability testing finished',
    date: '2024-01-18T14:30:00Z',
    category: 'testing',
    importance: 'medium',
    metadata: {
      tests: ['A/B_subject_lines', 'link_validation', 'spam_testing'],
      results: 'All tests passed successfully'
    }
  })

  // Launch
  events.push({
    id: 'campaign_launch',
    type: 'launch',
    title: 'Campaign Launched',
    description: 'Q1 product launch campaign went live across all channels',
    date: '2024-01-22T08:00:00Z',
    category: 'launch',
    importance: 'critical',
    metadata: {
      reach: 50000,
      channels: ['Email: 25K', 'Social: 15K', 'Website: 10K'],
      budget: 15000
    }
  })

  // Performance monitoring
  events.push({
    id: 'performance_monitoring',
    type: 'monitoring',
    title: 'Performance Monitoring Active',
    description: 'Real-time tracking of campaign metrics and engagement',
    date: '2024-01-22T08:15:00Z',
    category: 'monitoring',
    importance: 'high',
    metadata: {
      metrics: ['open_rate', 'click_rate', 'conversion_rate'],
      alerts: 'Set up for anomalies'
    }
  })

  // Optimization
  events.push({
    id: 'campaign_optimization',
    type: 'optimization',
    title: 'Campaign Optimization Applied',
    description: 'Made adjustments based on initial performance data',
    date: '2024-01-25T11:00:00Z',
    category: 'optimization',
    importance: 'medium',
    metadata: {
      changes: ['Updated subject line', 'Modified send time'],
      impact: '+15%_open_rate'
    }
  })

  // Completion
  events.push({
    id: 'campaign_completion',
    type: 'completion',
    title: 'Campaign Completed',
    description: 'Campaign reached all targets and concluded successfully',
    date: '2024-02-05T18:00:00Z',
    category: 'completion',
    importance: 'high',
    metadata: {
      results: {
        opens: 12500,
        clicks: 1875,
        conversions: 125,
        roi: 320
      }
    }
  })

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

async function generateGenericTimeline(entityId: string, options: any) {
  const events = []

  // Generate sample events for demonstration
  const eventTypes = ['creation', 'update', 'milestone', 'interaction', 'completion']

  for (let i = 0; i < 8; i++) {
    const eventDate = new Date()
    eventDate.setDate(eventDate.getDate() - (7 - i))

    events.push({
      id: `event_${i + 1}`,
      type: eventTypes[i % eventTypes.length],
      title: `Timeline Event ${i + 1}`,
      description: `This is a sample timeline event for demonstration purposes`,
      date: eventDate.toISOString(),
      category: 'general',
      importance: i % 2 === 0 ? 'high' : 'medium',
      metadata: {
        sequence: i + 1,
        generated: true
      }
    })
  }

  return events
}

function identifyMilestones(events: any[]) {
  const milestones = []

  // Identify high-importance events as milestones
  events.forEach(event => {
    if (event.importance === 'critical' || event.type === 'milestone') {
      milestones.push({
        ...event,
        milestoneType: 'critical'
      })
    } else if (event.importance === 'high' && ['meeting', 'demo', 'proposal', 'funding', 'launch'].includes(event.category)) {
      milestones.push({
        ...event,
        milestoneType: 'major'
      })
    }
  })

  return milestones
}

function determinePhases(events: any[]) {
  const phases = []

  if (events.length === 0) return phases

  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Define phases based on event types and timing
  let currentPhase = {
    name: 'Initial',
    startDate: sortedEvents[0].date,
    endDate: null,
    events: [],
    characteristics: []
  }

  sortedEvents.forEach((event, index) => {
    currentPhase.events.push(event)

    // Check if we should start a new phase
    if (index < sortedEvents.length - 1) {
      const nextEvent = sortedEvents[index + 1]
      const daysBetween = (new Date(nextEvent.date).getTime() - new Date(event.date).getTime()) / (1000 * 60 * 60 * 24)

      if (daysBetween > 30 || event.type === 'milestone') {
        currentPhase.endDate = event.date
        phases.push(currentPhase)

        currentPhase = {
          name: getPhaseName(event, nextEvent),
          startDate: nextEvent.date,
          endDate: null,
          events: [],
          characteristics: []
        }
      }
    }
  })

  // Close the final phase
  currentPhase.endDate = sortedEvents[sortedEvents.length - 1].date
  phases.push(currentPhase)

  return phases
}

async function generateTimelinePredictions(events: any[], entityType: string) {
  const predictions = []

  if (events.length === 0) return predictions

  const lastEvent = events[events.length - 1]
  const lastDate = new Date(lastEvent.date)

  // Predict next interaction based on patterns
  const avgInterval = calculateAverageInterval(events)
  const nextInteractionDate = new Date(lastDate.getTime() + avgInterval)

  predictions.push({
    type: 'next_interaction',
    description: 'Predicted next interaction based on historical patterns',
    predictedDate: nextInteractionDate.toISOString(),
    confidence: 0.75,
    factors: ['Historical interaction frequency', 'Recent engagement patterns']
  })

  // Predict milestone achievement
  if (entityType === 'deal') {
    const dealProgress = calculateDealProgress(events)
    const estimatedCloseDate = predictDealClose(events)

    predictions.push({
      type: 'deal_closure',
      description: 'Estimated deal closure date',
      predictedDate: estimatedCloseDate.toISOString(),
      confidence: 0.65,
      factors: ['Deal stage', 'Engagement level', 'Historical conversion rates']
    })
  }

  // Predict engagement level
  const engagementTrend = analyzeEngagementTrend(events)
  predictions.push({
    type: 'engagement_forecast',
    description: `Engagement level predicted to be ${engagementTrend.direction}`,
    predictedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    confidence: 0.70,
    factors: ['Recent interaction patterns', 'Communication frequency']
  })

  return predictions
}

function generateTimelineSummary(timeline: any) {
  const summary = {
    totalEvents: timeline.events.length,
    dateRange: {},
    mostActivePeriod: '',
    keyMetrics: {},
    overallTrend: '',
    insights: []
  }

  if (timeline.events.length === 0) return summary

  // Calculate date range
  const dates = timeline.events.map(e => new Date(e.date))
  summary.dateRange = {
    start: new Date(Math.min(...dates.map(d => d.getTime()))).toISOString(),
    end: new Date(Math.max(...dates.map(d => d.getTime()))).toISOString()
  }

  // Find most active period
  const activityByMonth = {}
  dates.forEach(date => {
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    activityByMonth[monthKey] = (activityByMonth[monthKey] || 0) + 1
  })

  const mostActiveMonth = Object.entries(activityByMonth)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0]

  summary.mostActivePeriod = mostActiveMonth ? mostActiveMonth[0] : 'N/A'

  // Calculate key metrics
  summary.keyMetrics = {
    averageEventsPerMonth: timeline.events.length / Math.max(1, Object.keys(activityByMonth).length),
    milestoneCount: timeline.milestones.length,
    phaseCount: timeline.phases.length
  }

  // Determine overall trend
  const recentEvents = timeline.events.slice(-5)
  const olderEvents = timeline.events.slice(-10, -5)

  if (recentEvents.length > 0 && olderEvents.length > 0) {
    const recentAvgInterval = calculateAverageInterval(recentEvents)
    const olderAvgInterval = calculateAverageInterval(olderEvents)

    if (recentAvgInterval < olderAvgInterval) {
      summary.overallTrend = 'accelerating'
    } else if (recentAvgInterval > olderAvgInterval) {
      summary.overallTrend = 'slowing'
    } else {
      summary.overallTrend = 'stable'
    }
  } else {
    summary.overallTrend = 'insufficient_data'
  }

  // Generate insights
  if (timeline.milestones.length > timeline.events.length * 0.3) {
    summary.insights.push('High proportion of milestone events indicates significant progress')
  }

  if (summary.overallTrend === 'accelerating') {
    summary.insights.push('Activity is accelerating, indicating growing engagement')
  }

  return summary
}

function getPhaseName(currentEvent: any, nextEvent: any) {
  const phaseMap = {
    'creation': 'Planning',
    'qualification': 'Discovery',
    'demo': 'Evaluation',
    'proposal': 'Negotiation',
    'negotiation': 'Closing',
    'milestone': 'Implementation',
    'funding': 'Growth',
    'product': 'Development',
    'launch': 'Execution'
  }

  return phaseMap[nextEvent.category] || phaseMap[nextEvent.type] || 'Active'
}

function calculateAverageInterval(events: any[]) {
  if (events.length < 2) return 30 * 24 * 60 * 60 * 1000 // 30 days default

  const intervals = []
  for (let i = 1; i < events.length; i++) {
    const interval = new Date(events[i].date).getTime() - new Date(events[i - 1].date).getTime()
    intervals.push(interval)
  }

  return intervals.reduce((a, b) => a + b, 0) / intervals.length
}

function calculateDealProgress(events: any[]) {
  // Simple progress calculation based on event types
  const progressIndicators = {
    'creation': 10,
    'qualification': 25,
    'demo': 50,
    'proposal': 75,
    'negotiation': 90,
    'milestone': 100
  }

  let maxProgress = 0
  events.forEach(event => {
    const progress = progressIndicators[event.type] || progressIndicators[event.category] || 0
    maxProgress = Math.max(maxProgress, progress)
  })

  return maxProgress
}

function predictDealClose(events: any[]) {
  const progress = calculateDealProgress(events)
  const baseDate = new Date(events[events.length - 1].date)

  // Estimate time to close based on current progress
  let daysToClose = 30 // Default
  if (progress < 25) daysToClose = 60
  else if (progress < 50) daysToClose = 45
  else if (progress < 75) daysToClose = 30
  else if (progress < 90) daysToClose = 15
  else daysToClose = 7

  return new Date(baseDate.getTime() + daysToClose * 24 * 60 * 60 * 1000)
}

function analyzeEngagementTrend(events: any[]) {
  if (events.length < 3) return { direction: 'stable' }

  const recent = events.slice(-3)
  const older = events.slice(-6, -3)

  const recentEngagement = recent.filter(e => e.category === 'engagement').length
  const olderEngagement = older.filter(e => e.category === 'engagement').length

  if (recentEngagement > olderEngagement) return { direction: 'increasing' }
  if (recentEngagement < olderEngagement) return { direction: 'decreasing' }
  return { direction: 'stable' }
}