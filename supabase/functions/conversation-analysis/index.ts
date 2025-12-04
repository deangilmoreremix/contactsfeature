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

    const { conversationData, analysisType } = await req.json()

    const analysis = await analyzeConversation(conversationData, analysisType)

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

async function analyzeConversation(conversationData: any, analysisType: string) {
  const analysis = {
    conversation: conversationData,
    analysisType: analysisType || 'comprehensive',
    metrics: {},
    sentiment: {},
    topics: [],
    entities: [],
    insights: [],
    recommendations: [],
    summary: '',
    analyzedAt: new Date().toISOString()
  }

  switch (analysisType) {
    case 'sentiment':
      analysis.sentiment = await analyzeConversationSentiment(conversationData)
      break
    case 'topics':
      analysis.topics = await extractConversationTopics(conversationData)
      break
    case 'entities':
      analysis.entities = await extractEntities(conversationData)
      break
    case 'effectiveness':
      analysis.metrics = await measureConversationEffectiveness(conversationData)
      break
    default:
      analysis.sentiment = await analyzeConversationSentiment(conversationData)
      analysis.topics = await extractConversationTopics(conversationData)
      analysis.entities = await extractEntities(conversationData)
      analysis.metrics = await measureConversationEffectiveness(conversationData)
      analysis.insights = await generateConversationInsights(conversationData)
      analysis.recommendations = await generateConversationRecommendations(conversationData)
      analysis.summary = await generateConversationSummary(conversationData)
  }

  return analysis
}

async function analyzeConversationSentiment(conversationData: any) {
  const messages = conversationData.messages || []
  const overallSentiment = { positive: 0, negative: 0, neutral: 0 }
  const sentimentOverTime = []

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]
    const sentiment = await analyzeMessageSentiment(message)

    overallSentiment.positive += sentiment.positive
    overallSentiment.negative += sentiment.negative
    overallSentiment.neutral += sentiment.neutral

    sentimentOverTime.push({
      messageIndex: i,
      timestamp: message.timestamp,
      sentiment: sentiment
    })
  }

  const total = overallSentiment.positive + overallSentiment.negative + overallSentiment.neutral
  const dominant = overallSentiment.positive > overallSentiment.negative ? 'positive' : 'negative'

  return {
    overall: {
      positive: (overallSentiment.positive / total) * 100,
      negative: (overallSentiment.negative / total) * 100,
      neutral: (overallSentiment.neutral / total) * 100,
      dominant: dominant,
      score: (overallSentiment.positive - overallSentiment.negative) / total
    },
    overTime: sentimentOverTime,
    trends: await analyzeSentimentTrends(sentimentOverTime)
  }
}

async function extractConversationTopics(conversationData: any) {
  const messages = conversationData.messages || []
  const allText = messages.map(m => m.content || '').join(' ')

  // Simple topic extraction - in production, use NLP service
  const topics = []
  const topicKeywords = {
    'pricing': ['price', 'cost', 'budget', 'fee', 'payment', 'quote'],
    'features': ['feature', 'functionality', 'capability', 'tool', 'option'],
    'support': ['help', 'support', 'issue', 'problem', 'troubleshoot'],
    'timeline': ['when', 'timeline', 'deadline', 'schedule', 'timeframe'],
    'integration': ['integrate', 'connect', 'api', 'system', 'platform'],
    'training': ['train', 'learn', 'tutorial', 'guide', 'documentation']
  }

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    const matches = keywords.filter(keyword =>
      allText.toLowerCase().includes(keyword.toLowerCase())
    ).length

    if (matches > 0) {
      topics.push({
        topic: topic,
        relevance: (matches / keywords.length) * 100,
        mentions: matches
      })
    }
  }

  return topics.sort((a, b) => b.relevance - a.relevance)
}

