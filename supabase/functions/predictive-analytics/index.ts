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

    const { data, predictionType, timeFrame } = await req.json()

    const predictions = await generatePredictions(data, predictionType, timeFrame)

    return new Response(JSON.stringify(predictions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function generatePredictions(data: any, predictionType: string, timeFrame: string) {
  const predictions = {
    inputData: data,
    predictionType: predictionType || 'general',
    timeFrame: timeFrame || '30days',
    forecasts: {},
    probabilities: {},
    trends: {},
    recommendations: [],
    confidence: 0,
    generatedAt: new Date().toISOString()
  }

  switch (predictionType) {
    case 'sales':
      predictions.forecasts = await predictSales(data, timeFrame)
      break
    case 'engagement':
      predictions.forecasts = await predictEngagement(data, timeFrame)
      break
    case 'churn':
      predictions.forecasts = await predictChurn(data, timeFrame)
      break
    case 'lifetime_value':
      predictions.forecasts = await predictLifetimeValue(data, timeFrame)
      break
    case 'conversion':
      predictions.forecasts = await predictConversion(data, timeFrame)
      break
    default:
      predictions.forecasts = await generateGeneralPredictions(data, timeFrame)
  }

  // Calculate probabilities
  predictions.probabilities = await calculateProbabilities(predictions.forecasts)

  // Identify trends
  predictions.trends = await identifyTrends(data, predictions.forecasts)

  // Generate recommendations
  predictions.recommendations = await generatePredictiveRecommendations(predictions)

  // Calculate overall confidence
  predictions.confidence = await calculatePredictionConfidence(predictions)

  return predictions
}

async function predictSales(data: any, timeFrame: string) {
  const forecasts = {
    revenue: {},
    deals: {},
    pipeline: {},
    growth: {}
  }

  // Historical data analysis
  const historicalRevenue = data.revenue || []
  const historicalDeals = data.deals || []

  // Simple linear regression for revenue forecasting
  forecasts.revenue = performLinearRegression(historicalRevenue, timeFrame)

  // Deal velocity prediction
  forecasts.deals = predictDealVelocity(historicalDeals, timeFrame)

  // Pipeline forecasting
  forecasts.pipeline = forecastPipeline(data.pipeline || [], timeFrame)

  // Growth rate prediction
  forecasts.growth = predictGrowthRate(historicalRevenue, timeFrame)

  return forecasts
}

async function predictEngagement(data: any, timeFrame: string) {
  const forecasts = {
    openRate: {},
    clickRate: {},
    responseRate: {},
    overallEngagement: {}
  }

  const engagementHistory = data.engagement || []

  forecasts.openRate = predictMetricTrend(engagementHistory, 'openRate', timeFrame)
  forecasts.clickRate = predictMetricTrend(engagementHistory, 'clickRate', timeFrame)
  forecasts.responseRate = predictMetricTrend(engagementHistory, 'responseRate', timeFrame)

  // Calculate overall engagement
  const overall = engagementHistory.map((item: any) => ({
    date: item.date,
    value: (item.openRate + item.clickRate + item.responseRate) / 3
  }))

  forecasts.overallEngagement = performLinearRegression(overall, timeFrame)

  return forecasts
}

async function predictChurn(data: any, timeFrame: string) {
  const forecasts = {
    churnRate: {},
    atRiskContacts: [],
    retentionRate: {},
    churnReasons: {}
  }

  const customerData = data.customers || []
  const engagementData = data.engagement || []

  // Calculate churn probability for each customer
  forecasts.atRiskContacts = customerData.map((customer: any) => ({
    id: customer.id,
    name: customer.name,
    churnProbability: calculateChurnProbability(customer, engagementData),
    riskFactors: identifyChurnRiskFactors(customer, engagementData),
    predictedChurnDate: predictChurnDate(customer, engagementData)
  })).filter((customer: any) => customer.churnProbability > 0.5)

  // Overall churn rate prediction
  const historicalChurn = data.churnHistory || []
  forecasts.churnRate = performLinearRegression(historicalChurn, timeFrame)

  // Retention rate (inverse of churn)
  forecasts.retentionRate = {
    current: 100 - (forecasts.churnRate.current || 0),
    predicted: 100 - (forecasts.churnRate.predicted || 0),
    trend: forecasts.churnRate.trend === 'increasing' ? 'decreasing' : 'increasing'
  }

  // Predict churn reasons
  forecasts.churnReasons = predictChurnReasons(customerData, engagementData)

  return forecasts
}

async function predictLifetimeValue(data: any, timeFrame: string) {
  const forecasts = {
    averageLTV: {},
    customerSegments: {},
    ltvDistribution: {},
    growthOpportunities: []
  }

  const customerData = data.customers || []
  const transactionData = data.transactions || []

  // Calculate current LTV
  const currentLTV = calculateAverageLTV(customerData, transactionData)
  forecasts.averageLTV.current = currentLTV

  // Predict future LTV
  forecasts.averageLTV.predicted = predictFutureLTV(customerData, transactionData, timeFrame)

  // Segment customers by LTV
  forecasts.customerSegments = segmentCustomersByLTV(customerData, transactionData)

  // LTV distribution
  forecasts.ltvDistribution = calculateLTVDistribution(customerData, transactionData)

  // Identify growth opportunities
  forecasts.growthOpportunities = identifyLTVGrowthOpportunities(customerData, transactionData)

  return forecasts
}

async function predictConversion(data: any, timeFrame: string) {
  const forecasts = {
    conversionRate: {},
    funnelEfficiency: {},
    bottleneckAnalysis: {},
    optimizationOpportunities: []
  }

  const funnelData = data.funnel || []
  const conversionHistory = data.conversions || []

  // Overall conversion rate prediction
  forecasts.conversionRate = performLinearRegression(conversionHistory, timeFrame)

  // Funnel efficiency analysis
  forecasts.funnelEfficiency = analyzeFunnelEfficiency(funnelData)

  // Identify bottlenecks
  forecasts.bottleneckAnalysis = identifyBottlenecks(funnelData)

  // Optimization opportunities
  forecasts.optimizationOpportunities = suggestOptimizations(funnelData, forecasts.bottleneckAnalysis)

  return forecasts
}

async function generateGeneralPredictions(data: any, timeFrame: string) {
  const forecasts = {
    generalMetrics: {},
    trendAnalysis: {},
    anomalyDetection: {},
    seasonalPatterns: {}
  }

  // Analyze available metrics
  const metrics = Object.keys(data).filter(key => Array.isArray(data[key]) && data[key].length > 0)

  for (const metric of metrics) {
    forecasts.generalMetrics[metric] = performLinearRegression(data[metric], timeFrame)
  }

  // Trend analysis
  forecasts.trendAnalysis = analyzeTrends(data)

  // Anomaly detection
  forecasts.anomalyDetection = detectAnomalies(data)

  // Seasonal patterns
  forecasts.seasonalPatterns = identifySeasonalPatterns(data)

  return forecasts
}

async function calculateProbabilities(forecasts: any) {
  const probabilities = {}

  // Calculate confidence intervals and probabilities for forecasts
  for (const [key, forecast] of Object.entries(forecasts)) {
    if (forecast && typeof forecast === 'object' && 'predicted' in forecast) {
      probabilities[key] = {
        confidence: calculateForecastConfidence(forecast),
        probability: Math.min(0.95, Math.max(0.05, 0.5 + (Math.random() - 0.5) * 0.4)),
        range: calculatePredictionRange(forecast)
      }
    }
  }

  return probabilities
}

async function identifyTrends(data: any, forecasts: any) {
  const trends = {
    overall: 'stable',
    significantChanges: [],
    emergingPatterns: [],
    seasonalTrends: []
  }

  // Analyze forecast trends
  for (const [key, forecast] of Object.entries(forecasts)) {
    if (forecast && typeof forecast === 'object' && 'trend' in forecast) {
      if (forecast.trend !== 'stable') {
        trends.significantChanges.push({
          metric: key,
          trend: forecast.trend,
          magnitude: forecast.change || 0
        })
      }
    }
  }

  // Identify emerging patterns
  trends.emergingPatterns = identifyEmergingPatterns(data)

  // Seasonal analysis
  trends.seasonalTrends = identifySeasonalTrends(data)

  // Overall trend
  if (trends.significantChanges.length > trends.significantChanges.filter((t: any) => t.trend === 'increasing').length) {
    trends.overall = 'declining'
  } else if (trends.significantChanges.length > 0) {
    trends.overall = 'improving'
  }

  return trends
}

async function generatePredictiveRecommendations(predictions: any) {
  const recommendations = []

  const { forecasts, trends, probabilities } = predictions

  // Trend-based recommendations
  if (trends.overall === 'declining') {
    recommendations.push('Implement intervention strategies to reverse negative trends')
  } else if (trends.overall === 'improving') {
    recommendations.push('Continue current strategies and identify scaling opportunities')
  }

  // Forecast-based recommendations
  if (forecasts.sales && forecasts.sales.revenue) {
    const revenue = forecasts.sales.revenue
    if (revenue.trend === 'declining') {
      recommendations.push('Focus on revenue growth initiatives and customer acquisition')
    }
  }

  // Churn recommendations
  if (forecasts.churn && forecasts.churn.atRiskContacts) {
    const atRiskCount = forecasts.churn.atRiskContacts.length
    if (atRiskCount > 0) {
      recommendations.push(`Address churn risk for ${atRiskCount} customers with targeted retention campaigns`)
    }
  }

  // Engagement recommendations
  if (forecasts.engagement && forecasts.engagement.overallEngagement) {
    const engagement = forecasts.engagement.overallEngagement
    if (engagement.trend === 'declining') {
      recommendations.push('Revitalize engagement through new content and interaction strategies')
    }
  }

  return recommendations
}

async function calculatePredictionConfidence(predictions: any) {
  let totalConfidence = 0
  let count = 0

  for (const probability of Object.values(predictions.probabilities)) {
    if (probability && typeof probability === 'object' && 'confidence' in probability) {
      totalConfidence += probability.confidence
      count++
    }
  }

  return count > 0 ? Math.round(totalConfidence / count) : 50
}

// Helper functions
function performLinearRegression(data: any[], timeFrame: string) {
  if (!data || data.length < 2) {
    return { predicted: 0, trend: 'insufficient_data', confidence: 0 }
  }

  const n = data.length
  const sumX = (n * (n - 1)) / 2
  const sumY = data.reduce((sum, item) => sum + (item.value || item), 0)
  const sumXY = data.reduce((sum, item, index) => sum + index * (item.value || item), 0)
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  const currentValue = data[n - 1].value || data[n - 1]
  const periods = getTimeFramePeriods(timeFrame)
  const predicted = slope * (n + periods - 1) + intercept

  const trend = slope > 1 ? 'increasing' : slope < -1 ? 'declining' : 'stable'
  const change = ((predicted - currentValue) / currentValue) * 100

  return {
    current: currentValue,
    predicted: Math.max(0, predicted),
    trend,
    change: Math.round(change * 100) / 100,
    slope,
    confidence: Math.min(100, Math.max(20, n * 10))
  }
}

function predictDealVelocity(deals: any[], timeFrame: string) {
  const velocity = deals.filter(deal => deal.closed).map(deal =>
    (new Date(deal.closedDate).getTime() - new Date(deal.createdDate).getTime()) / (1000 * 60 * 60 * 24)
  )

  const averageVelocity = velocity.length > 0 ? velocity.reduce((a, b) => a + b, 0) / velocity.length : 30

  return {
    current: Math.round(averageVelocity),
    predicted: Math.round(averageVelocity * 0.9), // Assume 10% improvement
    trend: 'improving',
    confidence: 75
  }
}

function forecastPipeline(pipeline: any[], timeFrame: string) {
  const totalValue = pipeline.reduce((sum, deal) => sum + (deal.value || 0), 0)
  const averageDealSize = pipeline.length > 0 ? totalValue / pipeline.length : 0

  const periods = getTimeFramePeriods(timeFrame)
  const conversionRate = 0.25 // Assume 25% conversion rate

  return {
    current: totalValue,
    predicted: totalValue * conversionRate * (periods / 30), // Monthly conversion
    averageDealSize,
    conversionRate,
    confidence: 70
  }
}

function predictGrowthRate(revenue: any[], timeFrame: string) {
  if (revenue.length < 2) return { rate: 0, trend: 'stable' }

  const recent = revenue.slice(-3)
  const older = revenue.slice(-6, -3)

  const recentAvg = recent.reduce((sum, item) => sum + (item.value || item), 0) / recent.length
  const olderAvg = older.reduce((sum, item) => sum + (item.value || item), 0) / older.length

  const growthRate = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0

  return {
    rate: Math.round(growthRate * 100) / 100,
    trend: growthRate > 5 ? 'accelerating' : growthRate < -5 ? 'decelerating' : 'stable',
    confidence: 80
  }
}

function predictMetricTrend(history: any[], metric: string, timeFrame: string) {
  const metricData = history.map(item => ({ value: item[metric] || 0 }))
  return performLinearRegression(metricData, timeFrame)
}

function calculateChurnProbability(customer: any, engagementData: any[]) {
  let risk = 0.1 // Base risk

  // Engagement-based risk
  const customerEngagement = engagementData.filter(e => e.customerId === customer.id)
  if (customerEngagement.length === 0) risk += 0.4
  else {
    const recentEngagement = customerEngagement.slice(-5)
    const avgEngagement = recentEngagement.reduce((sum, e) => sum + (e.score || 0), 0) / recentEngagement.length
    if (avgEngagement < 30) risk += 0.3
  }

  // Time-based risk
  const daysSinceLastActivity = customer.lastActivity ?
    (Date.now() - new Date(customer.lastActivity).getTime()) / (1000 * 60 * 60 * 24) : 90

  if (daysSinceLastActivity > 60) risk += 0.3
  else if (daysSinceLastActivity > 30) risk += 0.2

  // Contract-based risk
  if (customer.contractEnd && new Date(customer.contractEnd) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
    risk += 0.2
  }

  return Math.min(0.95, risk)
}

function identifyChurnRiskFactors(customer: any, engagementData: any[]) {
  const factors = []

  if (!customer.lastActivity || (Date.now() - new Date(customer.lastActivity).getTime()) / (1000 * 60 * 60 * 24) > 30) {
    factors.push('Low activity')
  }

  const engagement = engagementData.filter(e => e.customerId === customer.id)
  if (engagement.length > 0) {
    const avgScore = engagement.reduce((sum, e) => sum + (e.score || 0), 0) / engagement.length
    if (avgScore < 40) {
      factors.push('Low engagement')
    }
  }

  return factors
}

function predictChurnDate(customer: any, engagementData: any[]) {
  const risk = calculateChurnProbability(customer, engagementData)
  const daysToChurn = Math.max(30, Math.round((1 - risk) * 180)) // 30-180 days based on risk

  return new Date(Date.now() + daysToChurn * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

function predictChurnReasons(customers: any[], engagementData: any[]) {
  const reasons = {
    low_engagement: 0,
    poor_support: 0,
    pricing_issues: 0,
    competitor_switch: 0,
    other: 0
  }

  customers.forEach(customer => {
    const risk = calculateChurnProbability(customer, engagementData)
    if (risk > 0.5) {
      // Simple reason assignment based on customer data
      if (customer.supportTickets > 5) reasons.poor_support++
      else if (customer.competitorMentions > 0) reasons.competitor_switch++
      else if (customer.pricingComplaints > 0) reasons.pricing_issues++
      else reasons.low_engagement++
    }
  })

  return reasons
}

function calculateAverageLTV(customers: any[], transactions: any[]) {
  const ltvByCustomer = customers.map(customer => {
    const customerTransactions = transactions.filter(t => t.customerId === customer.id)
    return customerTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
  }).filter(ltv => ltv > 0)

  return ltvByCustomer.length > 0 ?
    ltvByCustomer.reduce((a, b) => a + b, 0) / ltvByCustomer.length : 0
}

function predictFutureLTV(customers: any[], transactions: any[], timeFrame: string) {
  const currentLTV = calculateAverageLTV(customers, transactions)
  const periods = getTimeFramePeriods(timeFrame)
  const monthlyGrowth = 0.02 // Assume 2% monthly growth

  return currentLTV * Math.pow(1 + monthlyGrowth, periods)
}

function segmentCustomersByLTV(customers: any[], transactions: any[]) {
  const segments = { low: [], medium: [], high: [] }

  customers.forEach(customer => {
    const customerTransactions = transactions.filter(t => t.customerId === customer.id)
    const ltv = customerTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)

    if (ltv < 1000) segments.low.push(customer)
    else if (ltv < 10000) segments.medium.push(customer)
    else segments.high.push(customer)
  })

  return segments
}

function calculateLTVDistribution(customers: any[], transactions: any[]) {
  const distribution = { '0-1000': 0, '1000-10000': 0, '10000+': 0 }

  customers.forEach(customer => {
    const customerTransactions = transactions.filter(t => t.customerId === customer.id)
    const ltv = customerTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)

    if (ltv < 1000) distribution['0-1000']++
    else if (ltv < 10000) distribution['1000-10000']++
    else distribution['10000+']++
  })

  return distribution
}

function identifyLTVGrowthOpportunities(customers: any[], transactions: any[]) {
  const opportunities = []

  // Identify customers with recent increased spending
  const recentHighSpenders = customers.filter(customer => {
    const recentTransactions = transactions.filter(t =>
      t.customerId === customer.id &&
      new Date(t.date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    )
    const recentSpend = recentTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
    return recentSpend > 5000
  })

  if (recentHighSpenders.length > 0) {
    opportunities.push(`Upsell opportunities for ${recentHighSpenders.length} high-spending customers`)
  }

  return opportunities
}

function analyzeFunnelEfficiency(funnel: any[]) {
  const efficiency = {}

  for (let i = 0; i < funnel.length - 1; i++) {
    const current = funnel[i]
    const next = funnel[i + 1]
    const rate = next.count / current.count

    efficiency[`${current.stage}_to_${next.stage}`] = {
      rate: Math.round(rate * 10000) / 100,
      efficiency: rate > 0.5 ? 'good' : rate > 0.3 ? 'fair' : 'poor'
    }
  }

  return efficiency
}

function identifyBottlenecks(funnel: any[]) {
  const bottlenecks = []

  for (let i = 0; i < funnel.length - 1; i++) {
    const current = funnel[i]
    const next = funnel[i + 1]
    const dropOff = current.count - next.count
    const dropOffRate = dropOff / current.count

    if (dropOffRate > 0.5) {
      bottlenecks.push({
        from: current.stage,
        to: next.stage,
        dropOff: dropOff,
        dropOffRate: Math.round(dropOffRate * 100),
        severity: dropOffRate > 0.7 ? 'critical' : dropOffRate > 0.5 ? 'high' : 'medium'
      })
    }
  }

  return bottlenecks
}

function suggestOptimizations(funnel: any[], bottlenecks: any[]) {
  const suggestions = []

  bottlenecks.forEach(bottleneck => {
    switch (bottleneck.from) {
      case 'awareness':
        suggestions.push('Improve lead capture forms and landing pages')
        break
      case 'interest':
        suggestions.push('Enhance content marketing and lead nurturing')
        break
      case 'consideration':
        suggestions.push('Provide better product information and demos')
        break
      case 'purchase':
        suggestions.push('Streamline checkout process and reduce friction')
        break
    }
  })

  return suggestions
}

function analyzeTrends(data: any) {
  const trends = {}

  Object.keys(data).forEach(key => {
    if (Array.isArray(data[key]) && data[key].length > 1) {
      const values = data[key].map(item => item.value || item)
      const trend = values[values.length - 1] > values[0] ? 'increasing' : 'decreasing'
      const change = ((values[values.length - 1] - values[0]) / values[0]) * 100

      trends[key] = {
        trend,
        change: Math.round(change * 100) / 100,
        significance: Math.abs(change) > 20 ? 'significant' : 'minor'
      }
    }
  })

  return trends
}

function detectAnomalies(data: any) {
  const anomalies = {}

  Object.keys(data).forEach(key => {
    if (Array.isArray(data[key]) && data[key].length > 2) {
      const values = data[key].map(item => item.value || item)
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const stdDev = Math.sqrt(values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length)

      const anomalies_found = []
      values.forEach((value, index) => {
        const zScore = Math.abs((value - mean) / stdDev)
        if (zScore > 2) { // 2 standard deviations
          anomalies_found.push({
            index,
            value,
            zScore: Math.round(zScore * 100) / 100,
            severity: zScore > 3 ? 'high' : 'medium'
          })
        }
      })

      if (anomalies_found.length > 0) {
        anomalies[key] = anomalies_found
      }
    }
  })

  return anomalies
}

function identifySeasonalPatterns(data: any) {
  const patterns = {}

  Object.keys(data).forEach(key => {
    if (Array.isArray(data[key]) && data[key].length >= 12) {
      // Simple seasonal analysis - compare monthly averages
      const monthlyData = data[key].slice(-12) // Last 12 months
      const monthlyAvg = monthlyData.reduce((sum, item) => sum + (item.value || item), 0) / 12

      const seasonalIndex = monthlyData.map(item => (item.value || item) / monthlyAvg)

      patterns[key] = {
        hasSeasonality: seasonalIndex.some(index => index > 1.2 || index < 0.8),
        peakMonth: seasonalIndex.indexOf(Math.max(...seasonalIndex)) + 1,
        troughMonth: seasonalIndex.indexOf(Math.min(...seasonalIndex)) + 1,
        seasonalityStrength: Math.max(...seasonalIndex) - Math.min(...seasonalIndex)
      }
    }
  })

  return patterns
}

function identifyEmergingPatterns(data: any) {
  const patterns = []

  // Look for accelerating growth
  Object.keys(data).forEach(key => {
    if (Array.isArray(data[key]) && data[key].length >= 4) {
      const recent = data[key].slice(-4)
      const growthRates = []

      for (let i = 1; i < recent.length; i++) {
        const prev = recent[i - 1].value || recent[i - 1]
        const curr = recent[i].value || recent[i]
        const growth = prev > 0 ? ((curr - prev) / prev) * 100 : 0
        growthRates.push(growth)
      }

      // Check if growth is accelerating
      if (growthRates.length >= 2) {
        const isAccelerating = growthRates.every((rate, index) =>
          index === 0 || rate >= growthRates[index - 1]
        )

        if (isAccelerating && growthRates[growthRates.length - 1] > 10) {
          patterns.push({
            type: 'accelerating_growth',
            metric: key,
            growthRate: Math.round(growthRates[growthRates.length - 1] * 100) / 100,
            significance: 'high'
          })
        }
      }
    }
  })

  return patterns
}

function identifySeasonalTrends(data: any) {
  const trends = []

  // Simple month-over-month comparison
  Object.keys(data).forEach(key => {
    if (Array.isArray(data[key]) && data[key].length >= 3) {
      const recent = data[key].slice(-3)
      const changes = []

      for (let i = 1; i < recent.length; i++) {
        const prev = recent[i - 1].value || recent[i - 1]
        const curr = recent[i].value || recent[i]
        const change = prev > 0 ? ((curr - prev) / prev) * 100 : 0
        changes.push(change)
      }

      const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length

      if (Math.abs(avgChange) > 15) {
        trends.push({
          metric: key,
          direction: avgChange > 0 ? 'increasing' : 'decreasing',
          magnitude: Math.abs(Math.round(avgChange * 100) / 100),
          period: 'monthly'
        })
      }
    }
  })

  return trends
}

function calculateForecastConfidence(forecast: any) {
  // Simple confidence calculation based on data quality and consistency
  let confidence = 50

  if (forecast.trend && forecast.trend !== 'insufficient_data') confidence += 20
  if (forecast.change && Math.abs(forecast.change) < 50) confidence += 15
  if (forecast.confidence && forecast.confidence > 50) confidence += 15

  return Math.min(100, confidence)
}

function calculatePredictionRange(forecast: any) {
  const base = forecast.predicted || forecast.current || 0
  const margin = 0.2 // 20% margin

  return {
    lower: Math.max(0, base * (1 - margin)),
    upper: base * (1 + margin)
  }
}

function getTimeFramePeriods(timeFrame: string): number {
  switch (timeFrame.toLowerCase()) {
    case '7days': return 7
    case '30days': return 30
    case '90days': return 90
    case '1year': return 365
    case '2years': return 730
    default: return 30
  }
}