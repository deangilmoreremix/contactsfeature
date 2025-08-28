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

    const { data, reasoningType, context } = await req.json()

    const reasoning = await performReasoning(data, reasoningType, context)

    return new Response(JSON.stringify(reasoning), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function performReasoning(data: any, reasoningType: string, context: any = {}) {
  const reasoning = {
    input: data,
    type: reasoningType,
    context: context,
    steps: [],
    conclusion: '',
    confidence: 0,
    alternatives: [],
    reasoningTime: 0,
    performedAt: new Date().toISOString()
  }

  const startTime = Date.now()

  switch (reasoningType) {
    case 'contact_priority':
      reasoning.steps = await reasonContactPriority(data, context)
      break
    case 'next_action':
      reasoning.steps = await reasonNextAction(data, context)
      break
    case 'engagement_strategy':
      reasoning.steps = await reasonEngagementStrategy(data, context)
      break
    case 'risk_assessment':
      reasoning.steps = await reasonRiskAssessment(data, context)
      break
    case 'opportunity_analysis':
      reasoning.steps = await reasonOpportunityAnalysis(data, context)
      break
    default:
      reasoning.steps = await generalReasoning(data, context)
  }

  reasoning.reasoningTime = Date.now() - startTime
  reasoning.conclusion = generateConclusion(reasoning.steps)
  reasoning.confidence = calculateConfidence(reasoning.steps)
  reasoning.alternatives = generateAlternatives(reasoning.steps)

  return reasoning
}

async function reasonContactPriority(contact: any, context: any) {
  const steps = []

  // Step 1: Analyze contact data
  steps.push({
    step: 1,
    action: 'analyze_contact_data',
    input: contact,
    reasoning: 'Evaluating contact attributes and engagement history',
    result: analyzeContactAttributes(contact)
  })

  // Step 2: Assess company information
  if (contact.company) {
    steps.push({
      step: 2,
      action: 'assess_company',
      input: contact.company,
      reasoning: 'Evaluating company size, industry, and growth potential',
      result: assessCompany(contact.company)
    })
  }

  // Step 3: Review engagement patterns
  steps.push({
    step: 3,
    action: 'review_engagement',
    input: contact.engagementHistory || [],
    reasoning: 'Analyzing past interactions and response patterns',
    result: reviewEngagement(contact.engagementHistory || [])
  })

  // Step 4: Consider context factors
  steps.push({
    step: 4,
    action: 'contextual_factors',
    input: context,
    reasoning: 'Factoring in business context and strategic priorities',
    result: evaluateContext(context)
  })

  // Step 5: Calculate priority score
  steps.push({
    step: 5,
    action: 'calculate_priority',
    input: steps.slice(0, 4).map(s => s.result),
    reasoning: 'Synthesizing all factors to determine contact priority',
    result: calculatePriority(steps.slice(0, 4).map(s => s.result))
  })

  return steps
}

async function reasonNextAction(contact: any, context: any) {
  const steps = []

  // Step 1: Assess current status
  steps.push({
    step: 1,
    action: 'assess_current_status',
    input: contact,
    reasoning: 'Understanding where the contact is in the customer journey',
    result: assessCurrentStatus(contact)
  })

  // Step 2: Evaluate timing
  steps.push({
    step: 2,
    action: 'evaluate_timing',
    input: contact.lastActivity,
    reasoning: 'Determining optimal timing for next interaction',
    result: evaluateTiming(contact.lastActivity)
  })

  // Step 3: Consider channel preferences
  steps.push({
    step: 3,
    action: 'channel_preferences',
    input: contact.preferredChannels,
    reasoning: 'Selecting appropriate communication channel',
    result: determineBestChannel(contact.preferredChannels)
  })

  // Step 4: Generate action options
  steps.push({
    step: 4,
    action: 'generate_options',
    input: steps.slice(0, 3).map(s => s.result),
    reasoning: 'Creating personalized action recommendations',
    result: generateActionOptions(steps.slice(0, 3).map(s => s.result))
  })

  return steps
}

async function reasonEngagementStrategy(contact: any, context: any) {
  const steps = []

  // Step 1: Profile analysis
  steps.push({
    step: 1,
    action: 'profile_analysis',
    input: contact,
    reasoning: 'Understanding contact preferences and behavior patterns',
    result: analyzeProfile(contact)
  })

  // Step 2: Content matching
  steps.push({
    step: 2,
    action: 'content_matching',
    input: contact.interests,
    reasoning: 'Matching content to contact interests and needs',
    result: matchContent(contact.interests)
  })

  // Step 3: Channel optimization
  steps.push({
    step: 3,
    action: 'channel_optimization',
    input: contact.engagementHistory,
    reasoning: 'Optimizing channel selection based on past performance',
    result: optimizeChannels(contact.engagementHistory)
  })

  // Step 4: Strategy formulation
  steps.push({
    step: 4,
    action: 'strategy_formulation',
    input: steps.slice(0, 3).map(s => s.result),
    reasoning: 'Creating comprehensive engagement strategy',
    result: formulateStrategy(steps.slice(0, 3).map(s => s.result))
  })

  return steps
}

async function reasonRiskAssessment(data: any, context: any) {
  const steps = []

  // Step 1: Identify risk factors
  steps.push({
    step: 1,
    action: 'identify_risks',
    input: data,
    reasoning: 'Identifying potential risk factors and warning signs',
    result: identifyRisks(data)
  })

  // Step 2: Assess impact
  steps.push({
    step: 2,
    action: 'assess_impact',
    input: steps[0].result,
    reasoning: 'Evaluating potential impact of identified risks',
    result: assessImpact(steps[0].result)
  })

  // Step 3: Determine probability
  steps.push({
    step: 3,
    action: 'probability_analysis',
    input: data,
    reasoning: 'Calculating likelihood of risk occurrence',
    result: calculateProbability(data)
  })

  // Step 4: Mitigation planning
  steps.push({
    step: 4,
    action: 'mitigation_planning',
    input: steps.slice(0, 3).map(s => s.result),
    reasoning: 'Developing risk mitigation strategies',
    result: planMitigation(steps.slice(0, 3).map(s => s.result))
  })

  return steps
}

async function reasonOpportunityAnalysis(data: any, context: any) {
  const steps = []

  // Step 1: Market analysis
  steps.push({
    step: 1,
    action: 'market_analysis',
    input: data,
    reasoning: 'Analyzing market conditions and trends',
    result: analyzeMarket(data)
  })

  // Step 2: Opportunity identification
  steps.push({
    step: 2,
    action: 'opportunity_id',
    input: data,
    reasoning: 'Identifying potential opportunities',
    result: identifyOpportunities(data)
  })

  // Step 3: Feasibility assessment
  steps.push({
    step: 3,
    action: 'feasibility_check',
    input: steps[1].result,
    reasoning: 'Assessing feasibility of identified opportunities',
    result: assessFeasibility(steps[1].result)
  })

  // Step 4: Prioritization
  steps.push({
    step: 4,
    action: 'prioritize_opportunities',
    input: steps.slice(0, 3).map(s => s.result),
    reasoning: 'Prioritizing opportunities based on potential impact',
    result: prioritizeOpportunities(steps.slice(0, 3).map(s => s.result))
  })

  return steps
}

async function generalReasoning(data: any, context: any) {
  const steps = []

  // Step 1: Data analysis
  steps.push({
    step: 1,
    action: 'data_analysis',
    input: data,
    reasoning: 'Analyzing provided data for patterns and insights',
    result: analyzeData(data)
  })

  // Step 2: Context consideration
  steps.push({
    step: 2,
    action: 'context_consideration',
    input: context,
    reasoning: 'Considering contextual factors and constraints',
    result: considerContext(context)
  })

  // Step 3: Pattern recognition
  steps.push({
    step: 3,
    action: 'pattern_recognition',
    input: steps.slice(0, 2).map(s => s.result),
    reasoning: 'Identifying patterns and relationships',
    result: recognizePatterns(steps.slice(0, 2).map(s => s.result))
  })

  // Step 4: Conclusion formation
  steps.push({
    step: 4,
    action: 'conclusion_formation',
    input: steps[2].result,
    reasoning: 'Forming reasoned conclusion based on analysis',
    result: formConclusion(steps[2].result)
  })

  return steps
}

// Helper functions
function analyzeContactAttributes(contact: any) {
  return {
    hasEmail: !!contact.email,
    hasPhone: !!contact.phone,
    hasCompany: !!contact.company,
    hasJobTitle: !!contact.jobTitle,
    engagementScore: contact.engagementScore || 0
  }
}

function assessCompany(company: any) {
  return {
    size: company.size || 'unknown',
    industry: company.industry || 'unknown',
    growth: company.growth || 'unknown'
  }
}

function reviewEngagement(history: any[]) {
  return {
    totalInteractions: history.length,
    lastInteraction: history[history.length - 1]?.date || null,
    averageResponseTime: calculateAverageResponseTime(history),
    preferredChannel: findPreferredChannel(history)
  }
}

function evaluateContext(context: any) {
  return {
    businessGoals: context.goals || [],
    timeConstraints: context.timeConstraints || null,
    resourceAvailability: context.resources || 'unknown'
  }
}

function calculatePriority(factors: any[]) {
  // Simple priority calculation
  let score = 0
  factors.forEach(factor => {
    if (factor.engagementScore) score += factor.engagementScore * 0.4
    if (factor.size === 'large') score += 30
    if (factor.lastInteraction) {
      const daysSince = (Date.now() - new Date(factor.lastInteraction).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < 30) score += 20
    }
  })
  return Math.min(100, score)
}

function assessCurrentStatus(contact: any) {
  return {
    stage: contact.stage || 'unknown',
    lastActivity: contact.lastActivity,
    nextMilestone: contact.nextMilestone
  }
}

function evaluateTiming(lastActivity: string) {
  if (!lastActivity) return { timing: 'immediate', reason: 'No previous activity' }

  const daysSince = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince < 7) return { timing: 'delayed', reason: 'Recent activity' }
  if (daysSince < 30) return { timing: 'soon', reason: 'Moderate time since last activity' }
  return { timing: 'immediate', reason: 'Long time since last activity' }
}

