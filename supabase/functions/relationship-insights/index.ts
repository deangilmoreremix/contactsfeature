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

    const { contactId, data, insightType } = await req.json()

    const insights = await generateRelationshipInsights(contactId, data, insightType)

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function generateRelationshipInsights(contactId: string, data: any, insightType: string) {
  const insights = {
    contactId,
    insightType: insightType || 'comprehensive',
    networkAnalysis: {},
    influenceMapping: {},
    interactionPatterns: {},
    relationshipStrength: {},
    recommendations: [],
    opportunities: [],
    risks: [],
    generatedAt: new Date().toISOString()
  }

  switch (insightType) {
    case 'network':
      insights.networkAnalysis = await analyzeNetwork(contactId, data)
      break
    case 'influence':
      insights.influenceMapping = await mapInfluence(contactId, data)
      break
    case 'interactions':
      insights.interactionPatterns = await analyzeInteractionPatterns(contactId, data)
      break
    case 'strength':
      insights.relationshipStrength = await assessRelationshipStrength(contactId, data)
      break
    default:
      insights.networkAnalysis = await analyzeNetwork(contactId, data)
      insights.influenceMapping = await mapInfluence(contactId, data)
      insights.interactionPatterns = await analyzeInteractionPatterns(contactId, data)
      insights.relationshipStrength = await assessRelationshipStrength(contactId, data)
  }

  // Generate recommendations based on insights
  insights.recommendations = await generateRelationshipRecommendations(insights)

  // Identify opportunities
  insights.opportunities = await identifyRelationshipOpportunities(insights)

  // Identify risks
  insights.risks = await identifyRelationshipRisks(insights)

  return insights
}

async function analyzeNetwork(contactId: string, data: any) {
  const network = {
    directConnections: [],
    indirectConnections: [],
    networkSize: 0,
    networkDensity: 0,
    clusters: [],
    bridges: [],
    isolates: []
  }

  const { contacts, interactions } = data

  // Find direct connections
  network.directConnections = interactions
    ?.filter((interaction: any) =>
      interaction.participants?.includes(contactId) && interaction.participants?.length > 1
    )
    .map((interaction: any) =>
      interaction.participants?.filter((p: string) => p !== contactId)
    )
    .flat()
    .filter((id: string, index: number, array: string[]) => array.indexOf(id) === index)
    .map((id: string) => contacts?.find((c: any) => c.id === id))
    .filter(Boolean) || []

  // Find indirect connections (second-degree connections)
  const directIds = new Set(network.directConnections.map((c: any) => c.id))
  const indirectConnections = new Set<string>()

  network.directConnections.forEach((directContact: any) => {
    interactions
      ?.filter((interaction: any) =>
        interaction.participants?.includes(directContact.id) &&
        interaction.participants?.length > 1 &&
        !interaction.participants?.includes(contactId)
      )
      .forEach((interaction: any) => {
        interaction.participants?.forEach((participantId: string) => {
          if (!directIds.has(participantId) && participantId !== contactId) {
            indirectConnections.add(participantId)
          }
        })
      })
  })

  network.indirectConnections = Array.from(indirectConnections)
    .map((id: string) => contacts?.find((c: any) => c.id === id))
    .filter(Boolean)

  // Calculate network metrics
  network.networkSize = network.directConnections.length + network.indirectConnections.length
  network.networkDensity = network.networkSize > 0 ?
    (network.directConnections.length * 2) / (network.networkSize * (network.networkSize - 1)) : 0

  // Identify clusters (groups of tightly connected contacts)
  network.clusters = identifyClusters(interactions || [], contactId)

  // Identify bridge contacts (connect different clusters)
  network.bridges = identifyBridges(network.clusters, interactions || [])

  // Identify isolates (contacts with no connections)
  network.isolates = contacts?.filter((contact: any) =>
    !network.directConnections.some((c: any) => c.id === contact.id) &&
    contact.id !== contactId
  ) || []

  return network
}

