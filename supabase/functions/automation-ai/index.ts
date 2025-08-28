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

    const { trigger, data, rules } = await req.json()

    const actions = await processAutomation(trigger, data, rules)

    return new Response(JSON.stringify(actions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function processAutomation(trigger: string, data: any, rules: any = {}) {
  const actions = []

  switch (trigger) {
    case 'contact_created':
      actions.push(...await handleContactCreated(data, rules))
      break
    case 'email_opened':
      actions.push(...await handleEmailOpened(data, rules))
      break
    case 'form_submitted':
      actions.push(...await handleFormSubmitted(data, rules))
      break
    case 'meeting_booked':
      actions.push(...await handleMeetingBooked(data, rules))
      break
    default:
      actions.push({
        type: 'log',
        message: `Unknown trigger: ${trigger}`,
        timestamp: new Date().toISOString()
      })
  }

  return actions
}

async function handleContactCreated(contact: any, rules: any) {
  const actions = []

  // Send welcome email
  if (rules.sendWelcomeEmail) {
    actions.push({
      type: 'send_email',
      template: 'welcome',
      to: contact.email,
      contactId: contact.id,
      priority: 'high'
    })
  }

  // Add to nurture sequence
  if (rules.addToNurture) {
    actions.push({
      type: 'add_to_sequence',
      sequence: 'nurture',
      contactId: contact.id,
      delay: rules.nurtureDelay || 86400 // 1 day
    })
  }

  // Assign owner
  if (rules.autoAssign) {
    actions.push({
      type: 'assign_owner',
      contactId: contact.id,
      ownerId: await getNextAvailableOwner()
    })
  }

  return actions
}

async function handleEmailOpened(data: any, rules: any) {
  const actions = []

  if (rules.followUpSequence) {
    actions.push({
      type: 'schedule_followup',
      contactId: data.contactId,
      delay: rules.followUpDelay || 3600, // 1 hour
      template: 'followup'
    })
  }

  return actions
}

async function handleFormSubmitted(data: any, rules: any) {
  const actions = []

  actions.push({
    type: 'create_lead',
    data: data.formData,
    source: 'form',
    priority: 'medium'
  })

  if (rules.notifyTeam) {
    actions.push({
      type: 'notify_team',
      message: `New form submission from ${data.formData.email}`,
      channel: rules.notificationChannel || 'leads'
    })
  }

  return actions
}

async function handleMeetingBooked(data: any, rules: any) {
  const actions = []

  actions.push({
    type: 'add_to_calendar',
    meeting: data.meeting,
    contactId: data.contactId
  })

  if (rules.sendConfirmation) {
    actions.push({
      type: 'send_email',
      template: 'meeting_confirmation',
      to: data.contactEmail,
      meeting: data.meeting
    })
  }

  return actions
}

async function getNextAvailableOwner() {
  // This would implement round-robin assignment
  // For now, return a placeholder
  return 'user_123'
}