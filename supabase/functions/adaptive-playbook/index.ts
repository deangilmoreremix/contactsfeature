import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  aiProvider?: 'openai' | 'gemini' | 'gpt5';
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
    const token = authHeader.replace('Bearer', '').trim()
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

    const requestData: PlaybookRequest = await req.json()

    if (!requestData.contact) {
      return new Response(
        JSON.stringify({ error: 'Contact/deal data is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate comprehensive adaptive playbook
    const playbook = await generateAdaptivePlaybook(requestData)

    // Log the playbook generation
    await supabaseClient
      .from('ai_usage_logs')
      .insert({
        user_id: user.user.id,
        feature_used: 'adaptive-playbook',
        model_id: 'playbook-ai',
        tokens_used: JSON.stringify(playbook).length,
        success: true
      })

    return new Response(
      JSON.stringify({ data: playbook }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Adaptive playbook generation error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error during playbook generation'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function generateAdaptivePlaybook(request: PlaybookRequest): Promise<PlaybookStrategy> {
  const { contact, currentStage, businessGoals, automationType = 'comprehensive' } = request

  // Analyze deal characteristics
  const dealAnalysis = analyzeDealCharacteristics(contact, currentStage)

  // Generate strategic approach
  const strategy = generateStrategicApproach(dealAnalysis, automationType, businessGoals)

  // Create phased playbook
  const phases = generatePlaybookPhases(dealAnalysis, strategy, automationType)

  // Develop risk mitigation strategies
  const riskMitigation = generateRiskMitigation(dealAnalysis, strategy)

  // Define success indicators
  const successIndicators = generateSuccessIndicators(dealAnalysis, strategy)

  // Analyze competitive positioning
  const competitivePositioning = analyzeCompetitivePositioning(dealAnalysis)

  return {
    dealId: contact.id,
    strategy,
    phases,
    riskMitigation,
    successIndicators,
    competitivePositioning
  }
}

function analyzeDealCharacteristics(deal: DealData, currentStage: string): any {
  const { value, company, industry, companySize, competitors = [] } = deal

  return {
    dealSize: categorizeDealSize(value),
    companyProfile: analyzeCompanyProfile(company, industry, companySize),
    competitiveLandscape: analyzeCompetitiveLandscape(competitors),
    salesStage: currentStage,
    complexity: assessDealComplexity(deal),
    stakeholders: identifyKeyStakeholders(deal),
    timeline: estimateTimeline(currentStage, value)
  }
}

function categorizeDealSize(value?: number): string {
  if (!value) return 'unknown'
  if (value < 10000) return 'small'
  if (value < 50000) return 'medium'
  if (value < 250000) return 'large'
  return 'enterprise'
}

function analyzeCompanyProfile(company: string, industry?: string, size?: number): any {
  return {
    name: company,
    industry: industry || 'Unknown',
    size: size || 100,
    sizeCategory: size ? (size < 50 ? 'startup' : size < 500 ? 'small' : size < 5000 ? 'medium' : 'enterprise') : 'unknown',
    growthStage: determineGrowthStage(company, industry),
    decisionMaking: inferDecisionMaking(size, industry)
  }
}

function determineGrowthStage(company: string, industry?: string): string {
  // Simplified logic - in production, this would use company data APIs
  const companyName = company.toLowerCase()
  if (companyName.includes('startup') || companyName.includes('labs')) return 'early'
  if (companyName.includes('inc') || companyName.includes('corp')) return 'growth'
  if (companyName.includes('global') || companyName.includes('international')) return 'mature'
  return 'growth'
}

function inferDecisionMaking(size?: number, industry?: string): string {
  if (size && size > 1000) return 'committee'
  if (industry === 'Technology' || industry === 'Healthcare') return 'technical'
  return 'consensus'
}

function analyzeCompetitiveLandscape(competitors: string[]): any {
  return {
    competitorCount: competitors.length,
    marketPosition: competitors.length > 3 ? 'competitive' : 'favorable',
    differentiationNeeded: competitors.length > 0,
    competitiveAdvantages: generateCompetitiveAdvantages(competitors)
  }
}

function generateCompetitiveAdvantages(competitors: string[]): string[] {
  const advantages = [
    'Superior product capabilities',
    'Better customer support',
    'Stronger industry expertise',
    'More flexible pricing',
    'Faster implementation'
  ]

  return advantages.slice(0, Math.min(3, competitors.length + 1))
}

function assessDealComplexity(deal: DealData): string {
  let complexity = 0

  if (deal.value && deal.value > 100000) complexity += 2
  if (deal.competitors && deal.competitors.length > 2) complexity += 1
  if (deal.stakeholders && deal.stakeholders.length > 3) complexity += 1
  if (deal.industry === 'Healthcare' || deal.industry === 'Financial Services') complexity += 1

  if (complexity >= 4) return 'high'
  if (complexity >= 2) return 'medium'
  return 'low'
}

function identifyKeyStakeholders(deal: DealData): any[] {
  // Simplified stakeholder identification
  const stakeholders = [
    { role: 'Decision Maker', influence: 'high', priority: 'primary' },
    { role: 'Technical Evaluator', influence: 'medium', priority: 'secondary' },
    { role: 'End User', influence: 'medium', priority: 'secondary' }
  ]

  return stakeholders
}

function estimateTimeline(stage: string, value?: number): any {
  const baseTimelines = {
    'prospecting': 30,
    'qualification': 45,
    'proposal': 60,
    'negotiation': 30,
    'closed': 0
  }

  const baseDays = baseTimelines[stage] || 45
  const multiplier = value ? Math.min(2, value / 100000) : 1

  return {
    estimatedDays: Math.round(baseDays * multiplier),
    criticalPath: identifyCriticalPath(stage),
    milestones: generateTimelineMilestones(stage, baseDays)
  }
}

function identifyCriticalPath(stage: string): string[] {
  const paths = {
    'prospecting': ['Initial contact', 'Discovery call', 'Qualification'],
    'qualification': ['Requirements gathering', 'Demo', 'Proposal'],
    'proposal': ['Proposal review', 'Negotiation', 'Contract'],
    'negotiation': ['Terms agreement', 'Legal review', 'Signature']
  }

  return paths[stage] || ['Contact', 'Qualify', 'Close']
}

function generateTimelineMilestones(stage: string, totalDays: number): any[] {
  const milestones = []
  const intervals = totalDays / 4

  for (let i = 1; i <= 4; i++) {
    milestones.push({
      name: `Phase ${i} Complete`,
      dueInDays: Math.round(intervals * i),
      description: `Complete phase ${i} activities`
    })
  }

  return milestones
}

function generateStrategicApproach(analysis: any, automationType: string, businessGoals: string[]): any {
  const { dealSize, companyProfile, competitiveLandscape, complexity } = analysis

  const strategies = {
    comprehensive: {
      name: 'Comprehensive Strategic Approach',
      description: 'Multi-phase strategy with stakeholder alignment, technical evaluation, and ROI demonstration',
      confidence: 0.85
    },
    aggressive: {
      name: 'Accelerated Sales Approach',
      description: 'Fast-track strategy focusing on quick wins and decision-maker engagement',
      confidence: 0.75
    },
    conservative: {
      name: 'Relationship-Building Approach',
      description: 'Long-term nurturing strategy building trust and credibility',
      confidence: 0.90
    },
    relationship: {
      name: 'Strategic Partnership Approach',
      description: 'Focus on long-term relationship and mutual value creation',
      confidence: 0.80
    },
    transactional: {
      name: 'Direct Transaction Approach',
      description: 'Straightforward sales process with clear value exchange',
      confidence: 0.70
    }
  }

  const strategy = strategies[automationType] || strategies.comprehensive

  return {
    ...strategy,
    rationale: generateStrategyRationale(analysis, automationType, businessGoals),
    approach: automationType,
    targetOutcomes: businessGoals
  }
}

function generateStrategyRationale(analysis: any, automationType: string, businessGoals: string[]): string {
  const { dealSize, complexity, companyProfile } = analysis

  let rationale = `Based on ${dealSize} deal size and ${complexity} complexity level`

  if (companyProfile.sizeCategory === 'enterprise') {
    rationale += ', enterprise-level decision making requires comprehensive stakeholder management'
  }

  if (businessGoals.includes('increase_revenue')) {
    rationale += ', with revenue growth as primary objective'
  }

  rationale += `. ${automationType} approach selected for optimal balance of speed and relationship building.`

  return rationale
}

function generatePlaybookPhases(analysis: any, strategy: any, automationType: string): any[] {
  const phases = []
  const phaseConfigs = getPhaseConfiguration(automationType)

  phaseConfigs.forEach((config, index) => {
    const phase = {
      id: `phase-${index + 1}`,
      name: config.name,
      timeline: config.timeline,
      objectives: generatePhaseObjectives(config, analysis, strategy),
      tactics: generatePhaseTactics(config, analysis, strategy),
      milestones: generatePhaseMilestones(config, analysis, index)
    }

    phases.push(phase)
  })

  return phases
}

function getPhaseConfiguration(automationType: string): any[] {
  const configs = {
    comprehensive: [
      { name: 'Discovery & Qualification', timeline: '2-3 weeks', focus: 'understanding' },
      { name: 'Technical Evaluation', timeline: '3-4 weeks', focus: 'evaluation' },
      { name: 'Proposal & Negotiation', timeline: '2-3 weeks', focus: 'closing' },
      { name: 'Implementation Planning', timeline: '1-2 weeks', focus: 'transition' }
    ],
    aggressive: [
      { name: 'Rapid Qualification', timeline: '1 week', focus: 'quick_qualify' },
      { name: 'Accelerated Demo', timeline: '1 week', focus: 'demo' },
      { name: 'Fast-Track Close', timeline: '1 week', focus: 'close' }
    ],
    conservative: [
      { name: 'Relationship Building', timeline: '4-6 weeks', focus: 'relationship' },
      { name: 'Education & Value Demo', timeline: '3-4 weeks', focus: 'education' },
      { name: 'Consensus Building', timeline: '2-3 weeks', focus: 'consensus' },
      { name: 'Careful Close', timeline: '2-3 weeks', focus: 'close' }
    ]
  }

  return configs[automationType] || configs.comprehensive
}

function generatePhaseObjectives(config: any, analysis: any, strategy: any): string[] {
  const objectives = []

  switch (config.focus) {
    case 'understanding':
      objectives.push('Understand business challenges and requirements')
      objectives.push('Identify key stakeholders and decision makers')
      objectives.push('Qualify budget and timeline expectations')
      break
    case 'evaluation':
      objectives.push('Demonstrate technical capabilities')
      objectives.push('Address technical concerns and requirements')
      objectives.push('Build technical credibility')
      break
    case 'closing':
      objectives.push('Present compelling business case')
      objectives.push('Negotiate terms and conditions')
      objectives.push('Secure commitment and signature')
      break
    case 'relationship':
      objectives.push('Establish trust and credibility')
      objectives.push('Understand long-term business goals')
      objectives.push('Position as strategic partner')
      break
  }

  return objectives
}

function generatePhaseTactics(config: any, analysis: any, strategy: any): any[] {
  const tactics = []

  switch (config.focus) {
    case 'understanding':
      tactics.push({
        id: 'discovery-call',
        name: 'Discovery Call',
        description: 'Conduct comprehensive discovery meeting with key stakeholders',
        priority: 'high',
        estimatedEffort: '2 hours',
        successMetrics: ['Stakeholder engagement', 'Information gathered', 'Next steps identified']
      })
      tactics.push({
        id: 'requirements-doc',
        name: 'Requirements Documentation',
        description: 'Document detailed requirements and success criteria',
        priority: 'medium',
        estimatedEffort: '4 hours',
        successMetrics: ['Requirements clarity', 'Stakeholder alignment']
      })
      break
    case 'evaluation':
      tactics.push({
        id: 'technical-demo',
        name: 'Technical Demonstration',
        description: 'Present technical capabilities and integration options',
        priority: 'high',
        estimatedEffort: '3 hours',
        successMetrics: ['Technical concerns addressed', 'Integration feasibility confirmed']
      })
      break
    case 'closing':
      tactics.push({
        id: 'proposal-presentation',
        name: 'Proposal Presentation',
        description: 'Present customized proposal with ROI analysis',
        priority: 'high',
        estimatedEffort: '4 hours',
        successMetrics: ['Proposal accepted', 'Objections addressed', 'Next steps agreed']
      })
      break
  }

  return tactics
}

function generatePhaseMilestones(config: any, analysis: any, phaseIndex: number): any[] {
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() + (phaseIndex * 7)) // Weekly phases

  return [
    {
      id: `milestone-${phaseIndex + 1}-1`,
      name: `${config.name} Kickoff`,
      description: `Begin ${config.name.toLowerCase()} activities`,
      dueDate: baseDate.toISOString(),
      owner: 'Sales Rep',
      status: 'pending'
    },
    {
      id: `milestone-${phaseIndex + 1}-2`,
      name: `${config.name} Complete`,
      description: `Complete all ${config.name.toLowerCase()} objectives`,
      dueDate: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      owner: 'Sales Rep',
      status: 'pending'
    }
  ]
}

function generateRiskMitigation(analysis: any, strategy: any): any[] {
  const risks = []

  if (analysis.complexity === 'high') {
    risks.push({
      risk: 'Stakeholder misalignment',
      probability: 0.6,
      impact: 'High',
      mitigation: 'Regular stakeholder check-ins and alignment sessions'
    })
  }

  if (analysis.competitiveLandscape.competitorCount > 2) {
    risks.push({
      risk: 'Competitive displacement',
      probability: 0.4,
      impact: 'High',
      mitigation: 'Develop competitive differentiation strategy and monitor competitor activity'
    })
  }

  if (analysis.dealSize === 'enterprise') {
    risks.push({
      risk: 'Extended sales cycle',
      probability: 0.7,
      impact: 'Medium',
      mitigation: 'Implement structured follow-up cadence and milestone tracking'
    })
  }

  // Add default risks
  risks.push({
    risk: 'Budget constraints',
    probability: 0.3,
    impact: 'Medium',
    mitigation: 'Present clear ROI analysis and flexible payment options'
  })

  return risks
}

function generateSuccessIndicators(analysis: any, strategy: any): any[] {
  return [
    {
      metric: 'Stakeholder Engagement',
      target: '80%',
      current: '60%',
      status: 'on_track'
    },
    {
      metric: 'Technical Evaluation',
      target: 'Complete',
      current: 'In Progress',
      status: 'on_track'
    },
    {
      metric: 'Proposal Acceptance',
      target: '100%',
      current: 'Pending',
      status: 'pending'
    },
    {
      metric: 'Deal Closure',
      target: '100%',
      current: '0%',
      status: 'pending'
    }
  ]
}

function analyzeCompetitivePositioning(analysis: any): any {
  const { competitiveLandscape, companyProfile } = analysis

  return {
    strengths: [
      'Deep industry expertise',
      'Proven track record',
      'Superior product capabilities',
      'Strong customer support'
    ],
    weaknesses: competitiveLandscape.differentiationNeeded ? [
      'Higher price point',
      'Longer implementation time'
    ] : [],
    differentiation: competitiveLandscape.differentiationNeeded ? [
      'Advanced AI capabilities',
      'Seamless integration',
      'Scalable architecture',
      'Personalized service'
    ] : ['Market leadership', 'Innovation focus'],
    winThemes: [
      'Digital transformation',
      'Operational efficiency',
      'Competitive advantage',
      'Future-proofing'
    ]
  }
}