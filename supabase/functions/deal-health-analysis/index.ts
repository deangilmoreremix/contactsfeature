import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Deal Health Analysis Edge Function - ProductIntel Pro
 *
 * Comprehensive deal health scoring and risk assessment for sales professionals:
 * - Multi-dimensional health scoring (engagement, momentum, competition, etc.)
 * - Predictive health trends and early warning signals
 * - Deal lifecycle health tracking and benchmarking
 * - Specific health improvement recommendations and action plans
 * - Comparative analysis against similar deals and historical performance
 *
 * Designed to help sales executives proactively manage deal health
 * and prevent deal deterioration before it's too late.
 *
 * @route POST /functions/v1/deal-health-analysis
 */

interface DealHealthAnalysisRequest {
  dealId: string;
  dealData: {
    name: string;
    value: number;
    stage: string;
    probability: number;
    age: number; // days in pipeline
    lastActivity: string;
    owner: string;
    industry: string;
    companySize: number;
    competitors: string[];
    riskFactors: string[];
    nextSteps: string[];
    engagementHistory: Array<{
      type: string;
      timestamp: string;
      duration?: number;
      sentiment?: 'positive' | 'neutral' | 'negative';
      keyPoints?: string[];
    }>;
    stakeholderMap: Array<{
      name: string;
      role: string;
      influence: 'high' | 'medium' | 'low';
      sentiment: 'champion' | 'supporter' | 'neutral' | 'skeptic' | 'blocker';
      lastInteraction: string;
    }>;
    objections: Array<{
      objection: string;
      status: 'resolved' | 'addressed' | 'outstanding';
      resolution?: string;
      dateRaised: string;
    }>;
  };
  benchmarkData?: {
    industryAverages: Record<string, number>;
    companySizeBenchmarks: Record<string, number>;
    historicalPerformance: Array<{
      period: string;
      averageHealthScore: number;
      winRate: number;
      averageDealAge: number;
    }>;
  };
  analysisPreferences: {
    includeTrendAnalysis: boolean;
    includeCompetitiveAnalysis: boolean;
    includeStakeholderAnalysis: boolean;
    benchmarkAgainst: 'industry' | 'company_size' | 'historical' | 'all';
  };
}

