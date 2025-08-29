import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Lead Nurturing Edge Function - ProductIntel Pro
 *
 * Intelligent lead nurturing with personalized content and cadence optimization:
 * - Lead scoring and segmentation for sales professionals like Sam
 * - Personalized content recommendations based on prospect profile
 * - Optimal engagement timing aligned with sales cycles
 * - Automated nurture sequences with conversion tracking
 * - Predictive analytics for lead conversion probability
 *
 * Designed for sales executives who need to efficiently nurture leads
 * without spending hours on manual research and follow-up.
 *
 * @route POST /functions/v1/lead-nurturing
 */

interface LeadNurturingRequest {
  leadId: string;
  leadData: {
    name: string;
    email: string;
    company: string;
    role: string;
    industry: string;
    companySize: number;
    currentStage: string; // prospecting, qualification, proposal, negotiation, closed
    engagementScore: number;
    lastContactedAt: string;
    painPoints?: string[];
    budget?: string;
    timeline?: string;
    competitors?: string[];
    engagementHistory: Array<{
      type: string; // email, call, meeting, demo, webinar, content_download
      timestamp: string;
      content: string;
      response?: string;
      sentiment?: 'positive' | 'neutral' | 'negative';
    }>;
  };
  nurtureGoals: string[];
  availableContent: Array<{
    id: string;
    type: string; // case_study, whitepaper, webinar, blog, video, infographic
    title: string;
    topic: string;
    targetAudience: string[];
    engagementRate: number;
    conversionRate: number;
    idealStage: string[];
  }>;
  constraints: {
    maxEmailsPerWeek: number;
    maxCallsPerWeek: number;
    preferredChannels: string[];
    timezone: string;
    workingHours: {
      start: string;
      end: string;
    };
  };
  salesContext?: {
    salesPerson: string;
    territory: string;
    quotaProgress: number;
    averageDealSize: number;
  };
}

interface NurtureStrategy {
  leadId: string;
  executiveSummary: {
    leadProfile: string;
    primaryGoal: string;
    estimatedConversionProbability: number;
    recommendedTimeline: string;
    keyInsights: string[];
  };
  contentSequence: Array<{
    order: number;
    contentId: string;
    type: string;
    title: string;
    topic: string;
    sendDate: string;
    channel: string;
    subjectLine?: string;
    emailBody?: string;
    callScript?: string;
    personalization: Record<string, any>;
    expectedEngagement: number;
    conversionPotential: number;
    followUpTriggers: string[];
    backupContent: string[];
  }>;
  engagementOptimization: {
    optimalTiming: {
      bestDays: string[];
      bestHours: number[];
      timezone: string;
      seasonalConsiderations: string[];
    };
    cadence: {
      frequency: string;
      spacing: string;
      adaptive: boolean;
      fatiguePrevention: string[];
    };
    channelMix: Array<{
      channel: string;
      percentage: number;
      rationale: string;
      successMetrics: string[];
    }>;
    personalizationStrategy: {
      dynamicFields: string[];
      behavioralTriggers: string[];
      contentTailoring: string[];
    };
  };
  conversionPrediction: {
    probability: number;
    timeline: string;
    keyIndicators: Array<{
      indicator: string;
      currentValue: any;
      targetValue: any;
      weight: number;
    }>;
    interventionPoints: Array<{
      trigger: string;
      action: string;
      urgency: 'low' | 'medium' | 'high' | 'critical';
      expectedImpact: number;
    }>;
    riskFactors: Array<{
      risk: string;
      probability: number;
      mitigation: string;
      impact: string;
    }>;
  };
  monitoringMetrics: {
    engagementRate: number;
    contentPerformance: Record<string, number>;
    stageProgression: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    nextBestAction: {
      action: string;
      reason: string;
      expectedOutcome: string;
      deadline: string;
    };
  };
  competitiveIntelligence: {
    competitorAwareness: string[];
    differentiationOpportunities: string[];
    marketTrends: string[];
    timingAdvantages: string[];
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: user } = await supabaseClient.auth.getUser(token)

