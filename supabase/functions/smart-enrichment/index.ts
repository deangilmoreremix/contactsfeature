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

    const { data, enrichmentType, options } = await req.json()

    const enrichedData = await performSmartEnrichment(data, enrichmentType, options)

    return new Response(JSON.stringify(enrichedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function performSmartEnrichment(data: any, type: string, options: any = {}) {
  const enrichment = {
    originalData: data,
    enrichedData: { ...data },
    enrichmentLog: [],
    confidence: 0,
    enrichedAt: new Date().toISOString()
  }

  switch (type) {
    case 'contact':
      return await enrichContactData(data, options)
    case 'company':
      return await enrichCompanyData(data, options)
    case 'social':
      return await enrichSocialData(data, options)
    case 'comprehensive':
      return await comprehensiveEnrichment(data, options)
    default:
      return await basicEnrichment(data, options)
  }
}

async function enrichContactData(contact: any, options: any) {
  const enriched = { ...contact }
  const log = []

  // Email enrichment
  if (contact.email && options.enrichEmail) {
    const emailEnrichment = await enrichEmail(contact.email)
    enriched.emailData = emailEnrichment
    log.push('Email enriched')
  }

  // Phone enrichment
  if (contact.phone && options.enrichPhone) {
    const phoneEnrichment = await enrichPhone(contact.phone)
    enriched.phoneData = phoneEnrichment
    log.push('Phone enriched')
  }

  // Name enrichment
  if (contact.name && options.enrichName) {
    const nameEnrichment = await enrichName(contact.name)
    enriched.nameData = nameEnrichment
    log.push('Name enriched')
  }

  // Address enrichment
  if (contact.address && options.enrichAddress) {
    const addressEnrichment = await enrichAddress(contact.address)
    enriched.addressData = addressEnrichment
    log.push('Address enriched')
  }

  return {
    originalData: contact,
    enrichedData: enriched,
    enrichmentLog: log,
    confidence: calculateConfidence(log),
    enrichedAt: new Date().toISOString()
  }
}

async function enrichCompanyData(company: any, options: any) {
  const enriched = { ...company }
  const log = []

  // Company info enrichment
  if (company.name && options.enrichCompanyInfo) {
    const companyInfo = await enrichCompanyInfo(company.name)
    enriched.companyInfo = companyInfo
    log.push('Company info enriched')
  }

  // Industry classification
  if (options.classifyIndustry) {
    const industry = await classifyIndustry(company)
    enriched.industry = industry
    log.push('Industry classified')
  }

  // Company size estimation
  if (options.estimateSize) {
    const size = await estimateCompanySize(company)
    enriched.size = size
    log.push('Company size estimated')
  }

  return {
    originalData: company,
    enrichedData: enriched,
    enrichmentLog: log,
    confidence: calculateConfidence(log),
    enrichedAt: new Date().toISOString()
  }
}

async function enrichSocialData(contact: any, options: any) {
  const enriched = { ...contact }
  const log = []

  // Social media discovery
  if (options.findSocialProfiles) {
    const socialProfiles = await discoverSocialProfiles(contact)
    enriched.socialProfiles = socialProfiles
    log.push('Social profiles discovered')
  }

  // Social media metrics
  if (options.getSocialMetrics && enriched.socialProfiles) {
    const metrics = await getSocialMetrics(enriched.socialProfiles)
    enriched.socialMetrics = metrics
    log.push('Social metrics retrieved')
  }

  return {
    originalData: contact,
    enrichedData: enriched,
    enrichmentLog: log,
    confidence: calculateConfidence(log),
    enrichedAt: new Date().toISOString()
  }
}

async function comprehensiveEnrichment(data: any, options: any) {
  // Combine all enrichment types
  let result = await enrichContactData(data, options)
  if (data.company) {
    const companyResult = await enrichCompanyData(data.company, options)
    result.enrichedData.companyData = companyResult.enrichedData
    result.enrichmentLog.push(...companyResult.enrichmentLog)
  }

  const socialResult = await enrichSocialData(data, options)
  result.enrichedData.socialData = socialResult.enrichedData
  result.enrichmentLog.push(...socialResult.enrichmentLog)

  result.confidence = calculateConfidence(result.enrichmentLog)

  return result
}

async function basicEnrichment(data: any, options: any) {
  // Basic data cleaning and formatting
  const enriched = { ...data }
  const log = []

  // Data normalization
  if (data.name) {
    enriched.normalizedName = normalizeName(data.name)
    log.push('Name normalized')
  }

  if (data.email) {
    enriched.normalizedEmail = normalizeEmail(data.email)
    log.push('Email normalized')
  }

  if (data.phone) {
    enriched.normalizedPhone = normalizePhone(data.phone)
    log.push('Phone normalized')
  }

  return {
    originalData: data,
    enrichedData: enriched,
    enrichmentLog: log,
    confidence: calculateConfidence(log),
    enrichedAt: new Date().toISOString()
  }
}

// Helper functions
async function enrichEmail(email: string) {
  // Placeholder for email enrichment API
  return {
    domain: email.split('@')[1],
    isValid: true,
    isDisposable: false,
    provider: getEmailProvider(email)
  }
}

async function enrichPhone(phone: string) {
  // Placeholder for phone enrichment API
  return {
    country: 'US',
    type: 'mobile',
    carrier: 'Unknown'
  }
}

async function enrichName(name: string) {
  // Placeholder for name enrichment
  const parts = name.split(' ')
  return {
    firstName: parts[0],
    lastName: parts[parts.length - 1],
    middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : null
  }
}

async function enrichAddress(address: string) {
  // Placeholder for address enrichment
  return {
    formatted: address,
    components: {
      street: '',
      city: '',
      state: '',
      zip: ''
    }
  }
}

async function enrichCompanyInfo(name: string) {
  // Placeholder for company enrichment
  return {
    name: name,
    domain: `${name.toLowerCase()}.com`,
    industry: 'Unknown',
    size: 'Unknown'
  }
}

async function classifyIndustry(company: any) {
  // Placeholder for industry classification
  return 'Technology'
}

async function estimateCompanySize(company: any) {
  // Placeholder for company size estimation
  return '51-200'
}

async function discoverSocialProfiles(contact: any) {
  // Placeholder for social media discovery
  return {
    linkedin: null,
    twitter: null,
    facebook: null
  }
}

async function getSocialMetrics(profiles: any) {
  // Placeholder for social metrics
  return {
    followers: 0,
    posts: 0,
    engagement: 0
  }
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

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

function calculateConfidence(log: string[]): number {
  // Calculate confidence based on enrichment log
  const baseConfidence = 50
  const confidencePerItem = 10
  return Math.min(100, baseConfidence + (log.length * confidencePerItem))
}