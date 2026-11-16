import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createResponse, resolveModel } from '../_shared/openai.ts'

/**
 * Adaptive Playbook Generator Edge Function
 *
 * AI-powered sales playbook generation for complex deals:
 * - Strategic analysis and deal assessment
 * - Multi-phase playbook creation with tactics and milestones
 * - Risk mitigation and competitive positioning
 * - Success indicators and performance tracking
 * - AI-driven recommendations and optimization
 *
 * Designed to help sales teams create comprehensive, adaptive strategies
 * for high-value deals and complex sales cycles.
 *
 * @route POST /functions/v1/adaptive-playbook
 */

interface DealData {
  id: string;
  name: string;
  value?: number;
  company: string;
  stage: string;
  competitors?: string[];
  stakeholders?: any[];
  industry?: string;
  companySize?: number;
}

interface PlaybookRequest {
  contact: DealData;
  currentStage: string;
  businessGoals: string[];
  automationType?: 'comprehensive' | 'aggressive' | 'conservative' | 'relationship' | 'transactional';
  playbookType?: string;
  /** Ignored: all AI runs through OpenAI Responses API. Kept for client compatibility. */
  aiProvider?: string;
}

interface PlaybookStrategy {
  dealId: string;
  strategy: {
    name: string;
    description: string;
    confidence: number;
    rationale: string;
  };
  phases: Array<{
    id: string;
    name: string;
    timeline: string;
    objectives: string[];
    tactics: Array<{
      id: string;
      name: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      estimatedEffort: string;
      successMetrics: string[];
      dependencies?: string[];
    }>;
    milestones: Array<{
      id: string;
      name: string;
      description: string;
      dueDate: string;
      owner: string;
      status: 'pending' | 'in_progress' | 'completed';
    }>;
  }>;
  riskMitigation: Array<{
    risk: string;
    probability: number;
    impact: string;
    mitigation: string;
  }>;
  successIndicators: Array<{
    metric: string;
    target: string;
    current: string;
    status: 'on_track' | 'at_risk' | 'behind';
  }>;
  competitivePositioning: {
    strengths: string[];
    weaknesses: string[];
    differentiation: string[];
    winThemes: string[];
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    const token = authHeader.replace('Bearer', '').trim()
    const { data: user } = await supabaseClient.auth.getUser(token)

    if (!user?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestData: PlaybookRequest = await req.json()

    if (!requestData.contact) {
      return new Response(
        JSON.stringify({ error: 'Contact/deal data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const startedAt = Date.now()
    const { playbook, usage } = await generateAdaptivePlaybook(requestData)

    // Usage logging must never fail the request
    try {
      await supabaseClient.from('ai_usage_logs').insert({
        user_id: user.user.id,
        feature: 'adaptive-playbook',
        model: resolveModel('thinking').model,
        tokens_used: usage?.total_tokens ?? 0,
        response_time_ms: Date.now() - startedAt,
        success: true
      })
    } catch (logError) {
      console.warn('Failed to log AI usage:', logError)
    }

    return new Response(
      JSON.stringify({ data: playbook }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Adaptive playbook generation error:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error during playbook generation'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

const stringArray = { type: 'array', items: { type: 'string' } }

const PLAYBOOK_SCHEMA = {
  type: 'object',
  properties: {
    strategy: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        confidence: { type: 'number', description: 'Between 0 and 1' },
        rationale: { type: 'string' }
      }
    },
    phases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          timeline: { type: 'string' },
          objectives: stringArray,
          tactics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                estimatedEffort: { type: 'string' },
                successMetrics: stringArray,
                dependencies: stringArray
              }
            }
          },
          milestones: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                dueInDays: { type: 'number', description: 'Days from today' },
                owner: { type: 'string' }
              }
            }
          }
        }
      }
    },
    riskMitigation: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          risk: { type: 'string' },
          probability: { type: 'number', description: 'Between 0 and 1' },
          impact: { type: 'string' },
          mitigation: { type: 'string' }
        }
      }
    },
    successIndicators: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          metric: { type: 'string' },
          target: { type: 'string' },
          current: { type: 'string', description: 'Use "Not measured yet" when no data was provided' },
          status: { type: 'string', enum: ['on_track', 'at_risk', 'behind'] }
        }
      }
    },
    competitivePositioning: {
      type: 'object',
      properties: {
        strengths: stringArray,
        weaknesses: stringArray,
        differentiation: stringArray,
        winThemes: stringArray
      }
    }
  }
}

async function generateAdaptivePlaybook(
  request: PlaybookRequest
): Promise<{ playbook: PlaybookStrategy; usage: { total_tokens?: number } | null }> {
  const { contact, currentStage, businessGoals = [], automationType = 'comprehensive', playbookType } = request

  const instructions = `You are a senior B2B sales strategist creating an adaptive sales playbook for a specific deal.
Rules:
- Tailor every phase, tactic, risk and positioning point to the deal data provided.
- Do not invent facts about the customer, competitors or our product that are not in the input; where something is unknown, say so or recommend discovering it.
- Use the requested approach: ${automationType}${playbookType ? ` (${playbookType})` : ''}.
- Produce 3-5 phases with 1-3 tactics and 1-2 milestones each; 3-6 risks; 3-5 success indicators.`

  const input = `Deal / contact data:
${JSON.stringify(contact, null, 2)}

Current stage: ${currentStage || contact.stage || 'unknown'}
Business goals: ${businessGoals.length ? businessGoals.join(', ') : 'not specified'}`

  const ai = await createResponse({
    role: 'thinking',
    effort: 'medium',
    instructions,
    input,
    schemaName: 'adaptive_playbook',
    schema: PLAYBOOK_SCHEMA,
    maxOutputTokens: 8000
  })

  if (!ai.json) {
    throw new Error('AI returned no structured playbook')
  }

  const data = ai.json
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  // deno-lint-ignore no-explicit-any
  const phases = (data.phases || []).map((phase: any, pi: number) => ({
    id: `phase-${pi + 1}`,
    name: phase.name,
    timeline: phase.timeline,
    objectives: phase.objectives,
    // deno-lint-ignore no-explicit-any
    tactics: (phase.tactics || []).map((t: any, ti: number) => ({
      id: `tactic-${pi + 1}-${ti + 1}`,
      ...t
    })),
    // deno-lint-ignore no-explicit-any
    milestones: (phase.milestones || []).map((m: any, mi: number) => ({
      id: `milestone-${pi + 1}-${mi + 1}`,
      name: m.name,
      description: m.description,
      dueDate: new Date(now + Math.max(0, Number(m.dueInDays) || 0) * dayMs).toISOString(),
      owner: m.owner,
      status: 'pending'
    }))
  }))

  return {
    playbook: {
      dealId: contact.id,
      strategy: data.strategy,
      phases,
      riskMitigation: data.riskMitigation,
      successIndicators: data.successIndicators,
      competitivePositioning: data.competitivePositioning
    },
    usage: ai.usage
  }
}