async function extractEntities(conversationData: any) {
  const messages = conversationData.messages || []
  const entities = {
    people: [],
    organizations: [],
    products: [],
    dates: [],
    locations: [],
    monetary: []
  }

  const allText = messages.map(m => m.content || '').join(' ')

  // Simple entity extraction - in production, use NLP service
  entities.dates = extractDates(allText)
  entities.monetary = extractMonetaryValues(allText)
  entities.people = extractPeopleNames(allText)
  entities.organizations = extractOrganizations(allText)
  entities.products = extractProducts(allText)
  entities.locations = extractLocations(allText)

  return entities
}

async function measureConversationEffectiveness(conversationData: any) {
  const messages = conversationData.messages || []

  const metrics = {
    totalMessages: messages.length,
    averageMessageLength: 0,
    responseTimes: [],
    engagementLevel: 0,
    resolution: false,
    satisfaction: 0,
    clarity: 0,
    completeness: 0
  }

  if (messages.length === 0) return metrics

  // Calculate average message length
  const totalLength = messages.reduce((sum, msg) => sum + (msg.content || '').length, 0)
  metrics.averageMessageLength = totalLength / messages.length

  // Calculate response times
  for (let i = 1; i < messages.length; i++) {
    const current = new Date(messages[i].timestamp)
    const previous = new Date(messages[i - 1].timestamp)
    const responseTime = current.getTime() - previous.getTime()
    metrics.responseTimes.push(responseTime)
  }

  // Calculate engagement level
  const questions = messages.filter(msg => (msg.content || '').includes('?')).length
  const exclamations = messages.filter(msg => (msg.content || '').includes('!')).length
  metrics.engagementLevel = ((questions + exclamations) / messages.length) * 100

  // Assess resolution
  const lastMessage = messages[messages.length - 1]
  metrics.resolution = checkForResolution(lastMessage.content || '')

  // Calculate other metrics
  metrics.satisfaction = await assessSatisfaction(messages)
  metrics.clarity = await assessClarity(messages)
  metrics.completeness = await assessCompleteness(messages)

  return metrics
}

async function generateConversationInsights(conversationData: any) {
  const insights = []
  const analysis = await analyzeConversation(conversationData, 'comprehensive')

  // Sentiment insights
  if (analysis.sentiment.overall.dominant === 'positive') {
    insights.push('Conversation has a positive tone throughout')
  } else if (analysis.sentiment.overall.dominant === 'negative') {
    insights.push('Conversation shows signs of frustration or dissatisfaction')
  }

  // Topic insights
  if (analysis.topics.length > 0) {
    const topTopic = analysis.topics[0]
    insights.push(`Main topic of discussion: ${topTopic.topic} (${Math.round(topTopic.relevance)}% relevance)`)
  }

  // Effectiveness insights
  if (analysis.metrics.engagementLevel > 70) {
    insights.push('High engagement level indicates active participation')
  } else if (analysis.metrics.engagementLevel < 30) {
    insights.push('Low engagement level suggests passive communication')
  }

  // Resolution insights
  if (analysis.metrics.resolution) {
    insights.push('Conversation appears to have reached a resolution')
  } else {
    insights.push('Conversation may require follow-up for resolution')
  }

  // Response time insights
  if (analysis.metrics.responseTimes.length > 0) {
    const avgResponseTime = analysis.metrics.responseTimes.reduce((a, b) => a + b, 0) / analysis.metrics.responseTimes.length
    const avgMinutes = Math.round(avgResponseTime / 60000)
    if (avgMinutes < 60) {
      insights.push(`Quick response times (${avgMinutes} minutes average)`)
    } else {
      insights.push(`Response times could be improved (${avgMinutes} minutes average)`)
    }
  }

  return insights
}