function determineBestChannel(preferredChannels: any) {
  return preferredChannels?.[0] || 'email'
}

function generateActionOptions(factors: any[]) {
  const options = []
  if (factors[0]?.stage === 'new') options.push('Send welcome email')
  if (factors[1]?.timing === 'immediate') options.push('Schedule call')
  options.push('Send personalized content')
  return options
}

function analyzeProfile(contact: any) {
  return {
    interests: contact.interests || [],
    behavior: contact.behavior || 'unknown',
    preferences: contact.preferences || {}
  }
}

function matchContent(interests: any[]) {
  return {
    matchedTopics: interests || [],
    contentType: 'educational',
    relevance: interests?.length > 0 ? 'high' : 'low'
  }
}

function optimizeChannels(history: any[]) {
  const channelPerformance = {}
  history.forEach(item => {
    if (!channelPerformance[item.channel]) {
      channelPerformance[item.channel] = { total: 0, successful: 0 }
    }
    channelPerformance[item.channel].total++
    if (item.success) channelPerformance[item.channel].successful++
  })
  return channelPerformance
}

function formulateStrategy(analyses: any[]) {
  return {
    primaryChannel: 'email',
    contentStrategy: 'educational',
    frequency: 'weekly',
    personalization: 'high'
  }
}

function identifyRisks(data: any) {
  const risks = []
  if (!data.email) risks.push('No email address')
  if (!data.phone) risks.push('No phone number')
  if (data.engagementScore < 30) risks.push('Low engagement')
  return risks
}