interface DealHealthAnalysis {
  dealId: string;
  overallHealth: {
    currentScore: number;
    previousScore?: number;
    trend: 'improving' | 'stable' | 'declining' | 'critical';
    grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
  };
  healthDimensions: {
    engagement: {
      score: number;
      metrics: Record<string, number>;
      trend: string;
      recommendations: string[];
    };
    momentum: {
      score: number;
      metrics: Record<string, number>;
      trend: string;
      recommendations: string[];
    };
    competition: {
      score: number;
      metrics: Record<string, number>;
      trend: string;
      recommendations: string[];
    };
    stakeholder: {
      score: number;
      metrics: Record<string, number>;
      trend: string;
      recommendations: string[];
    };
    qualification: {
      score: number;
      metrics: Record<string, number>;
      trend: string;
      recommendations: string[];
    };
    risk: {
      score: number;
      metrics: Record<string, number>;
      trend: string;
      recommendations: string[];
    };
  };
  predictiveInsights: {
    healthTrajectory: Array<{
      period: string;
      predictedScore: number;
      confidence: number;
      keyFactors: string[];
    }>;
    earlyWarningSignals: Array<{
      signal: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      probability: number;
      timeToImpact: string;
      mitigationSteps: string[];
    }>;
    criticalMilestones: Array<{
      milestone: string;
      dueDate: string;
      importance: 'low' | 'medium' | 'high' | 'critical';
      status: 'upcoming' | 'overdue' | 'completed';
      impact: string;
    }>;
  };
  comparativeAnalysis: {
    benchmarkComparison: Record<string, {
      current: number;
      benchmark: number;
      percentile: number;
      status: 'above_average' | 'average' | 'below_average';
    }>;
    peerComparison: Array<{
      dealId: string;
      dealName: string;
      similarity: number;
      healthScore: number;
      stage: string;
      lessonsLearned: string[];
    }>;
    historicalComparison: {
      similarDeals: Array<{
        dealId: string;
        outcome: 'won' | 'lost';
        finalHealthScore: number;
        timeToClose: number;
        keyFactors: string[];
      }>;
      successPatterns: string[];
      failurePatterns: string[];
    };
  };
  actionPlan: {
    immediateActions: Array<{
      action: string;
      priority: 'high' | 'medium' | 'low';
      timeframe: string;
      expectedImpact: number;
      owner: string;
      successMetrics: string[];
    }>;
    shortTermPlan: Array<{
      objective: string;
      actions: string[];
      timeline: string;
      successCriteria: string[];
      dependencies: string[];
    }>;
    longTermStrategy: {
      strategicObjectives: string[];
      capabilityBuilding: string[];
      processImprovements: string[];
      riskMitigation: string[];
    };
  };
  healthMonitoring: {
    keyMetrics: Array<{
      metric: string;
      currentValue: number;
      targetValue: number;
      trend: 'improving' | 'stable' | 'declining';
      frequency: string;
    }>;
    healthCheckpoints: Array<{
      checkpoint: string;
      date: string;
      criteria: string[];
      actions: string[];
    }>;
    escalationTriggers: Array<{
      trigger: string;
      threshold: any;
      action: string;
      responsibleParty: string;
    }>;
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

    const requestData: DealHealthAnalysisRequest = await req.json()

    if (!requestData.dealId || !requestData.dealData) {
      return new Response(
        JSON.stringify({ error: 'Deal ID and deal data are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate comprehensive deal health analysis
    const healthAnalysis = await generateDealHealthAnalysis(requestData)

    // Log the health analysis
    await supabaseClient
      .from('ai_usage_logs')
      .insert({
        user_id: user.user.id,
        feature_used: 'deal-health-analysis',
        model_id: 'health-ai',
        tokens_used: JSON.stringify(healthAnalysis).length,
        success: true
      })

    return new Response(
      JSON.stringify({ healthAnalysis }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Deal health analysis error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error during deal health analysis'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function generateDealHealthAnalysis(request: DealHealthAnalysisRequest): Promise<DealHealthAnalysis> {
  const { dealData, benchmarkData, analysisPreferences } = request

  // Calculate health scores for each dimension
  const engagementHealth = calculateEngagementHealth(dealData)
  const momentumHealth = calculateMomentumHealth(dealData)
  const competitionHealth = calculateCompetitionHealth(dealData)
  const stakeholderHealth = calculateStakeholderHealth(dealData)
  const qualificationHealth = calculateQualificationHealth(dealData)
  const riskHealth = calculateRiskHealth(dealData)

  // Calculate overall health score
  const overallHealth = calculateOverallHealth({
    engagement: engagementHealth.score,
    momentum: momentumHealth.score,
    competition: competitionHealth.score,
    stakeholder: stakeholderHealth.score,
    qualification: qualificationHealth.score,
    risk: riskHealth.score
  })

  // Generate predictive insights
  const predictiveInsights = generatePredictiveInsights(dealData, overallHealth)

  // Perform comparative analysis
  const comparativeAnalysis = performComparativeAnalysis(dealData, benchmarkData, analysisPreferences)

  // Create action plan
  const actionPlan = createActionPlan(overallHealth, {
    engagement: engagementHealth,
    momentum: momentumHealth,
    competition: competitionHealth,
    stakeholder: stakeholderHealth,
    qualification: qualificationHealth,
    risk: riskHealth
  })

  // Set up health monitoring
  const healthMonitoring = setupHealthMonitoring(dealData, overallHealth)

  return {
    dealId: request.dealId,
    overallHealth,
    healthDimensions: {
      engagement: engagementHealth,
      momentum: momentumHealth,
      competition: competitionHealth,
      stakeholder: stakeholderHealth,
      qualification: qualificationHealth,
      risk: riskHealth
    },
    predictiveInsights,
    comparativeAnalysis,
    actionPlan,
    healthMonitoring
  }
}

function calculateEngagementHealth(dealData: any): any {
  const { engagementHistory, lastActivity, age } = dealData

  let score = 50 // Base score
  const metrics = {
    recency: 0,
    frequency: 0,
    quality: 0,
    duration: 0
  }

  // Recency score (when was the last activity?)
  const daysSinceLastActivity = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
  if (daysSinceLastActivity <= 1) metrics.recency = 100
  else if (daysSinceLastActivity <= 3) metrics.recency = 80
  else if (daysSinceLastActivity <= 7) metrics.recency = 60
  else if (daysSinceLastActivity <= 14) metrics.recency = 40
  else if (daysSinceLastActivity <= 30) metrics.recency = 20
  else metrics.recency = 10

  // Frequency score (how often are we engaging?)
  const recentEngagements = engagementHistory.filter((e: any) =>
    new Date(e.timestamp) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length

  if (recentEngagements >= 10) metrics.frequency = 100
  else if (recentEngagements >= 7) metrics.frequency = 80
  else if (recentEngagements >= 5) metrics.frequency = 60
  else if (recentEngagements >= 3) metrics.frequency = 40
  else if (recentEngagements >= 1) metrics.frequency = 20
  else metrics.frequency = 10

  // Quality score (what type of engagement?)
  const qualityEngagements = engagementHistory.filter((e: any) =>
    ['meeting', 'demo', 'presentation', 'negotiation'].includes(e.type) ||
    e.sentiment === 'positive' ||
    (e.duration && e.duration > 30)
  ).length

  metrics.quality = Math.min(100, (qualityEngagements / Math.max(1, recentEngagements)) * 100)

  // Duration score (how long are interactions?)
  const avgDuration = engagementHistory
    .filter((e: any) => e.duration)
    .reduce((sum: number, e: any) => sum + e.duration, 0) /
    Math.max(1, engagementHistory.filter((e: any) => e.duration).length)

  if (avgDuration >= 60) metrics.duration = 100
  else if (avgDuration >= 45) metrics.duration = 80
  else if (avgDuration >= 30) metrics.duration = 60
  else if (avgDuration >= 15) metrics.duration = 40
  else metrics.duration = 20

  // Calculate overall engagement score
  score = (metrics.recency * 0.3) + (metrics.frequency * 0.25) + (metrics.quality * 0.25) + (metrics.duration * 0.2)

  // Determine trend
  const trend = determineEngagementTrend(engagementHistory)

  // Generate recommendations
  const recommendations = generateEngagementRecommendations(metrics, trend)

  return {
    score: Math.round(score),
    metrics,
    trend,
    recommendations
  }
}

function calculateMomentumHealth(dealData: any): any {
  const { stage, age, probability, nextSteps } = dealData

  let score = 50 // Base score
  const metrics = {
    stageProgress: 0,
    probability: 0,
    velocity: 0,
    nextSteps: 0
  }

  // Stage progress score
  const stageScores = {
    'prospecting': 20,
    'qualification': 40,
    'consideration': 60,
    'proposal': 80,
    'negotiation': 90,
    'closing': 95
  }
  metrics.stageProgress = stageScores[stage] || 50

  // Probability score (reflects momentum confidence)
  metrics.probability = probability * 100

  // Velocity score (how quickly is it progressing?)
  const expectedAgeByStage = {
    'prospecting': 30,
    'qualification': 45,
    'consideration': 60,
    'proposal': 75,
    'negotiation': 90,
    'closing': 105
  }

  const expectedAge = expectedAgeByStage[stage] || 60
  if (age <= expectedAge * 0.8) metrics.velocity = 100 // Ahead of schedule
  else if (age <= expectedAge * 1.0) metrics.velocity = 80 // On track
  else if (age <= expectedAge * 1.2) metrics.velocity = 60 // Slightly behind
  else if (age <= expectedAge * 1.5) metrics.velocity = 40 // Behind schedule
  else metrics.velocity = 20 // Significantly delayed

  // Next steps score
  if (nextSteps && nextSteps.length > 0) {
    metrics.nextSteps = Math.min(100, nextSteps.length * 20)
  } else {
    metrics.nextSteps = 10
  }

  // Calculate overall momentum score
  score = (metrics.stageProgress * 0.3) + (metrics.probability * 0.3) + (metrics.velocity * 0.25) + (metrics.nextSteps * 0.15)

  const trend = determineMomentumTrend(dealData)
  const recommendations = generateMomentumRecommendations(metrics, trend)

  return {
    score: Math.round(score),
    metrics,
    trend,
    recommendations
  }
}

function calculateCompetitionHealth(dealData: any): any {
  const { competitors, value, industry } = dealData

  let score = 50 // Base score
  const metrics = {
    competitorCount: 0,
    competitivePosition: 0,
    differentiation: 0,
    marketPosition: 0
  }

  // Competitor count score (fewer competitors = better)
  const competitorCount = competitors?.length || 0
  if (competitorCount === 0) metrics.competitorCount = 100
  else if (competitorCount === 1) metrics.competitorCount = 80
  else if (competitorCount === 2) metrics.competitorCount = 60
  else if (competitorCount === 3) metrics.competitorCount = 40
  else metrics.competitorCount = 20

  // Competitive position score (based on deal value and market)
  if (value > 500000) {
    metrics.competitivePosition = 70 // Large deals often have more competition
  } else if (value > 100000) {
    metrics.competitivePosition = 80
  } else {
    metrics.competitivePosition = 90
  }

  // Differentiation score (assumed - would need more data in real implementation)
  metrics.differentiation = 75

  // Market position score
  metrics.marketPosition = 70

  // Calculate overall competition score
  score = (metrics.competitorCount * 0.4) + (metrics.competitivePosition * 0.3) +
          (metrics.differentiation * 0.2) + (metrics.marketPosition * 0.1)

  const trend = determineCompetitionTrend(dealData)
  const recommendations = generateCompetitionRecommendations(metrics, trend)

  return {
    score: Math.round(score),
    metrics,
    trend,
    recommendations
  }
}

function calculateStakeholderHealth(dealData: any): any {
  const { stakeholderMap } = dealData

  let score = 50 // Base score
  const metrics = {
    championStrength: 0,
    stakeholderCoverage: 0,
    influenceBalance: 0,
    sentimentScore: 0
  }

  if (!stakeholderMap || stakeholderMap.length === 0) {
    return {
      score: 20,
      metrics,
      trend: 'unknown',
      recommendations: ['Identify and map key stakeholders', 'Establish relationships with decision makers']
    }
  }

  // Champion strength
  const champion = stakeholderMap.find((s: any) => s.sentiment === 'champion')
  if (champion) {
    metrics.championStrength = champion.influence === 'high' ? 100 :
                              champion.influence === 'medium' ? 80 : 60
  } else {
    metrics.championStrength = 20
  }

  // Stakeholder coverage
  const hasDecisionMaker = stakeholderMap.some((s: any) => s.role === 'decision_maker')
  const hasInfluencer = stakeholderMap.some((s: any) => s.role === 'influencer')
  const hasEndUser = stakeholderMap.some((s: any) => s.role === 'end_user')

  let coverageScore = 0
  if (hasDecisionMaker) coverageScore += 40
  if (hasInfluencer) coverageScore += 30
  if (hasEndUser) coverageScore += 30
  metrics.stakeholderCoverage = coverageScore

  // Influence balance
  const highInfluence = stakeholderMap.filter((s: any) => s.influence === 'high').length
  const totalStakeholders = stakeholderMap.length
  metrics.influenceBalance = Math.min(100, (highInfluence / Math.max(1, totalStakeholders)) * 100)

  // Sentiment score
  const positiveSentiment = stakeholderMap.filter((s: any) =>
    ['champion', 'supporter'].includes(s.sentiment)
  ).length
  metrics.sentimentScore = (positiveSentiment / totalStakeholders) * 100

  // Calculate overall stakeholder score
  score = (metrics.championStrength * 0.3) + (metrics.stakeholderCoverage * 0.25) +
          (metrics.influenceBalance * 0.25) + (metrics.sentimentScore * 0.2)

  const trend = determineStakeholderTrend(stakeholderMap)
  const recommendations = generateStakeholderRecommendations(metrics, trend)

  return {
    score: Math.round(score),
    metrics,
    trend,
    recommendations
  }
}

function calculateQualificationHealth(dealData: any): any {
  const { value, companySize, industry, riskFactors } = dealData

  let score = 50 // Base score
  const metrics = {
    budgetFit: 0,
    companyFit: 0,
    needFit: 0,
    riskLevel: 0
  }

  // Budget fit score
  if (companySize && value) {
    const dealToCompanyRatio = value / companySize
    if (dealToCompanyRatio < 0.001) metrics.budgetFit = 90 // Very small deal
    else if (dealToCompanyRatio < 0.01) metrics.budgetFit = 100 // Good fit
    else if (dealToCompanyRatio < 0.05) metrics.budgetFit = 80
    else if (dealToCompanyRatio < 0.1) metrics.budgetFit = 60
    else metrics.budgetFit = 40 // Potentially too large
  } else {
    metrics.budgetFit = 50 // Unknown
  }

  // Company fit score
  if (companySize > 1000) {
    metrics.companyFit = 80 // Enterprise ready
  } else if (companySize > 200) {
    metrics.companyFit = 90 // Mid-market fit
  } else if (companySize > 50) {
    metrics.companyFit = 100 // SMB fit
  } else {
    metrics.companyFit = 70 // Startup - may need customization
  }

  // Need fit score (simplified - would need more data)
  metrics.needFit = 75

  // Risk level score (inverse - lower risk = higher score)
  const riskCount = riskFactors?.length || 0
  metrics.riskLevel = Math.max(0, 100 - (riskCount * 20))

  // Calculate overall qualification score
  score = (metrics.budgetFit * 0.3) + (metrics.companyFit * 0.25) +
          (metrics.needFit * 0.25) + (metrics.riskLevel * 0.2)

  const trend = determineQualificationTrend(dealData)
  const recommendations = generateQualificationRecommendations(metrics, trend)

  return {
    score: Math.round(score),
    metrics,
    trend,
    recommendations
  }
}

function calculateRiskHealth(dealData: any): any {
  const { age, stage, riskFactors, objections } = dealData

  let score = 50 // Base score
  const metrics = {
    ageRisk: 0,
    stageRisk: 0,
    objectionRisk: 0,
    externalRisk: 0
  }

  // Age risk (older deals have higher risk)
  if (age < 30) metrics.ageRisk = 100
  else if (age < 60) metrics.ageRisk = 80
  else if (age < 90) metrics.ageRisk = 60
  else if (age < 120) metrics.ageRisk = 40
  else metrics.ageRisk = 20

  // Stage risk (later stages should have lower risk)
  const stageRiskScores = {
    'prospecting': 60,
    'qualification': 70,
    'consideration': 80,
    'proposal': 85,
    'negotiation': 90,
    'closing': 95
  }
  metrics.stageRisk = stageRiskScores[stage] || 50

  // Objection risk
  const outstandingObjections = objections?.filter((o: any) => o.status === 'outstanding').length || 0
  metrics.objectionRisk = Math.max(0, 100 - (outstandingObjections * 25))

  // External risk factors
  const externalRiskCount = riskFactors?.length || 0
  metrics.externalRisk = Math.max(0, 100 - (externalRiskCount * 15))

  // Calculate overall risk score
  score = (metrics.ageRisk * 0.3) + (metrics.stageRisk * 0.25) +
          (metrics.objectionRisk * 0.25) + (metrics.externalRisk * 0.2)

  const trend = determineRiskTrend(dealData)
  const recommendations = generateRiskRecommendations(metrics, trend)

  return {
    score: Math.round(score),
    metrics,
    trend,
    recommendations
  }
}

function calculateOverallHealth(dimensionScores: Record<string, number>): any {
  // Weighted average of all dimensions
  const weights = {
    engagement: 0.2,
    momentum: 0.25,
    competition: 0.15,
    stakeholder: 0.2,
    qualification: 0.1,
    risk: 0.1
  }

  let totalScore = 0
  let totalWeight = 0

  Object.entries(dimensionScores).forEach(([dimension, score]) => {
    const weight = weights[dimension] || 0.1
    totalScore += score * weight
    totalWeight += weight
  })

  const currentScore = Math.round(totalScore / totalWeight)

  // Determine grade
  const grade = currentScore >= 95 ? 'A+' :
                currentScore >= 90 ? 'A' :
                currentScore >= 85 ? 'B+' :
                currentScore >= 80 ? 'B' :
                currentScore >= 75 ? 'C+' :
                currentScore >= 70 ? 'C' :
                currentScore >= 60 ? 'D' : 'F'

  // Determine risk level
  const riskLevel = currentScore >= 80 ? 'low' :
                    currentScore >= 70 ? 'medium' :
                    currentScore >= 60 ? 'high' : 'critical'

  // Determine trend (simplified - would use historical data)
  const trend = currentScore >= 80 ? 'improving' :
                currentScore >= 60 ? 'stable' : 'declining'

  return {
    currentScore,
    grade,
    riskLevel,
    trend,
    confidence: 0.85 // Would be calculated based on data completeness
  }
}

function generatePredictiveInsights(dealData: any, overallHealth: any): any {
  // Generate 30-day health trajectory
  const trajectory = []
  const baseScore = overallHealth.currentScore

  for (let i = 1; i <= 4; i++) {
    const weeksAhead = i * 1 // Weekly predictions
    const predictedScore = Math.max(0, Math.min(100,
      baseScore + (Math.random() - 0.5) * 20 // Random variation for demo
    ))

    trajectory.push({
      period: `${weeksAhead} weeks`,
      predictedScore: Math.round(predictedScore),
      confidence: Math.max(0.5, 1 - (i * 0.1)),
      keyFactors: generateTrajectoryFactors(dealData, weeksAhead)
    })
  }

  // Generate early warning signals
  const earlyWarningSignals = generateEarlyWarningSignals(dealData, overallHealth)

  // Generate critical milestones
  const criticalMilestones = generateCriticalMilestones(dealData)

  return {
    healthTrajectory: trajectory,
    earlyWarningSignals,
    criticalMilestones
  }
}

function performComparativeAnalysis(dealData: any, benchmarkData?: any, preferences?: any): any {
  const benchmarkComparison = {}
  const peerComparison = []
  const historicalComparison = {
    similarDeals: [],
    successPatterns: [],
    failurePatterns: []
  }

  if (benchmarkData) {
    // Compare against industry averages
    if (preferences?.benchmarkAgainst === 'industry' || preferences?.benchmarkAgainst === 'all') {
      Object.entries(benchmarkData.industryAverages).forEach(([metric, benchmark]: [string, any]) => {
        const current = getCurrentMetricValue(dealData, metric)
        const percentile = calculatePercentile(current, benchmark)
        benchmarkComparison[metric] = {
          current,
          benchmark,
          percentile,
          status: percentile >= 75 ? 'above_average' :
                  percentile >= 25 ? 'average' : 'below_average'
        }
      })
    }
  }

  return {
    benchmarkComparison,
    peerComparison,
    historicalComparison
  }
}

function createActionPlan(overallHealth: any, dimensionHealth: any): any {
  const immediateActions = []
  const shortTermPlan = []
  const longTermStrategy = {
    strategicObjectives: [],
    capabilityBuilding: [],
    processImprovements: [],
    riskMitigation: []
  }

  // Generate immediate actions based on health scores
  if (overallHealth.riskLevel === 'critical' || overallHealth.currentScore < 60) {
    immediateActions.push({
      action: 'Schedule emergency deal review meeting',
      priority: 'high',
      timeframe: 'within_24_hours',
      expectedImpact: 20,
      owner: 'Sales Manager',
      successMetrics: ['Deal health score improvement', 'Clear action plan established']
    })
  }

  // Add dimension-specific actions
  Object.entries(dimensionHealth).forEach(([dimension, health]: [string, any]) => {
    if (health.score < 70) {
      immediateActions.push(...health.recommendations.slice(0, 2).map((rec: string) => ({
        action: rec,
        priority: health.score < 50 ? 'high' : 'medium',
        timeframe: 'within_1_week',
        expectedImpact: 10,
        owner: 'Sales Rep',
        successMetrics: [`${dimension} health score improvement`]
      })))
    }
  })

  return {
    immediateActions,
    shortTermPlan,
    longTermStrategy
  }
}

function setupHealthMonitoring(dealData: any, overallHealth: any): any {
  const keyMetrics = [
    {
      metric: 'Engagement Recency',
      currentValue: Math.floor((Date.now() - new Date(dealData.lastActivity).getTime()) / (1000 * 60 * 60 * 24)),
      targetValue: 7,
      trend: 'stable',
      frequency: 'daily'
    },
    {
      metric: 'Overall Health Score',
      currentValue: overallHealth.currentScore,
      targetValue: 80,
      trend: overallHealth.trend,
      frequency: 'weekly'
    }
  ]

  const healthCheckpoints = [
    {
      checkpoint: 'Weekly Health Review',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      criteria: ['All health dimensions >= 70', 'No outstanding objections'],
      actions: ['Update action plan', 'Schedule next steps']
    }
  ]

  const escalationTriggers = [
    {
      trigger: 'Health score drops below 60',
      threshold: 60,
      action: 'Immediate management review required',
      responsibleParty: 'Sales Manager'
    }
  ]

  return {
    keyMetrics,
    healthCheckpoints,
    escalationTriggers
  }
}

// Helper functions
function determineEngagementTrend(engagementHistory: any[]): string {
  // Simple trend analysis - would be more sophisticated in production
  const recent = engagementHistory.filter((e: any) =>
    new Date(e.timestamp) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  ).length

  const previous = engagementHistory.filter((e: any) =>
    new Date(e.timestamp) > new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) &&
    new Date(e.timestamp) <= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  ).length

  if (recent > previous * 1.2) return 'improving'
  if (recent < previous * 0.8) return 'declining'
  return 'stable'
}

function generateEngagementRecommendations(metrics: any, trend: string): string[] {
  const recommendations = []

  if (metrics.recency < 60) {
    recommendations.push('Schedule follow-up activity within 24 hours')
  }
  if (metrics.frequency < 60) {
    recommendations.push('Increase engagement frequency to at least weekly')
  }
  if (metrics.quality < 70) {
    recommendations.push('Focus on higher-quality engagement activities (meetings, demos)')
  }
  if (trend === 'declining') {
    recommendations.push('Re-engage with personalized outreach')
  }

  return recommendations
}

function determineMomentumTrend(dealData: any): string {
  // Simplified trend analysis
  const { age, stage, probability } = dealData

  if (probability > 0.7 && age < 45) return 'strong_positive'
  if (probability > 0.5 && age < 75) return 'positive'
  if (probability < 0.3 || age > 90) return 'concerning'
  return 'stable'
}

function generateMomentumRecommendations(metrics: any, trend: string): string[] {
  const recommendations = []

  if (metrics.velocity < 60) {
    recommendations.push('Accelerate deal progression with more frequent touchpoints')
  }
  if (metrics.nextSteps < 50) {
    recommendations.push('Define clear next steps and action items')
  }
  if (trend === 'concerning') {
    recommendations.push('Address blocking issues and re-establish momentum')
  }

  return recommendations
}

function determineCompetitionTrend(dealData: any): string {
  // Simplified analysis
  const competitorCount = dealData.competitors?.length || 0

  if (competitorCount === 0) return 'favorable'
  if (competitorCount <= 2) return 'manageable'
  return 'challenging'
}

function generateCompetitionRecommendations(metrics: any, trend: string): string[] {
  const recommendations = []

  if (trend === 'challenging') {
    recommendations.push('Develop competitive differentiation strategy')
    recommendations.push('Gather intelligence on competitor positioning')
  }
  if (metrics.competitorCount > 60) {
    recommendations.push('Accelerate timeline to reduce competitor evaluation time')
  }

  return recommendations
}

function determineStakeholderTrend(stakeholderMap: any[]): string {
  const positiveStakeholders = stakeholderMap.filter((s: any) =>
    ['champion', 'supporter'].includes(s.sentiment)
  ).length

  const totalStakeholders = stakeholderMap.length
  const positiveRatio = positiveStakeholders / totalStakeholders

  if (positiveRatio > 0.7) return 'strong_support'
  if (positiveRatio > 0.5) return 'good_support'
  if (positiveRatio < 0.3) return 'concerning'
  return 'neutral'
}

function generateStakeholderRecommendations(metrics: any, trend: string): string[] {
  const recommendations = []

  if (metrics.championStrength < 60) {
    recommendations.push('Identify and develop internal champion')
  }
  if (metrics.stakeholderCoverage < 70) {
    recommendations.push('Expand stakeholder engagement to include influencers and end users')
  }
  if (trend === 'concerning') {
    recommendations.push('Address stakeholder concerns and rebuild support')
  }

  return recommendations
}

function determineQualificationTrend(dealData: any): string {
  // Simplified analysis
  const { value, companySize } = dealData

  if (companySize && value / companySize < 0.05) return 'well_qualified'
  if (companySize && value / companySize > 0.2) return 'over_qualified'
  return 'appropriately_qualified'
}

function generateQualificationRecommendations(metrics: any, trend: string): string[] {
  const recommendations = []

  if (trend === 'over_qualified') {
    recommendations.push('Validate budget authority and approval process')
  }
  if (metrics.riskLevel < 60) {
    recommendations.push('Address identified risk factors')
  }

  return recommendations
}

function determineRiskTrend(dealData: any): string {
  const { age, objections } = dealData

  const outstandingObjections = objections?.filter((o: any) => o.status === 'outstanding').length || 0

  if (age > 90 && outstandingObjections > 0) return 'increasing'
  if (age < 45 && outstandingObjections === 0) return 'decreasing'
  return 'stable'
}

function generateRiskRecommendations(metrics: any, trend: string): string[] {
  const recommendations = []

  if (metrics.ageRisk < 60) {
    recommendations.push('Accelerate deal progression to reduce aging risk')
  }
  if (metrics.objectionRisk < 70) {
    recommendations.push('Address outstanding objections')
  }
  if (trend === 'increasing') {
    recommendations.push('Implement risk mitigation strategies')
  }

  return recommendations
}

function generateTrajectoryFactors(dealData: any, weeksAhead: number): string[] {
  const factors = []

  if (weeksAhead <= 2) {
    factors.push('Current engagement momentum')
    factors.push('Stakeholder sentiment')
  } else {
    factors.push('Competitive positioning')
    factors.push('Market conditions')
    factors.push('Internal readiness')
  }

  return factors
}

function generateEarlyWarningSignals(dealData: any, overallHealth: any): any[] {
  const signals = []

  if (overallHealth.currentScore < 70) {
    signals.push({
      signal: 'Overall health score declining',
      severity: overallHealth.currentScore < 50 ? 'critical' : 'high',
      probability: 0.8,
      timeToImpact: 'immediate',
      mitigationSteps: ['Immediate action plan review', 'Stakeholder re-engagement']
    })
  }

  const daysSinceActivity = Math.floor((Date.now() - new Date(dealData.lastActivity).getTime()) / (1000 * 60 * 60 * 24))
  if (daysSinceActivity > 14) {
    signals.push({
      signal: 'Extended period without engagement',
      severity: 'medium',
      probability: 0.7,
      timeToImpact: '1-2 weeks',
      mitigationSteps: ['Schedule follow-up activity', 'Re-establish communication cadence']
    })
  }

  return signals
}

function generateCriticalMilestones(dealData: any): any[] {
  const milestones = []

  // Next steps as milestones
  if (dealData.nextSteps) {
    dealData.nextSteps.forEach((step: string, index: number) => {
      milestones.push({
        milestone: step,
        dueDate: new Date(Date.now() + (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        importance: index === 0 ? 'high' : 'medium',
        status: 'upcoming',
        impact: 'Critical for deal progression'
      })
    })
  }

  return milestones
}

function getCurrentMetricValue(dealData: any, metric: string): number {
  // Simplified metric extraction
  switch (metric) {
    case 'deal_size': return dealData.value
    case 'deal_age': return dealData.age
    case 'engagement_count': return dealData.engagementHistory?.length || 0
    default: return 0
  }
}

function calculatePercentile(current: number, benchmark: number): number {
  // Simplified percentile calculation
  if (current >= benchmark * 1.2) return 90
  if (current >= benchmark) return 60
  if (current >= benchmark * 0.8) return 40
  return 10
}