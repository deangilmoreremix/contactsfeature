import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { respond, respondDualTask } from '../_shared/openai.ts'

/**
 * AI Enrichment Edge Function (OpenAI Responses API + hosted web_search tool).
 *
 * Honest results: every AI-derived field comes from web research with cited sources.
 * When nothing can be verified the field is null and `found: false` -- no guessed handles,
 * no generated headshots, no mock data.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin":
    Deno.env.get("FUNCTION_ALLOW_ORIGINS") ?? "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface Source { url: string; title: string }

const nullableString = { type: ['string', 'null'] }

/** Research a question with the hosted web_search tool and return structured JSON + sources. */
async function research(instructions: string, input: string, schemaName: string, schema: Record<string, unknown>) {
  const ai = await respond({
    role: 'thinking',
    effort: 'low',
    instructions: `${instructions}
Rules: use web search and report only facts supported by sources you found. If you cannot find or verify something, return null for it. Never guess, infer usernames, or fabricate URLs.`,
    input,
    schemaName,
    schema,
    tools: [{ type: 'web_search' }],
    maxOutputTokens: 4000
  }, { forward: 'status' }) // research calls may run in parallel: only live status is forwarded
  if (!ai.json) throw new Error('AI returned no structured research result')
  return { data: ai.json, sources: ai.citations as Source[] }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized', success: false }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: userData } = await supabaseClient.auth.getUser(authHeader.replace('Bearer', '').trim())
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', success: false }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const requestBody = await req.json()
    const { type, contactData, enrichmentType, email, name, linkedin, contacts, enrichmentRequest } = requestBody

    // Use 'type' field first, fallback to 'enrichmentType' for backward compatibility
    const requestType = type || enrichmentType

    // Handle nested enrichmentRequest structure for backward compatibility
    let processedData = contactData || requestBody
    if (enrichmentRequest) {
      processedData = enrichmentRequest
      if (enrichmentRequest.email) {
        processedData.email = enrichmentRequest.email
      }
    }

    const run = async () => {
      let enrichedData
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
          enrichedData = { success: true, data: await basicEnrichment(processedData) }
      }
      return enrichedData
    }

    return await respondDualTask({ req, body: requestBody, headers: corsHeaders, run })
  } catch (error) {
    console.error('AI Enrichment Error:', error)

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// deno-lint-ignore no-explicit-any
type AnyData = Record<string, any>

async function findContactImage(data: AnyData) {
  // We do not generate synthetic headshots of real people or return stock photos.
  return {
    success: false,
    imageUrl: null,
    found: false,
    error: 'No verified image source is available for this contact. Upload a photo instead.',
    enrichedAt: new Date().toISOString(),
    contact: data.contact || data
  }
}

const FREE_EMAIL_DOMAINS = new Set(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'proton.me', 'protonmail.com'])

async function enrichByEmail(email: string, data: AnyData) {
  const enriched = await basicEnrichment({ email, ...data })

  if (email && email.includes('@')) {
    const domain = email.split('@')[1].toLowerCase()
    enriched.emailDomain = domain
    enriched.emailProvider = getEmailProvider(email)

    if (FREE_EMAIL_DOMAINS.has(domain)) {
      enriched.companyInfo = { domain, found: false, reason: 'Personal email provider; no company can be inferred' }
    } else {
      enriched.companyInfo = await lookupCompany(data.company || data.organization || '', domain)
    }
  }

  enriched.enrichmentLevel = 'email'
  return { success: true, data: enriched }
}

