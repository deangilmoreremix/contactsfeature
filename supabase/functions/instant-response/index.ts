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

    const { message, context, contactData } = await req.json()

    const response = await generateInstantResponse(message, context, contactData)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function generateInstantResponse(message: string, context: any = {}, contactData: any = {}) {
  // Analyze the incoming message
  const messageAnalysis = await analyzeMessage(message)

  // Generate contextual response based on contact data and context
  const response = await craftResponse(messageAnalysis, context, contactData)

  // Add response metadata
  response.metadata = {
    generatedAt: new Date().toISOString(),
    responseTime: Date.now(),
    confidence: calculateConfidence(messageAnalysis, contactData),
    contextUsed: Object.keys(context).length,
    contactDataUsed: Object.keys(contactData).length
  }

  return response
}

async function analyzeMessage(message: string) {
  return {
    type: detectMessageType(message),
    sentiment: analyzeSentiment(message),
    intent: detectIntent(message),
    urgency: detectUrgency(message),
    topics: extractTopics(message),
    entities: extractEntities(message),
    length: message.length,
    language: detectLanguage(message)
  }
}

async function craftResponse(analysis: any, context: any, contactData: any) {
  let response = {
    text: '',
    suggestions: [],
    actions: [],
    followUp: null
  }

  // Generate response based on message type and intent
  switch (analysis.intent) {
    case 'question':
      response = await handleQuestion(analysis, context, contactData)
      break
    case 'request':
      response = await handleRequest(analysis, context, contactData)
      break
    case 'complaint':
      response = await handleComplaint(analysis, context, contactData)
      break
    case 'praise':
      response = await handlePraise(analysis, context, contactData)
      break
    default:
      response = await handleGeneral(analysis, context, contactData)
  }

  return response
}

async function handleQuestion(analysis: any, context: any, contactData: any) {
  const responses = {
    pricing: `I'd be happy to discuss pricing with you. Our packages are designed to fit different business needs. Would you like me to send you our pricing guide?`,
    features: `Great question about our features! We offer comprehensive solutions including ${context.features?.slice(0, 3).join(', ')}. Would you like a demo?`,
    timeline: `Our typical implementation timeline is ${context.timeline || '2-4 weeks'} depending on your specific requirements.`,
    support: `We provide 24/7 support through multiple channels. Our average response time is under 2 hours.`
  }

  const topic = analysis.topics[0] || 'general'
  const response = responses[topic] || `Thank you for your question. Let me connect you with the right team member to provide a detailed answer.`

  return {
    text: response,
    suggestions: ['Schedule a call', 'Send documentation', 'Connect with specialist'],
    actions: ['schedule_call', 'send_docs'],
    followUp: 'follow_up_call'
  }
}

async function handleRequest(analysis: any, context: any, contactData: any) {
  return {
    text: `I understand you're looking for ${analysis.topics.join(', ')}. I'd be happy to help you with this request.`,
    suggestions: ['Start process', 'Provide more details', 'Schedule consultation'],
    actions: ['start_process', 'schedule_consultation'],
    followUp: 'process_request'
  }
}

async function handleComplaint(analysis: any, context: any, contactData: any) {
  return {
    text: `I'm sorry to hear about your experience. I truly apologize for any inconvenience this has caused. Let me help resolve this issue immediately.`,
    suggestions: ['Escalate to manager', 'Schedule resolution call', 'Offer compensation'],
    actions: ['escalate', 'schedule_resolution', 'offer_compensation'],
    followUp: 'resolution_followup'
  }
}

async function handlePraise(analysis: any, context: any, contactData: any) {
  return {
    text: `Thank you so much for the kind words! We're thrilled that you're happy with our service. Your feedback means a lot to us.`,
    suggestions: ['Share testimonial', 'Refer a friend', 'Upgrade services'],
    actions: ['request_testimonial', 'referral_program'],
    followUp: 'thank_you_followup'
  }
}

