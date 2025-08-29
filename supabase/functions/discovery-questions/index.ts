import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Discovery Questions Edge Function - ProductIntel Pro
 *
 * Generates strategic discovery questions tailored to roles, industries, and buying stages
 * for sales professionals to uncover pain points, needs, and decision drivers effectively.
 *
 * @route POST /functions/v1/discovery-questions
 */

interface DiscoveryQuestionsRequest {
  prospectProfile: {
    name: string;
    role: string;
    industry: string;
    company: string;
    companySize: number;
    buyingStage: 'unaware' | 'aware' | 'interested' | 'evaluating' | 'negotiating';
    currentSolution?: string;
    painPoints?: string[];
    goals?: string[];
    challenges?: string[];
  };
  salesContext: {
    salesPerson: string;
    productCategory: string;
    meetingType: 'discovery' | 'demo' | 'follow_up' | 'negotiation' | 'closing';
    timeAvailable: number; // minutes
    previousConversation?: string;
  };
  questionPreferences: {
    questionCount: number;
    difficulty: 'basic' | 'intermediate' | 'advanced';
    focus: 'pain_points' | 'goals' | 'budget' | 'timeline' | 'decision_process' | 'competition';
    includeFollowUps: boolean;
  };
}

interface DiscoveryQuestionSet {
  prospectId: string;
  questionSet: {
    executiveSummary: string;
    strategicApproach: string;
    questionSequence: Array<{
      order: number;
      question: string;
      category: string;
      purpose: string;
      expectedInsight: string;
      followUpQuestions: string[];
      objectionHandling: string;
      timing: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    conversationFlow: {
      opening: string;
      transitionPoints: string[];
      closingQuestions: string[];
      backupQuestions: string[];
    };
    successMetrics: {
      keyInsights: string[];
      qualificationCriteria: string[];
      nextSteps: string[];
    };
  };
  contextualIntelligence: {
    industryInsights: string[];
    roleSpecificConsiderations: string[];
    competitivePositioning: string[];
    timingConsiderations: string[];
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

    const requestData: DiscoveryQuestionsRequest = await req.json()

    if (!requestData.prospectProfile || !requestData.salesContext) {
      return new Response(
        JSON.stringify({ error: 'Prospect profile and sales context are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate strategic discovery questions
    const questionSet = await generateDiscoveryQuestions(requestData)

    // Log the question generation
    await supabaseClient
      .from('ai_usage_logs')
      .insert({
        user_id: user.user.id,
        feature_used: 'discovery-questions',
        model_id: 'discovery-ai',
        tokens_used: JSON.stringify(questionSet).length,
        success: true
      })

    return new Response(
      JSON.stringify({ questionSet }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Discovery questions error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error during discovery questions generation'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function generateDiscoveryQuestions(request: DiscoveryQuestionsRequest): Promise<DiscoveryQuestionSet> {
  const { prospectProfile, salesContext, questionPreferences } = request

  // Analyze prospect profile and context
  const profileAnalysis = analyzeProspectProfile(prospectProfile)
  const contextAnalysis = analyzeSalesContext(salesContext)
  const strategicApproach = determineStrategicApproach(profileAnalysis, contextAnalysis, questionPreferences)

  // Generate question sequence
  const questionSequence = generateQuestionSequence(
    profileAnalysis,
    contextAnalysis,
    strategicApproach,
    questionPreferences
  )

  // Create conversation flow
  const conversationFlow = createConversationFlow(
    questionSequence,
    contextAnalysis,
    strategicApproach
  )

  return {
    prospectId: `${prospectProfile.name}_${prospectProfile.company}`.toLowerCase().replace(/\s+/g, '_'),
    questionSet: {
      executiveSummary: generateExecutiveSummary(profileAnalysis, strategicApproach),
      strategicApproach: strategicApproach.approach,
      questionSequence,
      conversationFlow,
      successMetrics: generateSuccessMetrics(profileAnalysis, strategicApproach)
    },
    contextualIntelligence: {
      industryInsights: generateIndustryInsights(prospectProfile),
      roleSpecificConsiderations: generateRoleConsiderations(prospectProfile),
      competitivePositioning: generateCompetitivePositioning(prospectProfile, salesContext),
      timingConsiderations: generateTimingConsiderations(prospectProfile, salesContext)
    }
  }
}

function analyzeProspectProfile(prospectProfile: any): any {
  const analysis = {
    personaType: determinePersonaType(prospectProfile),
    buyingStage: prospectProfile.buyingStage,
    decisionStyle: determineDecisionStyle(prospectProfile),
    painPointCategories: categorizePainPoints(prospectProfile.painPoints || []),
    goalAlignment: assessGoalAlignment(prospectProfile.goals || []),
    industryContext: analyzeIndustryContext(prospectProfile.industry),
    companyMaturity: assessCompanyMaturity(prospectProfile.companySize),
    currentSolution: analyzeCurrentSolution(prospectProfile.currentSolution),
    riskFactors: identifyRiskFactors(prospectProfile),
    opportunityIndicators: identifyOpportunityIndicators(prospectProfile)
  }

  return analysis
}

function determinePersonaType(prospectProfile: any): string {
  const { role, industry, companySize } = prospectProfile

  // Executive personas
  if (role?.toLowerCase().includes('ceo') || role?.toLowerCase().includes('founder')) {
    return 'Visionary Executive'
  }
  if (role?.toLowerCase().includes('cfo') || role?.toLowerCase().includes('vp finance')) {
    return 'Financial Decision Maker'
  }
  if (role?.toLowerCase().includes('cto') || role?.toLowerCase().includes('vp engineering')) {
    return 'Technical Architect'
  }

  // Operational personas
  if (role?.toLowerCase().includes('sales') || role?.toLowerCase().includes('business development')) {
    return 'Revenue Operations'
  }
  if (role?.toLowerCase().includes('marketing') || role?.toLowerCase().includes('growth')) {
    return 'Growth Strategist'
  }
  if (role?.toLowerCase().includes('operations') || role?.toLowerCase().includes('project manager')) {
    return 'Operations Manager'
  }

  // Specialized personas
  if (role?.toLowerCase().includes('hr') || role?.toLowerCase().includes('talent')) {
    return 'People Operations'
  }
  if (role?.toLowerCase().includes('customer') || role?.toLowerCase().includes('success')) {
    return 'Customer Advocate'
  }

  return 'General Professional'
}

function determineDecisionStyle(prospectProfile: any): string {
  const { role, industry, companySize } = prospectProfile

  // Analytical decision makers
  if (role?.toLowerCase().includes('cfo') || role?.toLowerCase().includes('finance')) {
    return 'data_driven'
  }
  if (role?.toLowerCase().includes('cto') || role?.toLowerCase().includes('engineering')) {
    return 'technical_evaluation'
  }

  // Relationship-driven decision makers
  if (role?.toLowerCase().includes('ceo') || role?.toLowerCase().includes('founder')) {
    return 'strategic_relationship'
  }
  if (role?.toLowerCase().includes('sales') || role?.toLowerCase().includes('business development')) {
    return 'peer_influence'
  }

  // Consensus-driven
  if (companySize > 1000) {
    return 'committee_consensus'
  }

  return 'balanced_approach'
}

function categorizePainPoints(painPoints: string[]): string[] {
  const categories = []

  painPoints.forEach(pain => {
    const painLower = pain.toLowerCase()

    if (painLower.includes('cost') || painLower.includes('budget') || painLower.includes('expensive')) {
      categories.push('cost_optimization')
    }
    if (painLower.includes('efficiency') || painLower.includes('productivity') || painLower.includes('time')) {
      categories.push('operational_efficiency')
    }
    if (painLower.includes('growth') || painLower.includes('scale') || painLower.includes('expansion')) {
      categories.push('business_growth')
    }
    if (painLower.includes('integration') || painLower.includes('connect') || painLower.includes('system')) {
      categories.push('system_integration')
    }
    if (painLower.includes('compliance') || painLower.includes('security') || painLower.includes('risk')) {
      categories.push('compliance_security')
    }
    if (painLower.includes('user') || painLower.includes('customer') || painLower.includes('experience')) {
      categories.push('customer_experience')
    }
  })

  return [...new Set(categories)]
}

function assessGoalAlignment(goals: string[]): any {
  const alignment = {
    primaryGoals: [],
    secondaryGoals: [],
    conflictingGoals: [],
    measurementCriteria: []
  }

  goals.forEach(goal => {
    const goalLower = goal.toLowerCase()

    if (goalLower.includes('increase') || goalLower.includes('grow') || goalLower.includes('expand')) {
      alignment.primaryGoals.push('business_growth')
    }
    if (goalLower.includes('reduce') || goalLower.includes('cut') || goalLower.includes('save')) {
      alignment.primaryGoals.push('cost_reduction')
    }
    if (goalLower.includes('improve') || goalLower.includes('enhance') || goalLower.includes('better')) {
      alignment.primaryGoals.push('performance_improvement')
    }
    if (goalLower.includes('integrate') || goalLower.includes('connect') || goalLower.includes('unify')) {
      alignment.secondaryGoals.push('system_integration')
    }
  })

  return alignment
}

function analyzeIndustryContext(industry: string): any {
  const industryContexts: Record<string, any> = {
    'technology': {
      trends: ['digital_transformation', 'ai_adoption', 'cloud_migration'],
      challenges: ['talent_shortage', 'rapid_innovation', 'security_threats'],
      opportunities: ['market_expansion', 'product_innovation', 'strategic_partnerships']
    },
    'healthcare': {
      trends: ['digital_health', 'telemedicine', 'data_analytics'],
      challenges: ['regulatory_compliance', 'patient_privacy', 'interoperability'],
      opportunities: ['preventive_care', 'personalized_medicine', 'operational_efficiency']
    },
    'finance': {
      trends: ['fintech_innovation', 'regulatory_tech', 'digital_banking'],
      challenges: ['cybersecurity', 'regulatory_compliance', 'customer_trust'],
      opportunities: ['financial_inclusion', 'automated_compliance', 'customer_insights']
    },
    'retail': {
      trends: ['ecommerce_growth', 'omnichannel_experience', 'personalization'],
      challenges: ['supply_chain_disruption', 'customer_expectations', 'competition'],
      opportunities: ['customer_loyalty', 'inventory_optimization', 'market_expansion']
    },
    'manufacturing': {
      trends: ['industry_4_0', 'smart_factories', 'supply_chain_digitalization'],
      challenges: ['legacy_systems', 'skilled_labor', 'global_competition'],
      opportunities: ['operational_excellence', 'predictive_maintenance', 'sustainable_practices']
    }
  }

  return industryContexts[industry?.toLowerCase()] || {
    trends: ['digital_transformation'],
    challenges: ['operational_efficiency'],
    opportunities: ['business_growth']
  }
}

function assessCompanyMaturity(companySize: number): string {
  if (companySize < 10) return 'startup'
  if (companySize < 50) return 'small_business'
  if (companySize < 200) return 'mid_market'
  if (companySize < 1000) return 'large_enterprise'
  return 'enterprise'
}

function analyzeCurrentSolution(currentSolution?: string): any {
  if (!currentSolution) {
    return { hasSolution: false, satisfaction: 'unknown', limitations: [] }
  }

  const analysis = {
    hasSolution: true,
    solutionType: 'unknown',
    satisfaction: 'neutral',
    limitations: [],
    migrationConsiderations: []
  }

  const solutionLower = currentSolution.toLowerCase()

  // Identify solution type
  if (solutionLower.includes('homegrown') || solutionLower.includes('custom') || solutionLower.includes('built in-house')) {
    analysis.solutionType = 'homegrown'
    analysis.limitations = ['scalability', 'maintenance_cost', 'feature_gaps']
    analysis.migrationConsiderations = ['data_migration', 'user_training', 'integration_complexity']
  } else if (solutionLower.includes('legacy') || solutionLower.includes('outdated')) {
    analysis.solutionType = 'legacy'
    analysis.limitations = ['modern_features', 'mobile_access', 'integration_capabilities']
    analysis.migrationConsiderations = ['change_management', 'user_adoption', 'process_reengineering']
  } else {
    analysis.solutionType = 'commercial'
    analysis.limitations = ['cost', 'customization', 'vendor_lock_in']
    analysis.migrationConsiderations = ['contract_terms', 'data_portability', 'feature_parity']
  }

  return analysis
}

function identifyRiskFactors(prospectProfile: any): string[] {
  const risks = []

  // Company size risks
  if (prospectProfile.companySize < 10) {
    risks.push('limited_budget', 'resource_constraints')
  }
  if (prospectProfile.companySize > 1000) {
    risks.push('complex_decision_process', 'long_sales_cycles')
  }

  // Role-based risks
  if (prospectProfile.role?.toLowerCase().includes('interim') || prospectProfile.role?.toLowerCase().includes('acting')) {
    risks.push('temporary_role', 'limited_decision_authority')
  }

  // Industry risks
  if (prospectProfile.industry === 'healthcare' || prospectProfile.industry === 'finance') {
    risks.push('regulatory_complexity', 'compliance_requirements')
  }

  return risks
}

function identifyOpportunityIndicators(prospectProfile: any): string[] {
  const opportunities = []

  // Growth indicators
  if (prospectProfile.companySize > 100 && prospectProfile.companySize < 500) {
    opportunities.push('scaling_needs', 'process_maturation')
  }

  // Industry opportunities
  if (prospectProfile.industry === 'technology') {
    opportunities.push('innovation_investment', 'digital_transformation')
  }

  // Role opportunities
  if (prospectProfile.role?.toLowerCase().includes('growth') || prospectProfile.role?.toLowerCase().includes('expansion')) {
    opportunities.push('strategic_initiative', 'budget_allocation')
  }

  return opportunities
}

function analyzeSalesContext(salesContext: any): any {
  const analysis = {
    meetingType: salesContext.meetingType,
    timeAvailable: salesContext.timeAvailable,
    productCategory: salesContext.productCategory,
    conversationContext: analyzePreviousConversation(salesContext.previousConversation),
    urgencyLevel: determineUrgencyLevel(salesContext),
    stakeholderAlignment: assessStakeholderAlignment(salesContext)
  }

  return analysis
}

function analyzePreviousConversation(previousConversation?: string): any {
  if (!previousConversation) {
    return { hasContext: false, keyTopics: [], concernsRaised: [], positiveSignals: [] }
  }

  // Simple analysis - in production, this would use NLP
  const context = {
    hasContext: true,
    keyTopics: [],
    concernsRaised: [],
    positiveSignals: [],
    followUpItems: []
  }

  const conversationLower = previousConversation.toLowerCase()

  if (conversationLower.includes('budget') || conversationLower.includes('cost')) {
    context.keyTopics.push('budget_discussion')
  }
  if (conversationLower.includes('timeline') || conversationLower.includes('when')) {
    context.keyTopics.push('timeline_discussion')
  }
  if (conversationLower.includes('competitor') || conversationLower.includes('alternative')) {
    context.keyTopics.push('competitive_discussion')
  }

  return context
}

function determineUrgencyLevel(salesContext: any): string {
  const { meetingType, timeAvailable } = salesContext

  if (meetingType === 'closing' || meetingType === 'negotiation') {
    return 'high'
  }
  if (meetingType === 'follow_up' && timeAvailable < 30) {
    return 'high'
  }
  if (meetingType === 'discovery' && timeAvailable > 60) {
    return 'medium'
  }

  return 'medium'
}

function assessStakeholderAlignment(salesContext: any): string {
  // This would be more sophisticated in production
  return 'primary_decision_maker'
}

function determineStrategicApproach(profileAnalysis: any, contextAnalysis: any, questionPreferences: any): any {
  const approach = {
    approach: '',
    questionStrategy: '',
    focusAreas: [],
    conversationStyle: '',
    riskMitigation: []
  }

  const { personaType, buyingStage, decisionStyle } = profileAnalysis
  const { meetingType, urgencyLevel } = contextAnalysis

  // Determine approach based on buying stage
  switch (buyingStage) {
    case 'unaware':
      approach.approach = 'Education-focused discovery to build awareness'
      approach.questionStrategy = 'Problem identification and awareness building'
      approach.focusAreas = ['pain_points', 'current_challenges', 'goals']
      approach.conversationStyle = 'consultative'
      break

    case 'aware':
      approach.approach = 'Solution exploration and qualification'
      approach.questionStrategy = 'Need validation and solution alignment'
      approach.focusAreas = ['requirements', 'current_solution', 'decision_criteria']
      approach.conversationStyle = 'collaborative'
      break

    case 'interested':
      approach.approach = 'Detailed requirements gathering and differentiation'
      approach.questionStrategy = 'Capability demonstration and competitive positioning'
      approach.focusAreas = ['technical_requirements', 'business_case', 'timeline']
      approach.conversationStyle = 'demonstration'
      break

    case 'evaluating':
      approach.approach = 'Decision acceleration and objection handling'
      approach.questionStrategy = 'Risk mitigation and commitment building'
      approach.focusAreas = ['decision_process', 'concerns', 'next_steps']
      approach.conversationStyle = 'closing'
      break

    case 'negotiating':
      approach.approach = 'Final qualification and commitment confirmation'
      approach.questionStrategy = 'Final concerns resolution and commitment validation'
      approach.focusAreas = ['final_requirements', 'stakeholder_buy_in', 'implementation']
      approach.conversationStyle = 'negotiation'
      break

    default:
      approach.approach = 'Comprehensive discovery and qualification'
      approach.questionStrategy = 'Balanced exploration of needs and capabilities'
      approach.focusAreas = ['pain_points', 'goals', 'current_solution', 'requirements']
      approach.conversationStyle = 'consultative'
  }

  // Adjust for persona type
  if (personaType.includes('Executive')) {
    approach.focusAreas.unshift('strategic_impact', 'roi')
    approach.conversationStyle = 'strategic'
  }
  if (personaType.includes('Technical')) {
    approach.focusAreas.unshift('technical_requirements', 'integration')
    approach.conversationStyle = 'technical'
  }

  // Adjust for urgency
  if (urgencyLevel === 'high') {
    approach.questionStrategy += ' with accelerated timeline'
    approach.riskMitigation.push('time_sensitivity')
  }

  return approach
}

function generateQuestionSequence(
  profileAnalysis: any,
  contextAnalysis: any,
  strategicApproach: any,
  questionPreferences: any
): any[] {
  const sequence = []
  const { questionCount, difficulty, focus, includeFollowUps } = questionPreferences
  const { focusAreas } = strategicApproach

  let questionOrder = 1

  // Opening questions (10-20% of questions)
  const openingQuestions = generateOpeningQuestions(profileAnalysis, contextAnalysis)
  const openingCount = Math.max(1, Math.floor(questionCount * 0.15))

  openingQuestions.slice(0, openingCount).forEach(q => {
    sequence.push({
      order: questionOrder++,
      question: q.question,
      category: q.category,
      purpose: q.purpose,
      expectedInsight: q.expectedInsight,
      followUpQuestions: includeFollowUps ? q.followUpQuestions : [],
      objectionHandling: q.objectionHandling,
      timing: 'opening',
      priority: q.priority
    })
  })

  // Core discovery questions (60-70% of questions)
  const coreQuestions = generateCoreQuestions(profileAnalysis, focusAreas, difficulty)
  const coreCount = Math.floor(questionCount * 0.65)

  coreQuestions.slice(0, coreCount).forEach(q => {
    sequence.push({
      order: questionOrder++,
      question: q.question,
      category: q.category,
      purpose: q.purpose,
      expectedInsight: q.expectedInsight,
      followUpQuestions: includeFollowUps ? q.followUpQuestions : [],
      objectionHandling: q.objectionHandling,
      timing: 'core',
      priority: q.priority
    })
  })

  // Closing questions (15-25% of questions)
  const closingQuestions = generateClosingQuestions(profileAnalysis, contextAnalysis)
  const closingCount = questionCount - sequence.length

  closingQuestions.slice(0, closingCount).forEach(q => {
    sequence.push({
      order: questionOrder++,
      question: q.question,
      category: q.category,
      purpose: q.purpose,
      expectedInsight: q.expectedInsight,
      followUpQuestions: includeFollowUps ? q.followUpQuestions : [],
      objectionHandling: q.objectionHandling,
      timing: 'closing',
      priority: q.priority
    })
  })

  return sequence
}

function generateOpeningQuestions(profileAnalysis: any, contextAnalysis: any): any[] {
  const questions = []

  questions.push({
    question: `Thanks for taking the time to speak with me today, ${profileAnalysis.prospectName || 'prospect'}. To make sure I understand your role and how I can best help, could you tell me a bit about what you're responsible for at ${profileAnalysis.company}?`,
    category: 'role_clarification',
    purpose: 'Establish context and build rapport',
    expectedInsight: 'Role responsibilities, scope of influence, key priorities',
    followUpQuestions: [
      'How long have you been in this role?',
      'What are your main objectives for this year?'
    ],
    objectionHandling: 'If they seem rushed: "I appreciate your time is valuable - I\'ll be efficient"',
    priority: 'high'
  })

  if (contextAnalysis.meetingType === 'discovery') {
    questions.push({
      question: 'I\'d love to understand what prompted you to explore solutions in this area. What specific challenges or opportunities are you looking to address?',
      category: 'trigger_identification',
      purpose: 'Understand the motivation for the conversation',
      expectedInsight: 'Current pain points, trigger events, urgency level',
      followUpQuestions: [
        'When did you first start thinking about this?',
        'What\'s the impact of not addressing this?'
      ],
      objectionHandling: 'If vague: "Could you give me a specific example of how this affects your day-to-day work?"',
      priority: 'high'
    })
  }

  return questions
}

function generateCoreQuestions(profileAnalysis: any, focusAreas: string[], difficulty: string): any[] {
  const questions = []

  focusAreas.forEach(area => {
    switch (area) {
      case 'pain_points':
        questions.push(...generatePainPointQuestions(profileAnalysis, difficulty))
        break
      case 'goals':
        questions.push(...generateGoalQuestions(profileAnalysis, difficulty))
        break
      case 'current_solution':
        questions.push(...generateCurrentSolutionQuestions(profileAnalysis, difficulty))
        break
      case 'requirements':
        questions.push(...generateRequirementQuestions(profileAnalysis, difficulty))
        break
      case 'budget':
        questions.push(...generateBudgetQuestions(profileAnalysis, difficulty))
        break
      case 'timeline':
        questions.push(...generateTimelineQuestions(profileAnalysis, difficulty))
        break
      case 'decision_process':
        questions.push(...generateDecisionProcessQuestions(profileAnalysis, difficulty))
        break
    }
  })

  return questions
}

function generatePainPointQuestions(profileAnalysis: any, difficulty: string): any[] {
  const questions = []
  const { personaType, industryContext } = profileAnalysis

  if (difficulty === 'basic') {
    questions.push({
      question: 'What are the biggest challenges you\'re facing in your current processes?',
      category: 'pain_identification',
      purpose: 'Uncover specific pain points and frustrations',
      expectedInsight: 'Current challenges, process inefficiencies, user complaints',
      followUpQuestions: [
        'How long have you been dealing with this?',
        'What\'s the impact on your team\'s productivity?'
      ],
      objectionHandling: 'If they say "everything is fine": "I understand - many organizations I work with initially say that, but when we dig deeper we often find opportunities for improvement"',
      priority: 'high'
    })
  }

  if (difficulty === 'intermediate' || difficulty === 'advanced') {
    questions.push({
      question: 'Can you walk me through a recent situation where your current approach didn\'t meet expectations? What happened and what was the outcome?',
      category: 'pain_amplification',
      purpose: 'Get specific examples and quantify the impact',
      expectedInsight: 'Specific incidents, measurable impacts, emotional context',
      followUpQuestions: [
        'What was the cost of that situation?',
        'How often does this happen?',
        'Who else was affected?'
      ],
      objectionHandling: 'If hesitant: "I understand this might be sensitive - feel free to share at the level you\'re comfortable with"',
      priority: 'high'
    })
  }

  if (difficulty === 'advanced' && personaType.includes('Executive')) {
    questions.push({
      question: 'From a strategic perspective, what keeps you up at night regarding your operational efficiency and customer experience?',
      category: 'strategic_pain',
      purpose: 'Uncover executive-level concerns and strategic implications',
      expectedInsight: 'Strategic risks, competitive threats, long-term implications',
      followUpQuestions: [
        'How does this affect your growth objectives?',
        'What\'s the potential market impact?'
      ],
      objectionHandling: 'Position as strategic discussion: "I work with many executives on these strategic challenges"',
      priority: 'medium'
    })
  }

  return questions
}

function generateGoalQuestions(profileAnalysis: any, difficulty: string): any[] {
  const questions = []

  questions.push({
    question: 'If we could wave a magic wand and solve one problem for you, what would that be and why is it important?',
    category: 'ideal_outcome',
    purpose: 'Understand desired outcomes and priorities',
    expectedInsight: 'Primary objectives, success criteria, motivation level',
    followUpQuestions: [
      'What would be different if this problem was solved?',
      'How would you measure success?'
    ],
    objectionHandling: 'If they struggle: "Think about the one thing that would make your job significantly easier"',
    priority: 'high'
  })

  if (difficulty === 'intermediate' || difficulty === 'advanced') {
    questions.push({
      question: 'Looking 12-18 months out, what does success look like for you and your team in this area?',
      category: 'future_vision',
      purpose: 'Understand long-term vision and strategic objectives',
      expectedInsight: 'Future goals, growth objectives, strategic priorities',
      followUpQuestions: [
        'What metrics will you use to measure that success?',
        'What obstacles do you anticipate?'
      ],
      objectionHandling: 'If too far out: "Even 6 months from now - what would you like to have achieved?"',
      priority: 'medium'
    })
  }

  return questions
}

function generateCurrentSolutionQuestions(profileAnalysis: any, difficulty: string): any[] {
  const questions = []
  const { currentSolution } = profileAnalysis

  if (currentSolution?.hasSolution) {
    questions.push({
      question: 'Can you tell me about your current approach to handling this? What works well and what doesn\'t?',
      category: 'current_state',
      purpose: 'Understand existing processes and satisfaction level',
      expectedInsight: 'Current capabilities, satisfaction level, workarounds',
      followUpQuestions: [
        'What do you like about your current approach?',
        'What frustrates you about it?'
      ],
      objectionHandling: 'If they say it\'s perfect: "That\'s great to hear - what made you decide to explore other options?"',
      priority: 'high'
    })

    if (difficulty === 'intermediate' || difficulty === 'advanced') {
      questions.push({
        question: 'What would need to happen for you to consider changing your current approach?',
        category: 'change_triggers',
        purpose: 'Identify conditions for change and decision criteria',
        expectedInsight: 'Switching costs, decision triggers, risk tolerance',
        followUpQuestions: [
          'What would the ideal solution look like?',
          'What concerns do you have about making a change?'
        ],
        objectionHandling: 'Frame as exploration: "I\'m not suggesting you need to change - just trying to understand your criteria"',
        priority: 'medium'
      })
    }
  } else {
    questions.push({
      question: 'How are you currently handling this area without a dedicated solution?',
      category: 'workaround_identification',
      purpose: 'Understand manual processes and pain points',
      expectedInsight: 'Manual processes, efficiency issues, scalability concerns',
      followUpQuestions: [
        'How much time does this take?',
        'What\'s the biggest challenge with this approach?'
      ],
      objectionHandling: 'If they say it\'s working: "Many organizations I work with initially say that, but when we look closer we find opportunities to improve efficiency"',
      priority: 'high'
    })
  }

  return questions
}

function generateRequirementQuestions(profileAnalysis: any, difficulty: string): any[] {
  const questions = []

  questions.push({
    question: 'What are the must-have capabilities that any solution would need to have?',
    category: 'requirements_gathering',
    purpose: 'Identify critical requirements and deal-breakers',
    expectedInsight: 'Essential features, integration needs, compliance requirements',
    followUpQuestions: [
      'What happens if a solution doesn\'t have this?',
      'How important is this compared to other needs?'
    ],
    objectionHandling: 'If they list many: "Let\'s prioritize - if you could only have 3 things, what would they be?"',
    priority: 'high'
  })

  if (difficulty === 'intermediate' || difficulty === 'advanced') {
    questions.push({
      question: 'How does this solution need to integrate with your existing systems and processes?',
      category: 'integration_requirements',
      purpose: 'Understand technical and process integration needs',
      expectedInsight: 'Technical stack, data flows, process dependencies',
      followUpQuestions: [
        'What systems does it need to connect with?',
        'How critical is real-time integration?'
      ],
      objectionHandling: 'If they don\'t know: "That\'s common - we can explore this together as we learn more about your needs"',
      priority: 'medium'
    })
  }

  return questions
}

function generateBudgetQuestions(profileAnalysis: any, difficulty: string): any[] {
  const questions = []

  if (difficulty === 'basic') {
    questions.push({
      question: 'Have you allocated budget for a solution in this area, or would this need to be approved?',
      category: 'budget_availability',
      purpose: 'Understand budget status and approval process',
      expectedInsight: 'Budget availability, approval requirements, timeline implications',
      followUpQuestions: [
        'What\'s the approval process like?',
        'When would you need to have budget approved by?'
      ],
      objectionHandling: 'If no budget: "Many organizations allocate budget as they find the right solution - what would help make the case for investment?"',
      priority: 'medium'
    })
  }

  if (difficulty === 'intermediate' || difficulty === 'advanced') {
    questions.push({
      question: 'What\'s your expected return on investment timeframe for a solution like this?',
      category: 'roi_expectations',
      purpose: 'Understand value expectations and justification needs',
      expectedInsight: 'ROI expectations, business case requirements, measurement approach',
      followUpQuestions: [
        'How do you typically measure ROI for technology investments?',
        'What would constitute a successful outcome?'
      ],
      objectionHandling: 'Frame as planning: "This helps me understand how to position the value proposition effectively"',
      priority: 'medium'
    })
  }

  return questions
}

function generateTimelineQuestions(profileAnalysis: any, difficulty: string): any[] {
  const questions = []

  questions.push({
    question: 'What\'s your timeline for implementing a solution in this area?',
    category: 'timeline_understanding',
    purpose: 'Understand urgency and decision timeframe',
    expectedInsight: 'Decision timeline, urgency level, competing priorities',
    followUpQuestions: [
      'What factors influence that timeline?',
      'What happens if you delay the decision?'
    ],
    objectionHandling: 'If they say "no rush": "I understand - what would need to happen to accelerate the timeline?"',
    priority: 'high'
  })

  if (difficulty === 'intermediate' || difficulty === 'advanced') {
    questions.push({
      question: 'What are the key milestones or events that could influence your decision timeline?',
      category: 'timeline_drivers',
      purpose: 'Identify external factors affecting decision timing',
      expectedInsight: 'Trigger events, dependencies, risk factors',
      followUpQuestions: [
        'How might these events change your requirements?',
        'What would you need to know before these milestones?'
      ],
      objectionHandling: 'Position as planning: "This helps me understand how to best support your process"',
      priority: 'medium'
    })
  }

  return questions
}

function generateDecisionProcessQuestions(profileAnalysis: any, difficulty: string): any[] {
  const questions = []

  questions.push({
    question: 'Who else will be involved in evaluating and deciding on a solution?',
    category: 'stakeholder_identification',
    purpose: 'Understand decision-making team and process',
    expectedInsight: 'Key stakeholders, decision criteria, influence levels',
    followUpQuestions: [
      'What will each person be looking for?',
      'How do you typically make decisions like this?'
    ],
    objectionHandling: 'If they say "just me": "That\'s helpful to know - are there others who should be kept informed?"',
    priority: 'high'
  })

  if (difficulty === 'intermediate' || difficulty === 'advanced') {
    questions.push({
      question: 'What criteria will you use to evaluate different options?',
      category: 'evaluation_criteria',
      purpose: 'Understand decision framework and priorities',
      expectedInsight: 'Decision criteria, weighting factors, evaluation process',
      followUpQuestions: [
        'How do you weight these different criteria?',
        'What would be a deal-breaker?'
      ],
      objectionHandling: 'If they don\'t have criteria: "That\'s common - we can develop evaluation criteria together"',
      priority: 'medium'
    })
  }

  return questions
}

function generateClosingQuestions(profileAnalysis: any, contextAnalysis: any): any[] {
  const questions = []

  questions.push({
    question: 'Based on what we\'ve discussed, what would be the most valuable next step for you?',
    category: 'next_step_identification',
    purpose: 'Understand prospect\'s desired next action and commitment level',
    expectedInsight: 'Interest level, decision readiness, appropriate next step',
    followUpQuestions: [
      'When would be a good time to follow up?',
      'What information would help you decide?'
    ],
    objectionHandling: 'If they say "nothing": "I understand you might need time to process - what questions can I answer now?"',
    priority: 'high'
  })

  if (contextAnalysis.timeAvailable > 45) {
    questions.push({
      question: 'Is there anything else you\'d like to explore or any concerns you have that we haven\'t addressed?',
      category: 'concern_identification',
      purpose: 'Uncover remaining objections or concerns',
      expectedInsight: 'Hidden objections, unanswered questions, confidence level',
      followUpQuestions: [
        'What would need to be true for you to move forward?',
        'What\'s your biggest remaining concern?'
      ],
      objectionHandling: 'This is designed to surface concerns, so handle them as they arise',
      priority: 'medium'
    })
  }

  return questions
}

function createConversationFlow(questionSequence: any[], contextAnalysis: any, strategicApproach: any): any {
  const flow = {
    opening: generateOpeningStatement(strategicApproach, contextAnalysis),
    transitionPoints: generateTransitionPoints(questionSequence),
    closingQuestions: extractClosingQuestions(questionSequence),
    backupQuestions: generateBackupQuestions(strategicApproach)
  }

  return flow
}

function generateOpeningStatement(strategicApproach: any, contextAnalysis: any): string {
  const { meetingType } = contextAnalysis

  switch (meetingType) {
    case 'discovery':
      return 'Thank you for taking the time to meet with me today. I\'d like to understand your current situation and goals so I can determine if and how we might be able to help.'
    case 'demo':
      return 'Thanks for joining today\'s demo. Before we dive in, I\'d like to make sure I understand your specific needs and how you\'re currently handling this area.'
    case 'follow_up':
      return 'Thank you for following up. I\'d like to check in on how things are progressing and see if there are any new developments or questions that have come up.'
    case 'negotiation':
      return 'Thank you for continuing the conversation. I\'d like to understand any remaining concerns or requirements that we need to address.'
    default:
      return 'Thank you for your time today. I\'d like to understand your situation and how we might be able to help.'
  }
}

function generateTransitionPoints(questionSequence: any[]): string[] {
  const transitions = []

  // Group questions by category and create smooth transitions
  const categories = [...new Set(questionSequence.map(q => q.category))]

  categories.forEach(category => {
    const categoryQuestions = questionSequence.filter(q => q.category === category)
    if (categoryQuestions.length > 1) {
      transitions.push(`Now that we've discussed ${category.replace('_', ' ')}, let me ask you about...`)
    }
  })

  return transitions
}

function extractClosingQuestions(questionSequence: any[]): string[] {
  return questionSequence
    .filter(q => q.timing === 'closing')
    .map(q => q.question)
}

function generateBackupQuestions(strategicApproach: any): string[] {
  const backups = []

  // Generate alternative questions for each focus area
  strategicApproach.focusAreas.forEach((area: string) => {
    switch (area) {
      case 'pain_points':
        backups.push('What challenges are you hoping to overcome?')
        backups.push('What\'s not working as well as you\'d like?')
        break
      case 'goals':
        backups.push('What are you trying to achieve?')
        backups.push('What would success look like for you?')
        break
      case 'budget':
        backups.push('What\'s your budget range for this?')
        backups.push('How are you thinking about the investment?')
        break
    }
  })

  return backups
}

function generateExecutiveSummary(profileAnalysis: any, strategicApproach: any): string {
  const { personaType, buyingStage, companyMaturity } = profileAnalysis

  return `${personaType} at ${companyMaturity} company currently in ${buyingStage} stage. ${strategicApproach.approach}. Focus on ${strategicApproach.focusAreas.join(', ')} to ${strategicApproach.questionStrategy.toLowerCase()}.`
}

function generateSuccessMetrics(profileAnalysis: any, strategicApproach: any): any {
  const metrics = {
    keyInsights: [],
    qualificationCriteria: [],
    nextSteps: []
  }

  // Generate metrics based on strategic approach
  strategicApproach.focusAreas.forEach((area: string) => {
    switch (area) {
      case 'pain_points':
        metrics.keyInsights.push('Clear understanding of current challenges and their impact')
        metrics.qualificationCriteria.push('Pain points are specific and measurable')
        break
      case 'goals':
        metrics.keyInsights.push('Defined objectives and success criteria')
        metrics.qualificationCriteria.push('Goals align with offered capabilities')
        break
      case 'budget':
        metrics.keyInsights.push('Budget availability and approval process')
        metrics.qualificationCriteria.push('Budget aligns with solution pricing')
        break
    }
  })

  metrics.nextSteps = [
    'Schedule follow-up meeting with additional stakeholders',
    'Prepare customized proposal based on requirements',
    'Share relevant case studies and ROI examples',
    'Address any outstanding concerns or objections'
  ]

  return metrics
}

function generateIndustryInsights(prospectProfile: any): string[] {
  const { industry } = prospectProfile
  const insights = []

  // Industry-specific insights that could inform questions
  if (industry === 'technology') {
    insights.push('Technology companies often prioritize innovation and competitive differentiation')
    insights.push('Integration with existing tech stack is typically a critical requirement')
    insights.push('ROI measurement and scalability are key decision drivers')
  }

  if (industry === 'healthcare') {
    insights.push('Compliance and patient privacy are paramount concerns')
    insights.push('Integration with existing healthcare systems (EHR, etc.) is essential')
    insights.push('Change management and user training are significant considerations')
  }

  if (industry === 'finance') {
    insights.push('Security and regulatory compliance are critical requirements')
    insights.push('Risk management and audit capabilities are highly valued')
    insights.push('Integration with existing financial systems is mandatory')
  }

  return insights
}

function generateRoleConsiderations(prospectProfile: any): string[] {
  const { role } = prospectProfile
  const considerations = []

  if (role?.toLowerCase().includes('ceo') || role?.toLowerCase().includes('founder')) {
    considerations.push('Focus on strategic impact and business outcomes')
    considerations.push('Emphasize ROI and competitive advantage')
    considerations.push('Address executive-level concerns and long-term vision')
  }

  if (role?.toLowerCase().includes('cto') || role?.toLowerCase().includes('engineering')) {
    considerations.push('Technical requirements and integration capabilities')
    considerations.push('Scalability and performance considerations')
    considerations.push('Security and compliance requirements')
  }

  if (role?.toLowerCase().includes('sales') || role?.toLowerCase().includes('marketing')) {
    considerations.push('User adoption and change management')
    considerations.push('Integration with existing sales/marketing tools')
    considerations.push('Training and support requirements')
  }

  return considerations
}

function generateCompetitivePositioning(prospectProfile: any, salesContext: any): string[] {
  const positioning = []

  // Generate positioning based on prospect profile
  if (prospectProfile.currentSolution) {
    positioning.push('Understand limitations of current solution')
    positioning.push('Identify specific pain points not addressed by current approach')
    positioning.push('Position as upgrade/enhancement rather than complete replacement')
  } else {
    positioning.push('Position as comprehensive solution for identified needs')
    positioning.push('Emphasize ease of implementation and quick time-to-value')
  }

  // Add product-specific positioning
  if (salesContext.productCategory) {
    positioning.push(`Highlight ${salesContext.productCategory} capabilities and differentiation`)
  }

  return positioning
}

function generateTimingConsiderations(prospectProfile: any, salesContext: any): string[] {
  const considerations = []

  // Time-based considerations
  if (salesContext.timeAvailable < 30) {
    considerations.push('Focus on high-priority questions only')
    considerations.push('Prepare detailed follow-up questions for next meeting')
  }

  if (salesContext.urgencyLevel === 'high') {
    considerations.push('Accelerate question sequence')
    considerations.push('Focus on decision drivers and timeline')
  }

  // Seasonal considerations
  const currentMonth = new Date().getMonth()
  if (currentMonth >= 9 && currentMonth <= 11) { // Q4
    considerations.push('Consider year-end budget and timeline pressures')
  }

  if (currentMonth >= 0 && currentMonth <= 2) { // Q1
    considerations.push('New year planning and goal setting context')
  }

  return considerations
}