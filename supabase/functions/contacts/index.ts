import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
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

    const { action, data } = await req.json()

    let result

    switch (action) {
      case 'validate':
        result = await validateContactData(data)
        break
      case 'enrich':
        result = await enrichContactData(data)
        break
      case 'process':
        result = await processContactData(data)
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }

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

async function validateContactData(data: any) {
  // Validate contact data
  const { email, phone, name } = data

  const errors = []

  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long')
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Valid email is required')
  }

  if (phone && !/^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/[\s\-\(\)]/g, ''))) {
    errors.push('Valid phone number is required')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

async function enrichContactData(data: any) {
  // Basic enrichment - in a real app, this would call external APIs
  const enriched = { ...data }

  // Add basic enrichment
  if (data.email) {
    enriched.emailDomain = data.email.split('@')[1]
  }

  if (data.name) {
    const nameParts = data.name.trim().split(' ')
    enriched.firstName = nameParts[0]
    enriched.lastName = nameParts.slice(1).join(' ')
  }

  enriched.lastUpdated = new Date().toISOString()

  return enriched
}

async function processContactData(data: any) {
  // Process contact data - could include AI processing
  const processed = await enrichContactData(data)

  // Add processing metadata
  processed.processedAt = new Date().toISOString()
  processed.status = 'processed'

  return processed
}