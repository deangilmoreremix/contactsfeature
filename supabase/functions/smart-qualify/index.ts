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

    const { leads, qualificationRules } = await req.json()

    const qualifiedLeads = await qualifyLeads(leads, qualificationRules)

    return new Response(JSON.stringify(qualifiedLeads), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function qualifyLeads(leads: any[], rules: any = {}) {
  const qualified = {
    qualified: [],
    unqualified: [],
    needsMoreInfo: []
  }

  for (const lead of leads) {
    const qualification = await qualifyLead(lead, rules)
    qualified[qualification.status].push({
      ...lead,
      qualification,
      qualifiedAt: new Date().toISOString()
    })
  }

  return {
    leads: qualified,
    summary: {
      total: leads.length,
      qualified: qualified.qualified.length,
      unqualified: qualified.unqualified.length,
      needsMoreInfo: qualified.needsMoreInfo.length
    }
  }
}

async function qualifyLead(lead: any, rules: any) {
  let score = 0
  const reasons = []
  const requirements = []

  // Budget qualification
  if (rules.budgetRequired) {
    if (lead.budget && lead.budget >= rules.minBudget) {
      score += 25
      reasons.push('Budget meets requirements')
    } else {
      requirements.push('Budget information needed')
    }
  }

  // Timeline qualification
  if (rules.timelineRequired) {
    if (lead.timeline && lead.timeline <= rules.maxTimeline) {
      score += 20
      reasons.push('Timeline is acceptable')
    } else {
      requirements.push('Timeline clarification needed')
    }
  }

  // Authority qualification
  if (lead.jobTitle) {
    const decisionMakers = ['ceo', 'cto', 'cfo', 'vp', 'director', 'manager']
    if (decisionMakers.some(title => lead.jobTitle.toLowerCase().includes(title))) {
      score += 30
      reasons.push('Decision maker identified')
    } else {
      requirements.push('Decision maker access needed')
    }
  }

  // Need qualification
  if (lead.painPoints && lead.painPoints.length > 0) {
    score += 15
    reasons.push('Clear need identified')
  } else {
    requirements.push('Need identification required')
  }

  // Company size
  if (rules.minCompanySize && lead.companySize) {
    if (lead.companySize >= rules.minCompanySize) {
      score += 10
      reasons.push('Company size meets requirements')
    }
  }

  // Determine qualification status
  let status = 'unqualified'
  if (score >= 70) {
    status = 'qualified'
  } else if (requirements.length > 0) {
    status = 'needsMoreInfo'
  }

  return {
    score,
    status,
    reasons,
    requirements,
    nextSteps: generateNextSteps(status, requirements)
  }
}

function generateNextSteps(status: string, requirements: string[]) {
  const steps = []

  if (status === 'qualified') {
    steps.push('Schedule product demo')
    steps.push('Send proposal')
    steps.push('Assign account manager')
  } else if (status === 'needsMoreInfo') {
    requirements.forEach(req => {
      if (req.includes('Budget')) {
        steps.push('Send budget questionnaire')
      } else if (req.includes('Timeline')) {
        steps.push('Schedule timeline discussion')
      } else if (req.includes('Decision maker')) {
        steps.push('Request introduction to decision maker')
      } else if (req.includes('Need')) {
        steps.push('Schedule discovery call')
      }
    })
  } else {
    steps.push('Add to nurture campaign')
    steps.push('Send educational content')
  }

  return steps
}