async function mapInfluence(contactId: string, data: any) {
  const influence = {
    influenceScore: 0,
    influenceFactors: [],
    influenceNetwork: [],
    decisionMakingPower: '',
    reach: 0,
    amplification: 0
  }

  const { contacts, interactions } = data

  // Calculate influence score based on various factors
  let score = 0
  const factors = []

  // Network size factor
  const networkSize = interactions?.filter((i: any) =>
    i.participants?.includes(contactId)
  ).length || 0

  if (networkSize > 20) {
    score += 30
    factors.push({ factor: 'large_network', score: 30, description: 'Extensive professional network' })
  } else if (networkSize > 10) {
    score += 20
    factors.push({ factor: 'moderate_network', score: 20, description: 'Moderate professional network' })
  } else if (networkSize > 5) {
    score += 10
    factors.push({ factor: 'small_network', score: 10, description: 'Growing professional network' })
  }

  // Job title influence
  const contact = contacts?.find((c: any) => c.id === contactId)
  if (contact?.jobTitle) {
    const title = contact.jobTitle.toLowerCase()
    if (title.includes('ceo') || title.includes('founder') || title.includes('president')) {
      score += 25
      factors.push({ factor: 'executive_position', score: 25, description: 'Executive leadership position' })
    } else if (title.includes('vp') || title.includes('director') || title.includes('head')) {
      score += 20
      factors.push({ factor: 'senior_position', score: 20, description: 'Senior leadership position' })
    } else if (title.includes('manager') || title.includes('lead')) {
      score += 10
      factors.push({ factor: 'management_position', score: 10, description: 'Management position' })
    }
  }

  // Company influence
  if (contact?.company) {
    const companySize = contact.companySize || 0
    if (companySize > 1000) {
      score += 20
      factors.push({ factor: 'large_company', score: 20, description: 'Works at large company' })
    } else if (companySize > 100) {
      score += 15
      factors.push({ factor: 'medium_company', score: 15, description: 'Works at medium company' })
    }
  }

  // Interaction frequency
  const recentInteractions = interactions?.filter((i: any) => {
    const interactionDate = new Date(i.timestamp || i.date)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return interactionDate > thirtyDaysAgo && i.participants?.includes(contactId)
  }).length || 0

  if (recentInteractions > 10) {
    score += 15
    factors.push({ factor: 'high_activity', score: 15, description: 'High recent activity' })
  } else if (recentInteractions > 5) {
    score += 10
    factors.push({ factor: 'moderate_activity', score: 10, description: 'Moderate recent activity' })
  }

  influence.influenceScore = Math.min(100, score)
  influence.influenceFactors = factors

  // Map influence network
  influence.influenceNetwork = await mapInfluenceNetwork(contactId, data)

  // Determine decision making power
  influence.decisionMakingPower = determineDecisionMakingPower(contact, factors)

  // Calculate reach and amplification
  influence.reach = calculateReach(contactId, data)
  influence.amplification = calculateAmplification(contactId, data)

  return influence
}

async function analyzeInteractionPatterns(contactId: string, data: any) {
  const patterns = {
    frequency: {},
    timing: {},
    channels: {},
    topics: {},
    sentiment: {},
    reciprocity: {}
  }

  const { interactions } = data

  if (!interactions || interactions.length === 0) {
    return patterns
  }

  const contactInteractions = interactions.filter((i: any) =>
    i.participants?.includes(contactId)
  )

  // Analyze frequency
  patterns.frequency = analyzeInteractionFrequency(contactInteractions)

  // Analyze timing patterns
  patterns.timing = analyzeTimingPatterns(contactInteractions)

  // Analyze channel preferences
  patterns.channels = analyzeChannelUsage(contactInteractions)

  // Analyze topic patterns
  patterns.topics = analyzeTopicPatterns(contactInteractions)

  // Analyze sentiment patterns
  patterns.sentiment = analyzeSentimentPatterns(contactInteractions)

  // Analyze reciprocity
  patterns.reciprocity = analyzeReciprocity(contactId, contactInteractions)

  return patterns
}