function assessImpact(risks: any[]) {
  return risks.map(risk => ({
    risk,
    impact: risk.includes('No email') ? 'high' : 'medium'
  }))
}

function calculateProbability(data: any) {
  let probability = 50
  if (data.engagementScore > 70) probability -= 20
  if (data.lastActivity) {
    const daysSince = (Date.now() - new Date(data.lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince > 90) probability += 30
  }
  return Math.min(100, probability)
}

function planMitigation(analyses: any[]) {
  return analyses.flatMap(analysis =>
    analysis.map((risk: any) => `Mitigation for: ${risk.risk}`)
  )
}

function analyzeMarket(data: any) {
  return {
    trends: ['AI adoption', 'Remote work'],
    opportunities: ['New markets', 'Product expansion']
  }
}

function identifyOpportunities(data: any) {
  return ['Partnership potential', 'Upsell opportunity', 'Referral potential']
}

function assessFeasibility(opportunities: any[]) {
  return opportunities.map(opp => ({
    opportunity: opp,
    feasibility: 'high'
  }))
}

function prioritizeOpportunities(analyses: any[]) {
  return analyses.flatMap(analysis =>
    analysis.map((item: any, index: number) => ({
      ...item,
      priority: index + 1
    }))
  )
}

function analyzeData(data: any) {
  return {
    patterns: ['Consistent growth', 'Seasonal trends'],
    insights: ['Strong performance', 'Room for improvement']
  }
}

function considerContext(context: any) {
  return {
    constraints: context.constraints || [],
    opportunities: context.opportunities || []
  }
}

function recognizePatterns(analyses: any[]) {
  return {
    identified: ['Pattern A', 'Pattern B'],
    confidence: 85
  }
}

function formConclusion(patterns: any) {
  return `Based on analysis, the recommended course of action is to ${patterns.identified[0] || 'proceed cautiously'}`
}

function generateConclusion(steps: any[]) {
  const lastStep = steps[steps.length - 1]
  return lastStep?.result?.conclusion || 'Analysis complete'
}

function calculateConfidence(steps: any[]) {
  // Calculate confidence based on step results
  let confidence = 50
  steps.forEach(step => {
    if (step.result?.confidence) {
      confidence = (confidence + step.result.confidence) / 2
    }
  })
  return Math.round(confidence)
}

function generateAlternatives(steps: any[]) {
  return [
    'Alternative approach 1',
    'Alternative approach 2',
    'Alternative approach 3'
  ]
}

function calculateAverageResponseTime(history: any[]) {
  if (history.length === 0) return 0
  const responseTimes = history
    .filter(item => item.responseTime)
    .map(item => item.responseTime)
  return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
}

function findPreferredChannel(history: any[]) {
  const channelCount = {}
  history.forEach(item => {
    channelCount[item.channel] = (channelCount[item.channel] || 0) + 1
  })
  return Object.keys(channelCount).reduce((a, b) =>
    channelCount[a] > channelCount[b] ? a : b
  )
}