async function generateConversationRecommendations(conversationData: any) {
  const recommendations = []
  const analysis = await analyzeConversation(conversationData, 'comprehensive')

  // Sentiment-based recommendations
  if (analysis.sentiment.overall.dominant === 'negative') {
    recommendations.push('Address concerns raised in the conversation promptly')
    recommendations.push('Consider follow-up to ensure satisfaction')
  }

  // Topic-based recommendations
  if (analysis.topics.some(t => t.topic === 'pricing')) {
    recommendations.push('Prepare pricing proposal based on discussion')
  }

  if (analysis.topics.some(t => t.topic === 'support')) {
    recommendations.push('Escalate to support team if issue not resolved')
  }

  // Effectiveness-based recommendations
  if (analysis.metrics.engagementLevel < 50) {
    recommendations.push('Increase engagement through more interactive communication')
  }

  if (!analysis.metrics.resolution) {
    recommendations.push('Schedule follow-up to ensure resolution')
  }

  // Response time recommendations
  if (analysis.metrics.responseTimes.length > 0) {
    const avgResponseTime = analysis.metrics.responseTimes.reduce((a, b) => a + b, 0) / analysis.metrics.responseTimes.length
    if (avgResponseTime > 3600000) { // 1 hour
      recommendations.push('Improve response times for better customer experience')
    }
  }

  return recommendations
}

async function generateConversationSummary(conversationData: any) {
  const analysis = await analyzeConversation(conversationData, 'comprehensive')

  let summary = `Conversation between ${conversationData.participants?.join(' and ') || 'participants'} `

  if (analysis.topics.length > 0) {
    const topTopics = analysis.topics.slice(0, 3).map(t => t.topic).join(', ')
    summary += `regarding ${topTopics}. `
  }

  summary += `The conversation had a ${analysis.sentiment.overall.dominant} tone `

  if (analysis.metrics.resolution) {
    summary += 'and appears to have reached a successful resolution.'
  } else {
    summary += 'and may require follow-up for complete resolution.'
  }

  return summary
}

// Helper functions
async function analyzeMessageSentiment(message: any): Promise<any> {
  const content = message.content || ''
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'happy', 'thanks', 'thank you']
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'disappointed', 'poor', 'issue', 'problem']

  let positive = 0
  let negative = 0
  let neutral = 0

  const words = content.toLowerCase().split(/\s+/)

  words.forEach(word => {
    if (positiveWords.some(pw => word.includes(pw))) positive++
    else if (negativeWords.some(nw => word.includes(nw))) negative++
    else neutral++
  })

  return { positive, negative, neutral }
}

async function analyzeSentimentTrends(sentimentOverTime: any[]): Promise<any> {
  if (sentimentOverTime.length < 2) return { trend: 'stable' }

  const firstHalf = sentimentOverTime.slice(0, Math.floor(sentimentOverTime.length / 2))
  const secondHalf = sentimentOverTime.slice(Math.floor(sentimentOverTime.length / 2))

  const firstAvg = firstHalf.reduce((sum, s) => sum + s.sentiment.positive - s.sentiment.negative, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((sum, s) => sum + s.sentiment.positive - s.sentiment.negative, 0) / secondHalf.length

  let trend = 'stable'
  if (secondAvg > firstAvg + 0.1) trend = 'improving'
  else if (secondAvg < firstAvg - 0.1) trend = 'declining'

  return { trend, firstHalfAvg: firstAvg, secondHalfAvg: secondAvg }
}

function extractDates(text: string): string[] {
  const datePatterns = [
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
    /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b/gi
  ]

  const dates = []
  datePatterns.forEach(pattern => {
    const matches = text.match(pattern)
    if (matches) dates.push(...matches)
  })

  return [...new Set(dates)]
}

function extractMonetaryValues(text: string): string[] {
  const moneyPatterns = [
    /\$\d+(?:,\d{3})*(?:\.\d{2})?/g,
    /\b\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:dollars?|usd|bucks)\b/gi
  ]

  const values = []
  moneyPatterns.forEach(pattern => {
    const matches = text.match(pattern)
    if (matches) values.push(...matches)
  })

  return [...new Set(values)]
}

