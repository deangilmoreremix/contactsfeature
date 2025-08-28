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

    const { contactData, context } = await req.json()

    const personalizedMessage = await generatePersonalizedMessage(contactData, context)

    return new Response(JSON.stringify(personalizedMessage), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function generatePersonalizedMessage(contactData: any, context: any = {}) {
  const { channel, purpose, tone } = context

  let message = ''

  switch (channel) {
    case 'email':
      message = await generatePersonalizedEmail(contactData, context)
      break
    case 'sms':
      message = await generatePersonalizedSMS(contactData, context)
      break
    case 'linkedin':
      message = await generatePersonalizedLinkedIn(contactData, context)
      break
    case 'call':
      message = await generateCallScript(contactData, context)
      break
    default:
      message = await generateGenericMessage(contactData, context)
  }

  return {
    message,
    channel: channel || 'generic',
    personalizationScore: calculatePersonalizationScore(contactData, message),
    generatedAt: new Date().toISOString(),
    contactId: contactData.id
  }
}

async function generatePersonalizedEmail(contactData: any, context: any) {
  const { firstName, lastName, company, jobTitle, industry } = contactData
  const { senderName, senderCompany, purpose } = context

  let greeting = 'Hi'
  if (firstName) {
    greeting = `Hi ${firstName}`
  } else if (contactData.name) {
    greeting = `Hi ${contactData.name.split(' ')[0]}`
  }

  let body = ''

  // Company reference
  if (company) {
    body += `I noticed you're at ${company}`
    if (jobTitle) {
      body += ` as ${jobTitle}`
    }
    body += '. '
  }

  // Industry reference
  if (industry) {
    body += `Working in the ${industry} space, I thought you might be interested in `
  } else {
    body += 'I wanted to reach out because '
  }

  // Purpose-based content
  switch (purpose) {
    case 'introduction':
      body += 'learning more about your work and exploring potential collaboration opportunities.'
      break
    case 'followup':
      body += 'following up on our previous conversation.'
      break
    case 'proposal':
      body += 'sharing a proposal that I believe would be valuable for your team.'
      break
    case 'checkin':
      body += 'checking in to see how things are going with your current projects.'
      break
    default:
      body += 'connecting with you.'
  }

  const closing = `\n\nBest regards,\n${senderName || 'Your Name'}\n${senderCompany || 'Your Company'}`

  return `${greeting},\n\n${body}${closing}`
}

async function generatePersonalizedSMS(contactData: any, context: any) {
  const { firstName, company } = contactData
  const { senderName, purpose } = context

  let message = ''

  if (firstName) {
    message = `Hi ${firstName}`
  } else {
    message = 'Hi'
  }

  if (company) {
    message += ` from ${company}`
  }

  message += ', '

  switch (purpose) {
    case 'reminder':
      message += 'this is a friendly reminder about our upcoming meeting.'
      break
    case 'followup':
      message += 'thanks for our conversation! Would you be available for a quick call this week?'
      break
    case 'checkin':
      message += 'hope you\'re doing well! Any updates on the project we discussed?'
      break
    default:
      message += 'hope this message finds you well.'
  }

  message += ` - ${senderName || 'Your Name'}`

  return message
}

async function generatePersonalizedLinkedIn(contactData: any, context: any) {
  const { firstName, lastName, company, jobTitle, industry } = contactData
  const { senderName, senderCompany, purpose } = context

  let message = ''

  if (firstName) {
    message = `Hi ${firstName}`
    if (lastName) {
      message += ` ${lastName}`
    }
  } else {
    message = 'Hi'
  }

  message += ',\n\n'

  // Reference their profile
  if (company && jobTitle) {
    message += `I see you're ${jobTitle} at ${company}. `
  } else if (company) {
    message += `I see you're at ${company}. `
  }

  // Connection reason
  if (industry) {
    message += `As someone also working in ${industry}, `
  } else {
    message += 'I '
  }

  switch (purpose) {
    case 'connection':
      message += 'would love to connect and learn more about your experience.'
      break
    case 'collaboration':
      message += 'thought we might have some opportunities to collaborate.'
      break
    case 'insight':
      message += 'came across an article that I thought would interest you.'
      break
    default:
      message += 'wanted to reach out and connect.'
  }

  message += `\n\nBest,\n${senderName || 'Your Name'}\n${senderCompany || 'Your Company'}`

  return message
}

async function generateCallScript(contactData: any, context: any) {
  const { firstName, company, jobTitle } = contactData
  const { senderName, purpose } = context

  let script = `Hi ${firstName || 'there'}, this is ${senderName || 'calling'} from ${context.senderCompany || 'our company'}. `

  if (company) {
    script += `I'm calling regarding ${company}`
    if (jobTitle) {
      script += ` and your role as ${jobTitle}`
    }
    script += '. '
  }

  switch (purpose) {
    case 'introduction':
      script += 'I was hoping to introduce myself and learn a bit about your current projects.'
      break
    case 'followup':
      script += 'I wanted to follow up on the email I sent last week.'
      break
    case 'meeting':
      script += 'I was wondering if you\'d be available for a brief call to discuss how we might work together.'
      break
    default:
      script += 'I was hoping to connect and see if there are any opportunities to collaborate.'
  }

  script += '\n\nDo you have a few minutes to speak now, or would there be a better time?'

  return script
}

async function generateGenericMessage(contactData: any, context: any) {
  const { firstName, company } = contactData
  const { senderName, purpose } = context

  let message = `Hi ${firstName || 'there'}`

  if (company) {
    message += ` at ${company}`
  }

  message += ',\n\n'

  switch (purpose) {
    case 'introduction':
      message += 'I wanted to introduce myself and explore potential opportunities to connect.'
      break
    case 'followup':
      message += 'I wanted to follow up on our previous conversation.'
      break
    case 'proposal':
      message += 'I have a proposal that I believe would be valuable for you.'
      break
    default:
      message += 'I wanted to reach out and connect.'
  }

  message += `\n\nBest regards,\n${senderName || 'Your Name'}`

  return message
}

function calculatePersonalizationScore(contactData: any, message: string): number {
  let score = 50 // Base score

  // Name usage
  if (contactData.firstName && message.includes(contactData.firstName)) {
    score += 15
  }

  // Company reference
  if (contactData.company && message.toLowerCase().includes(contactData.company.toLowerCase())) {
    score += 15
  }

  // Job title reference
  if (contactData.jobTitle && message.toLowerCase().includes(contactData.jobTitle.toLowerCase())) {
    score += 10
  }

  // Industry reference
  if (contactData.industry && message.toLowerCase().includes(contactData.industry.toLowerCase())) {
    score += 10
  }

  return Math.min(100, score)
}