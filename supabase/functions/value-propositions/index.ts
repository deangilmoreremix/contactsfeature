import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Value Propositions Edge Function - ProductIntel Pro
 *
 * Audience-specific value proposition generation for sales professionals:
 * - Persona-based value messaging tailored to buyer psychology
 * - Industry-specific value drivers and pain point alignment
 * - Competitive differentiation and positioning
 * - ROI-focused value communication and quantification
 * - Emotional and rational value drivers
 *
 * Designed to help sales executives craft compelling, personalized value
 * propositions that resonate with different buyer personas and drive action.
 *
 * @route POST /functions/v1/value-propositions
 */

interface ValuePropositionRequest {
  audienceProfile: {
    persona: string;
    role: string;
    seniority: 'executive' | 'manager' | 'individual_contributor';
    industry: string;
    companySize: number;
    decisionStyle: 'analytical' | 'intuitive' | 'collaborative' | 'directive';
    primaryMotivations: string[];
    keyChallenges: string[];
    successMetrics: string[];
  };
  productContext: {
    name: string;
    category: string;
    keyFeatures: string[];
    uniqueCapabilities: string[];
    provenResults: Array<{
      metric: string;
      improvement: string;
      timeframe: string;
      industry?: string;
    }>;
    pricing: {
      model: string;
      range: string;
      valueDrivers: string[];
    };
  };
  competitiveContext: {
    mainCompetitors: string[];
    competitiveAdvantages: string[];
    marketPosition: string;
    differentiationPoints: string[];
  };
  situationalContext: {
    salesStage: 'prospecting' | 'qualification' | 'demonstration' | 'negotiation' | 'closing';
    urgency: 'low' | 'medium' | 'high' | 'critical';
    budget: string;
    timeline: string;
    currentSolution?: string;
    painPoints: string[];
  };
  customization: {
    tone: 'professional' | 'casual' | 'technical' | 'executive';
    focus: 'roi' | 'efficiency' | 'growth' | 'risk_reduction' | 'innovation';
    length: 'brief' | 'standard' | 'comprehensive';
    includeMetrics: boolean;
    includeStories: boolean;
  };
}

