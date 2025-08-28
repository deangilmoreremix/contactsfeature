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

    const { contacts, operation, options } = await req.json()

    const result = await performBulkOperation(contacts, operation, options)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function performBulkOperation(contacts: any[], operation: string, options: any = {}) {
  const results = {
    successful: [],
    failed: [],
    summary: {
      total: contacts.length,
      successful: 0,
      failed: 0
    }
  }

  switch (operation) {
    case 'enrich':
      return await bulkEnrich(contacts, options)
    case 'score':
      return await bulkScore(contacts, options)
    case 'categorize':
      return await bulkCategorize(contacts, options)
    case 'email':
      return await bulkEmail(contacts, options)
    case 'tag':
      return await bulkTag(contacts, options)
    case 'delete':
      return await bulkDelete(contacts, options)
    default:
      throw new Error(`Unknown bulk operation: ${operation}`)
  }
}

async function bulkEnrich(contacts: any[], options: any) {
  const results = {
    successful: [],
    failed: [],
    summary: {
      total: contacts.length,
      successful: 0,
      failed: 0
    }
  }

  for (const contact of contacts) {
    try {
      // Call the ai-enrichment function for each contact
      const { data: enriched, error } = await supabase.functions.invoke('ai-enrichment', {
        body: { contactData: contact, enrichmentType: options.enrichmentType || 'comprehensive' }
      })

      if (error) throw error

      results.successful.push({
        original: contact,
        enriched: enriched,
        processedAt: new Date().toISOString()
      })
    } catch (error) {
      results.failed.push({
        contact: contact,
        error: error.message,
        failedAt: new Date().toISOString()
      })
    }
  }

  results.summary.successful = results.successful.length
  results.summary.failed = results.failed.length

  return results
}

async function bulkScore(contacts: any[], options: any) {
  const results = {
    successful: [],
    failed: [],
    summary: {
      total: contacts.length,
      successful: 0,
      failed: 0
    }
  }

  for (const contact of contacts) {
    try {
      const { data: score, error } = await supabase.functions.invoke('smart-score', {
        body: { contactData: contact, scoringCriteria: options.criteria }
      })

      if (error) throw error

      results.successful.push({
        contact: contact,
        score: score,
        processedAt: new Date().toISOString()
      })
    } catch (error) {
      results.failed.push({
        contact: contact,
        error: error.message,
        failedAt: new Date().toISOString()
      })
    }
  }

  results.summary.successful = results.successful.length
  results.summary.failed = results.failed.length

  return results
}

async function bulkCategorize(contacts: any[], options: any) {
  const results = {
    successful: [],
    failed: [],
    summary: {
      total: contacts.length,
      successful: 0,
      failed: 0
    }
  }

  try {
    const { data: categorized, error } = await supabase.functions.invoke('smart-categorize', {
      body: { contacts, criteria: options.criteria }
    })

    if (error) throw error

    results.successful = categorized.categories.hot.concat(
      categorized.categories.warm,
      categorized.categories.cold,
      categorized.categories.unqualified
    )
    results.summary.successful = results.successful.length
  } catch (error) {
    results.failed = contacts.map(contact => ({
      contact,
      error: error.message,
      failedAt: new Date().toISOString()
    }))
    results.summary.failed = results.failed.length
  }

  return results
}

async function bulkEmail(contacts: any[], options: any) {
  const results = {
    successful: [],
    failed: [],
    summary: {
      total: contacts.length,
      successful: 0,
      failed: 0
    }
  }

  for (const contact of contacts) {
    try {
      const { data: email, error } = await supabase.functions.invoke('email-composer', {
        body: {
          contactData: contact,
          emailType: options.emailType || 'introduction',
          context: options.context
        }
      })

      if (error) throw error

      results.successful.push({
        contact: contact,
        email: email,
        sent: options.sendImmediately || false,
        processedAt: new Date().toISOString()
      })
    } catch (error) {
      results.failed.push({
        contact: contact,
        error: error.message,
        failedAt: new Date().toISOString()
      })
    }
  }

  results.summary.successful = results.successful.length
  results.summary.failed = results.failed.length

  return results
}

async function bulkTag(contacts: any[], options: any) {
  const results = {
    successful: [],
    failed: [],
    summary: {
      total: contacts.length,
      successful: 0,
      failed: 0
    }
  }

  for (const contact of contacts) {
    try {
      // In a real implementation, this would update the database
      results.successful.push({
        contact: contact,
        tags: options.tags || [],
        taggedAt: new Date().toISOString()
      })
    } catch (error) {
      results.failed.push({
        contact: contact,
        error: error.message,
        failedAt: new Date().toISOString()
      })
    }
  }

  results.summary.successful = results.successful.length
  results.summary.failed = results.failed.length

  return results
}

async function bulkDelete(contacts: any[], options: any) {
  const results = {
    successful: [],
    failed: [],
    summary: {
      total: contacts.length,
      successful: 0,
      failed: 0
    }
  }

  if (!options.confirmDelete) {
    throw new Error('Delete operation requires confirmation')
  }

  for (const contact of contacts) {
    try {
      // In a real implementation, this would delete from database
      results.successful.push({
        contact: contact,
        deletedAt: new Date().toISOString()
      })
    } catch (error) {
      results.failed.push({
        contact: contact,
        error: error.message,
        failedAt: new Date().toISOString()
      })
    }
  }

  results.summary.successful = results.successful.length
  results.summary.failed = results.failed.length

  return results
}