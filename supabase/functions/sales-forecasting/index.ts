import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Sales Forecasting Edge Function - ProductIntel Pro
 *
 * AI-powered pipeline analysis and revenue prediction for sales professionals:
 * - Pipeline velocity and conversion rate analysis
 * - Win probability calculations with confidence intervals
 * - Revenue forecasting with seasonal adjustments
 * - Risk assessment and mitigation strategies
 * - Forecast accuracy tracking and improvement
 * - Market trend analysis and external factors
 *
 * Designed to help sales executives like Sam predict performance
 * and make data-driven decisions about their pipeline and quotas.
 *
 * @route POST /functions/v1/sales-forecasting
 */

interface SalesForecastingRequest {
  forecastType: 'pipeline' | 'revenue' | 'quota_attainment' | 'seasonal' | 'risk_analysis';
  timeRange: {
    startDate: string;
    endDate: string;
    granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  };
  pipelineData: Array<{
    id: string;
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
  }>;
  historicalData?: Array<{
    period: string;
    wonDeals: number;
    lostDeals: number;
    totalValue: number;
    averageDealSize: number;
    conversionRate: number;
    salesCycleLength: number;
  }>;
  marketFactors?: {
    industryTrends: Record<string, number>;
    economicIndicators: Record<string, number>;
    competitiveLandscape: Record<string, any>;
    seasonalPatterns: Record<string, number>;
  };
  salesTeam?: {
    totalReps: number;
    averageQuota: number;
    experienceLevels: Record<string, number>;
    territoryDistribution: Record<string, number>;
  };
}