function extractPeopleNames(text: string): string[] {
  // Simple name extraction - in production, use NLP service
  const names = []
  const words = text.split(/\s+/)
  for (let i = 0; i < words.length - 1; i++) {
    const word = words[i]
    const nextWord = words[i + 1]
    if (word[0] === word[0].toUpperCase() && nextWord[0] === nextWord[0].toUpperCase()) {
      names.push(`${word} ${nextWord}`)
    }
  }
  return [...new Set(names)]
}

function extractOrganizations(text: string): string[] {
  // Simple organization extraction
  const orgs = []
  const words = text.split(/\s+/)
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    if (word.length > 3 && word[0] === word[0].toUpperCase()) {
      // Check for company indicators
      if (words[i + 1] && ['Inc', 'LLC', 'Corp', 'Ltd', 'Company'].includes(words[i + 1])) {
        orgs.push(`${word} ${words[i + 1]}`)
      } else if (word.includes('Corp') || word.includes('Inc') || word.includes('LLC')) {
        orgs.push(word)
      }
    }
  }
  return [...new Set(orgs)]
}

function extractProducts(text: string): string[] {
  // Simple product extraction
  const products = []
  const productKeywords = ['software', 'tool', 'platform', 'service', 'product', 'solution']
  const words = text.split(/\s+/)

  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase()
    if (productKeywords.includes(word)) {
      // Get surrounding context
      const start = Math.max(0, i - 2)
      const end = Math.min(words.length, i + 3)
      const context = words.slice(start, end).join(' ')
      products.push(context)
    }
  }

  return [...new Set(products)]
}

function extractLocations(text: string): string[] {
  // Simple location extraction
  const locations = []
  const locationKeywords = ['New York', 'London', 'Tokyo', 'San Francisco', 'Chicago', 'Boston']

  locationKeywords.forEach(location => {
    if (text.includes(location)) {
      locations.push(location)
    }
  })

  return locations
}

function checkForResolution(text: string): boolean {
  const resolutionKeywords = ['resolved', 'fixed', 'solved', 'completed', 'done', 'finished', 'thank you', 'appreciate']
  return resolutionKeywords.some(keyword => text.toLowerCase().includes(keyword))
}

async function assessSatisfaction(messages: any[]): Promise<number> {
  let satisfaction = 50

  const positiveIndicators = ['thank you', 'great', 'excellent', 'perfect', 'awesome', 'love it']
  const negativeIndicators = ['disappointed', 'frustrated', 'angry', 'bad', 'terrible', 'awful']

  let positiveCount = 0
  let negativeCount = 0

  messages.forEach(message => {
    const content = message.content?.toLowerCase() || ''
    positiveIndicators.forEach(indicator => {
      if (content.includes(indicator)) positiveCount++
    })
    negativeIndicators.forEach(indicator => {
      if (content.includes(indicator)) negativeCount++
    })
  })

  if (positiveCount > negativeCount) {
    satisfaction += 25
  } else if (negativeCount > positiveCount) {
    satisfaction -= 25
  }

  return Math.max(0, Math.min(100, satisfaction))
}

async function assessClarity(messages: any[]): Promise<number> {
  let clarity = 100

  messages.forEach(message => {
    const content = message.content || ''
    // Reduce clarity for very short messages
    if (content.length < 10) clarity -= 10
    // Reduce clarity for messages with many questions
    const questionCount = (content.match(/\?/g) || []).length
    if (questionCount > 2) clarity -= 15
  })

  return Math.max(0, clarity)
}

async function assessCompleteness(messages: any[]): Promise<number> {
  let completeness = 50

  const lastMessage = messages[messages.length - 1]
  if (lastMessage) {
    const content = lastMessage.content?.toLowerCase() || ''
    if (content.includes('next steps') || content.includes('follow up') || content.includes('summary')) {
      completeness += 25
    }
    if (content.includes('thank you') || content.includes('appreciate')) {
      completeness += 25
    }
  }

  return Math.min(100, completeness)
}