    if (!user.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const requestData: LeadNurturingRequest = await req.json()

    if (!requestData.leadId || !requestData.leadData) {
      return new Response(
        JSON.stringify({ error: 'Lead ID and lead data are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate comprehensive nurture strategy
    const nurtureStrategy = await generateNurtureStrategy(requestData)

    // Log the nurture strategy creation
    await supabaseClient
      .from('ai_usage_logs')
      .insert({
        user_id: user.user.id,
        feature_used: 'lead-nurturing',
        model_id: 'nurture-ai',
        tokens_used: JSON.stringify(nurtureStrategy).length,
        success: true
      })

    return new Response(
      JSON.stringify({ nurtureStrategy }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Lead nurturing error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error during lead nurturing analysis'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function generateNurtureStrategy(request: LeadNurturingRequest): Promise<NurtureStrategy> {
  const { leadData, nurtureGoals, availableContent, constraints, salesContext } = request

  // Analyze lead profile and engagement patterns
  const leadProfile = analyzeLeadProfile(leadData)
  const engagementPatterns = analyzeEngagementPatterns(leadData.engagementHistory)
  const contentPreferences = identifyContentPreferences(leadData, availableContent)
  const competitivePosition = analyzeCompetitivePosition(leadData, salesContext)

  // Determine optimal nurture strategy
  const primaryGoal = determinePrimaryGoal(nurtureGoals, leadProfile, engagementPatterns)
  const contentSequence = generateContentSequence(
    leadProfile,
    contentPreferences,
    availableContent,
    constraints,
    competitivePosition
  )

  const engagementOptimization = optimizeEngagementTiming(
    leadData,
    engagementPatterns,
    constraints
  )

  const conversionPrediction = predictConversionProbability(
    leadProfile,
    engagementPatterns,
    contentSequence,
    competitivePosition
  )

  return {
    leadId: request.leadId,
    executiveSummary: {
      leadProfile: generateLeadProfileSummary(leadProfile),
      primaryGoal,
      estimatedConversionProbability: conversionPrediction.probability,
      recommendedTimeline: conversionPrediction.timeline,
      keyInsights: generateKeyInsights(leadProfile, engagementPatterns, competitivePosition)
    },
    contentSequence,
    engagementOptimization,
    conversionPrediction,
    monitoringMetrics: {
      engagementRate: calculateEngagementRate(leadData.engagementHistory),
      contentPerformance: analyzeContentPerformance(leadData.engagementHistory),
      stageProgression: assessStageProgression(leadData),
      riskLevel: determineRiskLevel(leadProfile, engagementPatterns),
      nextBestAction: determineNextBestAction(leadProfile, engagementPatterns, contentSequence)
    },
    competitiveIntelligence: {
      competitorAwareness: competitivePosition.competitorAwareness,
      differentiationOpportunities: competitivePosition.differentiationOpportunities,
      marketTrends: competitivePosition.marketTrends,
      timingAdvantages: competitivePosition.timingAdvantages
    }
  }
}

function analyzeLeadProfile(leadData: any): any {
  const profile = {
    persona: determinePersona(leadData),
    buyingStage: assessBuyingStage(leadData),
    decisionDrivers: identifyDecisionDrivers(leadData),
    painPoints: extractPainPoints(leadData),
    timeline: estimateDecisionTimeline(leadData),
    budget: assessBudgetCapacity(leadData),
    authority: determineDecisionAuthority(leadData),
    industryContext: analyzeIndustryContext(leadData),
    technologyStack: inferTechnologyStack(leadData),
    companyMaturity: assessCompanyMaturity(leadData)
  }

  return profile
}

function determinePersona(leadData: any): string {
  const { role, industry, companySize, engagementHistory } = leadData

  // Analyze role and seniority
  if (role?.toLowerCase().includes('ceo') || role?.toLowerCase().includes('founder')) {
    return 'Executive Decision Maker'
  }
  if (role?.toLowerCase().includes('cto') || role?.toLowerCase().includes('vp engineering')) {
    return 'Technical Influencer'
  }
  if (role?.toLowerCase().includes('cfo') || role?.toLowerCase().includes('vp finance')) {
    return 'Financial Decision Maker'
  }
  if (role?.toLowerCase().includes('marketing') || role?.toLowerCase().includes('growth')) {
    return 'Marketing Professional'
  }
  if (role?.toLowerCase().includes('sales') || role?.toLowerCase().includes('business development')) {
    return 'Sales Professional'
  }

  // Analyze engagement patterns for additional context
  const contentTypes = engagementHistory.map((e: any) => e.type)
  if (contentTypes.includes('demo') || contentTypes.includes('webinar')) {
    return 'Hands-on Evaluator'
  }
  if (contentTypes.includes('whitepaper') || contentTypes.includes('case_study')) {
    return 'Research-Oriented Buyer'
  }

  return 'General Professional'
}

function assessBuyingStage(leadData: any): string {
  const { currentStage, engagementHistory, engagementScore } = leadData

  // Map current stage to buying stage
  const stageMapping: Record<string, string> = {
    'prospecting': 'unaware',
    'qualification': 'aware',
    'consideration': 'interested',
    'proposal': 'evaluating',
    'negotiation': 'negotiating',
    'closed': 'purchased'
  }

  const mappedStage = stageMapping[currentStage] || 'unaware'

  // Adjust based on engagement patterns
  const recentEngagements = engagementHistory.filter((e: any) =>
    new Date(e.timestamp) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  )

  if (recentEngagements.length > 5 && engagementScore > 70) {
    return 'evaluating'
  }
  if (recentEngagements.some((e: any) => e.type === 'demo_request' || e.type === 'pricing_inquiry')) {
    return 'evaluating'
  }
  if (recentEngagements.some((e: any) => e.type === 'meeting' || e.type === 'proposal')) {
    return 'negotiating'
  }

  return mappedStage
}

function identifyDecisionDrivers(leadData: any): string[] {
  const drivers = []
  const { painPoints, industry, companySize, role } = leadData

  // Role-based drivers
  if (role?.toLowerCase().includes('ceo') || role?.toLowerCase().includes('founder')) {
    drivers.push('strategic growth', 'competitive advantage', 'ROI maximization')
  }
  if (role?.toLowerCase().includes('cto') || role?.toLowerCase().includes('vp engineering')) {
    drivers.push('technical scalability', 'integration capabilities', 'innovation')
  }
  if (role?.toLowerCase().includes('cfo')) {
    drivers.push('cost optimization', 'budget efficiency', 'financial metrics')
  }

  // Industry-based drivers
  if (industry === 'technology' || industry === 'software') {
    drivers.push('digital transformation', 'agile development', 'competitive differentiation')
  }
  if (industry === 'healthcare' || industry === 'finance') {
    drivers.push('compliance', 'security', 'data protection')
  }

  // Company size-based drivers
  if (companySize < 50) {
    drivers.push('ease of use', 'quick implementation', 'flexibility')
  }
  if (companySize > 1000) {
    drivers.push('enterprise scalability', 'advanced features', 'customization')
  }

  // Pain point-based drivers
  if (painPoints) {
    painPoints.forEach((pain: string) => {
      if (pain.toLowerCase().includes('efficiency')) drivers.push('operational efficiency')
      if (pain.toLowerCase().includes('cost')) drivers.push('cost reduction')
      if (pain.toLowerCase().includes('growth')) drivers.push('business growth')
      if (pain.toLowerCase().includes('integration')) drivers.push('system integration')
    })
  }

  return [...new Set(drivers)] // Remove duplicates
}

function extractPainPoints(leadData: any): string[] {
  const { engagementHistory, role, industry, companySize } = leadData
  const painPoints = []

  // Analyze engagement history for revealed pain points
  engagementHistory.forEach((engagement: any) => {
    const content = engagement.content?.toLowerCase() || ''
    const response = engagement.response?.toLowerCase() || ''

    if (content.includes('problem') || content.includes('issue') || content.includes('challenge')) {
      painPoints.push('operational challenges')
    }
    if (content.includes('cost') || content.includes('expensive') || content.includes('budget')) {
      painPoints.push('cost concerns')
    }
    if (content.includes('time') || content.includes('slow') || content.includes('efficiency')) {
      painPoints.push('efficiency issues')
    }
    if (content.includes('integration') || content.includes('connect') || content.includes('system')) {
      painPoints.push('system integration')
    }
    if (response.includes('frustrated') || response.includes('difficult') || engagement.sentiment === 'negative') {
      painPoints.push('user experience issues')
    }
  })

  // Infer pain points based on profile
  if (companySize > 500 && !painPoints.includes('scalability')) {
    painPoints.push('scalability challenges')
  }
  if (industry === 'healthcare' && !painPoints.includes('compliance')) {
    painPoints.push('compliance requirements')
  }
  if (role?.toLowerCase().includes('sales') && !painPoints.includes('lead generation')) {
    painPoints.push('lead generation challenges')
  }

  return [...new Set(painPoints)]
}

function estimateDecisionTimeline(leadData: any): string {
  const { currentStage, companySize, budget, timeline } = leadData

  // Base timeline by stage
  const stageTimelines = {
    'prospecting': '3-6 months',
    'qualification': '2-4 months',
    'consideration': '1-3 months',
    'proposal': '2-6 weeks',
    'negotiation': '1-4 weeks',
    'closed': 'immediate'
  }

  let estimatedTimeline = stageTimelines[currentStage] || '3-6 months'

  // Adjust based on company size
  if (companySize > 1000) {
    // Enterprise deals take longer
    estimatedTimeline = adjustTimeline(estimatedTimeline, 1.5)
  } else if (companySize < 50) {
    // SMB deals can be faster
    estimatedTimeline = adjustTimeline(estimatedTimeline, 0.7)
  }

  // Adjust based on budget
  if (budget) {
    const budgetValue = parseFloat(budget.replace(/[^0-9.]/g, ''))
    if (budgetValue > 100000) {
      estimatedTimeline = adjustTimeline(estimatedTimeline, 1.3)
    }
  }

  return estimatedTimeline
}

function assessBudgetCapacity(leadData: any): any {
  const { budget, companySize, industry, role } = leadData

  const budgetAnalysis = {
    estimatedRange: '',
    confidence: 0,
    factors: [],
    recommendations: []
  }

  // Estimate budget based on company size and industry
  if (companySize) {
    if (companySize < 50) {
      budgetAnalysis.estimatedRange = '$5,000 - $25,000'
    } else if (companySize < 200) {
      budgetAnalysis.estimatedRange = '$15,000 - $75,000'
    } else if (companySize < 1000) {
      budgetAnalysis.estimatedRange = '$50,000 - $250,000'
    } else {
      budgetAnalysis.estimatedRange = '$100,000 - $500,000+'
    }
  }

  // Adjust based on industry
  if (industry === 'healthcare' || industry === 'finance') {
    budgetAnalysis.estimatedRange = increaseBudgetRange(budgetAnalysis.estimatedRange, 1.5)
    budgetAnalysis.factors.push('Regulated industry - higher compliance costs')
  }

  // Adjust based on role
  if (role?.toLowerCase().includes('ceo') || role?.toLowerCase().includes('founder')) {
    budgetAnalysis.estimatedRange = increaseBudgetRange(budgetAnalysis.estimatedRange, 1.3)
    budgetAnalysis.factors.push('Executive involvement suggests larger budget')
  }

  if (budget) {
    budgetAnalysis.confidence = 0.9
    budgetAnalysis.factors.push(`Explicit budget mentioned: ${budget}`)
  } else {
    budgetAnalysis.confidence = 0.6
    budgetAnalysis.recommendations.push('Probe for budget during next interaction')
  }

  return budgetAnalysis
}

function determineDecisionAuthority(leadData: any): string {
  const { role, companySize, engagementHistory } = leadData

  // Direct indicators from role
  if (role?.toLowerCase().includes('ceo') || role?.toLowerCase().includes('founder')) {
    return 'full_authority'
  }
  if (role?.toLowerCase().includes('vp') || role?.toLowerCase().includes('director')) {
    return 'high_influence'
  }
  if (role?.toLowerCase().includes('manager')) {
    return 'medium_influence'
  }

  // Analyze engagement patterns
  const meetingCount = engagementHistory.filter((e: any) => e.type === 'meeting').length
  const demoCount = engagementHistory.filter((e: any) => e.type === 'demo').length

  if (meetingCount > 2 || demoCount > 1) {
    return 'active_decision_maker'
  }

  // Company size considerations
  if (companySize < 50) {
    return 'likely_full_authority'
  }
  if (companySize > 1000) {
    return 'likely_committee_approval'
  }

  return 'unknown'
}

function analyzeIndustryContext(leadData: any): any {
  const { industry, companySize, engagementHistory } = leadData

  return {
    industry,
    marketTrends: getIndustryTrends(industry),
    competitiveLandscape: getCompetitiveLandscape(industry),
    regulatoryFactors: getRegulatoryFactors(industry),
    technologyAdoption: assessTechnologyAdoption(industry, companySize),
    seasonalPatterns: getSeasonalPatterns(industry)
  }
}

function inferTechnologyStack(leadData: any): string[] {
  const { engagementHistory, industry, company } = leadData
  const technologies = []

  // Analyze content downloads and mentions
  engagementHistory.forEach((engagement: any) => {
    const content = (engagement.content + ' ' + (engagement.response || '')).toLowerCase()

    if (content.includes('salesforce')) technologies.push('Salesforce')
    if (content.includes('hubspot')) technologies.push('HubSpot')
    if (content.includes('microsoft dynamics')) technologies.push('Microsoft Dynamics')
    if (content.includes('oracle')) technologies.push('Oracle CRM')
    if (content.includes('sap')) technologies.push('SAP CRM')
    if (content.includes('zendesk')) technologies.push('Zendesk')
    if (content.includes('intercom')) technologies.push('Intercom')
    if (content.includes('slack')) technologies.push('Slack')
    if (content.includes('microsoft teams')) technologies.push('Microsoft Teams')
  })

  // Industry-based inferences
  if (industry === 'healthcare') {
    technologies.push('EHR Systems', 'HIPAA Compliance Tools')
  }
  if (industry === 'finance') {
    technologies.push('Financial Software', 'Compliance Systems')
  }

  return [...new Set(technologies)]
}

function assessCompanyMaturity(leadData: any): string {
  const { companySize, industry, engagementHistory } = leadData

  if (companySize < 10) return 'startup'
  if (companySize < 50) return 'small_business'
  if (companySize < 200) return 'mid_market'
  if (companySize < 1000) return 'large_enterprise'
  return 'enterprise'
}

function analyzeEngagementPatterns(engagementHistory: any[]): any {
  const patterns = {
    preferredChannels: [],
    optimalTiming: [],
    contentPreferences: [],
    responsePatterns: [],
    engagementVelocity: 0,
    sentimentTrend: [],
    touchFrequency: 0,
    conversionSignals: []
  }

  if (engagementHistory.length === 0) {
    return patterns
  }

  // Analyze channel preferences
  const channelCounts = engagementHistory.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1
    return acc
  }, {})

  patterns.preferredChannels = Object.entries(channelCounts)
    .sort(([,a], [,b]) => b - a)
    .map(([channel]) => channel)

  // Analyze timing patterns
  const hourCounts = engagementHistory.reduce((acc, e) => {
    const hour = new Date(e.timestamp).getHours()
    acc[hour] = (acc[hour] || 0) + 1
    return acc
  }, {})

  patterns.optimalTiming = Object.entries(hourCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour))

  // Analyze content preferences
  const contentTypeCounts = engagementHistory.reduce((acc, e) => {
    if (e.type === 'content_download' || e.type === 'webinar' || e.type === 'whitepaper') {
      acc[e.content] = (acc[e.content] || 0) + 1
    }
    return acc
  }, {})

  patterns.contentPreferences = Object.entries(contentTypeCounts)
    .sort(([,a], [,b]) => b - a)
    .map(([content]) => content)

  // Calculate engagement velocity (engagements per week)
  const weeksSinceFirst = Math.max(1,
    (Date.now() - new Date(engagementHistory[0].timestamp).getTime()) / (7 * 24 * 60 * 60 * 1000)
  )
  patterns.engagementVelocity = engagementHistory.length / weeksSinceFirst

  // Analyze sentiment trend
  patterns.sentimentTrend = engagementHistory
    .filter(e => e.sentiment)
    .map(e => e.sentiment)

  // Calculate touch frequency
  patterns.touchFrequency = engagementHistory.length / weeksSinceFirst

  // Identify conversion signals
  patterns.conversionSignals = engagementHistory
    .filter(e => ['demo_request', 'pricing_inquiry', 'meeting', 'proposal'].includes(e.type))
    .map(e => e.type)

  return patterns
}

function identifyContentPreferences(leadData: any, availableContent: any[]): any {
  const { engagementHistory, persona, buyingStage, painPoints } = leadData

  const preferences = {
    preferredTypes: [],
    preferredTopics: [],
    engagementRates: {},
    conversionRates: {},
    recommendations: []
  }

  // Analyze historical engagement with content
  const contentEngagement = engagementHistory
    .filter(e => e.type === 'content_download' || e.type === 'webinar' || e.type === 'whitepaper')
    .reduce((acc, e) => {
      acc[e.content] = (acc[e.content] || 0) + 1
      return acc
    }, {})

  preferences.preferredTypes = Object.keys(contentEngagement)

  // Match with available content
  availableContent.forEach(content => {
    let relevanceScore = 0

    // Persona matching
    if (content.targetAudience.some(audience =>
      audience.toLowerCase().includes(persona.toLowerCase()) ||
      persona.toLowerCase().includes(audience.toLowerCase())
    )) {
      relevanceScore += 30
    }

    // Buying stage matching
    if (content.idealStage.includes(buyingStage)) {
      relevanceScore += 25
    }

    // Pain point matching
    painPoints.forEach((pain: string) => {
      if (content.topic.toLowerCase().includes(pain.toLowerCase()) ||
          pain.toLowerCase().includes(content.topic.toLowerCase())) {
        relevanceScore += 20
      }
    })

    // Historical engagement bonus
    if (contentEngagement[content.title]) {
      relevanceScore += 15
    }

    preferences.engagementRates[content.id] = content.engagementRate
    preferences.conversionRates[content.id] = content.conversionRate

    if (relevanceScore > 40) {
      preferences.recommendations.push({
        contentId: content.id,
        relevanceScore,
        reasoning: generateRelevanceReasoning(content, persona, buyingStage, painPoints)
      })
    }
  })

  preferences.recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore)

  return preferences
}

function analyzeCompetitivePosition(leadData: any, salesContext?: any): any {
  const { competitors, industry, companySize } = leadData

  return {
    competitorAwareness: competitors || [],
    differentiationOpportunities: generateDifferentiationOpportunities(leadData),
    marketTrends: getMarketTrends(industry),
    timingAdvantages: assessTimingAdvantages(leadData, salesContext),
    competitiveStrengths: assessCompetitiveStrengths(leadData),
    winProbability: calculateWinProbability(leadData)
  }
}

function determinePrimaryGoal(nurtureGoals: string[], leadProfile: any, engagementPatterns: any): string {
  // Prioritize goals based on lead profile and engagement
  const goalPriorities = {
    'awareness': 1,
    'consideration': 2,
    'evaluation': 3,
    'purchase': 4,
    'retention': 5,
    'expansion': 6
  }

  // Determine most appropriate goal based on buying stage
  const stageGoals = {
    'unaware': 'awareness',
    'aware': 'consideration',
    'interested': 'evaluation',
    'evaluating': 'purchase',
    'negotiating': 'purchase',
    'purchased': 'retention'
  }

  const recommendedGoal = stageGoals[leadProfile.buyingStage] || 'awareness'

  // Check if requested goals include the recommended one
  if (nurtureGoals.includes(recommendedGoal)) {
    return recommendedGoal
  }

  // Find the highest priority goal from requested goals
  const prioritizedGoals = nurtureGoals
    .map(goal => ({ goal, priority: goalPriorities[goal] || 0 }))
    .sort((a, b) => b.priority - a.priority)

  return prioritizedGoals[0]?.goal || recommendedGoal
}

function generateContentSequence(
  leadProfile: any,
  contentPreferences: any,
  availableContent: any[],
  constraints: any,
  competitivePosition: any
): any[] {
  const sequence = []
  const { preferredTypes, preferredTopics, recommendations } = contentPreferences

  // Start with highly relevant content
  const topRecommendations = recommendations.slice(0, 5)

  topRecommendations.forEach((rec, index) => {
    const content = availableContent.find(c => c.id === rec.contentId)
    if (content) {
      sequence.push({
        order: index + 1,
        contentId: content.id,
        type: content.type,
        title: content.title,
        topic: content.topic,
        sendDate: calculateSendDate(index, constraints),
        channel: determineOptimalChannel(content, constraints, leadProfile),
        subjectLine: generateSubjectLine(content, leadProfile),
        emailBody: generateEmailBody(content, leadProfile, competitivePosition),
        callScript: generateCallScript(content, leadProfile),
        personalization: generatePersonalization(content, leadProfile),
        expectedEngagement: content.engagementRate,
        conversionPotential: content.conversionRate,
        followUpTriggers: generateFollowUpTriggers(content),
        backupContent: findBackupContent(content, availableContent)
      })
    }
  })

  return sequence
}

function optimizeEngagementTiming(leadData: any, engagementPatterns: any, constraints: any): any {
  const { timezone, workingHours } = constraints
  const { optimalTiming } = engagementPatterns

  return {
    optimalTiming: {
      bestDays: ['Tuesday', 'Wednesday', 'Thursday'], // Generally best for B2B
      bestHours: optimalTiming.length > 0 ? optimalTiming : [9, 10, 14, 15], // Default optimal hours
      timezone,
      seasonalConsiderations: generateSeasonalConsiderations(leadData)
    },
    cadence: {
      frequency: determineCadence(engagementPatterns),
      spacing: calculateSpacing(engagementPatterns),
      adaptive: true,
      fatiguePrevention: [
        'Vary content types',
        'Include value-driven content',
        'Monitor engagement signals',
        'Allow opt-out options'
      ]
    },
    channelMix: generateChannelMix(leadData, constraints),
    personalizationStrategy: {
      dynamicFields: ['name', 'company', 'role', 'industry'],
      behavioralTriggers: ['content_download', 'email_open', 'link_click'],
      contentTailoring: ['pain_points', 'buying_stage', 'industry_context']
    }
  }
}

function predictConversionProbability(
  leadProfile: any,
  engagementPatterns: any,
  contentSequence: any[],
  competitivePosition: any
): any {
  let baseProbability = 0.3 // Base conversion probability

  // Adjust based on buying stage
  const stageMultipliers = {
    'unaware': 0.1,
    'aware': 0.3,
    'interested': 0.5,
    'evaluating': 0.7,
    'negotiating': 0.9,
    'purchased': 1.0
  }
  baseProbability *= stageMultipliers[leadProfile.buyingStage] || 0.3

  // Adjust based on engagement velocity
  if (engagementPatterns.engagementVelocity > 2) {
    baseProbability *= 1.3
  } else if (engagementPatterns.engagementVelocity < 0.5) {
    baseProbability *= 0.7
  }

  // Adjust based on content sequence quality
  const avgConversionPotential = contentSequence.reduce((sum, item) =>
    sum + (item.conversionPotential || 0), 0) / contentSequence.length
  baseProbability *= (0.8 + avgConversionPotential * 0.4)

  // Adjust based on competitive position
  baseProbability *= competitivePosition.winProbability

  return {
    probability: Math.min(0.95, Math.max(0.05, baseProbability)),
    timeline: estimateConversionTimeline(leadProfile, baseProbability),
    keyIndicators: generateKeyIndicators(leadProfile, engagementPatterns),
    interventionPoints: generateInterventionPoints(leadProfile, engagementPatterns),
    riskFactors: identifyRiskFactors(leadProfile, engagementPatterns)
  }
}

function calculateEngagementRate(engagementHistory: any[]): number {
  if (engagementHistory.length === 0) return 0

  const totalInteractions = engagementHistory.length
  const engagedInteractions = engagementHistory.filter(e =>
    e.response || e.sentiment === 'positive' || ['meeting', 'demo', 'call'].includes(e.type)
  ).length

  return engagedInteractions / totalInteractions
}

function analyzeContentPerformance(engagementHistory: any[]): Record<string, number> {
  const performance = {}

  engagementHistory.forEach(engagement => {
    const contentType = engagement.type
    if (!performance[contentType]) {
      performance[contentType] = 0
    }
    performance[contentType] += engagement.response ? 1 : 0.5
  })

  return performance
}

function assessStageProgression(leadData: any): string {
  const { currentStage, engagementHistory, engagementScore } = leadData

  const stageScores = {
    'prospecting': 20,
    'qualification': 40,
    'consideration': 60,
    'proposal': 80,
    'negotiation': 90,
    'closed': 100
  }

  let progressionScore = stageScores[currentStage] || 20

  // Adjust based on engagement
  if (engagementScore > 70) progressionScore += 10
  if (engagementHistory.length > 10) progressionScore += 5

  // Adjust based on recent activity
  const recentActivity = engagementHistory.filter(e =>
    new Date(e.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  )
  if (recentActivity.length > 2) progressionScore += 5

  if (progressionScore >= 90) return 'advanced'
  if (progressionScore >= 70) return 'progressing'
  if (progressionScore >= 40) return 'developing'
  return 'early_stage'
}

function determineRiskLevel(leadProfile: any, engagementPatterns: any): 'low' | 'medium' | 'high' | 'critical' {
  let riskScore = 0

  // Risk factors
  if (engagementPatterns.engagementVelocity < 0.5) riskScore += 30
  if (leadProfile.buyingStage === 'unaware') riskScore += 20
  if (engagementPatterns.touchFrequency > 5) riskScore += 15 // Over-communication risk
  if (leadProfile.timeline === '6+ months') riskScore += 10

  if (riskScore >= 60) return 'critical'
  if (riskScore >= 40) return 'high'
  if (riskScore >= 20) return 'medium'
  return 'low'
}

function determineNextBestAction(leadProfile: any, engagementPatterns: any, contentSequence: any[]): any {
  // Determine the most impactful next action based on current state

  if (engagementPatterns.engagementVelocity < 0.5) {
    return {
      action: 'send_personalized_email',
      reason: 'Low engagement requires re-engagement',
      expectedOutcome: 'Increase engagement velocity',
      deadline: 'within_24_hours'
    }
  }

  if (leadProfile.buyingStage === 'unaware' || leadProfile.buyingStage === 'aware') {
    return {
      action: 'share_educational_content',
      reason: 'Lead needs awareness and education',
      expectedOutcome: 'Move to consideration stage',
      deadline: 'within_3_days'
    }
  }

  if (leadProfile.buyingStage === 'interested' || leadProfile.buyingStage === 'evaluating') {
    return {
      action: 'schedule_demo',
      reason: 'Lead is ready for product evaluation',
      expectedOutcome: 'Advance to proposal stage',
      deadline: 'within_1_week'
    }
  }

  if (leadProfile.buyingStage === 'negotiating') {
    return {
      action: 'prepare_proposal',
      reason: 'Lead is ready for pricing and terms',
      expectedOutcome: 'Close the deal',
      deadline: 'within_3_days'
    }
  }

  return {
    action: 'follow_up_check',
    reason: 'Monitor lead status and engagement',
    expectedOutcome: 'Maintain relationship',
    deadline: 'within_1_week'
  }
}

// Helper functions
function generateLeadProfileSummary(leadProfile: any): string {
  return `${leadProfile.persona} at ${leadProfile.companyMaturity} company in ${leadProfile.industryContext.industry} industry, currently in ${leadProfile.buyingStage} stage with ${leadProfile.authority} decision authority.`
}

function generateKeyInsights(leadProfile: any, engagementPatterns: any, competitivePosition: any): string[] {
  const insights = []

  insights.push(`${leadProfile.persona} shows preference for ${engagementPatterns.preferredChannels[0] || 'email'} communication`)
  insights.push(`Key decision drivers: ${leadProfile.decisionDrivers.slice(0, 3).join(', ')}`)
  insights.push(`Estimated timeline: ${leadProfile.timeline}`)

  if (competitivePosition.competitorAwareness.length > 0) {
    insights.push(`Aware of competitors: ${competitivePosition.competitorAwareness.join(', ')}`)
  }

  return insights
}

function calculateSendDate(order: number, constraints: any): string {
  const baseDate = new Date()
  const daysToAdd = order * 3 // Space out by 3 days

  baseDate.setDate(baseDate.getDate() + daysToAdd)

  // Adjust for working days
  const dayOfWeek = baseDate.getDay()
  if (dayOfWeek === 0) baseDate.setDate(baseDate.getDate() + 1) // Sunday -> Monday
  if (dayOfWeek === 6) baseDate.setDate(baseDate.getDate() + 2) // Saturday -> Monday

  return baseDate.toISOString().split('T')[0]
}

function determineOptimalChannel(content: any, constraints: any, leadProfile: any): string {
  const { preferredChannels } = constraints

  // Prioritize preferred channels
  if (preferredChannels.includes('email') && content.type !== 'webinar') {
    return 'email'
  }
  if (preferredChannels.includes('call') && ['demo', 'meeting'].includes(content.type)) {
    return 'call'
  }

  // Content-type based defaults
  if (content.type === 'webinar') return 'invitation'
  if (content.type === 'demo') return 'meeting'
  if (['whitepaper', 'case_study'].includes(content.type)) return 'email'

  return 'email'
}

function generateSubjectLine(content: any, leadProfile: any): string {
  const templates = {
    'case_study': `How ${leadProfile.company} Achieved [Result] with Our Solution`,
    'whitepaper': `The Complete Guide to [Topic] for ${leadProfile.industry} Leaders`,
    'webinar': `Join Us: [Topic] Webinar - Perfect for ${leadProfile.persona}s`,
    'blog': `[Insight] That Every ${leadProfile.role} Should Know`,
    'video': `2-Minute Demo: See Our Solution in Action`
  }

  return templates[content.type] || `Valuable Insights for ${leadProfile.role}s`
}

function generateEmailBody(content: any, leadProfile: any, competitivePosition: any): string {
  return `Dear ${leadProfile.name},

I hope this email finds you well. I wanted to share some insights that might be valuable for ${leadProfile.role}s in the ${leadProfile.industry} industry.

${content.title} addresses key challenges like ${leadProfile.painPoints.slice(0, 2).join(' and ')} that many professionals in your position face.

${competitivePosition.differentiationOpportunities[0] || 'Our solution stands out through its innovative approach and proven results.'}

Would you be interested in learning more about how this could benefit ${leadProfile.company}?

Best regards,
[Your Name]`
}

function generateCallScript(content: any, leadProfile: any): string {
  return `Hi ${leadProfile.name},

How are you doing today? I wanted to follow up on the ${content.title} I shared earlier.

Based on what you've mentioned about ${leadProfile.painPoints[0] || 'your current challenges'}, I thought this would be particularly relevant.

Have you had a chance to review it? I'd love to hear your thoughts and discuss how this might apply to ${leadProfile.company}'s situation.

What questions do you have about it?`
}

function generatePersonalization(content: any, leadProfile: any): Record<string, any> {
  return {
    name: leadProfile.name,
    company: leadProfile.company,
    role: leadProfile.role,
    industry: leadProfile.industry,
    painPoints: leadProfile.painPoints,
    decisionDrivers: leadProfile.decisionDrivers,
    companySize: leadProfile.companySize
  }
}

function generateFollowUpTriggers(content: any): string[] {
  const triggers = ['email_open', 'link_click']

  if (content.type === 'webinar') {
    triggers.push('registration', 'attendance')
  }
  if (content.type === 'demo') {
    triggers.push('meeting_booked', 'demo_completed')
  }
  if (['whitepaper', 'case_study'].includes(content.type)) {
    triggers.push('download', 'share')
  }

  return triggers
}

function findBackupContent(content: any, availableContent: any[]): string[] {
  return availableContent
    .filter(c => c.type === content.type && c.id !== content.id)
    .slice(0, 2)
    .map(c => c.title)
}

function generateSeasonalConsiderations(leadData: any): string[] {
  const { industry } = leadData
  const currentMonth = new Date().getMonth()

  const considerations = []

  // Q4 considerations for most industries
  if (currentMonth >= 9) { // October - December
    considerations.push('Year-end budget planning')
    considerations.push('Holiday schedule considerations')
  }

  // Industry-specific seasonal patterns
  if (industry === 'retail' || industry === 'ecommerce') {
    if (currentMonth >= 9 || currentMonth <= 1) { // Q4 and Q1
      considerations.push('Holiday shopping season')
    }
  }

  if (industry === 'education') {
    if (currentMonth >= 6 && currentMonth <= 8) { // Summer
      considerations.push('Academic calendar planning')
    }
  }

  return considerations
}

function determineCadence(engagementPatterns: any): string {
  const { engagementVelocity, touchFrequency } = engagementPatterns

  if (touchFrequency > 3) return 'weekly'
  if (touchFrequency > 1) return 'bi-weekly'
  if (engagementVelocity > 1) return 'weekly'
  return 'bi-weekly'
}

function calculateSpacing(engagementPatterns: any): string {
  const cadence = determineCadence(engagementPatterns)

  switch (cadence) {
    case 'weekly': return '7 days'
    case 'bi-weekly': return '14 days'
    case 'monthly': return '30 days'
    default: return '14 days'
  }
}

function generateChannelMix(leadData: any, constraints: any): any[] {
  const { preferredChannels, maxEmailsPerWeek, maxCallsPerWeek } = constraints

  const channels = []

  if (preferredChannels.includes('email')) {
    channels.push({
      channel: 'email',
      percentage: 60,
      rationale: 'Primary communication channel with high reach',
      successMetrics: ['open_rate', 'click_rate', 'response_rate']
    })
  }

  if (preferredChannels.includes('call') && maxCallsPerWeek > 0) {
    channels.push({
      channel: 'call',
      percentage: 25,
      rationale: 'Personal connection and immediate feedback',
      successMetrics: ['connection_rate', 'conversation_quality', 'next_steps']
    })
  }

  if (preferredChannels.includes('linkedin') || preferredChannels.includes('social')) {
    channels.push({
      channel: 'social',
      percentage: 15,
      rationale: 'Thought leadership and relationship building',
      successMetrics: ['engagement_rate', 'profile_views', 'connection_requests']
    })
  }

  return channels
}

function estimateConversionTimeline(leadProfile: any, probability: number): string {
  const { buyingStage, timeline } = leadProfile

  // Base timeline by stage and probability
  const stageTimelines = {
    'unaware': '6-12 months',
    'aware': '4-8 months',
    'interested': '2-4 months',
    'evaluating': '1-2 months',
    'negotiating': '2-4 weeks',
    'purchased': 'immediate'
  }

  let estimatedTimeline = stageTimelines[buyingStage] || '3-6 months'

  // Adjust based on probability
  if (probability > 0.7) {
    estimatedTimeline = adjustTimeline(estimatedTimeline, 0.7) // Faster for high probability
  } else if (probability < 0.3) {
    estimatedTimeline = adjustTimeline(estimatedTimeline, 1.5) // Slower for low probability
  }

  return estimatedTimeline
}

function generateKeyIndicators(leadProfile: any, engagementPatterns: any): any[] {
  return [
    {
      indicator: 'Engagement Velocity',
      currentValue: engagementPatterns.engagementVelocity,
      targetValue: 2.0,
      weight: 0.3
    },
    {
      indicator: 'Content Interaction Rate',
      currentValue: calculateEngagementRate(leadProfile.engagementHistory || []),
      targetValue: 0.7,
      weight: 0.25
    },
    {
      indicator: 'Buying Stage Progression',
      currentValue: getStageScore(leadProfile.buyingStage),
      targetValue: 80,
      weight: 0.25
    },
    {
      indicator: 'Decision Driver Alignment',
      currentValue: leadProfile.decisionDrivers?.length || 0,
      targetValue: 3,
      weight: 0.2
    }
  ]
}

function generateInterventionPoints(leadProfile: any, engagementPatterns: any): any[] {
  const interventions = []

  if (engagementPatterns.engagementVelocity < 0.5) {
    interventions.push({
      trigger: 'engagement_velocity_below_threshold',
      action: 'send_reengagement_sequence',
      urgency: 'high',
      expectedImpact: 0.3
    })
  }

  if (leadProfile.buyingStage === 'unaware') {
    interventions.push({
      trigger: 'stuck_in_unaware_stage',
      action: 'deliver_educational_content',
      urgency: 'medium',
      expectedImpact: 0.4
    })
  }

  if (engagementPatterns.touchFrequency > 5) {
    interventions.push({
      trigger: 'over_communication_risk',
      action: 'reduce_communication_frequency',
      urgency: 'medium',
      expectedImpact: 0.2
    })
  }

  return interventions
}

function identifyRiskFactors(leadProfile: any, engagementPatterns: any): any[] {
  const risks = []

  if (engagementPatterns.engagementVelocity < 0.3) {
    risks.push({
      risk: 'Low engagement may indicate lack of interest',
      probability: 0.6,
      mitigation: 'Send reengagement campaign with value-focused content',
      impact: 'May lose lead to competitors'
    })
  }

  if (leadProfile.timeline === '6+ months') {
    risks.push({
      risk: 'Long decision timeline increases competition risk',
      probability: 0.4,
      mitigation: 'Accelerate timeline with compelling offers and urgency',
      impact: 'Extended sales cycle may reduce conversion'
    })
  }

  if (engagementPatterns.touchFrequency > 7) {
    risks.push({
      risk: 'Over-communication may cause fatigue',
      probability: 0.3,
      mitigation: 'Reduce frequency and focus on high-value interactions',
      impact: 'Lead may unsubscribe or become unresponsive'
    })
  }

  return risks
}

// Utility functions
function adjustTimeline(timeline: string, factor: number): string {
  // Simple timeline adjustment - in production, this would be more sophisticated
  const parts = timeline.split('-')
  if (parts.length === 2) {
    const start = parseFloat(parts[0]) * factor
    const end = parseFloat(parts[1]) * factor
    return `${Math.round(start)}-${Math.round(end)} months`
  }
  return timeline
}

function increaseBudgetRange(range: string, factor: number): string {
  // Simple budget range adjustment
  const parts = range.split('-')
  if (parts.length === 2) {
    const start = parts[0].replace(/[^0-9]/g, '')
    const end = parts[1].replace(/[^0-9]/g, '')
    const newStart = Math.round(parseFloat(start) * factor)
    const newEnd = Math.round(parseFloat(end) * factor)
    return `$${newStart.toLocaleString()}-$${newEnd.toLocaleString()}+`
  }
  return range
}

function getIndustryTrends(industry: string): any[] {
  const trends: Record<string, any[]> = {
    technology: ['AI adoption', 'cloud migration', 'digital transformation'],
    healthcare: ['telemedicine', 'patient data security', 'regulatory compliance'],
    finance: ['digital banking', 'fintech innovation', 'regulatory technology'],
    retail: ['ecommerce growth', 'omnichannel experience', 'personalization']
  }

  return trends[industry] || ['digital transformation', 'efficiency improvement']
}

function getCompetitiveLandscape(industry: string): any[] {
  const landscapes: Record<string, any[]> = {
    technology: ['Major cloud providers', 'Open source solutions', 'Legacy systems'],
    healthcare: ['EHR vendors', 'Telemedicine platforms', 'Practice management systems'],
    finance: ['Banking software', 'Fintech startups', 'Regulatory compliance tools']
  }

  return landscapes[industry] || ['Established vendors', 'New market entrants']
}

function getRegulatoryFactors(industry: string): any[] {
  const factors: Record<string, any[]> = {
    healthcare: ['HIPAA compliance', 'Patient data privacy', 'FDA regulations'],
    finance: ['SOX compliance', 'Anti-money laundering', 'Data security standards'],
    technology: ['Data privacy laws', 'GDPR compliance', 'Industry certifications']
  }

  return factors[industry] || []
}

function assessTechnologyAdoption(industry: string, companySize: number): string {
  if (companySize > 1000) return 'high'
  if (companySize > 200) return 'medium'
  return 'low'
}

function getSeasonalPatterns(industry: string): any[] {
  const patterns: Record<string, any[]> = {
    retail: ['Holiday shopping season', 'Back-to-school period'],
    education: ['Academic calendar', 'Summer planning period'],
    healthcare: ['Year-end budget cycles', 'Regulatory deadlines']
  }

  return patterns[industry] || ['Quarterly business cycles']
}

function generateDifferentiationOpportunities(leadData: any): string[] {
  const { competitors, industry, painPoints } = leadData

  const opportunities = [
    'Superior customer support and implementation',
    'More flexible pricing and licensing options',
    'Advanced feature set with regular updates',
    'Strong security and compliance certifications'
  ]

  // Add industry-specific differentiation
  if (industry === 'healthcare') {
    opportunities.push('HIPAA-compliant architecture')
  }
  if (industry === 'finance') {
    opportunities.push('Advanced security and audit trails')
  }

  return opportunities
}

function getMarketTrends(industry: string): string[] {
  const trends: Record<string, string[]> = {
    technology: ['AI integration', 'Remote work solutions', 'Sustainability focus'],
    healthcare: ['Digital health records', 'Telemedicine expansion', 'Patient engagement'],
    finance: ['Open banking', 'Digital transformation', 'Regulatory technology']
  }

  return trends[industry] || ['Digital transformation', 'Automation', 'Customer experience']
}

function assessTimingAdvantages(leadData: any, salesContext?: any): string[] {
  const advantages = []

  if (salesContext?.quotaProgress && salesContext.quotaProgress < 0.5) {
    advantages.push('Early quarter positioning advantage')
  }

  advantages.push('Proactive market engagement')
  advantages.push('Competitive timing advantage')

  return advantages
}

function assessCompetitiveStrengths(leadData: any): string[] {
  return [
    'Strong product-market fit',
    'Proven customer success',
    'Scalable solution architecture',
    'Continuous innovation pipeline'
  ]
}

function calculateWinProbability(leadData: any): number {
  // Simple win probability calculation
  let probability = 0.5

  if (leadData.engagementScore > 70) probability += 0.2
  if (leadData.currentStage === 'negotiation') probability += 0.2
  if (leadData.currentStage === 'proposal') probability += 0.1

  return Math.min(0.9, Math.max(0.1, probability))
}

function generateRelevanceReasoning(content: any, persona: string, buyingStage: string, painPoints: string[]): string {
  let reasoning = `Highly relevant for ${persona} in ${buyingStage} stage`

  if (painPoints.some(pain => content.topic.toLowerCase().includes(pain.toLowerCase()))) {
    reasoning += ', directly addresses key pain points'
  }

  reasoning += ', aligns with current buying journey'

  return reasoning
}

function getStageScore(stage: string): number {
  const scores = {
    'unaware': 20,
    'aware': 40,
    'interested': 60,
    'evaluating': 80,
    'negotiating': 90,
    'purchased': 100
  }

  return scores[stage] || 20
}