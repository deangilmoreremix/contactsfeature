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

    const { contactData, enrichmentType } = await req.json()

    let enrichedData

    switch (enrichmentType) {
      case 'company':
        enrichedData = await enrichCompanyInfo(contactData)
        break
      case 'social':
        enrichedData = await enrichSocialProfiles(contactData)
        break
      case 'interests':
        enrichedData = await enrichInterests(contactData)
        break
      case 'comprehensive':
        enrichedData = await comprehensiveEnrichment(contactData)
        break
      default:
        enrichedData = await basicEnrichment(contactData)
    }

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

async function basicEnrichment(data: any) {
  // Basic enrichment without AI
  const enriched = { ...data }

  if (data.email) {
    enriched.emailDomain = data.email.split('@')[1]
    enriched.emailProvider = getEmailProvider(data.email)
  }

  if (data.name) {
    enriched.nameParts = parseName(data.name)
  }

  if (data.phone) {
    enriched.phoneFormatted = formatPhoneNumber(data.phone)
  }

  enriched.enrichedAt = new Date().toISOString()
  enriched.enrichmentLevel = 'basic'

  return enriched
}

async function enrichCompanyInfo(data: any) {
  // This would call AI/Company enrichment APIs
  const enriched = await basicEnrichment(data)

  // Placeholder for company enrichment
  if (data.email) {
    enriched.companyInfo = {
      domain: data.email.split('@')[1],
      industry: 'Unknown', // Would use AI to determine
      size: 'Unknown'
    }
  }

  enriched.enrichmentLevel = 'company'
  return enriched
}

async function enrichSocialProfiles(data: any) {
  // This would search for social media profiles
  const enriched = await basicEnrichment(data)

  enriched.socialProfiles = {
    linkedin: null,
    twitter: null,
    facebook: null
  }

  enriched.enrichmentLevel = 'social'
  return enriched
}

async function enrichInterests(data: any) {
  // This would use AI to determine interests based on available data
  const enriched = await basicEnrichment(data)

  enriched.interests = []
  enriched.enrichmentLevel = 'interests'

  return enriched
}

async function comprehensiveEnrichment(data: any) {
  // Combine all enrichment types
  let enriched = await basicEnrichment(data)
  enriched = await enrichCompanyInfo(enriched)
  enriched = await enrichSocialProfiles(enriched)
  enriched = await enrichInterests(enriched)

  enriched.enrichmentLevel = 'comprehensive'
  return enriched
}

function getEmailProvider(email: string): string {
  const domain = email.split('@')[1].toLowerCase()

  const providers = {
    'gmail.com': 'Gmail',
    'yahoo.com': 'Yahoo',
    'hotmail.com': 'Hotmail',
    'outlook.com': 'Outlook',
    'icloud.com': 'iCloud'
  }

  return providers[domain] || 'Other'
}

function parseName(name: string) {
  const parts = name.trim().split(' ')
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
    middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : null
  }
}

function formatPhoneNumber(phone: string): string {
  // Basic formatting - would use a proper library in production
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}