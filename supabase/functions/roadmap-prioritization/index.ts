import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * ProductIntel Pro - Roadmap Prioritization Edge Function
 *
 * Optimizes product roadmaps based on business objectives:
 * - Feature prioritization scoring
 * - Resource allocation optimization
 * - Strategic theme development
 *
 * @route POST /functions/v1/roadmap-prioritization
 */

interface RoadmapPrioritization {
  prioritizedFeatures: Array<{
    feature: any;
    priorityScore: number;
    reasoning: string;
    quarter: string;
    estimatedEffort: string;
    riskAssessment: string;
    expectedROI: number;
  }>;
  strategicThemes: Array<{
    theme: string;
    description: string;
    features: string[];
    impact: string;
  }>;
  tradeoffAnalysis: Array<{
    decision: string;
    rationale: string;
    alternatives: string[];
  }>;
  resourceAllocation: {
    quarters: Record<string, {
      features: string[];
      totalEffort: string;
      teamAllocation: string;
    }>;
  };
  riskMitigation: Array<{
    risk: string;
    mitigation: string;
    contingency: string;
  }>;
}

interface RequestBody {
  featureRequests: Array<{
    id: string;
    title: string;
    description: string;
    source: string;
    urgency: number;
    businessImpact: number;
    technicalComplexity: number;
    customerCount: number;
  }>;
  businessObjectives: string[];
  resourceConstraints: {
    teamSize: number;
    budget: string;
    timeline: string;
  };
  marketInsights?: any;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: user } = await supabaseClient.auth.getUser(token)

    if (!user.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { featureRequests, businessObjectives, resourceConstraints, marketInsights }: RequestBody = await req.json()

    if (!featureRequests || !businessObjectives) {
      return new Response(
        JSON.stringify({ error: 'Feature requests and business objectives are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Calculate priority scores for each feature
    const prioritizedFeatures = featureRequests.map(feature => {
      const priorityScore = calculatePriorityScore(feature, businessObjectives);
      return {
        feature,
        priorityScore,
        reasoning: generateReasoning(feature, priorityScore),
        quarter: assignQuarter(priorityScore, feature.technicalComplexity),
        estimatedEffort: estimateEffort(feature.technicalComplexity),
        riskAssessment: assessRisk(feature),
        expectedROI: estimateROI(feature.businessImpact, feature.customerCount)
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);

    const result: RoadmapPrioritization = {
      prioritizedFeatures,
      strategicThemes: [
        {
          theme: "Customer Experience Enhancement",
          description: "Focus on improving user satisfaction and adoption",
          features: prioritizedFeatures.filter(f => f.feature.title.toLowerCase().includes('ui') || f.feature.title.toLowerCase().includes('user')).map(f => f.feature.title),
          impact: "Improved customer retention and satisfaction scores"
        },
        {
          theme: "AI and Automation",
          description: "Leverage AI to automate manual processes",
          features: prioritizedFeatures.filter(f => f.feature.title.toLowerCase().includes('ai') || f.feature.title.toLowerCase().includes('automat')).map(f => f.feature.title),
          impact: "Reduced operational costs and improved efficiency"
        }
      ],
      tradeoffAnalysis: [
        {
          decision: "Prioritize high-impact features over nice-to-have additions",
          rationale: "Limited development resources require focus on features that drive business objectives",
          alternatives: ["Implement all requested features with extended timeline", "Outsource development of lower-priority features"]
        }
      ],
      resourceAllocation: {
        quarters: {
          "Q1 2024": {
            features: prioritizedFeatures.slice(0, 3).map(f => f.feature.title),
            totalEffort: "80% of development capacity",
            teamAllocation: "Full team focus on top 3 features"
          },
          "Q2 2024": {
            features: prioritizedFeatures.slice(3, 6).map(f => f.feature.title),
            totalEffort: "70% of development capacity",
            teamAllocation: "Core team + additional resources"
          }
        }
      },
      riskMitigation: [
        {
          risk: "Technical complexity exceeds estimates",
          mitigation: "Conduct thorough technical discovery before committing to timeline",
          contingency: "Reduce scope or extend timeline as needed"
        },
        {
          risk: "Market conditions change during development",
          mitigation: "Regular market validation and customer feedback loops",
          contingency: "Pivot priorities based on updated market intelligence"
        }
      ]
    };

    await supabaseClient
      .from('ai_usage_logs')
      .insert({
        user_id: user.user.id,
        feature_used: 'roadmap-prioritization',
        model_id: 'roadmap-ai',
        tokens_used: JSON.stringify(result).length,
        success: true
      })

    return new Response(
      JSON.stringify({ roadmap: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Roadmap prioritization error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error during roadmap prioritization'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function calculatePriorityScore(feature: any, objectives: string[]): number {
  let score = 0;

  // Weight the scoring factors
  score += (feature.urgency / 10) * 0.25; // 25% weight
  score += (feature.businessImpact / 10) * 0.35; // 35% weight
  score += ((10 - feature.technicalComplexity) / 10) * 0.15; // 15% weight (inverse)
  score += Math.min(feature.customerCount / 20, 1) * 0.25; // 25% weight

  return Math.round(score * 10 * 100) / 100; // Scale to 10 and round
}

function generateReasoning(feature: any, score: number): string {
  const reasons = [];

  if (feature.urgency >= 8) reasons.push("high urgency from stakeholders");
  if (feature.businessImpact >= 8) reasons.push("significant business impact potential");
  if (feature.customerCount >= 10) reasons.push(`high customer demand (${feature.customerCount} requests)`);
  if (feature.technicalComplexity <= 4) reasons.push("low technical complexity enables quick delivery");

  return `Priority score ${score}/10 based on: ${reasons.join(', ') || 'balanced scoring across all factors'}.`;
}

function assignQuarter(priorityScore: number, complexity: number): string {
  if (priorityScore >= 8 && complexity <= 5) return "Q1 2024";
  if (priorityScore >= 6) return "Q2 2024";
  if (priorityScore >= 4) return "Q3 2024";
  return "Q4 2024";
}

function estimateEffort(complexity: number): string {
  if (complexity <= 3) return "1-2 sprint cycles";
  if (complexity <= 6) return "3-4 sprint cycles";
  if (complexity <= 8) return "5-6 sprint cycles";
  return "7+ sprint cycles";
}

function assessRisk(feature: any): string {
  if (feature.technicalComplexity >= 8) return "High technical risk due to complexity";
  if (feature.source === 'competitive_gap') return "Medium risk - competitive pressure";
  return "Low risk with standard implementation approach";
}

function estimateROI(businessImpact: number, customerCount: number): number {
  return Math.round((businessImpact * customerCount * 0.1) * 100) / 100;
}