async function assessRelationshipStrength(contactId: string, data: any) {
  const strength = {
    overallScore: 0,
    components: {},
    trajectory: '',
    health: '',
    recommendations: []
  }

  const { interactions } = data

  // Calculate interaction-based strength
  const interactionStrength = calculateInteractionStrength(contactId, interactions || [])

  // Calculate shared connection strength
  const networkStrength = calculateNetworkStrength(contactId, data)

  // Calculate content engagement strength
  const engagementStrength = calculateEngagementStrength(contactId, data)

  // Calculate temporal strength (relationship duration)
  const temporalStrength = calculateTemporalStrength(contactId, interactions || [])

  // Combine all factors
  strength.components = {
    interaction: interactionStrength,
    network: networkStrength,
    engagement: engagementStrength,
    temporal: temporalStrength
  }

  // Calculate overall score
  strength.overallScore = Math.round(
    (interactionStrength.score * 0.4) +
    (networkStrength.score * 0.3) +
    (engagementStrength.score * 0.2) +
    (temporalStrength.score * 0.1)
  )

  // Determine trajectory
  strength.trajectory = determineRelationshipTrajectory(strength.components)

  // Assess relationship health
  strength.health = assessRelationshipHealth(strength.overallScore)

  // Generate recommendations
  strength.recommendations = generateStrengthRecommendations(strength)

  return strength
}

async function generateRelationshipRecommendations(insights: any) {
  const recommendations = []

  // Network-based recommendations
  if (insights.networkAnalysis?.networkSize < 5) {
    recommendations.push('Expand professional network through industry events and introductions')
  }

  if (insights.networkAnalysis?.isolates?.length > 0) {
    recommendations.push('Re-engage with isolated contacts to strengthen connections')
  }

  // Influence-based recommendations
  if (insights.influenceMapping?.influenceScore < 50) {
    recommendations.push('Build influence through thought leadership and content sharing')
  }

  // Interaction-based recommendations
  if (insights.interactionPatterns?.frequency?.average < 7) {
    recommendations.push('Increase interaction frequency to maintain relationship momentum')
  }

  // Relationship strength recommendations
  if (insights.relationshipStrength?.overallScore < 60) {
    recommendations.push('Focus on deepening relationship through meaningful interactions')
  }

  return recommendations
}

async function identifyRelationshipOpportunities(insights: any) {
  const opportunities = []

  // Collaboration opportunities
  if (insights.networkAnalysis?.clusters?.length > 1) {
    opportunities.push('Bridge different network clusters for new collaborations')
  }

  // Influence opportunities
  if (insights.influenceMapping?.influenceScore > 70) {
    opportunities.push('Leverage influence for advocacy and referrals')
  }

  // Growth opportunities
  if (insights.relationshipStrength?.trajectory === 'strengthening') {
    opportunities.push('Capitalize on strengthening relationships for business development')
  }

  return opportunities
}

async function identifyRelationshipRisks(insights: any) {
  const risks = []

  // Network risks
  if (insights.networkAnalysis?.bridges?.length === 0) {
    risks.push('Lack of bridge contacts may limit network reach')
  }

  // Influence risks
  if (insights.influenceMapping?.amplification < 50) {
    risks.push('Low content amplification may reduce influence')
  }

  // Interaction risks
  if (insights.interactionPatterns?.sentiment?.average < 0) {
    risks.push('Negative sentiment in interactions requires attention')
  }

  // Relationship risks
  if (insights.relationshipStrength?.health === 'weak') {
    risks.push('Weak relationship strength increases churn risk')
  }

  return risks
}

// Helper functions
function identifyClusters(interactions: any[], contactId: string) {
  // Simple clustering algorithm - group contacts by shared interactions
  const clusters = []
  const processed = new Set()

  interactions.forEach(interaction => {
    if (!interaction.participants?.includes(contactId)) return

    const cluster = interaction.participants.filter((p: string) => p !== contactId)
    if (cluster.length > 1) {
      clusters.push({
        members: cluster,
        strength: interaction.participants.length,
        topic: interaction.topic || 'general'
      })
    }
  })

  return clusters
}