async function handleGeneral(analysis: any, context: any, contactData: any) {
  const greeting = contactData.name ? `Hi ${contactData.name}! ` : 'Hello! '

  return {
    text: `${greeting}Thank you for reaching out. How can I help you today?`,
    suggestions: ['Learn more', 'Schedule demo', 'Speak with team'],
    actions: ['learn_more', 'schedule_demo', 'connect_team'],
    followUp: 'general_followup'
  }
}

function detectMessageType(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('?')) return 'question'
  if (lowerMessage.includes('please') || lowerMessage.includes('can you') || lowerMessage.includes('would you')) return 'request'
  if (lowerMessage.includes('problem') || lowerMessage.includes('issue') || lowerMessage.includes('wrong')) return 'complaint'
  if (lowerMessage.includes('great') || lowerMessage.includes('excellent') || lowerMessage.includes('amazing')) return 'praise'

  return 'general'
}

function analyzeSentiment(message: string): string {
  const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'happy', 'good']
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'disappointed', 'poor', 'wrong']

  const lowerMessage = message.toLowerCase()
  let positiveScore = 0
  let negativeScore = 0

  positiveWords.forEach(word => {
    if (lowerMessage.includes(word)) positiveScore++
  })

  negativeWords.forEach(word => {
    if (lowerMessage.includes(word)) negativeScore++
  })

  if (positiveScore > negativeScore) return 'positive'
  if (negativeScore > positiveScore) return 'negative'
  return 'neutral'
}

function detectIntent(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('?') || lowerMessage.includes('what') || lowerMessage.includes('how') || lowerMessage.includes('when')) {
    return 'question'
  }
  if (lowerMessage.includes('please') || lowerMessage.includes('can you') || lowerMessage.includes('would you') || lowerMessage.includes('need')) {
    return 'request'
  }
  if (lowerMessage.includes('problem') || lowerMessage.includes('issue') || lowerMessage.includes('wrong') || lowerMessage.includes('bad')) {
    return 'complaint'
  }
  if (lowerMessage.includes('great') || lowerMessage.includes('excellent') || lowerMessage.includes('amazing') || lowerMessage.includes('love')) {
    return 'praise'
  }

  return 'general'
}

function detectUrgency(message: string): string {
  const urgentWords = ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'fast', 'quick', 'rush']
  const lowerMessage = message.toLowerCase()

  return urgentWords.some(word => lowerMessage.includes(word)) ? 'high' : 'normal'
}

function extractTopics(message: string): string[] {
  const topics = []
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('pricing')) {
    topics.push('pricing')
  }
  if (lowerMessage.includes('feature') || lowerMessage.includes('function') || lowerMessage.includes('capability')) {
    topics.push('features')
  }
  if (lowerMessage.includes('time') || lowerMessage.includes('timeline') || lowerMessage.includes('schedule')) {
    topics.push('timeline')
  }
  if (lowerMessage.includes('support') || lowerMessage.includes('help') || lowerMessage.includes('assist')) {
    topics.push('support')
  }

  return topics.length > 0 ? topics : ['general']
}

function extractEntities(message: string): any {
  // Simple entity extraction - could be enhanced with AI
  return {
    emails: message.match(/[\w.-]+@[\w.-]+\.\w+/g) || [],
    phones: message.match(/[\+]?[\d\s\-\(\)]{10,}/g) || [],
    urls: message.match(/https?:\/\/[^\s]+/g) || []
  }
}

function detectLanguage(message: string): string {
  // Simple language detection - could be enhanced
  return 'english'
}

function calculateConfidence(analysis: any, contactData: any): number {
  let confidence = 50

  // Higher confidence for clear intents
  if (analysis.intent !== 'general') confidence += 20

  // Higher confidence with contact data
  if (contactData.name) confidence += 10
  if (contactData.company) confidence += 10

  // Higher confidence for shorter, clearer messages
  if (analysis.length < 100) confidence += 10

  return Math.min(100, confidence)
}