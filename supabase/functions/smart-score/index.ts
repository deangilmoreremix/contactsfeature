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

    const { contactData, scoringCriteria } = await req.json()

    const score = await calculateSmartScore(contactData, scoringCriteria)

    return new Response(JSON.stringify(score), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function calculateSmartScore(data: any, criteria: any = {}) {
  let score = 0
  const maxScore = 100
  const factors = []

  // Email quality (20 points)
  if (data.email) {
    const emailScore = calculateEmailScore(data.email)
    score += emailScore * 0.2
    factors.push({ factor: 'email_quality', score: emailScore, weight: 0.2 })
  }

  // Phone completeness (15 points)
  if (data.phone) {
    const phoneScore = data.phone.length > 8 ? 100 : 50
    score += phoneScore * 0.15
    factors.push({ factor: 'phone_completeness', score: phoneScore, weight: 0.15 })
  }

  // Company info (25 points)
  if (data.company || data.jobTitle) {
    let companyScore = 0
    if (data.company) companyScore += 50
    if (data.jobTitle) companyScore += 50
    score += companyScore * 0.25
    factors.push({ factor: 'company_info', score: companyScore, weight: 0.25 })
  }

  // Social profiles (20 points)
  if (data.socialProfiles) {
    const socialCount = Object.values(data.socialProfiles).filter(Boolean).length
    const socialScore = Math.min(socialCount * 25, 100)
    score += socialScore * 0.2
    factors.push({ factor: 'social_profiles', score: socialScore, weight: 0.2 })
  }

  // Engagement history (20 points)
  if (data.engagementHistory) {
    const engagementScore = Math.min(data.engagementHistory.length * 10, 100)
    score += engagementScore * 0.2
    factors.push({ factor: 'engagement_history', score: engagementScore, weight: 0.2 })
  }

  // Apply custom criteria
  if (criteria.priorityContacts && data.isPriority) {
    score += 10
    factors.push({ factor: 'priority_bonus', score: 100, weight: 0.1 })
  }

  if (criteria.recentActivity && data.lastActivity) {
    const daysSinceActivity = (Date.now() - new Date(data.lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceActivity < 30) {
      score += 5
      factors.push({ factor: 'recent_activity', score: 100, weight: 0.05 })
    }
  }

  return {
    totalScore: Math.min(Math.round(score), maxScore),
    factors,
    grade: getGrade(Math.round(score)),
    calculatedAt: new Date().toISOString()
  }
}

function calculateEmailScore(email: string): number {
  let score = 50 // Base score

  // Check for professional domains
  const professionalDomains = ['.com', '.org', '.net', '.edu', '.gov']
  const domain = email.split('@')[1]
  if (professionalDomains.some(pd => domain.includes(pd))) {
    score += 30
  }

  // Check for disposable email domains
  const disposableDomains = ['10minutemail.com', 'guerrillamail.com', 'mailinator.com']
  if (disposableDomains.some(dd => domain.includes(dd))) {
    score -= 40
  }

  // Length and format
  if (email.length > 10) score += 10
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) score += 10

  return Math.max(0, Math.min(100, score))
}

function getGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}