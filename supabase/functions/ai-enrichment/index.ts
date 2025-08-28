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

    const requestBody = await req.json()
    const { type, contactData, enrichmentType, email, name, linkedin, contacts } = requestBody

    let enrichedData

    // Use 'type' field first, fallback to 'enrichmentType' for backward compatibility
    const requestType = type || enrichmentType

    switch (requestType) {
      case 'image':
        enrichedData = await findContactImage(contactData || requestBody)
        break
      case 'email':
        enrichedData = await enrichByEmail(email, requestBody)
        break
      case 'name':
        enrichedData = await enrichByName(name, requestBody)
        break
      case 'linkedin':
        enrichedData = await enrichByLinkedIn(linkedin, requestBody)
        break
      case 'bulk':
        enrichedData = await enrichBulkContacts(contacts || requestBody)
        break
      case 'company':
        enrichedData = await enrichCompanyInfo(contactData || requestBody)
        break
      case 'social':
        enrichedData = await enrichSocialProfiles(contactData || requestBody)
        break
      case 'interests':
        enrichedData = await enrichInterests(contactData || requestBody)
        break
      case 'comprehensive':
        enrichedData = await comprehensiveEnrichment(contactData || requestBody)
        break
      default:
        enrichedData = await basicEnrichment(contactData || requestBody)
    }

    return new Response(JSON.stringify(enrichedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('AI Enrichment Error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred',
      success: false 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function findContactImage(data: any) {
  // Mock implementation for finding contact images
  const contact = data.contact || data
  
  // In a real implementation, this would use AI services to find professional images
  const mockImages = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1494790108755-2616b332dea7?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  ]

  const randomImage = mockImages[Math.floor(Math.random() * mockImages.length)]
  
  return {
    success: true,
    imageUrl: randomImage,
    confidence: 0.75,
    source: 'AI Generated',
    enrichedAt: new Date().toISOString(),
    contact: contact
  }
}

async function enrichByEmail(email: string, data: any) {
  const enriched = await basicEnrichment({ email, ...data })
  
  if (email) {
    enriched.emailDomain = email.split('@')[1]
    enriched.emailProvider = getEmailProvider(email)
    enriched.companyInfo = {
      domain: email.split('@')[1],
      industry: 'Unknown',
      size: 'Unknown'
    }
  }

  enriched.enrichmentLevel = 'email'
  return { success: true, data: enriched }
}

async function enrichByName(name: string, data: any) {
  const enriched = await basicEnrichment({ name, ...data })
  
  if (name) {
    enriched.nameParts = parseName(name)
    enriched.socialProfiles = {
      linkedin: null,
      twitter: null,
      facebook: null
    }
  }

  enriched.enrichmentLevel = 'name'
  return { success: true, data: enriched }
}

async function enrichByLinkedIn(linkedin: string, data: any) {
  const enriched = await basicEnrichment({ linkedin, ...data })
  
  enriched.socialProfiles = {
    linkedin: linkedin,
    twitter: null,
    facebook: null
  }
  
  enriched.enrichmentLevel = 'linkedin'
  return { success: true, data: enriched }
}

async function enrichBulkContacts(contacts: any[]) {
  if (!Array.isArray(contacts)) {
    return { success: false, error: 'Contacts must be an array' }
  }

  const enrichedContacts = await Promise.all(
    contacts.map(async (contact) => {
      return await basicEnrichment(contact)
    })
  )

  return {
    success: true,
    data: enrichedContacts,
    processed: enrichedContacts.length,
    enrichedAt: new Date().toISOString()
  }
}

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
  return { success: true, data: enriched }
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
  return { success: true, data: enriched }
}

async function enrichInterests(data: any) {
  // This would use AI to determine interests based on available data
  const enriched = await basicEnrichment(data)

  enriched.interests = []
  enriched.enrichmentLevel = 'interests'

  return { success: true, data: enriched }
}

async function comprehensiveEnrichment(data: any) {
  // Combine all enrichment types
  let enriched = await basicEnrichment(data)
  const companyResult = await enrichCompanyInfo(enriched)
  const socialResult = await enrichSocialProfiles(enriched)
  const interestsResult = await enrichInterests(enriched)

  enriched = {
    ...enriched,
    ...companyResult.data,
    ...socialResult.data,
    ...interestsResult.data
  }

  enriched.enrichmentLevel = 'comprehensive'
  return { success: true, data: enriched }
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