function identifyBridges(clusters: any[], interactions: any[]) {
  const bridges = []

  // Find contacts that connect different clusters
  clusters.forEach(cluster => {
    cluster.members.forEach((member: string) => {
      const connectedClusters = clusters.filter(c =>
        c !== cluster && c.members.includes(member)
      )

      if (connectedClusters.length > 0) {
        bridges.push({
          contact: member,
          connectedClusters: connectedClusters.length,
          importance: connectedClusters.length * cluster.strength
        })
      }
    })
  })

  return bridges.sort((a, b) => b.importance - a.importance)
}

async function mapInfluenceNetwork(contactId: string, data: any) {
  const network = []
  const { contacts, interactions } = data

  // Find contacts influenced by this contact
  const influencedContacts = contacts?.filter((contact: any) => {
    const contactInteractions = interactions?.filter((i: any) =>
      i.participants?.includes(contact.id) && i.participants?.includes(contactId)
    ) || []

    return contactInteractions.length > 0
  }) || []

  influencedContacts.forEach((contact: any) => {
    const influenceLevel = calculateInfluenceOnContact(contactId, contact, interactions || [])
    network.push({
      contact: contact,
      influenceLevel: influenceLevel,
      connectionStrength: calculateConnectionStrength(contactId, contact, interactions || [])
    })
  })

  return network.sort((a, b) => b.influenceLevel - a.influenceLevel)
}

function determineDecisionMakingPower(contact: any, factors: any[]) {
  const executiveFactors = factors.filter(f =>
    f.factor.includes('executive') || f.factor.includes('senior')
  )

  if (executiveFactors.length > 0) {
    return 'high'
  }

  const managementFactors = factors.filter(f =>
    f.factor.includes('management')
  )

  if (managementFactors.length > 0) {
    return 'medium'
  }

  return 'low'
}

function calculateReach(contactId: string, data: any) {
  const { interactions } = data

  // Estimate reach based on network size and interaction breadth
  const uniqueConnections = new Set()

  interactions?.forEach((interaction: any) => {
    if (interaction.participants?.includes(contactId)) {
      interaction.participants.forEach((participant: string) => {
        if (participant !== contactId) {
          uniqueConnections.add(participant)
        }
      })
    }
  })

  return uniqueConnections.size
}

function calculateAmplification(contactId: string, data: any) {
  // Placeholder for amplification calculation
  // In a real implementation, this would analyze content sharing and engagement
  return 75
}

function analyzeInteractionFrequency(interactions: any[]) {
  if (interactions.length === 0) {
    return { average: 0, trend: 'no_data' }
  }

  // Calculate frequency over time
  const now = Date.now()
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000)

  const recentInteractions = interactions.filter(i =>
    new Date(i.timestamp || i.date).getTime() > thirtyDaysAgo
  )

  const veryRecentInteractions = interactions.filter(i =>
    new Date(i.timestamp || i.date).getTime() > sevenDaysAgo
  )

  const average = recentInteractions.length / 4 // Average per week

  return {
    average: Math.round(average * 10) / 10,
    last30Days: recentInteractions.length,
    last7Days: veryRecentInteractions.length,
    trend: veryRecentInteractions.length > recentInteractions.length / 4 ? 'increasing' : 'stable'
  }
}

