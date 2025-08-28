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

    const { data, insightType } = await req.json()

    const insights = await generateInsights(data, insightType)

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function generateInsights(data: any, type: string) {
  const insights = {
    patterns: [],
    recommendations: [],
    predictions: [],
    risks: [],
    opportunities: []
  }

  switch (type) {
    case 'contact':
      return await analyzeContactInsights(data)
    case 'engagement':
      return await analyzeEngagementInsights(data)
    case 'pipeline':
      return await analyzePipelineInsights(data)
    default:
      return await analyzeGeneralInsights(data)
  }
}

async function analyzeContactInsights(contact: any) {
  const insights = {
    summary: `Contact ${contact.name || 'Unknown'} has ${contact.engagementCount || 0} engagements`,
    keyPoints: [],
    recommendations: [],
    score: Math.floor(Math.random() * 40) + 60 // Placeholder scoring
  }

  if (contact.email) {
    insights.keyPoints.push('Has email address for communication')
  }

  if (contact.company) {
    insights.keyPoints.push(`Works at ${contact.company}`)
    insights.recommendations.push('Research company for personalized outreach')
  }

  if (contact.lastActivity) {
    const daysSince = Math.floor((Date.now() - new Date(contact.lastActivity).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSince > 30) {
      insights.recommendations.push('Send follow-up email to re-engage')
    }
  }

  return insights
}

async function analyzeEngagementInsights(engagementData: any) {
  return {
    summary: 'Engagement analysis completed',
    trends: [],
    recommendations: ['Increase email open rates', 'Schedule follow-up calls'],
    score: 75
  }
}

async function analyzePipelineInsights(pipelineData: any) {
  return {
    summary: 'Pipeline analysis completed',
    bottlenecks: [],
    recommendations: ['Focus on high-value leads', 'Improve conversion rates'],
    score: 82
  }
}

async function analyzeGeneralInsights(data: any) {
  return {
    summary: 'General insights generated',
    patterns: ['Consistent engagement', 'Growing interest'],
    recommendations: ['Continue current strategy', 'Explore new channels'],
    score: 78
  }
}