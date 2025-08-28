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

    const { dealData, analysisType } = await req.json()

    const analysis = await analyzeDeal(dealData, analysisType)

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function analyzeDeal(dealData: any, analysisType: string) {
  const analysis = {
    dealData,
    metrics: {},
    risks: [],
    opportunities: [],
    recommendations: [],
    score: 0,
    probability: 0,
    timeline: {},
    analyzedAt: new Date().toISOString()
  }

  switch (analysisType) {
    case 'comprehensive':
      return await comprehensiveDealAnalysis(dealData)
    case 'risk':
      analysis.risks = await assessDealRisks(dealData)
      break
    case 'opportunity':
      analysis.opportunities = await identifyOpportunities(dealData)
      break
    case 'timeline':
      analysis.timeline = await analyzeTimeline(dealData)
      break
    default:
      analysis.metrics = await calculateDealMetrics(dealData)
  }

  return analysis
}

async function comprehensiveDealAnalysis(dealData: any) {
  const analysis = {
    dealData,
    metrics: await calculateDealMetrics(dealData),
    risks: await assessDealRisks(dealData),
    opportunities: await identifyOpportunities(dealData),
    recommendations: await generateRecommendations(dealData),
    score: 0,
    probability: 0,
    timeline: await analyzeTimeline(dealData),
    competitors: await analyzeCompetitiveLandscape(dealData),
    stakeholderAnalysis: await analyzeStakeholders(dealData),
    analyzedAt: new Date().toISOString()
  }

  // Calculate overall deal score
  analysis.score = Math.round(
    (analysis.metrics.dealScore || 0) * 0.4 +
    (analysis.probability || 0) * 0.3 +
    (analysis.timeline.confidence || 0) * 0.3
  )

  return analysis
}

async function calculateDealMetrics(dealData: any) {
  const metrics = {
    dealScore: 50,
    engagementScore: dealData.engagementScore || 0,
    valueScore: calculateValueScore(dealData),
    timelineScore: calculateTimelineScore(dealData),
    stakeholderScore: calculateStakeholderScore(dealData),
    competitivePosition: 'neutral'
  }

  // Calculate overall deal score
  metrics.dealScore = Math.round(
    (metrics.engagementScore * 0.3) +
    (metrics.valueScore * 0.25) +
    (metrics.timelineScore * 0.25) +
    (metrics.stakeholderScore * 0.2)
  )

  return metrics
}

async function assessDealRisks(dealData: any) {
  const risks = []

  // Timeline risks
  if (dealData.timeline && dealData.timeline > 90) {
    risks.push({
      type: 'timeline',
      severity: 'high',
      description: 'Long sales cycle increases risk of deal falling through',
      mitigation: 'Break down into smaller milestones with regular check-ins'
    })
  }

  // Budget risks
  if (dealData.budget && dealData.budget > dealData.companySize * 0.1) {
    risks.push({
      type: 'budget',
      severity: 'medium',
      description: 'Deal value is unusually high for company size',
      mitigation: 'Validate budget authority and approval process'
    })
  }

  // Competition risks
  if (dealData.competitors && dealData.competitors.length > 2) {
    risks.push({
      type: 'competition',
      severity: 'high',
      description: 'Multiple competitors actively engaged',
      mitigation: 'Differentiate value proposition and accelerate timeline'
    })
  }

  // Stakeholder risks
  if (dealData.stakeholders && dealData.stakeholders.length < 2) {
    risks.push({
      type: 'stakeholder',
      severity: 'medium',
      description: 'Limited stakeholder involvement',
      mitigation: 'Identify and engage additional decision-makers'
    })
  }

  // Product fit risks
  if (dealData.productFit && dealData.productFit < 70) {
    risks.push({
      type: 'product_fit',
      severity: 'high',
      description: 'Product may not fully meet customer needs',
      mitigation: 'Conduct product demo and gather specific requirements'
    })
  }

  return risks
}

async function identifyOpportunities(dealData: any) {
  const opportunities = []

  // Upsell opportunities
  if (dealData.currentSolution && dealData.currentSolution !== 'none') {
    opportunities.push({
      type: 'upsell',
      description: 'Customer already has a solution - opportunity to upgrade or migrate',
      value: dealData.value * 0.3,
      actions: ['Identify pain points with current solution', 'Demonstrate upgrade benefits']
    })
  }

  // Expansion opportunities
  if (dealData.companySize && dealData.companySize > 100) {
    opportunities.push({
      type: 'expansion',
      description: 'Large company with potential for multi-department rollout',
      value: dealData.value * 2,
      actions: ['Identify additional departments', 'Create enterprise proposal']
    })
  }

  // Referral opportunities
  if (dealData.networkingEvents && dealData.networkingEvents.length > 0) {
    opportunities.push({
      type: 'referral',
      description: 'Customer has network connections that could provide referrals',
      value: dealData.value * 0.5,
      actions: ['Ask for introductions', 'Offer referral incentives']
    })
  }

  // Partnership opportunities
  if (dealData.industry && ['technology', 'consulting', 'professional_services'].includes(dealData.industry)) {
    opportunities.push({
      type: 'partnership',
      description: 'Potential for strategic partnership or integration',
      value: 'strategic',
      actions: ['Explore partnership opportunities', 'Identify integration points']
    })
  }

  return opportunities
}

