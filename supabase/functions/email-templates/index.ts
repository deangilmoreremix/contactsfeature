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

    const { action, category, templateId, templateData } = await req.json()

    let result

    switch (action) {
      case 'get':
        result = await getTemplates(category)
        break
      case 'getById':
        result = await getTemplateById(templateId)
        break
      case 'create':
        result = await createTemplate(templateData)
        break
      case 'update':
        result = await updateTemplate(templateId, templateData)
        break
      case 'delete':
        result = await deleteTemplate(templateId)
        break
      case 'categories':
        result = await getTemplateCategories()
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

async function getTemplates(category: string = 'all') {
  // In a real implementation, this would query a database
  // For now, return predefined templates
  const allTemplates = [
    {
      id: 'welcome-new-contact',
      name: 'Welcome New Contact',
      category: 'onboarding',
      subject: 'Welcome to {{company_name}}!',
      content: `Hi {{first_name}},

Welcome to {{company_name}}! We're excited to have you as part of our community.

Here's what you can expect from us:
• Regular updates about our latest features
• Exclusive insights from our team
• Opportunities to connect with other professionals

If you have any questions, feel free to reply to this email.

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}`
    },
    {
      id: 'follow-up-meeting',
      name: 'Meeting Follow-up',
      category: 'followup',
      subject: 'Thank you for meeting with us',
      content: `Hi {{first_name}},

Thank you for taking the time to meet with me today. I enjoyed our conversation about {{meeting_topic}}.

As discussed, here are the next steps:
{{next_steps}}

Please let me know if you need any additional information.

Best regards,
{{sender_name}}`
    },
    {
      id: 'newsletter-monthly',
      name: 'Monthly Newsletter',
      category: 'newsletter',
      subject: '{{month}} Update from {{company_name}}',
      content: `Hi {{first_name}},

Here's what's been happening at {{company_name}} this month:

{{monthly_highlights}}

{{cta_text}}

Best regards,
{{sender_name}}
{{company_name}}`
    },
    {
      id: 'product-update',
      name: 'Product Update',
      category: 'product',
      subject: 'New Feature: {{feature_name}}',
      content: `Hi {{first_name}},

We're excited to announce our latest feature: {{feature_name}}!

{{feature_description}}

{{benefits}}

Try it out today: {{cta_link}}

Best regards,
{{sender_name}}
{{company_name}}`
    },
    {
      id: 're-engagement',
      name: 'Re-engagement Campaign',
      category: 'engagement',
      subject: 'We miss you at {{company_name}}',
      content: `Hi {{first_name}},

We noticed it has been a while since you last visited {{company_name}}. We hope you're doing well!

Here are some updates you might have missed:
{{recent_updates}}

Come back and see what's new: {{website_link}}

Best regards,
{{sender_name}}`
    },
    {
      id: 'event-invitation',
      name: 'Event Invitation',
      category: 'events',
      subject: 'You\'re invited: {{event_name}}',
      content: `Hi {{first_name}},

You're invited to our upcoming event: {{event_name}}

Event Details:
• Date: {{event_date}}
• Time: {{event_time}}
• Location: {{event_location}}

{{event_description}}

RSVP here: {{rsvp_link}}

We hope to see you there!

Best regards,
{{sender_name}}
{{company_name}}`
    }
  ]

  if (category === 'all') {
    return allTemplates
  }

  return allTemplates.filter(template => template.category === category)
}

async function getTemplateById(templateId: string) {
  const templates = await getTemplates()
  return templates.find(template => template.id === templateId) || null
}

async function createTemplate(templateData: any) {
  // In a real implementation, this would save to database
  const newTemplate = {
    ...templateData,
    id: generateTemplateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  return newTemplate
}

async function updateTemplate(templateId: string, templateData: any) {
  // In a real implementation, this would update in database
  const existingTemplate = await getTemplateById(templateId)
  if (!existingTemplate) {
    throw new Error('Template not found')
  }

  const updatedTemplate = {
    ...existingTemplate,
    ...templateData,
    updatedAt: new Date().toISOString()
  }

  return updatedTemplate
}

async function deleteTemplate(templateId: string) {
  // In a real implementation, this would delete from database
  const template = await getTemplateById(templateId)
  if (!template) {
    throw new Error('Template not found')
  }

  return { success: true, deletedId: templateId }
}

async function getTemplateCategories() {
  const templates = await getTemplates()
  const categories = [...new Set(templates.map(template => template.category))]

  return categories.map(category => ({
    name: category,
    count: templates.filter(template => template.category === category).length
  }))
}

function generateTemplateId(): string {
  return 'template_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}