async function lookupCompany(companyName: string, domain: string) {
  const { data, sources } = await research(
    'You are a B2B company researcher.',
    `Find factual information about the company${companyName ? ` "${companyName}"` : ''}${domain ? ` with website domain "${domain}"` : ''}.`,
    'company_info',
    {
      type: 'object',
      properties: {
        found: { type: 'boolean' },
        name: nullableString,
        industry: nullableString,
        size: nullableString,
        description: nullableString,
        headquarters: nullableString,
        founded: nullableString,
        website: nullableString
      }
    }
  )

  return {
    found: !!data.found,
    domain: domain || (data.website ? String(data.website).replace(/^https?:\/\//, '').split('/')[0] : null),
    name: data.name || companyName || null,
    industry: data.industry,
    size: data.size,
    description: data.description,
    headquarters: data.headquarters,
    founded: data.founded,
    website: data.website,
    sources
  }
}

async function enrichByName(name: string, data: AnyData) {
  const enriched = await basicEnrichment({ name, ...data })

  if (name) {
    enriched.nameParts = parseName(name)
    enriched.socialProfiles = await discoverSocialProfiles(name, data.company || data.organization || '', data.email)
  }

  enriched.enrichmentLevel = 'name'
  return { success: true, data: enriched }
}

async function enrichByLinkedIn(linkedin: string, data: AnyData) {
  const enriched = await basicEnrichment({ linkedin, ...data })

  enriched.socialProfiles = {
    linkedin: linkedin ? { url: linkedin, verificationStatus: 'provided_by_user' } : null,
    twitter: null,
    facebook: null
  }

  enriched.enrichmentLevel = 'linkedin'
  return { success: true, data: enriched }
}

async function enrichBulkContacts(contacts: AnyData[]) {
  if (!Array.isArray(contacts)) {
    return { success: false, error: 'Contacts must be an array' }
  }

  // Bulk mode is deterministic normalisation only (no per-contact web research).
  const enrichedContacts = await Promise.all(contacts.map((contact) => basicEnrichment(contact)))

  return {
    success: true,
    data: enrichedContacts,
    processed: enrichedContacts.length,
    enrichedAt: new Date().toISOString()
  }
}

/** Deterministic normalisation only; no AI involved and no confidence claimed. */
async function basicEnrichment(data: AnyData) {
  const enriched: AnyData = { ...data }

  if (data.email && String(data.email).includes('@')) {
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

async function enrichCompanyInfo(data: AnyData) {
  const enriched = await basicEnrichment(data)

  const companyName = data.company || data.organization || ''
  const domain = data.email && String(data.email).includes('@') ? data.email.split('@')[1].toLowerCase() : ''

  if (companyName || (domain && !FREE_EMAIL_DOMAINS.has(domain))) {
    enriched.companyInfo = await lookupCompany(companyName, FREE_EMAIL_DOMAINS.has(domain) ? '' : domain)
  } else {
    enriched.companyInfo = { found: false, reason: 'No company name or business email domain provided' }
  }

  enriched.enrichmentLevel = 'company'
  return { success: true, data: enriched }
}

const PLATFORM_HOSTS: Record<string, string[]> = {
  linkedin: ['linkedin.com'],
  twitter: ['twitter.com', 'x.com'],
  facebook: ['facebook.com'],
  instagram: ['instagram.com']
}

function hostMatches(url: string, hosts: string[]): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase()
    return hosts.some((d) => h === d || h.endsWith(`.${d}`))
  } catch {
    return false
  }
}

/** Find public profiles via web search; only URLs on the right platform that were actually found are returned. */
async function discoverSocialProfiles(fullName: string, company: string, email?: string) {
  const profiles: AnyData = {
    whatsapp: null,
    linkedin: null,
    email: email || null,
    twitter: null,
    facebook: null,
    instagram: null
  }

  if (!fullName || fullName.trim().length < 2) return profiles

  const { data, sources } = await research(
    'You find the public professional social media profiles of a specific person.',
    `Person: ${fullName}${company ? `\nCompany: ${company}` : ''}${email ? `\nEmail: ${email}` : ''}\nFind their LinkedIn, X/Twitter, Facebook and Instagram profile URLs. Only return a profile when you are confident it is the same person (name and company/email context match).`,
    'social_profiles',
    {
      type: 'object',
      properties: {
        linkedin: nullableString,
        twitter: nullableString,
        facebook: nullableString,
        instagram: nullableString
      }
    }
  )

  for (const platform of Object.keys(PLATFORM_HOSTS)) {
    const url = data[platform]
    if (typeof url === 'string' && hostMatches(url, PLATFORM_HOSTS[platform])) {
      const handle = new URL(url).pathname.split('/').filter(Boolean).pop() || null
      profiles[platform] = {
        url,
        handle,
        verificationStatus: 'found_via_web_search',
        lastChecked: new Date().toISOString(),
        sources
      }
    }
  }

  return profiles
}

async function enrichSocialProfiles(data: AnyData) {
  const enriched = await basicEnrichment(data)

  const fullName = data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim()
  const company = data.company || data.organization || ''

  enriched.socialProfiles = await discoverSocialProfiles(fullName, company, data.email)
  if (enriched.socialProfiles.email) {
    enriched.socialProfiles.emailValidation = {
      isValid: isValidEmail(enriched.socialProfiles.email),
      provider: getEmailProvider(enriched.socialProfiles.email)
    }
  }

  const found = ['linkedin', 'twitter', 'facebook', 'instagram'].filter((p) => enriched.socialProfiles[p])
  enriched.enrichmentLevel = 'social'
  enriched.socialDiscovery = {
    discoveredAt: new Date().toISOString(),
    profilesFound: found.length,
    platforms: found,
    method: 'OpenAI web_search'
  }

  return { success: true, data: enriched }
}

async function enrichInterests(data: AnyData) {
  const enriched = await basicEnrichment(data)

  const name = data.name || ''
  const company = data.company || data.organization || ''
  const jobTitle = data.jobTitle || data.position || ''
  const industry = data.industry || ''

  if (!name) {
    enriched.interests = []
    enriched.interestsSources = []
    enriched.enrichmentLevel = 'interests'
    return { success: true, data: enriched }
  }

  const { data: result, sources } = await research(
    'You research the publicly stated professional interests of a specific person.',
    `Person: ${name}\nCompany: ${company || 'unknown'}\nJob title: ${jobTitle || 'unknown'}\nIndustry: ${industry || 'unknown'}\nList up to 8 professional interests or topics this person has publicly written or spoken about. Return an empty list if you cannot verify any.`,
    'interests',
    { type: 'object', properties: { interests: { type: 'array', items: { type: 'string' } } } }
  )

  enriched.interests = Array.isArray(result.interests) ? result.interests : []
  enriched.interestsSources = sources
  enriched.enrichmentLevel = 'interests'
  return { success: true, data: enriched }
}

async function comprehensiveEnrichment(data: AnyData) {
  let enriched = await basicEnrichment(data)
  const [companyResult, socialResult, interestsResult] = await Promise.all([
    enrichCompanyInfo(enriched),
    enrichSocialProfiles(enriched),
    enrichInterests(enriched)
  ])

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
  const domain = (email.split('@')[1] || '').toLowerCase()

  const providers: Record<string, string> = {
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
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