interface SalesForecast {
  forecastId: string;
  forecastType: string;
  timeRange: any;
  executiveSummary: {
    totalPipelineValue: number;
    forecastedRevenue: number;
    confidenceLevel: number;
    keyDrivers: string[];
    majorRisks: string[];
    recommendedActions: string[];
  };
  pipelineAnalysis: {
    pipelineHealth: {
      score: number;
      velocity: number;
      conversionRates: Record<string, number>;
      bottleneckStages: string[];
      agingAnalysis: any;
    };
    stageAnalysis: Array<{
      stage: string;
      dealCount: number;
      totalValue: number;
      averageValue: number;
      averageAge: number;
      conversionRate: number;
      riskLevel: string;
    }>;
    velocityMetrics: {
      dealsPerMonth: number;
      averageSalesCycle: number;
      pipelineCoverage: number;
      winRate: number;
    };
  };
  revenueForecast: {
    baseCase: {
      totalRevenue: number;
      monthlyBreakdown: Record<string, number>;
      quarterlyBreakdown: Record<string, number>;
      confidenceInterval: {
        lower: number;
        upper: number;
        confidence: number;
      };
    };
    optimisticCase: {
      totalRevenue: number;
      assumptions: string[];
      probability: number;
    };
    pessimisticCase: {
      totalRevenue: number;
      assumptions: string[];
      probability: number;
    };
    seasonalAdjustments: Record<string, number>;
    marketAdjustments: Record<string, number>;
  };
  riskAssessment: {
    overallRiskScore: number;
    riskFactors: Array<{
      factor: string;
      impact: number;
      probability: number;
      mitigationStrategy: string;
      owner: string;
    }>;
    earlyWarningSignals: string[];
    contingencyPlans: Array<{
      scenario: string;
      trigger: string;
      action: string;
      responsibleParty: string;
    }>;
  };
  opportunityAnalysis: {
    highProbabilityDeals: Array<{
      id: string;
      name: string;
      value: number;
      probability: number;
      closingDate: string;
      keyFactors: string[];
    }>;
    accelerationOpportunities: Array<{
      id: string;
      name: string;
      currentStage: string;
      recommendedActions: string[];
      potentialImpact: number;
      timeToClose: number;
    }>;
    expansionOpportunities: Array<{
      account: string;
      currentValue: number;
      potentialValue: number;
      expansionAreas: string[];
      successProbability: number;
    }>;
  };
  forecastAccuracy: {
    historicalAccuracy: number;
    forecastBias: number;
    improvementRecommendations: string[];
    trackingMetrics: Record<string, number>;
  };
  actionableInsights: {
    immediateActions: Array<{
      action: string;
      priority: 'high' | 'medium' | 'low';
      expectedImpact: number;
      timeline: string;
      owner: string;
    }>;
    strategicRecommendations: Array<{
      recommendation: string;
      rationale: string;
      implementationSteps: string[];
      expectedOutcome: string;
      timeframe: string;
    }>;
    teamCoaching: Array<{
      focusArea: string;
      currentPerformance: number;
      targetPerformance: number;
      coachingTips: string[];
      trainingRecommendations: string[];
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

    const requestData: SalesForecastingRequest = await req.json()

    if (!requestData.pipelineData || requestData.pipelineData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Pipeline data is required for forecasting' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate comprehensive sales forecast
    const forecast = await generateSalesForecast(requestData)

    // Log the forecast generation
    await supabaseClient
      .from('ai_usage_logs')
      .insert({
        user_id: user.user.id,
        feature_used: 'sales-forecasting',
        model_id: 'forecast-ai',
        tokens_used: JSON.stringify(forecast).length,
        success: true
      })

    return new Response(
      JSON.stringify({ forecast }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Sales forecasting error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error during sales forecasting analysis'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function generateSalesForecast(request: SalesForecastingRequest): Promise<SalesForecast> {
  const { forecastType, timeRange, pipelineData, historicalData, marketFactors, salesTeam } = request

  // Analyze pipeline health and metrics
  const pipelineAnalysis = analyzePipelineHealth(pipelineData, historicalData)

  // Generate revenue forecast
  const revenueForecast = generateRevenueForecast(pipelineData, historicalData, marketFactors, timeRange)

  // Assess risks and opportunities
  const riskAssessment = assessForecastRisks(pipelineData, historicalData, marketFactors)
  const opportunityAnalysis = identifyOpportunities(pipelineData, historicalData)

  // Calculate forecast accuracy metrics
  const forecastAccuracy = calculateForecastAccuracy(historicalData)

  // Generate actionable insights
  const actionableInsights = generateActionableInsights(
    pipelineAnalysis,
    revenueForecast,
    riskAssessment,
    salesTeam
  )

  const forecastId = `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  return {
    forecastId,
    forecastType,
    timeRange,
    executiveSummary: generateExecutiveSummary(
      pipelineAnalysis,
      revenueForecast,
      riskAssessment,
      opportunityAnalysis
    ),
    pipelineAnalysis,
    revenueForecast,
    riskAssessment,
    opportunityAnalysis,
    forecastAccuracy,
    actionableInsights
  }
}

function analyzePipelineHealth(pipelineData: any[], historicalData?: any[]): any {
  // Calculate pipeline metrics
  const totalValue = pipelineData.reduce((sum, deal) => sum + deal.value, 0)
  const dealCount = pipelineData.length

  // Group deals by stage
  const stageGroups = pipelineData.reduce((acc, deal) => {
    if (!acc[deal.stage]) acc[deal.stage] = []
    acc[deal.stage].push(deal)
    return acc
  }, {})

  // Calculate stage analysis
  const stageAnalysis = Object.entries(stageGroups).map(([stage, deals]: [string, any[]]) => {
    const stageValue = deals.reduce((sum, deal) => sum + deal.value, 0)
    const avgAge = deals.reduce((sum, deal) => sum + deal.age, 0) / deals.length
    const avgProbability = deals.reduce((sum, deal) => sum + deal.probability, 0) / deals.length

    return {
      stage,
      dealCount: deals.length,
      totalValue: stageValue,
      averageValue: stageValue / deals.length,
      averageAge: avgAge,
      conversionRate: calculateStageConversionRate(stage, historicalData),
      riskLevel: determineStageRisk(stage, avgAge, deals)
    }
  })

  // Calculate velocity metrics
  const velocityMetrics = calculateVelocityMetrics(pipelineData, historicalData)

  // Calculate pipeline health score
  const healthScore = calculatePipelineHealthScore(stageAnalysis, velocityMetrics)

  return {
    pipelineHealth: {
      score: healthScore,
      velocity: velocityMetrics.dealsPerMonth,
      conversionRates: stageAnalysis.reduce((acc, stage) => {
        acc[stage.stage] = stage.conversionRate
        return acc
      }, {}),
      bottleneckStages: identifyBottleneckStages(stageAnalysis),
      agingAnalysis: analyzePipelineAging(pipelineData)
    },
    stageAnalysis,
    velocityMetrics
  }
}

function calculateStageConversionRate(stage: string, historicalData?: any[]): number {
  if (!historicalData) return 0.5 // Default conversion rate

  // Calculate conversion rate based on historical data
  const stageData = historicalData.filter(h => h.stage === stage)
  if (stageData.length === 0) return 0.5

  const totalDeals = stageData.reduce((sum, h) => sum + h.totalDeals, 0)
  const wonDeals = stageData.reduce((sum, h) => sum + h.wonDeals, 0)

  return wonDeals / totalDeals
}

function determineStageRisk(stage: string, avgAge: number, deals: any[]): string {
  let riskScore = 0

  // Age-based risk
  if (avgAge > 90) riskScore += 30
  else if (avgAge > 60) riskScore += 20
  else if (avgAge > 30) riskScore += 10

  // Deal count risk
  if (deals.length > 20) riskScore += 15 // Too many deals in one stage

  // Stage-specific risks
  if (stage === 'prospecting' && avgAge > 14) riskScore += 20
  if (stage === 'proposal' && avgAge > 45) riskScore += 25
  if (stage === 'negotiation' && avgAge > 30) riskScore += 15

  if (riskScore >= 60) return 'high'
  if (riskScore >= 30) return 'medium'
  return 'low'
}

function calculateVelocityMetrics(pipelineData: any[], historicalData?: any[]): any {
  const totalValue = pipelineData.reduce((sum, deal) => sum + deal.value, 0)
  const dealCount = pipelineData.length

  // Calculate deals per month
  const avgDealSize = totalValue / dealCount
  const dealsPerMonth = historicalData ?
    historicalData.reduce((sum, h) => sum + h.wonDeals, 0) / historicalData.length : 4

  // Calculate average sales cycle
  const avgSalesCycle = pipelineData.reduce((sum, deal) => sum + deal.age, 0) / dealCount

  // Calculate pipeline coverage (months of quota covered)
  const monthlyTarget = historicalData ?
    historicalData.reduce((sum, h) => sum + h.totalValue, 0) / historicalData.length / 3 : 100000
  const pipelineCoverage = totalValue / monthlyTarget

  // Calculate win rate
  const winRate = historicalData ?
    historicalData.reduce((sum, h) => sum + h.wonDeals, 0) /
    historicalData.reduce((sum, h) => sum + h.totalDeals, 0) : 0.25

  return {
    dealsPerMonth,
    averageSalesCycle: avgSalesCycle,
    pipelineCoverage,
    winRate,
    averageDealSize: avgDealSize
  }
}

function calculatePipelineHealthScore(stageAnalysis: any[], velocityMetrics: any): number {
  let score = 50 // Base score

  // Stage distribution score (20 points)
  const idealDistribution = {
    'prospecting': 0.3,
    'qualification': 0.25,
    'proposal': 0.2,
    'negotiation': 0.15,
    'closing': 0.1
  }

  let distributionScore = 0
  const totalDeals = stageAnalysis.reduce((sum, stage) => sum + stage.dealCount, 0)

  stageAnalysis.forEach(stage => {
    const actualRatio = stage.dealCount / totalDeals
    const idealRatio = idealDistribution[stage.stage] || 0.1
    const ratioDiff = Math.abs(actualRatio - idealRatio)
    distributionScore += (1 - ratioDiff) * (idealRatio * 100)
  })

  score += distributionScore * 0.4

  // Velocity score (20 points)
  if (velocityMetrics.pipelineCoverage >= 3) score += 20
  else if (velocityMetrics.pipelineCoverage >= 2) score += 15
  else if (velocityMetrics.pipelineCoverage >= 1.5) score += 10
  else if (velocityMetrics.pipelineCoverage >= 1) score += 5

  // Conversion rate score (20 points)
  const avgConversionRate = stageAnalysis.reduce((sum, stage) => sum + stage.conversionRate, 0) / stageAnalysis.length
  score += avgConversionRate * 20

  // Risk score (20 points)
  const highRiskStages = stageAnalysis.filter(stage => stage.riskLevel === 'high').length
  const riskPenalty = highRiskStages * 5
  score -= riskPenalty

  return Math.max(0, Math.min(100, score))
}

function identifyBottleneckStages(stageAnalysis: any[]): string[] {
  return stageAnalysis
    .filter(stage => stage.riskLevel === 'high' || stage.averageAge > 60)
    .map(stage => stage.stage)
}

function analyzePipelineAging(pipelineData: any[]): any {
  const ageBuckets = {
    '0-30': 0,
    '31-60': 0,
    '61-90': 0,
    '91-120': 0,
    '120+': 0
  }

  pipelineData.forEach(deal => {
    if (deal.age <= 30) ageBuckets['0-30']++
    else if (deal.age <= 60) ageBuckets['31-60']++
    else if (deal.age <= 90) ageBuckets['61-90']++
    else if (deal.age <= 120) ageBuckets['91-120']++
    else ageBuckets['120+']++
  })

  const agingRisk = ageBuckets['120+'] / pipelineData.length

  return {
    ageDistribution: ageBuckets,
    agingRisk: agingRisk > 0.2 ? 'high' : agingRisk > 0.1 ? 'medium' : 'low',
    recommendations: agingRisk > 0.2 ?
      ['Review and potentially disqualify aged deals', 'Focus on accelerating older opportunities'] :
      ['Monitor aging deals closely', 'Implement regular pipeline reviews']
  }
}

function generateRevenueForecast(
  pipelineData: any[],
  historicalData?: any[],
  marketFactors?: any,
  timeRange?: any
): any {
  const totalPipelineValue = pipelineData.reduce((sum, deal) => sum + deal.value, 0)
  const weightedValue = pipelineData.reduce((sum, deal) => sum + (deal.value * deal.probability), 0)

  // Base case forecast
  const baseCase = calculateBaseCaseForecast(pipelineData, historicalData, timeRange)

  // Apply market adjustments
  const marketAdjustments = calculateMarketAdjustments(marketFactors, timeRange)

  // Apply seasonal adjustments
  const seasonalAdjustments = calculateSeasonalAdjustments(timeRange)

  // Calculate confidence intervals
  const confidenceInterval = calculateConfidenceInterval(baseCase.totalRevenue, pipelineData)

  return {
    baseCase: {
      totalRevenue: baseCase.totalRevenue,
      monthlyBreakdown: baseCase.monthlyBreakdown,
      quarterlyBreakdown: baseCase.quarterlyBreakdown,
      confidenceInterval
    },
    optimisticCase: generateOptimisticCase(baseCase, pipelineData),
    pessimisticCase: generatePessimisticCase(baseCase, pipelineData),
    seasonalAdjustments,
    marketAdjustments
  }
}

function calculateBaseCaseForecast(pipelineData: any[], historicalData?: any[], timeRange?: any): any {
  const monthlyBreakdown = {}
  const quarterlyBreakdown = {}

  // Group deals by expected close date
  const dealsByMonth = pipelineData.reduce((acc, deal) => {
    // Estimate close date based on stage and age
    const estimatedCloseDate = estimateCloseDate(deal)
    const monthKey = estimatedCloseDate.toISOString().substring(0, 7) // YYYY-MM

    if (!acc[monthKey]) acc[monthKey] = []
    acc[monthKey].push(deal)
    return acc
  }, {})

  // Calculate monthly revenue
  let totalRevenue = 0
  Object.entries(dealsByMonth).forEach(([month, deals]: [string, any[]]) => {
    const monthlyValue = deals.reduce((sum, deal) => sum + (deal.value * deal.probability), 0)
    monthlyBreakdown[month] = monthlyValue
    totalRevenue += monthlyValue

    // Add to quarterly breakdown
    const quarter = getQuarterFromMonth(month)
    quarterlyBreakdown[quarter] = (quarterlyBreakdown[quarter] || 0) + monthlyValue
  })

  return {
    totalRevenue,
    monthlyBreakdown,
    quarterlyBreakdown
  }
}

function estimateCloseDate(deal: any): Date {
  const baseDate = new Date()
  let daysToAdd = 0

  // Base days by stage
  const stageDays = {
    'prospecting': 60,
    'qualification': 45,
    'proposal': 30,
    'negotiation': 15,
    'closing': 7
  }

  daysToAdd = stageDays[deal.stage] || 30

  // Adjust for deal age
  if (deal.age > daysToAdd) {
    daysToAdd = Math.max(7, daysToAdd - (deal.age - daysToAdd) * 0.5)
  }

  // Adjust for deal size (larger deals take longer)
  if (deal.value > 100000) {
    daysToAdd *= 1.2
  }

  baseDate.setDate(baseDate.getDate() + daysToAdd)
  return baseDate
}

function getQuarterFromMonth(monthKey: string): string {
  const month = parseInt(monthKey.split('-')[1])
  const year = monthKey.split('-')[0]
  const quarter = Math.ceil(month / 3)
  return `${year}-Q${quarter}`
}

function calculateMarketAdjustments(marketFactors?: any, timeRange?: any): Record<string, number> {
  if (!marketFactors) return {}

  const adjustments = {}

  // Industry trend adjustments
  if (marketFactors.industryTrends) {
    Object.entries(marketFactors.industryTrends).forEach(([industry, growth]: [string, number]) => {
      adjustments[`industry_${industry}`] = growth
    })
  }

  // Economic indicator adjustments
  if (marketFactors.economicIndicators) {
    const avgEconomicGrowth = Object.values(marketFactors.economicIndicators).reduce((sum: number, val: number) => sum + val, 0) /
                             Object.values(marketFactors.economicIndicators).length
    adjustments['economic'] = avgEconomicGrowth
  }

  return adjustments
}

function calculateSeasonalAdjustments(timeRange?: any): Record<string, number> {
  const adjustments = {}

  // Typical B2B sales patterns
  const seasonalFactors = {
    '01': 0.8,  // January - post-holiday slowdown
    '02': 0.9,  // February - planning season
    '03': 1.2,  // March - Q1 push
    '04': 1.0,  // April - steady
    '05': 0.9,  // May - pre-summer slowdown
    '06': 0.8,  // June - summer slowdown
    '07': 0.7,  // July - vacation season
    '08': 0.8,  // August - return from vacation
    '09': 1.1,  // September - Q4 planning
    '10': 1.3,  // October - Q4 push
    '11': 1.4,  // November - peak selling
    '12': 1.2   // December - year-end push
  }

  if (timeRange?.startDate && timeRange?.endDate) {
    const startDate = new Date(timeRange.startDate)
    const endDate = new Date(timeRange.endDate)

    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      adjustments[monthKey] = seasonalFactors[monthKey.split('-')[1]] || 1.0
    }
  }

  return adjustments
}

function calculateConfidenceInterval(baseRevenue: number, pipelineData: any[]): any {
  // Calculate standard deviation of deal probabilities
  const probabilities = pipelineData.map(deal => deal.probability)
  const avgProbability = probabilities.reduce((sum, p) => sum + p, 0) / probabilities.length
  const variance = probabilities.reduce((sum, p) => sum + Math.pow(p - avgProbability, 2), 0) / probabilities.length
  const stdDev = Math.sqrt(variance)

  // Calculate confidence interval (95%)
  const marginOfError = 1.96 * stdDev * Math.sqrt(baseRevenue) / Math.sqrt(pipelineData.length)

  return {
    lower: Math.max(0, baseRevenue - marginOfError),
    upper: baseRevenue + marginOfError,
    confidence: 0.95
  }
}

function generateOptimisticCase(baseCase: any, pipelineData: any[]): any {
  // Optimistic case: 20% higher probability for all deals
  const optimisticRevenue = pipelineData.reduce((sum, deal) => {
    const optimisticProb = Math.min(1.0, deal.probability * 1.2)
    return sum + (deal.value * optimisticProb)
  }, 0)

  return {
    totalRevenue: optimisticRevenue,
    assumptions: [
      'All deals progress as planned',
      'No major competitive disruptions',
      'Economic conditions remain favorable',
      'Team performance exceeds expectations'
    ],
    probability: 0.3
  }
}

function generatePessimisticCase(baseCase: any, pipelineData: any[]): any {
  // Pessimistic case: 20% lower probability for all deals
  const pessimisticRevenue = pipelineData.reduce((sum, deal) => {
    const pessimisticProb = Math.max(0.1, deal.probability * 0.8)
    return sum + (deal.value * pessimisticProb)
  }, 0)

  return {
    totalRevenue: pessimisticRevenue,
    assumptions: [
      'Some deals experience delays',
      'Increased competitive pressure',
      'Economic headwinds impact buying decisions',
      'Team faces resource constraints'
    ],
    probability: 0.2
  }
}

function assessForecastRisks(pipelineData: any[], historicalData?: any[], marketFactors?: any): any {
  const riskFactors = []
  let overallRiskScore = 0

  // Pipeline concentration risk
  const topDealValue = Math.max(...pipelineData.map(d => d.value))
  const totalValue = pipelineData.reduce((sum, d) => sum + d.value, 0)
  const concentrationRatio = topDealValue / totalValue

  if (concentrationRatio > 0.3) {
    riskFactors.push({
      factor: 'Pipeline concentration',
      impact: 25,
      probability: 0.6,
      mitigationStrategy: 'Diversify pipeline with more deals',
      owner: 'Sales Manager'
    })
    overallRiskScore += 15
  }

  // Age-related risks
  const oldDeals = pipelineData.filter(d => d.age > 90)
  if (oldDeals.length > pipelineData.length * 0.2) {
    riskFactors.push({
      factor: 'Aging pipeline',
      impact: 20,
      probability: 0.7,
      mitigationStrategy: 'Review and accelerate or disqualify old deals',
      owner: 'Sales Reps'
    })
    overallRiskScore += 14
  }

  // Market risks
  if (marketFactors?.economicIndicators) {
    const economicRisk = Object.values(marketFactors.economicIndicators).some((val: number) => val < -0.02)
    if (economicRisk) {
      riskFactors.push({
        factor: 'Economic headwinds',
        impact: 30,
        probability: 0.4,
        mitigationStrategy: 'Focus on recession-resistant industries',
        owner: 'Sales Leadership'
      })
      overallRiskScore += 12
    }
  }

  // Competitive risks
  const competitivePressure = pipelineData.filter(d => d.competitors?.length > 2)
  if (competitivePressure.length > pipelineData.length * 0.3) {
    riskFactors.push({
      factor: 'High competitive pressure',
      impact: 20,
      probability: 0.5,
      mitigationStrategy: 'Develop competitive differentiation strategies',
      owner: 'Sales Reps'
    })
    overallRiskScore += 10
  }

  return {
    overallRiskScore: Math.min(100, overallRiskScore),
    riskFactors,
    earlyWarningSignals: generateEarlyWarningSignals(riskFactors),
    contingencyPlans: generateContingencyPlans(riskFactors)
  }
}

function generateEarlyWarningSignals(riskFactors: any[]): string[] {
  const signals = []

  riskFactors.forEach(risk => {
    switch (risk.factor) {
      case 'Pipeline concentration':
        signals.push('Single large deal represents >30% of pipeline')
        signals.push('Loss of top deal would significantly impact forecast')
        break
      case 'Aging pipeline':
        signals.push('Deals in pipeline >90 days without progress')
        signals.push('Increasing number of stalled opportunities')
        break
      case 'Economic headwinds':
        signals.push('Prospects delaying decisions due to economic uncertainty')
        signals.push('Increased focus on cost savings over growth initiatives')
        break
      case 'High competitive pressure':
        signals.push('Competitors winning deals at higher rate')
        signals.push('Prospects mentioning multiple vendor evaluations')
        break
    }
  })

  return signals
}

function generateContingencyPlans(riskFactors: any[]): any[] {
  const plans = []

  riskFactors.forEach(risk => {
    plans.push({
      scenario: risk.factor,
      trigger: `Risk score exceeds ${risk.impact}`,
      action: risk.mitigationStrategy,
      responsibleParty: risk.owner
    })
  })

  return plans
}

function identifyOpportunities(pipelineData: any[], historicalData?: any[]): any {
  // High probability deals
  const highProbabilityDeals = pipelineData
    .filter(deal => deal.probability > 0.7)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map(deal => ({
      id: deal.id,
      name: deal.name,
      value: deal.value,
      probability: deal.probability,
      closingDate: estimateCloseDate(deal).toISOString().split('T')[0],
      keyFactors: generateKeySuccessFactors(deal)
    }))

  // Acceleration opportunities
  const accelerationOpportunities = pipelineData
    .filter(deal => deal.probability > 0.4 && deal.age < 30)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map(deal => ({
      id: deal.id,
      name: deal.name,
      currentStage: deal.stage,
      recommendedActions: generateAccelerationActions(deal),
      potentialImpact: deal.value * 0.2, // Potential 20% acceleration value
      timeToClose: Math.max(7, estimateCloseDate(deal).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    }))

  // Expansion opportunities (based on account size and industry)
  const expansionOpportunities = pipelineData
    .filter(deal => deal.companySize > 500 && deal.probability > 0.3)
    .map(deal => ({
      account: deal.name,
      currentValue: deal.value,
      potentialValue: deal.value * 2.5, // Assume 2.5x expansion potential
      expansionAreas: generateExpansionAreas(deal),
      successProbability: deal.probability * 0.8
    }))

  return {
    highProbabilityDeals,
    accelerationOpportunities,
    expansionOpportunities
  }
}

function generateKeySuccessFactors(deal: any): string[] {
  const factors = []

  if (deal.probability > 0.8) factors.push('Strong champion identified')
  if (deal.age < 45) factors.push('Recent engagement momentum')
  if (deal.competitors?.length < 2) factors.push('Limited competition')
  if (deal.nextSteps?.length > 0) factors.push('Clear next steps defined')

  return factors
}

function generateAccelerationActions(deal: any): string[] {
  const actions = []

  if (deal.stage === 'prospecting') {
    actions.push('Schedule discovery call within 3 days')
    actions.push('Send personalized value proposition')
  } else if (deal.stage === 'qualification') {
    actions.push('Complete technical requirements gathering')
    actions.push('Identify and engage decision maker')
  } else if (deal.stage === 'proposal') {
    actions.push('Follow up on proposal within 24 hours')
    actions.push('Prepare for objection handling')
  }

  return actions
}

function generateExpansionAreas(deal: any): string[] {
  const areas = []

  if (deal.industry === 'technology') {
    areas.push('Additional product licenses', 'Professional services', 'Training programs')
  } else if (deal.industry === 'healthcare') {
    areas.push('Additional facilities', 'Extended care services', 'Telemedicine solutions')
  } else {
    areas.push('Additional locations', 'Expanded service offerings', 'Premium support packages')
  }

  return areas
}

function calculateForecastAccuracy(historicalData?: any[]): any {
  if (!historicalData || historicalData.length < 3) {
    return {
      historicalAccuracy: 0.7, // Default accuracy
      forecastBias: 0,
      improvementRecommendations: ['Collect more historical data for better accuracy'],
      trackingMetrics: {}
    }
  }

  // Calculate forecast accuracy based on historical forecasts vs actuals
  const accuracyMetrics = historicalData.map(h => {
    const forecastedWinRate = h.wonDeals / h.totalDeals
    const actualWinRate = h.conversionRate
    return Math.abs(forecastedWinRate - actualWinRate) / actualWinRate
  })

  const avgAccuracy = 1 - (accuracyMetrics.reduce((sum, acc) => sum + acc, 0) / accuracyMetrics.length)

  // Calculate forecast bias (tendency to over/under forecast)
  const biases = historicalData.map(h => (h.wonDeals - (h.totalDeals * h.conversionRate)) / h.totalDeals)
  const avgBias = biases.reduce((sum, bias) => sum + bias, 0) / biases.length

  return {
    historicalAccuracy: Math.max(0, Math.min(1, avgAccuracy)),
    forecastBias: avgBias,
    improvementRecommendations: generateAccuracyRecommendations(avgAccuracy, avgBias),
    trackingMetrics: {
      meanAbsolutePercentageError: accuracyMetrics.reduce((sum, acc) => sum + acc, 0) / accuracyMetrics.length,
      forecastBias: avgBias,
      dataPoints: historicalData.length
    }
  }
}

function generateAccuracyRecommendations(accuracy: number, bias: number): string[] {
  const recommendations = []

  if (accuracy < 0.7) {
    recommendations.push('Review and improve probability assignments')
    recommendations.push('Implement regular pipeline reviews')
  }

  if (Math.abs(bias) > 0.1) {
    if (bias > 0) {
      recommendations.push('Address tendency to over-forecast deals')
    } else {
      recommendations.push('Address tendency to under-forecast deals')
    }
  }

  recommendations.push('Track forecast accuracy monthly')
  recommendations.push('Use historical data to calibrate probability estimates')

  return recommendations
}

function generateActionableInsights(
  pipelineAnalysis: any,
  revenueForecast: any,
  riskAssessment: any,
  salesTeam?: any
): any {
  const immediateActions = []
  const strategicRecommendations = []
  const teamCoaching = []

  // Immediate actions based on pipeline health
  if (pipelineAnalysis.pipelineHealth.score < 60) {
    immediateActions.push({
      action: 'Conduct emergency pipeline review',
      priority: 'high',
      expectedImpact: 15,
      timeline: 'within_24_hours',
      owner: 'Sales Manager'
    })
  }

  // Actions based on bottleneck stages
  pipelineAnalysis.pipelineHealth.bottleneckStages.forEach(stage => {
    immediateActions.push({
      action: `Address bottleneck in ${stage} stage`,
      priority: 'high',
      expectedImpact: 10,
      timeline: 'within_1_week',
      owner: 'Sales Operations'
    })
  })

  // Revenue gap actions
  const revenueGap = calculateRevenueGap(revenueForecast, salesTeam)
  if (revenueGap > 0.2) {
    immediateActions.push({
      action: 'Develop gap-closing plan',
      priority: 'high',
      expectedImpact: 20,
      timeline: 'within_3_days',
      owner: 'Sales Leadership'
    })
  }

  // Strategic recommendations
  strategicRecommendations.push({
    recommendation: 'Implement forecast accuracy tracking',
    rationale: 'Improve prediction accuracy over time',
    implementationSteps: [
      'Set up monthly forecast vs actual tracking',
      'Identify root causes of forecast errors',
      'Adjust forecasting methodology based on learnings'
    ],
    expectedOutcome: '10-15% improvement in forecast accuracy',
    timeframe: '3 months'
  })

  // Team coaching recommendations
  if (salesTeam) {
    teamCoaching.push({
      focusArea: 'Pipeline management',
      currentPerformance: pipelineAnalysis.pipelineHealth.score,
      targetPerformance: 80,
      coachingTips: [
        'Focus on deal qualification criteria',
        'Regular pipeline reviews and cleanup',
        'Proactive deal acceleration strategies'
      ],
      trainingRecommendations: [
        'Advanced pipeline management workshop',
        'Forecasting best practices training'
      ]
    })
  }

  return {
    immediateActions,
    strategicRecommendations,
    teamCoaching
  }
}

function calculateRevenueGap(revenueForecast: any, salesTeam?: any): number {
  if (!salesTeam?.averageQuota) return 0

  const forecastedRevenue = revenueForecast.baseCase.totalRevenue
  const targetRevenue = salesTeam.totalReps * salesTeam.averageQuota

  return Math.max(0, (targetRevenue - forecastedRevenue) / targetRevenue)
}

function generateExecutiveSummary(
  pipelineAnalysis: any,
  revenueForecast: any,
  riskAssessment: any,
  opportunityAnalysis: any
): any {
  const totalPipelineValue = pipelineAnalysis.stageAnalysis.reduce((sum, stage) => sum + stage.totalValue, 0)
  const forecastedRevenue = revenueForecast.baseCase.totalRevenue
  const confidenceLevel = revenueForecast.baseCase.confidenceInterval.confidence

  const keyDrivers = []
  if (pipelineAnalysis.velocityMetrics.pipelineCoverage > 2) {
    keyDrivers.push('Strong pipeline coverage')
  }
  if (opportunityAnalysis.highProbabilityDeals.length > 3) {
    keyDrivers.push('Multiple high-probability deals')
  }

  const majorRisks = riskAssessment.riskFactors
    .filter(risk => risk.impact > 20)
    .map(risk => risk.factor)

  const recommendedActions = []
  if (riskAssessment.overallRiskScore > 50) {
    recommendedActions.push('Implement risk mitigation strategies')
  }
  if (pipelineAnalysis.pipelineHealth.score < 70) {
    recommendedActions.push('Focus on pipeline health improvement')
  }

  return {
    totalPipelineValue,
    forecastedRevenue,
    confidenceLevel,
    keyDrivers,
    majorRisks,
    recommendedActions
  }
}