import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin":
    Deno.env.get("FUNCTION_ALLOW_ORIGINS") ?? "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
    const { type, contactData, enrichmentType, email, name, linkedin, contacts, enrichmentRequest, contactId } = requestBody

    let enrichedData

    // Use 'type' field first, fallback to 'enrichmentType' for backward compatibility
    const requestType = type || enrichmentType

    // Handle nested enrichmentRequest structure for backward compatibility
    let processedData = contactData || requestBody
    if (enrichmentRequest) {
      processedData = enrichmentRequest
      // Extract email from nested structure if present
      if (enrichmentRequest.email) {
        processedData.email = enrichmentRequest.email
      }
    }

    switch (requestType) {
      case 'image':
        enrichedData = await findContactImage(processedData)
        break
      case 'email':
        enrichedData = await enrichByEmail(processedData.email || email, processedData)
        break
      case 'name':
        enrichedData = await enrichByName(processedData.name || name, processedData)
        break
      case 'linkedin':
        enrichedData = await enrichByLinkedIn(processedData.linkedin || linkedin, processedData)
        break
      case 'bulk':
        enrichedData = await enrichBulkContacts(contacts || processedData.contacts || processedData)
        break
      case 'company':
        enrichedData = await enrichCompanyInfo(processedData)
        break
      case 'social':
        enrichedData = await enrichSocialProfiles(processedData)
        break
      case 'interests':
        enrichedData = await enrichInterests(processedData)
        break
      case 'comprehensive':
        enrichedData = await comprehensiveEnrichment(processedData)
        break
      default:
        enrichedData = await basicEnrichment(processedData)
    }

    return new Response(JSON.stringify(enrichedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('AI Enrichment Error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function findContactImage(data: any) {
  // Mock implementation for finding contact images
  const contact = data.contact || data
  
  // In a real implementation, this would use AI services to find professional images
  const mockImages = [
    'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2'
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
  enriched.confidence = 75

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
  // Comprehensive social media profile discovery
  const enriched = await basicEnrichment(data)

  // Initialize social profiles structure
  enriched.socialProfiles = {
    whatsapp: null,
    linkedin: null,
    email: data.email || null,
    twitter: null,
    facebook: null,
    instagram: null
  }

  // Extract name for profile discovery
  const fullName = data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim()
  const company = data.company || data.organization || ''

  // Discover social profiles based on available data
  if (fullName) {
    enriched.socialProfiles = await discoverSocialProfiles(fullName, company, data.email)
  }

  // Add confidence scores and verification status
  enriched.socialProfiles = await validateSocialProfiles(enriched.socialProfiles)

  enriched.enrichmentLevel = 'social'
  enriched.socialDiscovery = {
    discoveredAt: new Date().toISOString(),
    confidence: calculateSocialDiscoveryConfidence(enriched.socialProfiles),
    sources: ['AI-powered search', 'Pattern matching', 'Public data aggregation']
  }

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

// Social Profile Discovery Functions
async function discoverSocialProfiles(fullName: string, company: string, email?: string): Promise<any> {
  const profiles = {
    whatsapp: null,
    linkedin: null,
    email: email || null,
    twitter: null,
    facebook: null,
    instagram: null
  }

  if (!fullName || fullName.trim().length < 2) {
    return profiles
  }

  // Generate potential social media handles
  const nameParts = fullName.toLowerCase().split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts[nameParts.length - 1]
  const companySlug = company ? company.toLowerCase().replace(/[^a-z0-9]/g, '') : ''

  // LinkedIn profile discovery
  profiles.linkedin = await discoverLinkedInProfile(fullName, company)

  // Twitter/X profile discovery
  profiles.twitter = await discoverTwitterProfile(firstName, lastName, company)

  // Facebook profile discovery
  profiles.facebook = await discoverFacebookProfile(fullName, company)

  // Instagram profile discovery
  profiles.instagram = await discoverInstagramProfile(firstName, lastName, company)

  // WhatsApp (based on phone if available - would need phone data)
  profiles.whatsapp = null // Would require phone number data

  return profiles
}

async function discoverLinkedInProfile(fullName: string, company: string): Promise<any> {
  // In production, this would use LinkedIn API or web scraping
  // For now, return a structured placeholder
  const nameSlug = fullName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const companySlug = company ? company.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : ''

  return {
    url: `https://linkedin.com/in/${nameSlug}`,
    handle: nameSlug,
    verified: false,
    confidence: 0.6,
    company: companySlug,
    lastUpdated: new Date().toISOString()
  }
}

async function discoverTwitterProfile(firstName: string, lastName: string, company: string): Promise<any> {
  // Generate potential Twitter handles
  const handle1 = `${firstName}${lastName}`
  const handle2 = `${firstName}_${lastName}`
  const handle3 = `${firstName[0]}${lastName}`

  // In production, would check which handle exists
  return {
    url: `https://twitter.com/${handle1}`,
    handle: handle1,
    username: handle1,
    verified: false,
    confidence: 0.5,
    followers: null,
    lastUpdated: new Date().toISOString()
  }
}

async function discoverFacebookProfile(fullName: string, company: string): Promise<any> {
  const nameSlug = fullName.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')

  return {
    url: `https://facebook.com/${nameSlug}`,
    handle: nameSlug,
    verified: false,
    confidence: 0.4,
    lastUpdated: new Date().toISOString()
  }
}

async function discoverInstagramProfile(firstName: string, lastName: string, company: string): Promise<any> {
  const handle1 = `${firstName}${lastName}`
  const handle2 = `${firstName}_${lastName}`
  const handle3 = `${firstName}.${lastName}`

  return {
    url: `https://instagram.com/${handle1}`,
    handle: handle1,
    username: handle1,
    verified: false,
    confidence: 0.5,
    followers: null,
    lastUpdated: new Date().toISOString()
  }
}

async function validateSocialProfiles(profiles: any): Promise<any> {
  // Add validation status and confidence scores
  const validatedProfiles = { ...profiles }

  // Validate email format if present
  if (validatedProfiles.email) {
    validatedProfiles.emailValidation = {
      isValid: isValidEmail(validatedProfiles.email),
      confidence: 0.9,
      provider: getEmailProvider(validatedProfiles.email)
    }
  }

  // Add verification status for each social profile
  Object.keys(validatedProfiles).forEach(platform => {
    if (validatedProfiles[platform] && typeof validatedProfiles[platform] === 'object') {
      validatedProfiles[platform] = {
        ...validatedProfiles[platform],
        verificationStatus: 'unverified', // In production, would check if profile exists
        lastChecked: new Date().toISOString(),
        isActive: true // Placeholder
      }
    }
  })

  return validatedProfiles
}

function calculateSocialDiscoveryConfidence(profiles: any): number {
  let totalConfidence = 0
  let profileCount = 0

  Object.values(profiles).forEach((profile: any) => {
    if (profile && typeof profile === 'object' && profile.confidence) {
      totalConfidence += profile.confidence
      profileCount++
    }
  })

  return profileCount > 0 ? totalConfidence / profileCount : 0
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}