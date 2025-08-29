import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Proposal Generation Edge Function - ProductIntel Pro
 *
 * Automated proposal generation with customization for sales professionals:
 * - Dynamic proposal creation based on prospect profile and requirements
 * - ROI calculations and business case development
 * - Competitive positioning and differentiation
 * - Implementation timeline and risk mitigation
 * - Stakeholder-specific customization
 *
 * Designed to help sales executives create compelling, customized proposals
 * that address prospect needs and differentiate from competitors.
 *
 * @route POST /functions/v1/proposal-generation
 */

interface ProposalGenerationRequest {
  prospectProfile: {
    companyName: string;
    industry: string;
    companySize: number;
    keyContacts: Array<{
      name: string;
      role: string;
      influence: 'decision_maker' | 'influencer' | 'end_user';
      priorities: string[];
    }>;
    currentSituation: {
      currentSolution?: string;
      painPoints: string[];
      goals: string[];
      budget?: {
        range: string;
        approvalProcess: string;
      };
    };
  };
  dealRequirements: {
    products: Array<{
      name: string;
      features: string[];
      pricing: number;
      implementation: string;
    }>;
    services: Array<{
      type: string;
      scope: string;
      duration: string;
      cost: number;
    }>;
    timeline: {
      startDate: string;
      keyMilestones: Array<{
        milestone: string;
        date: string;
        deliverables: string[];
      }>;
    };
  };
  competitiveContext: {
    competitors: string[];
    differentiation: string[];
    winThemes: string[];
    objections: string[];
  };
  customization: {
    tone: 'professional' | 'casual' | 'technical' | 'executive';
    focus: 'roi' | 'features' | 'timeline' | 'support' | 'integration';
    length: 'brief' | 'standard' | 'comprehensive';
    includeCaseStudies: boolean;
    includeTestimonials: boolean;
  };
}