async function generateRecommendations(dealData: any) {
  const recommendations = []

  // Timeline recommendations
  if (dealData.stage === 'prospecting') {
    recommendations.push({
      priority: 'high',
      action: 'Schedule discovery call within 3 business days',
      reason: 'Early engagement improves conversion rates'
    })
  }

  if (dealData.stage === 'proposal') {
    recommendations.push({
      priority: 'high',
      action: 'Follow up within 24 hours of proposal delivery',
      reason: 'Proposals have short attention span'
    })
  }

  // Value recommendations
  if (dealData.value > 50000) {
    recommendations.push({
      priority: 'medium',
      action: 'Involve senior management in next interaction',
      reason: 'High-value deals require executive involvement'
    })
  }

  // Stakeholder recommendations
  if (!dealData.champion) {
    recommendations.push({
      priority: 'high',
      action: 'Identify and develop internal champion',
      reason: 'Deals without champions are at higher risk'
    })
  }

  return recommendations
}

async function analyzeTimeline(dealData: any) {
  const timeline = {
    estimatedCloseDate: null,
    confidence: 0,
    milestones: [],
    bottlenecks: [],
    accelerators: []
  }

  // Estimate close date based on stage and historical data
  if (dealData.stage === 'prospecting') {
    timeline.estimatedCloseDate = addDays(new Date(), 60)
    timeline.confidence = 40
  } else if (dealData.stage === 'qualification') {
    timeline.estimatedCloseDate = addDays(new Date(), 45)
    timeline.confidence = 55
  } else if (dealData.stage === 'proposal') {
    timeline.estimatedCloseDate = addDays(new Date(), 30)
    timeline.confidence = 70
  } else if (dealData.stage === 'negotiation') {
    timeline.estimatedCloseDate = addDays(new Date(), 15)
    timeline.confidence = 85
  }

  // Define milestones
  timeline.milestones = [
    { name: 'Initial Contact', completed: dealData.stage !== 'prospecting', date: dealData.firstContact },
    { name: 'Discovery Call', completed: ['qualification', 'proposal', 'negotiation', 'closed'].includes(dealData.stage), date: dealData.discoveryCall },
    { name: 'Proposal Delivery', completed: ['proposal', 'negotiation', 'closed'].includes(dealData.stage), date: dealData.proposalDate },
    { name: 'Final Negotiation', completed: ['negotiation', 'closed'].includes(dealData.stage), date: dealData.negotiationStart },
    { name: 'Contract Signed', completed: dealData.stage === 'closed', date: dealData.closeDate }
  ]

  return timeline
}

async function analyzeCompetitiveLandscape(dealData: any) {
  const competitors = dealData.competitors || []

  return {
    primaryCompetitor: competitors[0] || null,
    competitiveAdvantage: 'solution_fit', // Could be: price, features, service, relationship
    winProbability: calculateWinProbability(dealData, competitors),
    differentiationPoints: [
      'Superior product features',
      'Better customer service',
      'Stronger relationship',
      'More competitive pricing'
    ]
  }
}

async function analyzeStakeholders(dealData: any) {
  const stakeholders = dealData.stakeholders || []

  return {
    decisionMaker: stakeholders.find((s: any) => s.role === 'decision_maker'),
    champion: stakeholders.find((s: any) => s.role === 'champion'),
    influencers: stakeholders.filter((s: any) => s.role === 'influencer'),
    endUsers: stakeholders.filter((s: any) => s.role === 'end_user'),
    stakeholderMap: createStakeholderMap(stakeholders)
  }
}

function calculateValueScore(dealData: any): number {
  if (!dealData.value) return 50

  let score = 50

  // Size appropriate deals score higher
  if (dealData.companySize) {
    const dealToCompanyRatio = dealData.value / dealData.companySize
    if (dealToCompanyRatio < 0.01) score += 20 // Small deal for large company
    else if (dealToCompanyRatio > 0.1) score -= 20 // Large deal for small company
  }

  // Industry standard pricing
  if (dealData.industry === 'technology') {
    if (dealData.value > 100000) score += 10
  }

  return Math.max(0, Math.min(100, score))
}

function calculateTimelineScore(dealData: any): number {
  if (!dealData.timeline) return 50

  let score = 50

  // Optimal timeline is 30-60 days
  if (dealData.timeline >= 30 && dealData.timeline <= 60) {
    score += 30
  } else if (dealData.timeline < 30) {
    score += 10 // Fast close is good but rushed
  } else if (dealData.timeline > 90) {
    score -= 20 // Too long increases risk
  }

  return Math.max(0, Math.min(100, score))
}

function calculateStakeholderScore(dealData: any): number {
  const stakeholders = dealData.stakeholders || []
  let score = 50

  // More stakeholders generally better
  if (stakeholders.length >= 3) score += 20
  else if (stakeholders.length >= 2) score += 10
  else if (stakeholders.length === 0) score -= 20

  // Having a champion is crucial
  if (dealData.champion) score += 20

  // Having decision maker identified
  if (stakeholders.some((s: any) => s.role === 'decision_maker')) score += 10

  return Math.max(0, Math.min(100, score))
}

function calculateWinProbability(dealData: any, competitors: any[]): number {
  let probability = 60 // Base probability

  // Adjust based on competitive position
  if (competitors.length === 0) probability += 20
  else if (competitors.length === 1) probability += 10
  else if (competitors.length > 2) probability -= 15

  // Adjust based on relationship strength
  if (dealData.relationshipStrength === 'strong') probability += 15
  else if (dealData.relationshipStrength === 'weak') probability -= 10

  // Adjust based on product fit
  if (dealData.productFit > 80) probability += 10
  else if (dealData.productFit < 60) probability -= 15

  return Math.max(0, Math.min(100, probability))
}

function createStakeholderMap(stakeholders: any[]): any {
  // Create a visual map of stakeholder relationships
  return {
    nodes: stakeholders.map(s => ({ id: s.id, name: s.name, role: s.role })),
    edges: [] // Would contain relationships between stakeholders
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}