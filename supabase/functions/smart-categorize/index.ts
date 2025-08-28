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

    const { contacts, criteria } = await req.json()

    const categorizedContacts = await categorizeContacts(contacts, criteria)

    return new Response(JSON.stringify(categorizedContacts), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function categorizeContacts(contacts: any[], criteria: any = {}) {
  const categories = {
    hot: [],
    warm: [],
    cold: [],
    unqualified: []
  }

  for (const contact of contacts) {
    const category = await determineCategory(contact, criteria)
    categories[category].push({
      ...contact,
      category,
      categorizedAt: new Date().toISOString()
    })
  }

  return {
    categories,
    summary: {
      total: contacts.length,
      hot: categories.hot.length,
      warm: categories.warm.length,
      cold: categories.cold.length,
      unqualified: categories.unqualified.length
    }
  }
}

async function determineCategory(contact: any, criteria: any) {
  let score = 0

  // Engagement score
  if (contact.engagementScore) {
    score += contact.engagementScore * 0.3
  }

  // Company size
  if (contact.companySize) {
    if (contact.companySize > 1000) score += 20
    else if (contact.companySize > 100) score += 15
    else if (contact.companySize > 10) score += 10
  }

  // Job title
  if (contact.jobTitle) {
    const executiveTitles = ['ceo', 'cto', 'cfo', 'vp', 'director', 'manager']
    if (executiveTitles.some(title => contact.jobTitle.toLowerCase().includes(title))) {
      score += 25
    }
  }

  // Recent activity
  if (contact.lastActivity) {
    const daysSince = (Date.now() - new Date(contact.lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < 7) score += 20
    else if (daysSince < 30) score += 10
  }

  // Custom criteria
  if (criteria.industry && contact.industry === criteria.industry) {
    score += 15
  }

  if (criteria.location && contact.location === criteria.location) {
    score += 10
  }

  // Determine category based on score
  if (score >= 70) return 'hot'
  if (score >= 40) return 'warm'
  if (score >= 20) return 'cold'
  return 'unqualified'
}