interface ProposalGeneration {
  proposalId: string;
  executiveSummary: {
    title: string;
    overview: string;
    keyBenefits: string[];
    investment: {
      total: number;
      breakdown: Record<string, number>;
      roi: {
        projected: number;
        timeframe: string;
        assumptions: string[];
      };
    };
  };
  proposalContent: {
    introduction: {
      hook: string;
      companyUnderstanding: string;
      valueProposition: string;
    };
    solutionOverview: {
      products: Array<{
        name: string;
        description: string;
        benefits: string[];
        roi: string;
      }>;
      services: Array<{
        type: string;
        deliverables: string[];
        timeline: string;
        value: string;
      }>;
      implementation: {
        approach: string;
        timeline: string;
        milestones: Array<{
          phase: string;
          duration: string;
          deliverables: string[];
          successCriteria: string[];
        }>;
        risks: Array<{
          risk: string;
          mitigation: string;
          impact: string;
        }>;
      };
    };
    businessCase: {
      costBenefitAnalysis: {
        costs: Record<string, number>;
        benefits: Record<string, number>;
        paybackPeriod: string;
        npv: number;
        irr: number;
      };
      roiScenarios: Array<{
        scenario: string;
        assumptions: string[];
        projectedReturn: number;
        timeframe: string;
      }>;
      riskAnalysis: {
        implementationRisks: string[];
        marketRisks: string[];
        mitigationStrategies: string[];
      };
    };
    competitivePositioning: {
      differentiation: string[];
      competitiveAdvantages: Array<{
        advantage: string;
        impact: string;
        evidence: string;
      }>;
      winThemes: string[];
      objectionResponses: Record<string, string>;
    };
  };
  stakeholderCustomization: {
    decisionMakerContent: {
      executiveSummary: string;
      strategicBenefits: string[];
      riskConsiderations: string[];
    };
    technicalContent: {
      technicalRequirements: string[];
      integrationDetails: string[];
      securityConsiderations: string[];
    };
    endUserContent: {
      userBenefits: string[];
      trainingRequirements: string[];
      adoptionStrategy: string[];
    };
  };
  appendices: {
    caseStudies: Array<{
      company: string;
      industry: string;
      challenge: string;
      solution: string;
      results: string[];
    }>;
    testimonials: Array<{
      customer: string;
      role: string;
      quote: string;
      context: string;
    }>;
    technicalSpecifications: Record<string, any>;
    pricingDetails: {
      breakdown: Record<string, number>;
      paymentTerms: string[];
      discounts: Record<string, number>;
    };
  };
  nextSteps: {
    immediateActions: Array<{
      action: string;
      timeline: string;
      owner: string;
      purpose: string;
    }>;
    decisionProcess: {
      timeline: string;
      decisionMakers: string[];
      evaluationCriteria: string[];
      followUpPlan: string[];
    };
    contingencyPlans: Array<{
      scenario: string;
      trigger: string;
      response: string;
      backupPlan: string;
    }>;
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

    const requestData: ProposalGenerationRequest = await req.json()

    if (!requestData.prospectProfile || !requestData.dealRequirements) {
      return new Response(
        JSON.stringify({ error: 'Prospect profile and deal requirements are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate comprehensive proposal
    const proposal = await generateProposal(requestData)

    // Log the proposal generation
    await supabaseClient
      .from('ai_usage_logs')
      .insert({
        user_id: user.user.id,
        feature_used: 'proposal-generation',
        model_id: 'proposal-ai',
        tokens_used: JSON.stringify(proposal).length,
        success: true
      })

    return new Response(
      JSON.stringify({ proposal }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Proposal generation error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error during proposal generation'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function generateProposal(request: ProposalGenerationRequest): Promise<ProposalGeneration> {
  const { prospectProfile, dealRequirements, competitiveContext, customization } = request

  // Generate executive summary
  const executiveSummary = generateExecutiveSummary(prospectProfile, dealRequirements)

  // Create proposal content
  const proposalContent = generateProposalContent(
    prospectProfile,
    dealRequirements,
    competitiveContext,
    customization
  )

  // Generate stakeholder-specific content
  const stakeholderCustomization = generateStakeholderCustomization(
    prospectProfile,
    dealRequirements,
    customization
  )

  // Create appendices
  const appendices = generateAppendices(prospectProfile, dealRequirements, customization)

  // Define next steps
  const nextSteps = generateNextSteps(prospectProfile, dealRequirements)

  const proposalId = `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  return {
    proposalId,
    executiveSummary,
    proposalContent,
    stakeholderCustomization,
    appendices,
    nextSteps
  }
}

function generateExecutiveSummary(prospectProfile: any, dealRequirements: any): any {
  const { companyName, industry, currentSituation } = prospectProfile
  const { products, services } = dealRequirements

  // Calculate total investment
  const productTotal = products.reduce((sum: number, p: any) => sum + p.pricing, 0)
  const serviceTotal = services.reduce((sum: number, s: any) => sum + s.cost, 0)
  const totalInvestment = productTotal + serviceTotal

  // Generate key benefits
  const keyBenefits = generateKeyBenefits(currentSituation.painPoints, products, services)

  // Calculate ROI
  const projectedROI = calculateProjectedROI(totalInvestment, currentSituation.goals)

  return {
    title: `Custom Solution Proposal for ${companyName}`,
    overview: `A comprehensive solution designed to address ${companyName}'s key challenges in ${industry} through innovative technology and strategic implementation.`,
    keyBenefits,
    investment: {
      total: totalInvestment,
      breakdown: {
        products: productTotal,
        services: serviceTotal,
        implementation: serviceTotal * 0.2
      },
      roi: projectedROI
    }
  }
}

function generateKeyBenefits(painPoints: string[], products: any[], services: any[]): string[] {
  const benefits = []

  painPoints.forEach(pain => {
    if (pain.toLowerCase().includes('efficiency') || pain.toLowerCase().includes('productivity')) {
      benefits.push('30-50% improvement in operational efficiency through automation')
    }
    if (pain.toLowerCase().includes('cost') || pain.toLowerCase().includes('budget')) {
      benefits.push('20-40% reduction in operational costs through optimization')
    }
    if (pain.toLowerCase().includes('integration') || pain.toLowerCase().includes('system')) {
      benefits.push('Seamless integration with existing technology infrastructure')
    }
    if (pain.toLowerCase().includes('scalability') || pain.toLowerCase().includes('growth')) {
      benefits.push('Scalable solution that grows with your business needs')
    }
  })

  // Add product-specific benefits
  products.forEach(product => {
    benefits.push(`Advanced ${product.name} capabilities for enhanced performance`)
  })

  return benefits.slice(0, 5) // Top 5 benefits
}

function calculateProjectedROI(totalInvestment: number, goals: string[]): any {
  let projectedReturn = totalInvestment * 2.5 // 250% ROI baseline
  let timeframe = '24 months'

  // Adjust based on goals
  if (goals.some(g => g.toLowerCase().includes('efficiency'))) {
    projectedReturn = totalInvestment * 3.0
    timeframe = '18 months'
  }
  if (goals.some(g => g.toLowerCase().includes('growth') || g.toLowerCase().includes('revenue'))) {
    projectedReturn = totalInvestment * 4.0
    timeframe = '12 months'
  }

  return {
    projected: projectedReturn,
    timeframe,
    assumptions: [
      'Full implementation and adoption of proposed solution',
      'Normal market conditions and business operations',
      'Standard implementation timeline and resource allocation',
      'Expected efficiency gains and cost savings realized'
    ]
  }
}

function generateProposalContent(
  prospectProfile: any,
  dealRequirements: any,
  competitiveContext: any,
  customization: any
): any {
  const { companyName, currentSituation } = prospectProfile
  const { products, services, timeline } = dealRequirements

  return {
    introduction: generateIntroduction(companyName, currentSituation, customization),
    solutionOverview: generateSolutionOverview(products, services, timeline),
    businessCase: generateBusinessCase(dealRequirements, prospectProfile),
    competitivePositioning: generateCompetitivePositioning(competitiveContext)
  }
}

function generateIntroduction(companyName: string, currentSituation: any, customization: any): any {
  const { painPoints, goals } = currentSituation

  let hook = `Transforming ${companyName}'s operations through innovative technology solutions.`

  if (customization.focus === 'roi') {
    hook = `Maximizing ROI and business impact for ${companyName} through strategic technology investment.`
  } else if (customization.focus === 'timeline') {
    hook = `Accelerating ${companyName}'s digital transformation with rapid, effective implementation.`
  }

  const companyUnderstanding = `We understand that ${companyName} is facing challenges with ${painPoints.slice(0, 2).join(' and ')}, while aiming to achieve ${goals.slice(0, 2).join(' and ')}.`

  const valueProposition = `Our comprehensive solution combines cutting-edge technology with strategic implementation to deliver measurable results and competitive advantage.`

  return {
    hook,
    companyUnderstanding,
    valueProposition
  }
}

function generateSolutionOverview(products: any[], services: any[], timeline: any): any {
  return {
    products: products.map(product => ({
      name: product.name,
      description: `Advanced ${product.name} with ${product.features.slice(0, 3).join(', ')}`,
      benefits: generateProductBenefits(product),
      roi: `Expected ${product.pricing * 2}x return on investment within 18 months`
    })),
    services: services.map(service => ({
      type: service.type,
      deliverables: generateServiceDeliverables(service),
      timeline: service.duration,
      value: `Comprehensive ${service.type} to ensure successful implementation and adoption`
    })),
    implementation: generateImplementationPlan(timeline)
  }
}

function generateProductBenefits(product: any): string[] {
  const benefits = []

  product.features.forEach((feature: string) => {
    if (feature.toLowerCase().includes('automation')) {
      benefits.push('Streamlined workflows and reduced manual processes')
    }
    if (feature.toLowerCase().includes('analytics') || feature.toLowerCase().includes('reporting')) {
      benefits.push('Data-driven insights for better decision making')
    }
    if (feature.toLowerCase().includes('integration')) {
      benefits.push('Seamless connectivity with existing systems')
    }
    if (feature.toLowerCase().includes('security')) {
      benefits.push('Enhanced security and compliance protection')
    }
  })

  return benefits
}

function generateServiceDeliverables(service: any): string[] {
  const deliverables = []

  if (service.type === 'implementation') {
    deliverables.push('Complete system setup and configuration')
    deliverables.push('Data migration and integration')
    deliverables.push('User training and documentation')
    deliverables.push('Go-live support and optimization')
  }

  if (service.type === 'training') {
    deliverables.push('Comprehensive user training programs')
    deliverables.push('Administrator training sessions')
    deliverables.push('Training materials and documentation')
    deliverables.push('Ongoing support and resources')
  }

  if (service.type === 'consulting') {
    deliverables.push('Strategic consulting and planning')
    deliverables.push('Process optimization recommendations')
    deliverables.push('Change management support')
    deliverables.push('Performance monitoring and reporting')
  }

  return deliverables
}

function generateImplementationPlan(timeline: any): any {
  const { startDate, keyMilestones } = timeline

  return {
    approach: 'Phased implementation approach ensuring minimal disruption and maximum success',
    timeline: `Implementation begins ${startDate} with completion expected within ${calculateTotalDuration(keyMilestones)} weeks`,
    milestones: keyMilestones.map((milestone: any) => ({
      phase: milestone.milestone,
      duration: '2-3 weeks',
      deliverables: milestone.deliverables,
      successCriteria: generateSuccessCriteria(milestone.milestone)
    })),
    risks: generateImplementationRisks()
  }
}

function calculateTotalDuration(milestones: any[]): number {
  if (!milestones || milestones.length === 0) return 12

  // Simple calculation - assume 2 weeks per milestone
  return milestones.length * 2
}

function generateSuccessCriteria(milestone: string): string[] {
  const criteria = []

  if (milestone.toLowerCase().includes('planning') || milestone.toLowerCase().includes('discovery')) {
    criteria.push('Requirements documented and approved')
    criteria.push('Project timeline and resources allocated')
    criteria.push('Stakeholder alignment achieved')
  }

  if (milestone.toLowerCase().includes('implementation') || milestone.toLowerCase().includes('setup')) {
    criteria.push('System configured and tested')
    criteria.push('Data migration completed successfully')
    criteria.push('User access and permissions established')
  }

  if (milestone.toLowerCase().includes('training')) {
    criteria.push('Users trained and certified')
    criteria.push('Training materials delivered')
    criteria.push('Support processes documented')
  }

  if (milestone.toLowerCase().includes('go-live') || milestone.toLowerCase().includes('launch')) {
    criteria.push('System operational and stable')
    criteria.push('Users successfully transitioned')
    criteria.push('Performance metrics established')
  }

  return criteria
}

function generateImplementationRisks(): any[] {
  return [
    {
      risk: 'User adoption challenges',
      mitigation: 'Comprehensive training program and change management support',
      impact: 'Medium - could delay realization of benefits'
    },
    {
      risk: 'Technical integration issues',
      mitigation: 'Thorough testing and phased rollout approach',
      impact: 'Low - addressed through detailed planning'
    },
    {
      risk: 'Resource availability constraints',
      mitigation: 'Dedicated project team and clear resource allocation',
      impact: 'Medium - managed through project planning'
    },
    {
      risk: 'Scope creep during implementation',
      mitigation: 'Clear scope definition and change control process',
      impact: 'Low - controlled through governance processes'
    }
  ]
}

function generateBusinessCase(dealRequirements: any, prospectProfile: any): any {
  const { products, services } = dealRequirements
  const totalCost = products.reduce((sum: number, p: any) => sum + p.pricing, 0) +
                   services.reduce((sum: number, s: any) => sum + s.cost, 0)

  return {
    costBenefitAnalysis: {
      costs: {
        software: products.reduce((sum: number, p: any) => sum + p.pricing, 0),
        services: services.reduce((sum: number, s: any) => sum + s.cost, 0),
        implementation: totalCost * 0.1,
        training: totalCost * 0.05
      },
      benefits: {
        efficiency: totalCost * 0.3,
        costSavings: totalCost * 0.25,
        revenueIncrease: totalCost * 0.4,
        riskReduction: totalCost * 0.1
      },
      paybackPeriod: '18 months',
      npv: totalCost * 1.8,
      irr: 0.35
    },
    roiScenarios: generateROIScenarios(totalCost, prospectProfile),
    riskAnalysis: generateRiskAnalysis()
  }
}

function generateROIScenarios(totalCost: number, prospectProfile: any): any[] {
  const { industry, companySize } = prospectProfile

  return [
    {
      scenario: 'Conservative',
      assumptions: [
        '70% adoption of proposed solution',
        'Moderate efficiency improvements',
        'Standard market conditions'
      ],
      projectedReturn: totalCost * 2.2,
      timeframe: '24 months'
    },
    {
      scenario: 'Expected',
      assumptions: [
        '85% adoption of proposed solution',
        'Significant efficiency improvements',
        'Favorable market conditions'
      ],
      projectedReturn: totalCost * 3.0,
      timeframe: '18 months'
    },
    {
      scenario: 'Optimistic',
      assumptions: [
        '95% adoption of proposed solution',
        'Exceptional efficiency improvements',
        'Highly favorable market conditions'
      ],
      projectedReturn: totalCost * 4.0,
      timeframe: '12 months'
    }
  ]
}

function generateRiskAnalysis(): any {
  return {
    implementationRisks: [
      'User adoption may be slower than expected',
      'Technical integration challenges',
      'Resource constraints during implementation'
    ],
    marketRisks: [
      'Economic downturn affecting budget',
      'Competitive response to implementation',
      'Regulatory changes impacting requirements'
    ],
    mitigationStrategies: [
      'Comprehensive change management program',
      'Phased implementation approach',
      'Regular stakeholder communication',
      'Contingency planning and risk monitoring'
    ]
  }
}

function generateCompetitivePositioning(competitiveContext: any): any {
  const { competitors, differentiation, winThemes, objections } = competitiveContext

  return {
    differentiation,
    competitiveAdvantages: differentiation.map((diff: string) => ({
      advantage: diff,
      impact: 'Significant competitive differentiation',
      evidence: 'Based on market analysis and customer feedback'
    })),
    winThemes,
    objectionResponses: objections.reduce((acc: any, objection: string) => {
      acc[objection] = generateObjectionResponse(objection)
      return acc
    }, {})
  }
}

function generateObjectionResponse(objection: string): string {
  const responses: Record<string, string> = {
    'too_expensive': 'While the initial investment may seem significant, the projected ROI of 300% within 18 months, combined with operational efficiencies and cost savings, makes this a highly attractive investment.',
    'complex_implementation': 'Our phased implementation approach, combined with comprehensive training and ongoing support, ensures smooth adoption with minimal disruption to your operations.',
    'not_differentiated': 'Our unique combination of advanced features, seamless integration, and proven results in similar organizations provides clear differentiation from other solutions.',
    'long_timeline': 'Our accelerated implementation methodology and dedicated project team ensure you realize value quickly, with most benefits achieved within the first 90 days.',
    'resource_intensive': 'Our solution is designed for ease of use and requires minimal internal resources, with our team providing comprehensive support throughout the implementation.'
  }

  return responses[objection.toLowerCase().replace(/\s+/g, '_')] ||
         'Thank you for raising this concern. Let me address this by providing specific examples and data points that demonstrate how our solution overcomes this challenge.'
}

function generateStakeholderCustomization(
  prospectProfile: any,
  dealRequirements: any,
  customization: any
): any {
  const { keyContacts } = prospectProfile

  return {
    decisionMakerContent: generateDecisionMakerContent(keyContacts, dealRequirements),
    technicalContent: generateTechnicalContent(dealRequirements),
    endUserContent: generateEndUserContent(dealRequirements)
  }
}

function generateDecisionMakerContent(keyContacts: any[], dealRequirements: any): any {
  const decisionMaker = keyContacts.find((c: any) => c.influence === 'decision_maker')

  return {
    executiveSummary: 'Strategic investment in technology that drives competitive advantage and operational excellence.',
    strategicBenefits: [
      'Enhanced competitive positioning through advanced capabilities',
      'Improved operational efficiency and cost optimization',
      'Scalable platform for future growth and innovation',
      'Data-driven decision making and strategic insights'
    ],
    riskConsiderations: [
      'Minimal implementation risk through proven methodology',
      'Strong ROI potential with conservative estimates',
      'Flexible approach allows for adjustments based on business needs'
    ]
  }
}

function generateTechnicalContent(dealRequirements: any): any {
  const { products, services } = dealRequirements

  return {
    technicalRequirements: [
      'System compatibility assessment completed',
      'Integration capabilities verified',
      'Security and compliance requirements addressed',
      'Scalability and performance specifications met'
    ],
    integrationDetails: [
      'API-based integration with existing systems',
      'Data migration strategy developed',
      'User authentication and access control implemented',
      'Monitoring and maintenance procedures established'
    ],
    securityConsiderations: [
      'Enterprise-grade security protocols implemented',
      'Data encryption and privacy protection ensured',
      'Compliance with industry standards maintained',
      'Regular security audits and updates scheduled'
    ]
  }
}

function generateEndUserContent(dealRequirements: any): any {
  return {
    userBenefits: [
      'Intuitive interface requiring minimal training',
      'Streamlined workflows reducing manual processes',
      'Real-time access to information and insights',
      'Mobile-friendly design for remote work capabilities'
    ],
    trainingRequirements: [
      'Comprehensive online training modules',
      'Hands-on training sessions with expert instructors',
      'On-demand support and documentation resources',
      'Regular refresher training and advanced workshops'
    ],
    adoptionStrategy: [
      'Phased rollout to minimize disruption',
      'Super-user program for peer training and support',
      'Regular feedback sessions and optimization',
      'Celebration of quick wins and success stories'
    ]
  }
}

function generateAppendices(prospectProfile: any, dealRequirements: any, customization: any): any {
  return {
    caseStudies: generateCaseStudies(prospectProfile.industry),
    testimonials: generateTestimonials(prospectProfile.industry),
    technicalSpecifications: generateTechnicalSpecifications(dealRequirements),
    pricingDetails: generatePricingDetails(dealRequirements)
  }
}

function generateCaseStudies(industry: string): any[] {
  const caseStudies = []

  // Industry-specific case studies
  if (industry === 'technology') {
    caseStudies.push({
      company: 'TechCorp Solutions',
      industry: 'Technology',
      challenge: 'Inefficient project management and resource allocation',
      solution: 'Implemented comprehensive project management platform',
      results: [
        '40% improvement in project delivery time',
        '25% reduction in resource allocation costs',
        'Improved team collaboration and communication'
      ]
    })
  }

  if (industry === 'healthcare') {
    caseStudies.push({
      company: 'Metro Health System',
      industry: 'Healthcare',
      challenge: 'Patient data management and compliance requirements',
      solution: 'Deployed integrated healthcare management system',
      results: [
        '100% compliance with regulatory requirements',
        '30% reduction in administrative overhead',
        'Improved patient care coordination'
      ]
    })
  }

  // Generic case study
  caseStudies.push({
    company: 'Global Enterprises Inc.',
    industry: 'Manufacturing',
    challenge: 'Operational inefficiencies and manual processes',
    solution: 'Comprehensive digital transformation initiative',
    results: [
      '35% improvement in operational efficiency',
      '20% cost reduction through process optimization',
      'Enhanced decision-making with real-time insights'
    ]
  })

  return caseStudies
}

function generateTestimonials(industry: string): any[] {
  return [
    {
      customer: 'Sarah Johnson',
      role: 'VP of Operations',
      quote: 'This solution transformed our operations, delivering results beyond our expectations.',
      context: 'Implementation completed 6 months ago'
    },
    {
      customer: 'Michael Chen',
      role: 'IT Director',
      quote: 'The technical implementation was seamless, and the support team was exceptional.',
      context: 'Large-scale enterprise deployment'
    },
    {
      customer: 'Jennifer Williams',
      role: 'CEO',
      quote: 'The ROI has exceeded our projections, and the strategic value is immeasurable.',
      context: '12-month post-implementation review'
    }
  ]
}

function generateTechnicalSpecifications(dealRequirements: any): any {
  const { products, services } = dealRequirements

  return {
    systemRequirements: {
      hardware: 'Standard enterprise server infrastructure',
      software: 'Modern web browsers and standard office applications',
      network: 'High-speed internet connection required',
      security: 'Enterprise-grade encryption and access controls'
    },
    integrationCapabilities: {
      apis: 'RESTful APIs for seamless integration',
      dataFormats: 'JSON, XML, CSV data format support',
      authentication: 'OAuth 2.0, SAML, LDAP integration',
      webhooks: 'Real-time data synchronization capabilities'
    },
    scalability: {
      users: 'Supports 10 to 100,000+ concurrent users',
      dataVolume: 'Handles petabytes of data with auto-scaling',
      performance: 'Sub-second response times under normal load',
      geographic: 'Multi-region deployment capabilities'
    },
    compliance: {
      standards: ['SOC 2 Type II', 'ISO 27001', 'GDPR', 'HIPAA'],
      certifications: 'Regular third-party security audits',
      dataResidency: 'Flexible data residency options',
      backup: 'Automated daily backups with disaster recovery'
    }
  }
}

function generatePricingDetails(dealRequirements: any): any {
  const { products, services } = dealRequirements

  const productTotal = products.reduce((sum: number, p: any) => sum + p.pricing, 0)
  const serviceTotal = services.reduce((sum: number, s: any) => sum + s.cost, 0)

  return {
    breakdown: {
      software: productTotal,
      implementation: serviceTotal,
      training: serviceTotal * 0.1,
      support: (productTotal + serviceTotal) * 0.15
    },
    paymentTerms: [
      '50% upfront payment upon contract signing',
      '25% upon completion of implementation phase',
      '25% upon successful go-live and user acceptance',
      'Net 30 payment terms for all invoices'
    ],
    discounts: {
      earlyPayment: 0.05,
      multiYear: 0.10,
      volume: 0.08
    }
  }
}

function generateNextSteps(prospectProfile: any, dealRequirements: any): any {
  return {
    immediateActions: [
      {
        action: 'Schedule executive briefing session',
        timeline: 'Within 1 week',
        owner: 'Sales Representative',
        purpose: 'Present proposal to key decision makers'
      },
      {
        action: 'Prepare technical demonstration',
        timeline: 'Within 2 weeks',
        owner: 'Solutions Engineer',
        purpose: 'Showcase technical capabilities and integration'
      },
      {
        action: 'Develop detailed implementation plan',
        timeline: 'Within 1 week',
        owner: 'Project Manager',
        purpose: 'Create comprehensive project timeline and resources'
      }
    ],
    decisionProcess: {
      timeline: '4-6 weeks from proposal delivery',
      decisionMakers: prospectProfile.keyContacts
        .filter((c: any) => c.influence === 'decision_maker')
        .map((c: any) => c.name),
      evaluationCriteria: [
        'Technical capabilities and integration',
        'Total cost of ownership and ROI',
        'Implementation timeline and resources required',
        'Vendor reputation and support capabilities',
        'Strategic alignment with business objectives'
      ],
      followUpPlan: [
        'Weekly check-ins with decision makers',
        'Technical deep-dive sessions as requested',
        'Reference calls with existing customers',
        'ROI modeling and scenario planning',
        'Contract negotiation preparation'
      ]
    },
    contingencyPlans: [
      {
        scenario: 'Delayed decision timeline',
        trigger: 'No response within 2 weeks of proposal delivery',
        response: 'Schedule follow-up meeting to address concerns',
        backupPlan: 'Prepare alternative proposal with adjusted scope/timeline'
      },
      {
        scenario: 'Budget concerns raised',
        trigger: 'Objection related to pricing or ROI',
        response: 'Present detailed ROI analysis and payment options',
        backupPlan: 'Offer phased implementation with reduced initial investment'
      },
      {
        scenario: 'Competitive pressure increases',
        trigger: 'Prospect mentions increased competitive interest',
        response: 'Highlight unique differentiators and success stories',
        backupPlan: 'Accelerate timeline and offer additional incentives'
      }
    ]
  }
}