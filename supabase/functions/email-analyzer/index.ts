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

    const { emailContent, analysisType } = await req.json()

    const analysis = await analyzeEmail(emailContent, analysisType)

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

async function analyzeEmail(emailContent: any, analysisType: string) {
  const analysis = {
    content: emailContent,
    metrics: {},
    sentiment: {},
    recommendations: [],
    score: 0,
    analyzedAt: new Date().toISOString()
  }

  switch (analysisType) {
    case 'comprehensive':
      return await comprehensiveEmailAnalysis(emailContent)
    case 'sentiment':
      analysis.sentiment = await analyzeSentiment(emailContent)
      break
    case 'engagement':
      analysis.metrics = await analyzeEngagement(emailContent)
      break
    case 'effectiveness':
      analysis.score = await calculateEmailEffectiveness(emailContent)
      analysis.recommendations = await generateEmailRecommendations(emailContent)
      break
    default:
      analysis.metrics = await basicEmailMetrics(emailContent)
  }

  return analysis
}

async function comprehensiveEmailAnalysis(emailContent: any) {
  const analysis = {
    content: emailContent,
    metrics: await basicEmailMetrics(emailContent),
    sentiment: await analyzeSentiment(emailContent),
    readability: await analyzeReadability(emailContent),
    effectiveness: await calculateEmailEffectiveness(emailContent),
    recommendations: await generateEmailRecommendations(emailContent),
    score: 0,
    analyzedAt: new Date().toISOString()
  }

  // Calculate overall score
  analysis.score = Math.round(
    (analysis.metrics.score || 0) * 0.3 +
    (analysis.sentiment.score || 0) * 0.2 +
    (analysis.readability.score || 0) * 0.2 +
    (analysis.effectiveness || 0) * 0.3
  )

  return analysis
}

async function basicEmailMetrics(emailContent: any) {
  const { subject, body, sender } = emailContent

  const metrics = {
    subjectLength: subject ? subject.length : 0,
    bodyLength: body ? body.length : 0,
    wordCount: body ? body.split(/\s+/).length : 0,
    paragraphCount: body ? body.split('\n\n').length : 0,
    hasPersonalization: checkPersonalization(body),
    hasCallToAction: checkCallToAction(body),
    hasLinks: checkLinks(body),
    hasImages: checkImages(body),
    score: 0
  }

  // Calculate basic score
  let score = 50 // Base score

  if (metrics.subjectLength > 0 && metrics.subjectLength <= 60) score += 10
  if (metrics.wordCount > 50 && metrics.wordCount < 200) score += 10
  if (metrics.hasPersonalization) score += 15
  if (metrics.hasCallToAction) score += 10
  if (metrics.hasLinks) score += 5

  metrics.score = Math.min(100, score)

  return metrics
}

async function analyzeSentiment(emailContent: any) {
  const { subject, body } = emailContent

  // Simple sentiment analysis - in production, use AI service
  const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'happy']
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'disappointed', 'poor']

  const text = `${subject} ${body}`.toLowerCase()
  let positiveScore = 0
  let negativeScore = 0

  positiveWords.forEach(word => {
    const matches = text.match(new RegExp(word, 'g'))
    if (matches) positiveScore += matches.length
  })

  negativeWords.forEach(word => {
    const matches = text.match(new RegExp(word, 'g'))
    if (matches) negativeScore += matches.length
  })

  const total = positiveScore + negativeScore
  const sentiment = total === 0 ? 'neutral' :
    positiveScore > negativeScore ? 'positive' : 'negative'

  return {
    sentiment,
    positiveScore,
    negativeScore,
    score: total === 0 ? 50 : Math.round((positiveScore / total) * 100)
  }
}

async function analyzeReadability(emailContent: any) {
  const { body } = emailContent

  if (!body) return { score: 0, level: 'unknown' }

  const sentences = body.split(/[.!?]+/).length
  const words = body.split(/\s+/).length
  const syllables = countSyllables(body)

  // Flesch Reading Ease score
  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)

  let level = 'unknown'
  if (score >= 90) level = '5th grade'
  else if (score >= 80) level = '6th grade'
  else if (score >= 70) level = '7th grade'
  else if (score >= 60) level = '8th-9th grade'
  else if (score >= 50) level = '10th-12th grade'
  else level = 'college'

  return {
    score: Math.max(0, Math.min(100, score)),
    level,
    sentences,
    words,
    syllables
  }
}

async function calculateEmailEffectiveness(emailContent: any) {
  const metrics = await basicEmailMetrics(emailContent)
  const sentiment = await analyzeSentiment(emailContent)

  let effectiveness = 50

  // Subject line effectiveness
  if (metrics.subjectLength > 10 && metrics.subjectLength < 60) effectiveness += 10

  // Content quality
  if (metrics.wordCount > 75 && metrics.wordCount < 150) effectiveness += 10

  // Engagement elements
  if (metrics.hasPersonalization) effectiveness += 15
  if (metrics.hasCallToAction) effectiveness += 10
  if (metrics.hasLinks) effectiveness += 5

  // Sentiment
  if (sentiment.sentiment === 'positive') effectiveness += 10

  return Math.min(100, effectiveness)
}

async function generateEmailRecommendations(emailContent: any) {
  const recommendations = []
  const metrics = await basicEmailMetrics(emailContent)

  if (metrics.subjectLength === 0) {
    recommendations.push('Add a compelling subject line')
  } else if (metrics.subjectLength > 60) {
    recommendations.push('Shorten subject line for better mobile display')
  }

  if (metrics.wordCount < 50) {
    recommendations.push('Add more content to provide value')
  } else if (metrics.wordCount > 200) {
    recommendations.push('Consider shortening content for better engagement')
  }

  if (!metrics.hasPersonalization) {
    recommendations.push('Add personalization to increase engagement')
  }

  if (!metrics.hasCallToAction) {
    recommendations.push('Include a clear call-to-action')
  }

  if (!metrics.hasLinks) {
    recommendations.push('Consider adding relevant links')
  }

  return recommendations
}

function checkPersonalization(text: string): boolean {
  if (!text) return false
  const personalizationPatterns = [
    /\{\{.*?\}\}/g, // Template variables
    /\b(you|your|you're)\b/gi, // Direct address
    /\b(hi|hello|dear)\s+\w+/gi // Personalized greeting
  ]

  return personalizationPatterns.some(pattern => pattern.test(text))
}

function checkCallToAction(text: string): boolean {
  if (!text) return false
  const ctaPatterns = [
    /\b(click here|learn more|sign up|contact us|get started)\b/gi,
    /\b(button|link|register|download)\b/gi,
    /\?.*\?/g // Questions that prompt action
  ]

  return ctaPatterns.some(pattern => pattern.test(text))
}

function checkLinks(text: string): boolean {
  if (!text) return false
  const linkPattern = /https?:\/\/[^\s]+/gi
  return linkPattern.test(text)
}

function checkImages(text: string): boolean {
  if (!text) return false
  const imagePattern = /<img[^>]+>/gi
  return imagePattern.test(text)
}

function countSyllables(text: string): number {
  if (!text) return 0

  const words = text.toLowerCase().split(/\s+/)
  let syllables = 0

  words.forEach(word => {
    // Remove punctuation
    const cleanWord = word.replace(/[^a-z]/g, '')

    if (cleanWord.length <= 3) {
      syllables += 1
    } else {
      syllables += cleanWord.match(/[aeiouy]{1,2}/g)?.length || 1
    }
  })

  return syllables
}