function analyzeTimingPatterns(interactions: any[]) {
  const patterns = {
    preferredDays: [],
    preferredHours: [],
    responseTime: 0,
    consistency: 0
  }

  if (interactions.length === 0) return patterns

  // Analyze preferred days and hours
  const dayCounts = new Array(7).fill(0)
  const hourCounts = new Array(24).fill(0)

  interactions.forEach(interaction => {
    const date = new Date(interaction.timestamp || interaction.date)
    dayCounts[date.getDay()]++
    hourCounts[date.getHours()]++
  })

  // Find preferred days (top 2)
  const topDays = dayCounts
    .map((count, index) => ({ day: index, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map(item => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][item.day])

  // Find preferred hours (top 3)
  const topHours = hourCounts
    .map((count, index) => ({ hour: index, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(item => item.hour)

  patterns.preferredDays = topDays
  patterns.preferredHours = topHours

  // Calculate average response time
  let totalResponseTime = 0
  let responseCount = 0

  for (let i = 1; i < interactions.length; i++) {
    const current = new Date(interactions[i].timestamp || interactions[i].date)
    const previous = new Date(interactions[i - 1].timestamp || interactions[i - 1].date)
    const responseTime = current.getTime() - previous.getTime()

    if (responseTime > 0 && responseTime < 7 * 24 * 60 * 60 * 1000) { // Less than a week
      totalResponseTime += responseTime
      responseCount++
    }
  }

  patterns.responseTime = responseCount > 0 ? totalResponseTime / responseCount : 0
  patterns.consistency = calculateConsistency(interactions)

  return patterns
}

function analyzeChannelUsage(interactions: any[]) {
  const channels = {}

  interactions.forEach(interaction => {
    const channel = interaction.channel || 'unknown'
    channels[channel] = (channels[channel] || 0) + 1
  })

  // Convert to percentages
  const total = interactions.length
  Object.keys(channels).forEach(channel => {
    channels[channel] = Math.round((channels[channel] / total) * 100)
  })

  return channels
}

function analyzeTopicPatterns(interactions: any[]) {
  const topics = {}

  interactions.forEach(interaction => {
    const topic = interaction.topic || interaction.category || 'general'
    topics[topic] = (topics[topic] || 0) + 1
  })

  // Sort by frequency
  const sortedTopics = Object.entries(topics)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)

  return Object.fromEntries(sortedTopics)
}

function analyzeSentimentPatterns(interactions: any[]) {
  // Placeholder for sentiment analysis
  const sentiments = interactions.map(() => Math.random() * 2 - 1) // -1 to 1 scale
  const average = sentiments.reduce((a, b) => a + b, 0) / sentiments.length

  return {
    average: Math.round(average * 100) / 100,
    trend: average > 0.1 ? 'positive' : average < -0.1 ? 'negative' : 'neutral',
    volatility: calculateVolatility(sentiments)
  }
}

function analyzeReciprocity(contactId: string, interactions: any[]) {
  let initiatedByContact = 0
  let initiatedByOthers = 0

  interactions.forEach(interaction => {
    if (interaction.initiator === contactId) {
      initiatedByContact++
    } else {
      initiatedByOthers++
    }
  })

  const total = initiatedByContact + initiatedByOthers
  const reciprocity = total > 0 ? (Math.min(initiatedByContact, initiatedByOthers) / total) * 2 : 0

  return {
    initiatedByContact,
    initiatedByOthers,
    reciprocity: Math.round(reciprocity * 100) / 100,
    balance: initiatedByContact > initiatedByOthers ? 'contact_driven' :
             initiatedByOthers > initiatedByContact ? 'other_driven' : 'balanced'
  }
}

function calculateInteractionStrength(contactId: string, interactions: any[]) {
  const contactInteractions = interactions.filter(i =>
    i.participants?.includes(contactId)
  )

  const score = Math.min(100, contactInteractions.length * 5)

  return {
    score,
    level: score > 70 ? 'strong' : score > 40 ? 'moderate' : 'weak',
    totalInteractions: contactInteractions.length
  }
}

function calculateNetworkStrength(contactId: string, data: any) {
  const network = data.contacts?.filter((c: any) =>
    data.interactions?.some((i: any) =>
      i.participants?.includes(contactId) && i.participants?.includes(c.id)
    )
  ) || []

  const score = Math.min(100, network.length * 10)

  return {
    score,
    level: score > 60 ? 'strong' : score > 30 ? 'moderate' : 'weak',
    networkSize: network.length
  }
}

function calculateEngagementStrength(contactId: string, data: any) {
  // Placeholder calculation
  const score = 65

  return {
    score,
    level: score > 70 ? 'high' : score > 50 ? 'medium' : 'low'
  }
}

function calculateTemporalStrength(contactId: string, interactions: any[]) {
  if (interactions.length === 0) {
    return { score: 0, level: 'new', duration: 0 }
  }

  const firstInteraction = new Date(Math.min(...interactions.map(i =>
    new Date(i.timestamp || i.date).getTime()
  )))

  const lastInteraction = new Date(Math.max(...interactions.map(i =>
    new Date(i.timestamp || i.date).getTime()
  )))

  const duration = lastInteraction.getTime() - firstInteraction.getTime()
  const days = duration / (1000 * 60 * 60 * 24)

  const score = Math.min(100, days / 10) // 1 point per 10 days, max 100

  return {
    score: Math.round(score),
    level: days > 365 ? 'long-term' : days > 90 ? 'established' : 'new',
    duration: Math.round(days)
  }
}

function determineRelationshipTrajectory(components: any) {
  // Analyze trends in different components
  const trends = []

  // Simple trend analysis - in a real implementation, this would use time series analysis
  if (components.interaction?.score > 50) trends.push('strengthening')
  if (components.network?.score > 50) trends.push('expanding')
  if (components.engagement?.score > 50) trends.push('deepening')

  if (trends.length > trends.filter(t => t === 'strengthening').length) {
    return 'strengthening'
  } else if (trends.length > 0) {
    return 'stable'
  } else {
    return 'weakening'
  }
}

function assessRelationshipHealth(score: number) {
  if (score > 70) return 'strong'
  if (score > 50) return 'moderate'
  if (score > 30) return 'weak'
  return 'critical'
}

function generateStrengthRecommendations(strength: any) {
  const recommendations = []

  if (strength.overallScore < 50) {
    recommendations.push('Increase interaction frequency to strengthen relationship')
  }

  if (strength.components.network?.score < 50) {
    recommendations.push('Expand network connections for broader relationship')
  }

  if (strength.components.engagement?.score < 50) {
    recommendations.push('Improve engagement through more meaningful interactions')
  }

  return recommendations
}

function calculateInfluenceOnContact(influencerId: string, contact: any, interactions: any[]) {
  // Calculate how much influence the influencer has on this contact
  const relevantInteractions = interactions.filter(i =>
    i.participants?.includes(influencerId) && i.participants?.includes(contact.id)
  )

  let influence = 0

  relevantInteractions.forEach(interaction => {
    // Influence increases with interaction frequency and recency
    const recency = (Date.now() - new Date(interaction.timestamp || interaction.date).getTime()) / (1000 * 60 * 60 * 24)
    const recencyScore = Math.max(0, 30 - recency) / 30 // Higher for more recent

    influence += recencyScore * 10
  })

  return Math.min(100, influence)
}

function calculateConnectionStrength(contactId1: string, contactId2: any, interactions: any[]) {
  const connectionInteractions = interactions.filter(i =>
    i.participants?.includes(contactId1) && i.participants?.includes(contactId2.id)
  )

  // Strength based on frequency, recency, and diversity
  const frequency = connectionInteractions.length
  const recency = connectionInteractions.length > 0 ?
    (Date.now() - new Date(connectionInteractions[0].timestamp || connectionInteractions[0].date).getTime()) / (1000 * 60 * 60 * 24) : 365

  const recencyScore = Math.max(0, 90 - recency) / 90
  const frequencyScore = Math.min(1, frequency / 10)

  return Math.round((recencyScore * 0.6 + frequencyScore * 0.4) * 100)
}

function calculateConsistency(interactions: any[]) {
  if (interactions.length < 2) return 0

  // Calculate consistency based on time intervals
  const intervals = []

  for (let i = 1; i < interactions.length; i++) {
    const current = new Date(interactions[i].timestamp || interactions[i].date)
    const previous = new Date(interactions[i - 1].timestamp || interactions[i - 1].date)
    intervals.push(current.getTime() - previous.getTime())
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length
  const stdDev = Math.sqrt(variance)

  // Consistency score (lower variance = higher consistency)
  const consistency = Math.max(0, 100 - (stdDev / avgInterval) * 100)

  return Math.round(consistency)
}

function calculateVolatility(values: number[]) {
  if (values.length < 2) return 0

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length

  return Math.sqrt(variance)
}