interface ValueProposition {
  propositionId: string;
  coreProposition: {
    headline: string;
    subheadline: string;
    keyMessage: string;
    valueStatement: string;
  };
  audienceSpecificValue: {
    rationalBenefits: Array<{
      benefit: string;
      impact: string;
      quantification: string;
      timeframe: string;
    }>;
    emotionalBenefits: Array<{
      benefit: string;
      connection: string;
      psychologicalDriver: string;
    }>;
    riskReduction: Array<{
      risk: string;
      mitigation: string;
      assurance: string;
    }>;
  };
  competitivePositioning: {
    differentiation: string[];
    competitiveAdvantages: Array<{
      advantage: string;
      competitorWeakness: string;
      customerBenefit: string;
    }>;
    uniqueValueProposition: string;
    positioningStatement: string;
  };
  proofPoints: {
    quantitativeProof: Array<{
      metric: string;
      result: string;
      context: string;
      source: string;
    }>;
    qualitativeProof: Array<{
      testimonial: string;
      customer: string;
      situation: string;
      outcome: string;
    }>;
    caseStudies: Array<{
      company: string;
      industry: string;
      challenge: string;
      solution: string;
      results: string[];
      relevance: string;
    }>;
  };
  callToAction: {
    primaryAction: {
      action: string;
      reason: string;
      urgency: string;
      nextStep: string;
    };
    secondaryActions: Array<{
      action: string;
      purpose: string;
      timing: string;
    }>;
    objectionHandling: Record<string, string>;
  };
  communicationAssets: {
    emailTemplates: Array<{
      subject: string;
      body: string;
      purpose: string;
      tone: string;
    }>;
    talkingPoints: Array<{
      point: string;
      supportingData: string;
      transition: string;
    }>;
    presentationSlides: Array<{
      title: string;
      content: string;
      visualSuggestion: string;
      keyTakeaway: string;
    }>;
    oneLiner: string;
    elevatorPitch: string;
  };
  personalization: {
    dynamicElements: Record<string, string>;
    industrySpecificContent: Record<string, any>;
    roleSpecificMessaging: Record<string, any>;
    companySizeAdjustments: Record<string, any>;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

    const requestData: ValuePropositionRequest = await req.json()

    if (!requestData.audienceProfile || !requestData.productContext) {
      return new Response(
        JSON.stringify({ error: 'Audience profile and product context are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate value proposition
    const valueProposition = await generateValueProposition(requestData)

    // Log the value proposition generation
    await supabaseClient
      .from('ai_usage_logs')
      .insert({
        user_id: user.user.id,
        feature_used: 'value-propositions',
        model_id: 'value-ai',
        tokens_used: JSON.stringify(valueProposition).length,
        success: true
      })

    return new Response(
      JSON.stringify({ valueProposition }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Value proposition error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error during value proposition generation'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function generateValueProposition(request: ValuePropositionRequest): Promise<ValueProposition> {
  const { audienceProfile, productContext, competitiveContext, situationalContext, customization } = request

  // Generate core proposition
  const coreProposition = generateCoreProposition(audienceProfile, productContext, situationalContext, customization)

  // Create audience-specific value
  const audienceSpecificValue = generateAudienceSpecificValue(audienceProfile, productContext, situationalContext)

  // Develop competitive positioning
  const competitivePositioning = generateCompetitivePositioning(competitiveContext, productContext)

  // Compile proof points
  const proofPoints = generateProofPoints(productContext, audienceProfile.industry)

  // Create call to action
  const callToAction = generateCallToAction(situationalContext, audienceProfile)

  // Generate communication assets
  const communicationAssets = generateCommunicationAssets(coreProposition, audienceSpecificValue, customization)

  // Create personalization elements
  const personalization = generatePersonalization(audienceProfile, productContext)

  const propositionId = `vp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  return {
    propositionId,
    coreProposition,
    audienceSpecificValue,
    competitivePositioning,
    proofPoints,
    callToAction,
    communicationAssets,
    personalization
  }
}

function generateCoreProposition(
  audienceProfile: any,
  productContext: any,
  situationalContext: any,
  customization: any
): any {
  const { persona, role, industry, primaryMotivations } = audienceProfile
  const { name, category, uniqueCapabilities } = productContext
  const { salesStage, painPoints } = situationalContext
  const { focus, tone } = customization

  // Generate headline based on focus and persona
  let headline = ''
  if (focus === 'roi') {
    headline = `Maximize ROI and Transform ${industry} Operations with ${name}`
  } else if (focus === 'efficiency') {
    headline = `Streamline ${role} Workflows and Boost Team Productivity`
  } else if (focus === 'growth') {
    headline = `Accelerate ${industry} Growth and Market Leadership`
  } else if (focus === 'risk_reduction') {
    headline = `Mitigate Business Risks and Ensure Operational Continuity`
  } else {
    headline = `Unlock ${industry} Innovation and Competitive Advantage`
  }

  // Generate subheadline
  const subheadline = generateSubheadline(persona, painPoints, uniqueCapabilities)

  // Create key message
  const keyMessage = generateKeyMessage(persona, primaryMotivations, productContext, situationalContext)

  // Craft value statement
  const valueStatement = generateValueStatement(audienceProfile, productContext, focus)

  return {
    headline,
    subheadline,
    keyMessage,
    valueStatement
  }
}

function generateSubheadline(persona: string, painPoints: string[], uniqueCapabilities: string[]): string {
  const primaryPain = painPoints[0] || 'operational challenges'
  const keyCapability = uniqueCapabilities[0] || 'advanced technology'

  if (persona.includes('Executive')) {
    return `Overcome ${primaryPain} and drive strategic growth through ${keyCapability}`
  } else if (persona.includes('Technical')) {
    return `Solve ${primaryPain} with proven ${keyCapability} and technical excellence`
  } else if (persona.includes('Sales') || persona.includes('Business')) {
    return `Address ${primaryPain} and accelerate results using ${keyCapability}`
  }

  return `Transform ${primaryPain} into competitive advantage with ${keyCapability}`
}

function generateKeyMessage(
  persona: string,
  motivations: string[],
  productContext: any,
  situationalContext: any
): string {
  const { name, provenResults } = productContext
  const { salesStage, urgency } = situationalContext

  let message = ''

  if (persona.includes('Executive')) {
    message = `${name} delivers the strategic capabilities and proven results that ${motivations[0] || 'drive business success'}. `
  } else if (persona.includes('Technical')) {
    message = `${name} provides the technical foundation and capabilities to ${motivations[0] || 'solve complex challenges'}. `
  } else {
    message = `${name} enables ${motivations[0] || 'achieve business objectives'} through innovative solutions. `
  }

  // Add urgency element
  if (urgency === 'high' || urgency === 'critical') {
    message += 'Now is the time to act and secure competitive advantage.'
  } else if (salesStage === 'prospecting') {
    message += 'Discover how this solution can transform your operations.'
  } else {
    message += 'Experience the difference with proven results and reliable performance.'
  }

  return message
}

function generateValueStatement(audienceProfile: any, productContext: any, focus: string): string {
  const { role, industry, companySize } = audienceProfile
  const { name, pricing } = productContext

  let statement = `For ${role}s in ${industry} companies, ${name} delivers `

  switch (focus) {
    case 'roi':
      statement += `exceptional ROI through cost optimization and efficiency gains, typically achieving 300-500% returns within 18 months.`
      break
    case 'efficiency':
      statement += `significant efficiency improvements, reducing operational overhead by 30-50% while maintaining quality standards.`
      break
    case 'growth':
      statement += `accelerated growth opportunities, enabling ${companySize > 1000 ? 'enterprise' : 'mid-market'} expansion and market penetration.`
      break
    case 'risk_reduction':
      statement += `comprehensive risk mitigation, ensuring business continuity and compliance with industry standards.`
      break
    case 'innovation':
      statement += `cutting-edge innovation capabilities, positioning your organization as an industry leader in digital transformation.`
      break
    default:
      statement += `transformative results that drive business success and competitive advantage across all key metrics.`
  }

  return statement
}

function generateAudienceSpecificValue(
  audienceProfile: any,
  productContext: any,
  situationalContext: any
): any {
  const { persona, role, seniority, primaryMotivations, keyChallenges, successMetrics } = audienceProfile
  const { provenResults, keyFeatures } = productContext
  const { painPoints, urgency } = situationalContext

  // Generate rational benefits
  const rationalBenefits = generateRationalBenefits(
    persona,
    primaryMotivations,
    provenResults,
    successMetrics
  )

  // Generate emotional benefits
  const emotionalBenefits = generateEmotionalBenefits(
    seniority,
    role,
    keyChallenges,
    urgency
  )

  // Generate risk reduction elements
  const riskReduction = generateRiskReduction(painPoints, keyFeatures, persona)

  return {
    rationalBenefits,
    emotionalBenefits,
    riskReduction
  }
}

function generateRationalBenefits(
  persona: string,
  motivations: string[],
  provenResults: any[],
  successMetrics: string[]
): any[] {
  const benefits = []

  provenResults.forEach(result => {
    const benefit = {
      benefit: `Achieve ${result.metric} improvements`,
      impact: result.improvement,
      quantification: `${result.improvement} within ${result.timeframe}`,
      timeframe: result.timeframe
    }
    benefits.push(benefit)
  })

  // Add persona-specific benefits
  if (persona.includes('Executive')) {
    benefits.push({
      benefit: 'Strategic decision support',
      impact: 'Data-driven insights for executive decision making',
      quantification: '30% faster strategic decisions',
      timeframe: '3-6 months'
    })
  }

  if (persona.includes('Technical')) {
    benefits.push({
      benefit: 'Technical implementation support',
      impact: 'Streamlined deployment and integration',
      quantification: '50% reduction in implementation time',
      timeframe: '1-3 months'
    })
  }

  return benefits.slice(0, 5)
}

function generateEmotionalBenefits(
  seniority: string,
  role: string,
  challenges: string[],
  urgency: string
): any[] {
  const benefits = []

  // Career advancement benefits
  if (seniority === 'executive') {
    benefits.push({
      benefit: 'Executive confidence and peace of mind',
      connection: 'Knowing your technology investments are driving strategic objectives',
      psychologicalDriver: 'Achievement and recognition'
    })
  }

  // Professional satisfaction benefits
  benefits.push({
    benefit: 'Professional satisfaction from successful outcomes',
    connection: 'Seeing tangible results from your technology decisions',
    psychologicalDriver: 'Accomplishment and pride'
  })

  // Team leadership benefits
  if (role.includes('manager') || role.includes('director')) {
    benefits.push({
      benefit: 'Team leadership and morale boost',
      connection: 'Equipping your team with tools that make their jobs easier',
      psychologicalDriver: 'Leadership fulfillment'
    })
  }

  // Urgency-based emotional benefits
  if (urgency === 'high' || urgency === 'critical') {
    benefits.push({
      benefit: 'Relief from pressing challenges',
      connection: 'Solving immediate pain points that are keeping you up at night',
      psychologicalDriver: 'Problem resolution and relief'
    })
  }

  return benefits
}

function generateRiskReduction(painPoints: string[], keyFeatures: string[], persona: string): any[] {
  const riskReduction = []

  painPoints.forEach(pain => {
    if (pain.toLowerCase().includes('cost') || pain.toLowerCase().includes('budget')) {
      riskReduction.push({
        risk: 'Budget overruns and unexpected costs',
        mitigation: 'Predictable pricing and transparent cost structure',
        assurance: 'Fixed pricing with no hidden fees or surprise costs'
      })
    }

    if (pain.toLowerCase().includes('time') || pain.toLowerCase().includes('delay')) {
      riskReduction.push({
        risk: 'Implementation delays and timeline slippage',
        mitigation: 'Proven implementation methodology and dedicated project management',
        assurance: '90% of implementations complete on or ahead of schedule'
      })
    }

    if (pain.toLowerCase().includes('integration') || pain.toLowerCase().includes('compatibility')) {
      riskReduction.push({
        risk: 'System integration challenges and compatibility issues',
        mitigation: 'Comprehensive integration capabilities and API support',
        assurance: 'Seamless integration with 95% of enterprise systems'
      })
    }
  })

  // Persona-specific risk reduction
  if (persona.includes('Executive')) {
    riskReduction.push({
      risk: 'Strategic misalignment and failed initiatives',
      mitigation: 'Strategic alignment assessment and executive sponsorship',
      assurance: 'Executive involvement ensures strategic alignment throughout'
    })
  }

  return riskReduction.slice(0, 4)
}

function generateCompetitivePositioning(competitiveContext: any, productContext: any): any {
  const { mainCompetitors, competitiveAdvantages, differentiationPoints } = competitiveContext
  const { name, uniqueCapabilities } = productContext

  // Generate differentiation statement
  const differentiation = differentiationPoints.map(point =>
    `${name} ${point.toLowerCase()} while competitors typically struggle with this area.`
  )

  // Create competitive advantages
  const competitiveAdvantagesFormatted = competitiveAdvantages.map(advantage => ({
    advantage,
    competitorWeakness: identifyCompetitorWeakness(advantage, mainCompetitors),
    customerBenefit: translateToCustomerBenefit(advantage)
  }))

  // Craft unique value proposition
  const uniqueValueProposition = `Unlike ${mainCompetitors.slice(0, 2).join(' and ')}, ${name} delivers ${uniqueCapabilities[0] || 'unique capabilities'} that directly address your most pressing challenges.`

  // Create positioning statement
  const positioningStatement = generatePositioningStatement(name, mainCompetitors, differentiationPoints)

  return {
    differentiation,
    competitiveAdvantages: competitiveAdvantagesFormatted,
    uniqueValueProposition,
    positioningStatement
  }
}

function identifyCompetitorWeakness(advantage: string, competitors: string[]): string {
  // Simplified competitor weakness identification
  if (advantage.toLowerCase().includes('integration')) {
    return 'Limited integration capabilities requiring manual workarounds'
  }
  if (advantage.toLowerCase().includes('scalability')) {
    return 'Performance degradation at scale'
  }
  if (advantage.toLowerCase().includes('user-friendly')) {
    return 'Complex interfaces requiring extensive training'
  }
  if (advantage.toLowerCase().includes('support')) {
    return 'Slow response times and limited support options'
  }

  return 'Generic limitations in feature depth and flexibility'
}

function translateToCustomerBenefit(advantage: string): string {
  if (advantage.toLowerCase().includes('integration')) {
    return 'Seamlessly connects with your existing technology stack'
  }
  if (advantage.toLowerCase().includes('scalability')) {
    return 'Grows with your business without performance issues'
  }
  if (advantage.toLowerCase().includes('user-friendly')) {
    return 'Reduces training time and increases user adoption'
  }
  if (advantage.toLowerCase().includes('support')) {
    return 'Ensures quick resolution of issues and minimal downtime'
  }

  return 'Delivers superior value and business outcomes'
}

function generatePositioningStatement(name: string, competitors: string[], differentiationPoints: string[]): string {
  const primaryCompetitor = competitors[0] || 'traditional solutions'
  const keyDifferentiation = differentiationPoints[0] || 'innovative approach'

  return `${name} is positioned as the ${keyDifferentiation} alternative to ${primaryCompetitor}, offering superior capabilities that deliver measurable business results.`
}

function generateProofPoints(productContext: any, industry: string): any {
  const { provenResults } = productContext

  // Generate quantitative proof
  const quantitativeProof = provenResults.map(result => ({
    metric: result.metric,
    result: result.improvement,
    context: result.industry || industry,
    source: 'Customer implementation data'
  }))

  // Generate qualitative proof
  const qualitativeProof = generateQualitativeProof(industry)

  // Generate case studies
  const caseStudies = generateCaseStudies(industry)

  return {
    quantitativeProof,
    qualitativeProof,
    caseStudies
  }
}

function generateQualitativeProof(industry: string): any[] {
  const testimonials = []

  if (industry === 'technology') {
    testimonials.push({
      testimonial: '"This solution transformed our development process and improved our time-to-market by 40%."',
      customer: 'Sarah Chen, CTO',
      situation: 'Scaling engineering team from 20 to 200 developers',
      outcome: 'Successful scaling with maintained code quality and faster delivery'
    })
  }

  if (industry === 'healthcare') {
    testimonials.push({
      testimonial: '"Finally, a solution that understands healthcare compliance while improving patient care."',
      customer: 'Dr. Michael Rodriguez, CIO',
      situation: 'Implementing electronic health records system',
      outcome: 'HIPAA compliance achieved with improved patient outcomes'
    })
  }

  // Generic testimonial
  testimonials.push({
    testimonial: '"The ROI was evident within the first quarter, and the quality of support exceeded our expectations."',
    customer: 'Jennifer Williams, Operations Director',
    situation: 'Digital transformation initiative',
    outcome: 'Successful transformation with measurable efficiency gains'
  })

  return testimonials
}

function generateCaseStudies(industry: string): any[] {
  const caseStudies = []

  if (industry === 'technology') {
    caseStudies.push({
      company: 'TechFlow Solutions',
      industry: 'Technology',
      challenge: 'Inefficient development processes and delayed product releases',
      solution: 'Implemented comprehensive development platform with automation',
      results: [
        '50% reduction in development cycle time',
        '30% improvement in code quality metrics',
        '25% increase in team productivity'
      ],
      relevance: 'Similar company size and development challenges'
    })
  }

  if (industry === 'healthcare') {
    caseStudies.push({
      company: 'Metro Health Network',
      industry: 'Healthcare',
      challenge: 'Patient data management and regulatory compliance',
      solution: 'Deployed integrated healthcare management platform',
      results: [
        '100% compliance with HIPAA regulations',
        '40% reduction in administrative overhead',
        'Improved patient satisfaction scores'
      ],
      relevance: 'Healthcare industry compliance and efficiency focus'
    })
  }

  // Generic case study
  caseStudies.push({
    company: 'Global Enterprises Inc.',
    industry: 'Manufacturing',
    challenge: 'Operational inefficiencies and manual processes',
    solution: 'Digital transformation with automated workflows',
    results: [
      '35% improvement in operational efficiency',
      '20% cost reduction through process optimization',
      'Enhanced decision-making with real-time insights'
    ],
    relevance: 'Operational excellence and digital transformation'
  })

  return caseStudies
}

function generateCallToAction(situationalContext: any, audienceProfile: any): any {
  const { salesStage, urgency } = situationalContext
  const { seniority, persona } = audienceProfile

  let primaryAction = {
    action: 'Schedule a demonstration',
    reason: 'Experience the solution in action and see how it addresses your specific needs',
    urgency: urgency === 'high' ? 'immediate' : 'within_1_week',
    nextStep: 'Technical deep-dive session'
  }

  // Customize based on sales stage
  if (salesStage === 'prospecting') {
    primaryAction = {
      action: 'Book an introductory call',
      reason: 'Learn more about how this solution can benefit your organization',
      urgency: 'within_3_days',
      nextStep: 'Discovery meeting'
    }
  } else if (salesStage === 'negotiation') {
    primaryAction = {
      action: 'Review final proposal',
      reason: 'Evaluate the complete solution and implementation plan',
      urgency: 'immediate',
      nextStep: 'Contract negotiation'
    }
  }

  // Generate secondary actions
  const secondaryActions = [
    {
      action: 'Download case studies',
      purpose: 'Review real-world implementations and results',
      timing: 'after_primary_action'
    },
    {
      action: 'Connect with customer references',
      purpose: 'Speak directly with satisfied customers',
      timing: 'after_demonstration'
    }
  ]

  // Generate objection handling
  const objectionHandling = generateObjectionResponses(situationalContext, audienceProfile)

  return {
    primaryAction,
    secondaryActions,
    objectionHandling
  }
}

function generateObjectionResponses(situationalContext: any, audienceProfile: any): Record<string, string> {
  const { budget, timeline } = situationalContext
  const { seniority } = audienceProfile

  const responses: Record<string, string> = {
    'too_expensive': 'I understand budget concerns are important. Let me show you the ROI calculation that demonstrates how this investment pays for itself within 12-18 months through efficiency gains and cost savings.',
    'not_enough_time': 'I appreciate your time constraints. Our implementation team can work around your schedule, and many customers see initial benefits within the first 30 days.',
    'current_solution_works': 'That\'s great to hear you have something that works. I\'d love to understand what you like about your current solution and explore how we might enhance or complement it.',
    'need_more_information': 'Absolutely, I want to make sure you have all the information you need. Would you like me to arrange a technical deep-dive or connect you with a customer reference?',
    'wrong_timing': 'I understand timing is critical. Let me share some flexible options for getting started, including phased implementations that can begin immediately.',
    'competition_is_better': 'I\'d be happy to discuss the specific differences you\'ve seen. Our customers often choose us because of our superior integration capabilities and ongoing support.',
    'not_sure_about_roi': 'ROI is definitely worth exploring in detail. Let me walk you through specific metrics from similar companies in your industry that have achieved 300-500% returns.'
  }

  // Add seniority-specific responses
  if (seniority === 'executive') {
    responses['too_expensive'] = 'For executive decision-makers, the focus is often on strategic value rather than initial cost. Let me show you how this investment aligns with your strategic objectives and delivers measurable business impact.'
  }

  return responses
}

function generateCommunicationAssets(
  coreProposition: any,
  audienceSpecificValue: any,
  customization: any
): any {
  const { tone, length } = customization

  // Generate email templates
  const emailTemplates = generateEmailTemplates(coreProposition, audienceSpecificValue, tone)

  // Generate talking points
  const talkingPoints = generateTalkingPoints(coreProposition, audienceSpecificValue)

  // Generate presentation slides
  const presentationSlides = generatePresentationSlides(coreProposition, audienceSpecificValue, length)

  // Create one-liner and elevator pitch
  const oneLiner = generateOneLiner(coreProposition)
  const elevatorPitch = generateElevatorPitch(coreProposition, audienceSpecificValue)

  return {
    emailTemplates,
    talkingPoints,
    presentationSlides,
    oneLiner,
    elevatorPitch
  }
}

function generateEmailTemplates(coreProposition: any, audienceSpecificValue: any, tone: string): any[] {
  const templates = []

  // Prospecting email
  templates.push({
    subject: coreProposition.headline,
    body: `Dear [Recipient],

${coreProposition.keyMessage}

${audienceSpecificValue.rationalBenefits[0]?.benefit || 'Key benefits include:'}
• ${audienceSpecificValue.rationalBenefits.slice(0, 3).map(b => b.benefit).join('\n• ')}

Would you be available for a brief call to explore how this could benefit [Company]?

Best regards,
[Your Name]`,
    purpose: 'Initial outreach',
    tone
  })

  // Follow-up email
  templates.push({
    subject: `Following up: ${coreProposition.subheadline}`,
    body: `Dear [Recipient],

I wanted to follow up on my previous message about ${coreProposition.headline.toLowerCase()}.

${audienceSpecificValue.rationalBenefits[1]?.benefit || 'Additional benefits include:'}
• ${audienceSpecificValue.rationalBenefits.slice(1, 4).map(b => b.benefit).join('\n• ')}

I'd love to hear your thoughts and answer any questions.

Best regards,
[Your Name]`,
    purpose: 'Follow-up communication',
    tone
  })

  return templates
}

function generateTalkingPoints(coreProposition: any, audienceSpecificValue: any): any[] {
  const talkingPoints = []

  talkingPoints.push({
    point: coreProposition.keyMessage,
    supportingData: audienceSpecificValue.rationalBenefits[0]?.quantification || 'Based on proven results',
    transition: 'This leads me to the key benefits...'
  })

  audienceSpecificValue.rationalBenefits.slice(0, 3).forEach((benefit, index) => {
    talkingPoints.push({
      point: benefit.benefit,
      supportingData: benefit.quantification,
      transition: index < 2 ? 'Additionally...' : 'Finally...'
    })
  })

  return talkingPoints
}

function generatePresentationSlides(coreProposition: any, audienceSpecificValue: any, length: string): any[] {
  const slides = []

  slides.push({
    title: 'The Challenge',
    content: 'Current situation and pain points that need to be addressed',
    visualSuggestion: 'Problem/solution diagram',
    keyTakeaway: 'Clear articulation of the business challenge'
  })

  slides.push({
    title: 'Our Solution',
    content: coreProposition.valueStatement,
    visualSuggestion: 'Product capabilities overview',
    keyTakeaway: coreProposition.keyMessage
  })

  if (length !== 'brief') {
    slides.push({
      title: 'Key Benefits',
      content: audienceSpecificValue.rationalBenefits.map(b => b.benefit).join('\n\n'),
      visualSuggestion: 'Benefits matrix or comparison chart',
      keyTakeaway: 'Quantified value delivered to the customer'
    })

    slides.push({
      title: 'Proof Points',
      content: 'Case studies, testimonials, and quantitative results',
      visualSuggestion: 'Success metrics and customer logos',
      keyTakeaway: 'Social proof and credibility'
    })
  }

  slides.push({
    title: 'Next Steps',
    content: 'Clear call to action and implementation timeline',
    visualSuggestion: 'Action plan timeline',
    keyTakeaway: 'Clear path forward for the customer'
  })

  return slides
}

function generateOneLiner(coreProposition: any): string {
  return coreProposition.headline
}

function generateElevatorPitch(coreProposition: any, audienceSpecificValue: any): string {
  const topBenefit = audienceSpecificValue.rationalBenefits[0]?.benefit || 'significant value'

  return `${coreProposition.keyMessage} ${topBenefit}, delivering ${audienceSpecificValue.rationalBenefits[0]?.quantification || 'proven results'} for organizations like yours.`
}

function generatePersonalization(audienceProfile: any, productContext: any): any {
  const { role, industry, companySize, seniority } = audienceProfile
  const { name, category } = productContext

  const dynamicElements = {
    recipient_name: '[Recipient Name]',
    company_name: '[Company Name]',
    role_title: role,
    industry: industry,
    company_size: companySize > 1000 ? 'enterprise' : companySize > 200 ? 'mid-market' : 'small business'
  }

  const industrySpecificContent = generateIndustrySpecificContent(industry, name)
  const roleSpecificMessaging = generateRoleSpecificMessaging(seniority, role, name)
  const companySizeAdjustments = generateCompanySizeAdjustments(companySize, category)

  return {
    dynamicElements,
    industrySpecificContent,
    roleSpecificMessaging,
    companySizeAdjustments
  }
}

function generateIndustrySpecificContent(industry: string, productName: string): Record<string, any> {
  const content: Record<string, any> = {}

  if (industry === 'healthcare') {
    content.compliance = 'HIPAA compliance and patient data security'
    content.specific_pain = 'patient care coordination and regulatory requirements'
    content.industry_value = 'improved patient outcomes and operational efficiency'
  }

  if (industry === 'technology') {
    content.compliance = 'data security and intellectual property protection'
    content.specific_pain = 'rapid scaling and development velocity'
    content.industry_value = 'faster time-to-market and innovation acceleration'
  }

  if (industry === 'finance') {
    content.compliance = 'SOX compliance and financial regulations'
    content.specific_pain = 'risk management and regulatory reporting'
    content.industry_value = 'enhanced risk mitigation and regulatory compliance'
  }

  return content
}

function generateRoleSpecificMessaging(seniority: string, role: string, productName: string): Record<string, any> {
  const messaging: Record<string, any> = {}

  if (seniority === 'executive') {
    messaging.focus = 'strategic impact and competitive advantage'
    messaging.metrics = 'revenue growth, market share, strategic positioning'
    messaging.timeline = 'long-term transformation and sustained growth'
  }

  if (role.includes('technical') || role.includes('IT')) {
    messaging.focus = 'technical capabilities and implementation'
    messaging.metrics = 'system performance, integration success, technical ROI'
    messaging.timeline = 'implementation efficiency and technical adoption'
  }

  if (role.includes('sales') || role.includes('business')) {
    messaging.focus = 'business impact and revenue generation'
    messaging.metrics = 'sales productivity, deal velocity, customer satisfaction'
    messaging.timeline = 'immediate impact and quick wins'
  }

  return messaging
}

function generateCompanySizeAdjustments(companySize: number, category: string): Record<string, any> {
  const adjustments: Record<string, any> = {}

  if (companySize < 50) {
    adjustments.scale = 'small business focus'
    adjustments.complexity = 'simple, easy-to-implement solutions'
    adjustments.support = 'personalized, hands-on support'
  } else if (companySize < 1000) {
    adjustments.scale = 'mid-market growth'
    adjustments.complexity = 'scalable solutions with room for growth'
    adjustments.support = 'dedicated account management'
  } else {
    adjustments.scale = 'enterprise transformation'
    adjustments.complexity = 'comprehensive, enterprise-grade solutions'
    adjustments.support = 'enterprise support team and strategic partnership'
  }

  return adjustments
}