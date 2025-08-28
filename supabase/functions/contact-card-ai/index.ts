import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-control-Allow-Origin': '*',
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

    const { contactData, cardType, options } = await req.json()

    const enhancedCard = await enhanceContactCard(contactData, cardType, options)

    return new Response(JSON.stringify(enhancedCard), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function enhanceContactCard(contactData: any, cardType: string, options: any = {}) {
  const enhanced = {
    originalData: contactData,
    cardType: cardType || 'standard',
    enhancements: {},
    insights: [],
    recommendations: [],
    riskIndicators: [],
    opportunityFlags: [],
    engagement: {},
    lastUpdated: new Date().toISOString()
  }

  switch (cardType) {
    case 'comprehensive':
      enhanced.enhancements = await generateComprehensiveEnhancements(contactData)
      break
    case 'sales':
      enhanced.enhancements = await generateSalesEnhancements(contactData)
      break
    case 'support':
      enhanced.enhancements = await generateSupportEnhancements(contactData)
      break
    case 'marketing':
      enhanced.enhancements = await generateMarketingEnhancements(contactData)
      break
    default:
      enhanced.enhancements = await generateStandardEnhancements(contactData)
  }

  // Generate insights regardless of card type
  enhanced.insights = await generateContactInsights(contactData)
  enhanced.recommendations = await generateContactRecommendations(contactData)
  enhanced.riskIndicators = await identifyRiskIndicators(contactData)
  enhanced.opportunityFlags = await identifyOpportunityFlags(contactData)
  enhanced.engagement = await calculateEngagementMetrics(contactData)

  return enhanced
}

async function generateStandardEnhancements(contact: any) {
  const enhancements = {}

  // Basic information enhancement
  if (contact.name) {
    enhancements.name = {
      displayName: formatDisplayName(contact.name),
      phonetic: generatePhonetic(contact.name),
      formality: detectFormality(contact.name)
    }
  }

  // Contact information
  if (contact.email) {
    enhancements.email = {
      isValid: validateEmail(contact.email),
      domain: extractDomain(contact.email),
      provider: getEmailProvider(contact.email)
    }
  }

  if (contact.phone) {
    enhancements.phone = {
      formatted: formatPhoneNumber(contact.phone),
      type: detectPhoneType(contact.phone),
      country: detectPhoneCountry(contact.phone)
    }
  }

  // Company information
  if (contact.company) {
    enhancements.company = {
      formatted: formatCompanyName(contact.company),
      industry: await inferIndustry(contact.company),
      size: await estimateCompanySize(contact.company)
    }
  }

  return enhancements
}

async function generateComprehensiveEnhancements(contact: any) {
  const enhancements = await generateStandardEnhancements(contact)

  // Add comprehensive enhancements
  enhancements.social = await generateSocialEnhancements(contact)
  enhancements.behavioral = await generateBehavioralEnhancements(contact)
  enhancements.predictive = await generatePredictiveEnhancements(contact)
  enhancements.contextual = await generateContextualEnhancements(contact)

  return enhancements
}

async function generateSalesEnhancements(contact: any) {
  const enhancements = await generateStandardEnhancements(contact)

  // Sales-specific enhancements
  enhancements.sales = {
    leadScore: await calculateLeadScore(contact),
    buyingStage: await determineBuyingStage(contact),
    budget: await estimateBudget(contact),
    timeline: await predictTimeline(contact),
    decisionMakers: await identifyDecisionMakers(contact),
    competitors: await identifyCompetitors(contact)
  }

  return enhancements
}

async function generateSupportEnhancements(contact: any) {
  const enhancements = await generateStandardEnhancements(contact)

  // Support-specific enhancements
  enhancements.support = {
    priority: await calculateSupportPriority(contact),
    issueHistory: await analyzeIssueHistory(contact),
    satisfaction: await predictSatisfaction(contact),
    escalationRisk: await calculateEscalationRisk(contact),
    resolutionTime: await predictResolutionTime(contact)
  }

  return enhancements
}

async function generateMarketingEnhancements(contact: any) {
  const enhancements = await generateStandardEnhancements(contact)

  // Marketing-specific enhancements
  enhancements.marketing = {
    segments: await determineSegments(contact),
    interests: await inferInterests(contact),
    preferences: await analyzePreferences(contact),
    engagement: await calculateMarketingEngagement(contact),
    campaigns: await recommendCampaigns(contact)
  }

  return enhancements
}

async function generateContactInsights(contact: any) {
  const insights = []

  // Demographic insights
  if (contact.location) {
    insights.push(`Located in ${contact.location} - consider time zone for communications`)
  }

  // Professional insights
  if (contact.jobTitle && contact.company) {
    insights.push(`${contact.jobTitle} at ${contact.company} - ${await generateRoleInsight(contact.jobTitle, contact.company)}`)
  }

  // Engagement insights
  if (contact.lastActivity) {
    const daysSince = Math.floor((Date.now() - new Date(contact.lastActivity).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSince > 30) {
      insights.push(`Last active ${daysSince} days ago - consider re-engagement campaign`)
    } else if (daysSince < 7) {
      insights.push(`Recently active (${daysSince} days ago) - good timing for follow-up`)
    }
  }

  // Communication insights
  if (contact.preferredChannel) {
    insights.push(`Prefers communication via ${contact.preferredChannel}`)
  }

  return insights
}

async function generateContactRecommendations(contact: any) {
  const recommendations = []

  // Communication recommendations
  if (!contact.preferredChannel) {
    recommendations.push('Determine preferred communication channel')
  }

  // Engagement recommendations
  if (contact.engagementScore < 50) {
    recommendations.push('Increase engagement through personalized content')
  }

  // Data completeness recommendations
  const missingFields = []
  if (!contact.phone) missingFields.push('phone number')
  if (!contact.company) missingFields.push('company information')
  if (!contact.jobTitle) missingFields.push('job title')

  if (missingFields.length > 0) {
    recommendations.push(`Gather missing information: ${missingFields.join(', ')}`)
  }

  // Timing recommendations
  if (contact.timezone) {
    recommendations.push(`Schedule communications during ${contact.timezone} business hours`)
  }

  return recommendations
}

async function identifyRiskIndicators(contact: any) {
  const risks = []

  // Data quality risks
  if (!contact.email && !contact.phone) {
    risks.push('No reliable contact method')
  }

  // Engagement risks
  if (contact.engagementScore < 30) {
    risks.push('Low engagement - risk of disinterest')
  }

  // Timing risks
  if (contact.lastActivity) {
    const daysSince = Math.floor((Date.now() - new Date(contact.lastActivity).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSince > 90) {
      risks.push('Extended inactivity - potential churn risk')
    }
  }

  // Data accuracy risks
  if (contact.email && !validateEmail(contact.email)) {
    risks.push('Invalid email address')
  }

  return risks
}

async function identifyOpportunityFlags(contact: any) {
  const opportunities = []

  // Growth opportunities
  if (contact.company && contact.jobTitle) {
    if (contact.jobTitle.includes('VP') || contact.jobTitle.includes('Director')) {
      opportunities.push('High-level executive - potential for enterprise solutions')
    }
  }

  // Engagement opportunities
  if (contact.engagementScore > 70) {
    opportunities.push('Highly engaged - good candidate for upsell/cross-sell')
  }

  // Referral opportunities
  if (contact.referralCount > 0) {
    opportunities.push('Referral source - nurture relationship for more referrals')
  }

  // Expansion opportunities
  if (contact.company && contact.companySize > 100) {
    opportunities.push('Large company - potential for account expansion')
  }

  return opportunities
}

async function calculateEngagementMetrics(contact: any) {
  return {
    overallScore: contact.engagementScore || 0,
    emailEngagement: calculateEmailEngagement(contact),
    socialEngagement: calculateSocialEngagement(contact),
    websiteEngagement: calculateWebsiteEngagement(contact),
    lastInteraction: contact.lastActivity,
    interactionFrequency: calculateInteractionFrequency(contact),
    preferredChannel: contact.preferredChannel || 'unknown'
  }
}

// Helper functions
function formatDisplayName(name: string): string {
  return name.trim()
}

function generatePhonetic(name: string): string {
  // Simple phonetic representation
  return name.toLowerCase().replace(/[^a-z]/g, '')
}

function detectFormality(name: string): string {
  // Simple formality detection
  const parts = name.split(' ')
  if (parts.length > 1) return 'formal'
  return 'casual'
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function extractDomain(email: string): string {
  return email.split('@')[1]
}

function getEmailProvider(email: string): string {
  const domain = email.split('@')[1].toLowerCase()
  const providers = {
    'gmail.com': 'Gmail',
    'yahoo.com': 'Yahoo',
    'hotmail.com': 'Hotmail',
    'outlook.com': 'Outlook'
  }
  return providers[domain] || 'Other'
}

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

function detectPhoneType(phone: string): string {
  // Simple phone type detection
  return 'mobile'
}

function detectPhoneCountry(phone: string): string {
  // Simple country detection
  return 'US'
}

function formatCompanyName(company: string): string {
  return company.trim()
}

async function inferIndustry(company: string): Promise<string> {
  // Placeholder for industry inference
  return 'Technology'
}

async function estimateCompanySize(company: string): Promise<string> {
  // Placeholder for company size estimation
  return '51-200'
}

async function generateSocialEnhancements(contact: any) {
  return {
    profiles: contact.socialProfiles || [],
    recommendations: ['Connect on LinkedIn', 'Follow on Twitter']
  }
}

async function generateBehavioralEnhancements(contact: any) {
  return {
    patterns: ['Regular email opener', 'Weekend activity'],
    predictions: ['Likely to respond within 24 hours']
  }
}

async function generatePredictiveEnhancements(contact: any) {
  return {
    nextAction: 'Send personalized email',
    bestTime: 'Tuesday 10 AM',
    conversionProbability: 0.75
  }
}

async function generateContextualEnhancements(contact: any) {
  return {
    industryTrends: ['AI adoption increasing'],
    companyNews: ['Recent funding round'],
    marketPosition: 'Growing market leader'
  }
}

async function calculateLeadScore(contact: any): Promise<number> {
  let score = 50
  if (contact.jobTitle) score += 10
  if (contact.company) score += 10
  if (contact.budget) score += 15
  return Math.min(100, score)
}

async function determineBuyingStage(contact: any): Promise<string> {
  if (contact.budget && contact.timeline) return 'ready'
  if (contact.interests) return 'considering'
  return 'awareness'
}

async function estimateBudget(contact: any): Promise<string> {
  // Placeholder
  return '$10,000 - $50,000'
}

async function predictTimeline(contact: any): Promise<string> {
  // Placeholder
  return '3-6 months'
}

async function identifyDecisionMakers(contact: any): Promise<any[]> {
  // Placeholder
  return []
}

async function identifyCompetitors(contact: any): Promise<any[]> {
  // Placeholder
  return []
}

async function calculateSupportPriority(contact: any): Promise<string> {
  if (contact.urgency === 'high') return 'high'
  if (contact.accountType === 'premium') return 'high'
  return 'medium'
}

async function analyzeIssueHistory(contact: any): Promise<any> {
  return {
    totalIssues: contact.issues?.length || 0,
    resolvedIssues: contact.issues?.filter((i: any) => i.resolved).length || 0,
    averageResolutionTime: '2.5 days'
  }
}

async function predictSatisfaction(contact: any): Promise<number> {
  // Placeholder
  return 85
}

async function calculateEscalationRisk(contact: any): Promise<number> {
  // Placeholder
  return 25
}

async function predictResolutionTime(contact: any): Promise<string> {
  // Placeholder
  return '24-48 hours'
}

async function determineSegments(contact: any): Promise<string[]> {
  const segments = []
  if (contact.industry) segments.push(contact.industry)
  if (contact.companySize > 100) segments.push('enterprise')
  segments.push('active')
  return segments
}

async function inferInterests(contact: any): Promise<string[]> {
  // Placeholder
  return ['Technology', 'Business Development']
}

async function analyzePreferences(contact: any): Promise<any> {
  return {
    frequency: 'weekly',
    contentType: 'educational',
    channel: contact.preferredChannel || 'email'
  }
}

async function calculateMarketingEngagement(contact: any): Promise<number> {
  return contact.engagementScore || 50
}

async function recommendCampaigns(contact: any): Promise<string[]> {
  return ['Welcome Series', 'Product Updates', 'Industry Insights']
}

async function generateRoleInsight(jobTitle: string, company: string): Promise<string> {
  // Placeholder
  return 'Key decision maker with purchasing authority'
}

function calculateEmailEngagement(contact: any): number {
  return contact.emailEngagement || 0
}

function calculateSocialEngagement(contact: any): number {
  return contact.socialEngagement || 0
}

function calculateWebsiteEngagement(contact: any): number {
  return contact.websiteEngagement || 0
}

function calculateInteractionFrequency(contact: any): string {
  // Placeholder
  return 'weekly'
}