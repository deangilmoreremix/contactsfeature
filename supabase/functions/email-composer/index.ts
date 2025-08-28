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

    const { contactData, emailType, context } = await req.json()

    const email = await composeEmail(contactData, emailType, context)

    return new Response(JSON.stringify(email), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function composeEmail(contact: any, type: string, context: any = {}) {
  const templates = {
    introduction: {
      subject: `Introduction - ${context.senderName || 'Your Name'}`,
      body: `Hi ${contact.firstName || contact.name},

I hope this email finds you well. My name is ${context.senderName || 'Your Name'} and I'm reaching out because ${context.reason || 'I believe we could benefit from connecting'}.

${context.additionalInfo || 'I would love to learn more about your work and see if there are opportunities for collaboration.'}

Would you be available for a brief call next week?

Best regards,
${context.senderName || 'Your Name'}
${context.senderTitle || ''}
${context.senderCompany || ''}
${context.senderContact || ''}`
    },
    followUp: {
      subject: `Following up on our previous conversation`,
      body: `Hi ${contact.firstName || contact.name},

I wanted to follow up on our previous conversation about ${context.topic || 'our discussion'}.

${context.followUpDetails || 'I was wondering if you had any updates or thoughts on the matter.'}

Please let me know if you need any additional information from my side.

Best regards,
${context.senderName || 'Your Name'}`
    },
    proposal: {
      subject: `Proposal for ${context.service || 'Our Services'}`,
      body: `Hi ${contact.firstName || contact.name},

Thank you for your interest in ${context.service || 'our services'}. I've attached a proposal outlining our approach and pricing.

${context.proposalSummary || 'The proposal includes detailed information about deliverables, timeline, and next steps.'}

Please review the attachment and let me know if you have any questions or would like to discuss further.

Best regards,
${context.senderName || 'Your Name'}`
    }
  }

  const template = templates[type] || templates.introduction

  return {
    to: contact.email,
    subject: template.subject,
    body: template.body,
    type,
    composedAt: new Date().toISOString(),
    contactId: contact.id
  }
}