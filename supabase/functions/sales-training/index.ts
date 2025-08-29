import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Sales Training Edge Function - ProductIntel Pro
 *
 * Personalized sales training module creation for sales professionals:
 * - Skill gap analysis and personalized learning paths
 * - Industry-specific sales techniques and best practices
 * - Product knowledge training and objection handling
 * - Communication skills development and presentation training
 * - Performance tracking and continuous improvement
 *
 * Designed to help sales professionals like Sam continuously improve
 * their skills and adapt to changing market conditions.
 *
 * @route POST /functions/v1/sales-training
 */

interface SalesTrainingRequest {
  salesRepProfile: {
    name: string;
    experience: number; // years
    currentRole: string;
    industry: string;
    specialization: string[];
    performanceMetrics: {
      quotaAttainment: number;
      winRate: number;
      averageDealSize: number;
      salesCycleLength: number;
    };
    skillAssessment: {
      productKnowledge: number; // 1-10
      communicationSkills: number;
      objectionHandling: number;
      negotiationSkills: number;
      relationshipBuilding: number;
      technicalProficiency: number;
    };
    learningPreferences: {
      preferredFormat: 'video' | 'interactive' | 'reading' | 'practice';
      timeCommitment: '15_min' | '30_min' | '1_hour' | '2_hours';
      frequency: 'daily' | 'weekly' | 'bi_weekly';
      learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
    };
  };
  trainingContext: {
    immediateNeeds: string[];
    longTermGoals: string[];
    upcomingDeals: Array<{
      company: string;
      industry: string;
      dealSize: number;
      complexity: 'simple' | 'moderate' | 'complex';
      timeline: string;
    }>;
    recentPerformance: {
      wins: number;
      losses: number;
      commonObjections: string[];
      strengths: string[];
      weaknesses: string[];
    };
  };
  productKnowledge: {
    products: Array<{
      name: string;
      category: string;
      keyFeatures: string[];
      useCases: string[];
      competitiveAdvantages: string[];
    }>;
    industrySpecifics: Record<string, any>;
    objectionLibrary: Record<string, string>;
  };
  customization: {
    focus: 'product_knowledge' | 'communication' | 'negotiation' | 'relationship' | 'comprehensive';
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    duration: 'short' | 'medium' | 'long';
    includeAssessments: boolean;
    includePractice: boolean;
  };
}

interface SalesTraining {
  trainingPlanId: string;
  skillAssessment: {
    currentLevel: Record<string, number>;
    skillGaps: Array<{
      skill: string;
      currentLevel: number;
      targetLevel: number;
      priority: 'high' | 'medium' | 'low';
    }>;
    strengths: string[];
    developmentAreas: string[];
  };
  personalizedCurriculum: {
    modules: Array<{
      moduleId: string;
      title: string;
      description: string;
      duration: string;
      difficulty: string;
      skills: string[];
      prerequisites: string[];
      learningObjectives: string[];
      content: Array<{
        type: 'video' | 'interactive' | 'reading' | 'exercise' | 'assessment';
        title: string;
        duration: string;
        content: string;
        keyTakeaways: string[];
      }>;
    }>;
    learningPath: {
      sequence: string[];
      estimatedCompletion: string;
      milestones: Array<{
        milestone: string;
        skills: string[];
        assessment: string;
      }>;
    };
  };
  practicalApplication: {
    dealSpecificTraining: Array<{
      dealId: string;
      company: string;
      focusAreas: string[];
      preparationMaterials: string[];
      practiceScenarios: Array<{
        scenario: string;
        objectives: string[];
        preparation: string;
      }>;
    }>;
    rolePlayingExercises: Array<{
      scenario: string;
      buyerPersona: string;
      keyChallenges: string[];
      successCriteria: string[];
      debriefQuestions: string[];
    }>;
    objectionHandling: {
      commonObjections: Array<{
        objection: string;
        frequency: number;
        recommendedResponse: string;
        practiceScript: string;
        followUp: string;
      }>;
      industrySpecific: Record<string, any>;
    };
  };
  productMastery: {
    productTraining: Array<{
      product: string;
      modules: Array<{
        topic: string;
        content: string;
        assessment: string;
        proficiency: number;
      }>;
      certification: {
        requirements: string[];
        assessment: string;
        validity: string;
      };
    }>;
    competitiveIntelligence: {
      competitorProfiles: Array<{
        competitor: string;
        keyFeatures: string[];
        positioning: string;
        battleCards: string[];
      }>;
      differentiationTraining: string[];
    };
  };
  communicationSkills: {
    presentationTraining: {
      modules: Array<{
        skill: string;
        exercises: string[];
        assessment: string;
      }>;
      deliveryTips: string[];
      audienceAnalysis: string[];
    };
    questioningTechniques: {
      discoveryQuestions: string[];
      qualificationQuestions: string[];
      objectionQuestions: string[];
      practiceScenarios: string[];
    };
    activeListening: {
      techniques: string[];
      exercises: string[];
      feedback: string[];
    };
  };
  performanceTracking: {
    progressMetrics: Array<{
      metric: string;
      currentValue: number;
      targetValue: number;
      trend: 'improving' | 'stable' | 'declining';
    }>;
    skillDevelopment: Record<string, {
      baseline: number;
      current: number;
      target: number;
      progress: number;
    }>;
    certificationTracking: Array<{
      certification: string;
      status: 'not_started' | 'in_progress' | 'completed';
      progress: number;
      nextSteps: string;
    }>;
  };
  continuousImprovement: {
    feedbackLoop: {
      selfAssessment: string[];
      peerReview: string[];
      managerFeedback: string[];
      customerFeedback: string[];
    };
    adaptationStrategies: Array<{
      trigger: string;
      adjustment: string;
      rationale: string;
    }>;
    advancedTraining: {
      recommendations: string[];
      prerequisites: string[];
      expectedOutcomes: string[];
    };
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

    const requestData: SalesTrainingRequest = await req.json()

    if (!requestData.salesRepProfile) {
      return new Response(
        JSON.stringify({ error: 'Sales rep profile is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate personalized sales training
    const training = await generateSalesTraining(requestData)

    // Log the training generation
    await supabaseClient
      .from('ai_usage_logs')
      .insert({
        user_id: user.user.id,
        feature_used: 'sales-training',
        model_id: 'training-ai',
        tokens_used: JSON.stringify(training).length,
        success: true
      })

    return new Response(
      JSON.stringify({ training }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Sales training error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error during sales training generation'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function generateSalesTraining(request: SalesTrainingRequest): Promise<SalesTraining> {
  const { salesRepProfile, trainingContext, productKnowledge, customization } = request

  // Assess current skills and identify gaps
  const skillAssessment = assessSkills(salesRepProfile)

  // Create personalized curriculum
  const personalizedCurriculum = createCurriculum(salesRepProfile, skillAssessment, customization)

  // Generate practical application training
  const practicalApplication = createPracticalApplication(trainingContext, salesRepProfile)

  // Develop product mastery training
  const productMastery = developProductMastery(productKnowledge, salesRepProfile)

  // Create communication skills training
  const communicationSkills = developCommunicationSkills(salesRepProfile, skillAssessment)

  // Set up performance tracking
  const performanceTracking = setupPerformanceTracking(salesRepProfile, skillAssessment)

  // Create continuous improvement plan
  const continuousImprovement = createContinuousImprovement(salesRepProfile, trainingContext)

  const trainingPlanId = `training_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  return {
    trainingPlanId,
    skillAssessment,
    personalizedCurriculum,
    practicalApplication,
    productMastery,
    communicationSkills,
    performanceTracking,
    continuousImprovement
  }
}

function assessSkills(salesRepProfile: any): any {
  const { skillAssessment, performanceMetrics, experience } = salesRepProfile

  // Calculate skill gaps
  const skillGaps = []

  Object.entries(skillAssessment).forEach(([skill, level]: [string, any]) => {
    const targetLevel = determineTargetLevel(skill, experience, performanceMetrics)
    if (level < targetLevel - 1) { // Gap of more than 1 point
      skillGaps.push({
        skill: formatSkillName(skill),
        currentLevel: level,
        targetLevel,
        priority: determinePriority(skill, level, targetLevel)
      })
    }
  })

  // Sort by priority
  skillGaps.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })

  // Identify strengths and development areas
  const strengths = Object.entries(skillAssessment)
    .filter(([, level]: [string, any]) => level >= 8)
    .map(([skill]) => formatSkillName(skill))

  const developmentAreas = skillGaps.map(gap => gap.skill)

  return {
    currentLevel: skillAssessment,
    skillGaps,
    strengths,
    developmentAreas
  }
}

function determineTargetLevel(skill: string, experience: number, performanceMetrics: any): number {
  let baseTarget = 7 // Default target

  // Adjust based on experience
  if (experience > 5) baseTarget = 8
  if (experience > 10) baseTarget = 9

  // Adjust based on performance
  if (performanceMetrics.winRate > 0.6) baseTarget += 0.5
  if (performanceMetrics.quotaAttainment > 1.0) baseTarget += 0.5

  // Skill-specific adjustments
  if (skill === 'productKnowledge') baseTarget += 1 // Always important
  if (skill === 'communicationSkills') baseTarget += 0.5

  return Math.min(10, Math.max(1, baseTarget))
}

function formatSkillName(skill: string): string {
  const nameMap: Record<string, string> = {
    productKnowledge: 'Product Knowledge',
    communicationSkills: 'Communication Skills',
    objectionHandling: 'Objection Handling',
    negotiationSkills: 'Negotiation Skills',
    relationshipBuilding: 'Relationship Building',
    technicalProficiency: 'Technical Proficiency'
  }

  return nameMap[skill] || skill
}

function determinePriority(skill: string, current: number, target: number): 'high' | 'medium' | 'low' {
  const gap = target - current

  if (gap >= 3 || skill === 'productKnowledge') return 'high'
  if (gap >= 2) return 'medium'
  return 'low'
}

function createCurriculum(salesRepProfile: any, skillAssessment: any, customization: any): any {
  const { learningPreferences } = salesRepProfile
  const { skillGaps } = skillAssessment
  const { focus, difficulty, duration } = customization

  // Create modules based on skill gaps and focus
  const modules = []

  skillGaps.forEach((gap: any, index: number) => {
    const module = createModule(gap.skill, gap.currentLevel, difficulty, learningPreferences, index + 1)
    modules.push(module)
  })

  // Add focus-specific modules
  if (focus !== 'comprehensive') {
    const focusModule = createFocusModule(focus, difficulty, learningPreferences, modules.length + 1)
    modules.push(focusModule)
  }

  // Create learning path
  const learningPath = {
    sequence: modules.map(m => m.moduleId),
    estimatedCompletion: calculateCompletionTime(modules, learningPreferences, duration),
    milestones: createMilestones(modules)
  }

  return {
    modules,
    learningPath
  }
}

function createModule(skill: string, currentLevel: number, difficulty: string, preferences: any, order: number): any {
  const moduleId = `module_${order}_${skill.toLowerCase().replace(/\s+/g, '_')}`

  const content = generateModuleContent(skill, currentLevel, difficulty, preferences)

  return {
    moduleId,
    title: `${skill} Mastery`,
    description: `Develop and enhance your ${skill.toLowerCase()} through targeted training and practice.`,
    duration: content.totalDuration,
    difficulty,
    skills: [skill],
    prerequisites: determinePrerequisites(skill, currentLevel),
    learningObjectives: generateLearningObjectives(skill, difficulty),
    content
  }
}

function generateModuleContent(skill: string, currentLevel: number, difficulty: string, preferences: any): any {
  const { preferredFormat, timeCommitment } = preferences

  const content = []
  const totalDuration = timeCommitment === '15_min' ? '15 minutes' :
                       timeCommitment === '30_min' ? '30 minutes' :
                       timeCommitment === '1_hour' ? '1 hour' : '2 hours'

  // Core content based on skill
  if (skill === 'Product Knowledge') {
    content.push({
      type: preferredFormat,
      title: 'Product Deep Dive',
      duration: '10 minutes',
      content: 'Comprehensive overview of product features, benefits, and use cases',
      keyTakeaways: ['Key product features', 'Customer benefits', 'Competitive advantages']
    })

    if (difficulty !== 'beginner') {
      content.push({
        type: 'interactive',
        title: 'Feature Demonstration',
        duration: '15 minutes',
        content: 'Interactive walkthrough of product capabilities',
        keyTakeaways: ['Hands-on experience', 'Feature application', 'Customer scenarios']
      })
    }
  }

  if (skill === 'Communication Skills') {
    content.push({
      type: 'video',
      title: 'Effective Communication Techniques',
      duration: '12 minutes',
      content: 'Master verbal and non-verbal communication skills',
      keyTakeaways: ['Active listening', 'Clear messaging', 'Body language']
    })

    content.push({
      type: 'exercise',
      title: 'Communication Practice',
      duration: '10 minutes',
      content: 'Practice scenarios for different communication situations',
      keyTakeaways: ['Confidence building', 'Message delivery', 'Audience engagement']
    })
  }

  return content
}

function determinePrerequisites(skill: string, currentLevel: number): string[] {
  const prerequisites = []

  if (currentLevel < 3) {
    prerequisites.push('Basic sales fundamentals')
  }

  if (skill === 'Negotiation Skills' && currentLevel < 5) {
    prerequisites.push('Communication Skills')
  }

  if (skill === 'Technical Proficiency') {
    prerequisites.push('Product Knowledge')
  }

  return prerequisites
}

function generateLearningObjectives(skill: string, difficulty: string): string[] {
  const objectives = []

  const baseObjectives = {
    'Product Knowledge': [
      'Understand product features and capabilities',
      'Articulate customer benefits clearly',
      'Handle product-related questions confidently'
    ],
    'Communication Skills': [
      'Deliver clear and compelling messages',
      'Adapt communication style to different audiences',
      'Build rapport and trust with customers'
    ],
    'Objection Handling': [
      'Identify and categorize common objections',
      'Develop effective response strategies',
      'Turn objections into opportunities'
    ],
    'Negotiation Skills': [
      'Understand negotiation principles and tactics',
      'Create win-win outcomes',
      'Handle price and terms negotiations'
    ]
  }

  objectives.push(...(baseObjectives[skill] || ['Develop core competencies in ' + skill]))

  if (difficulty === 'advanced') {
    objectives.push('Apply advanced techniques in complex scenarios')
    objectives.push('Mentor others in best practices')
  }

  return objectives
}

function createFocusModule(focus: string, difficulty: string, preferences: any, order: number): any {
  const focusModules = {
    product_knowledge: {
      title: 'Advanced Product Mastery',
      skills: ['Product Knowledge', 'Technical Proficiency']
    },
    communication: {
      title: 'Communication Excellence',
      skills: ['Communication Skills', 'Relationship Building']
    },
    negotiation: {
      title: 'Negotiation Mastery',
      skills: ['Negotiation Skills', 'Objection Handling']
    },
    relationship: {
      title: 'Relationship Building',
      skills: ['Relationship Building', 'Communication Skills']
    }
  }

  const focusInfo = focusModules[focus] || focusModules.product_knowledge

  return {
    moduleId: `focus_${order}_${focus}`,
    title: focusInfo.title,
    description: `Specialized training focused on ${focus.replace('_', ' ')} excellence.`,
    duration: '45 minutes',
    difficulty,
    skills: focusInfo.skills,
    prerequisites: [],
    learningObjectives: [`Master advanced ${focus.replace('_', ' ')} techniques`],
    content: [{
      type: preferences.preferredFormat,
      title: focusInfo.title,
      duration: '45 minutes',
      content: `Comprehensive training on ${focus.replace('_', ' ')} best practices`,
      keyTakeaways: [`Advanced ${focus.replace('_', ' ')} skills`, 'Practical application', 'Performance improvement']
    }]
  }
}

function calculateCompletionTime(modules: any[], preferences: any, duration: string): string {
  const { frequency, timeCommitment } = preferences

  const totalHours = modules.reduce((total, module) => {
    const moduleHours = module.duration.includes('hour') ?
      parseFloat(module.duration) :
      parseFloat(module.duration) / 60
    return total + moduleHours
  }, 0)

  const sessionsPerWeek = frequency === 'daily' ? 5 :
                         frequency === 'weekly' ? 1 : 0.5

  const weeksToComplete = Math.ceil(totalHours / sessionsPerWeek)

  return `${weeksToComplete} weeks`
}

function createMilestones(modules: any[]): any[] {
  const milestones = []

  // Group modules into logical milestones
  const milestoneGroups = {
    foundation: modules.filter(m => m.difficulty === 'beginner'),
    intermediate: modules.filter(m => m.difficulty === 'intermediate'),
    advanced: modules.filter(m => m.difficulty === 'advanced')
  }

  if (milestoneGroups.foundation.length > 0) {
    milestones.push({
      milestone: 'Foundation Skills',
      skills: milestoneGroups.foundation.flatMap(m => m.skills),
      assessment: 'Foundation skills assessment'
    })
  }

  if (milestoneGroups.intermediate.length > 0) {
    milestones.push({
      milestone: 'Intermediate Proficiency',
      skills: milestoneGroups.intermediate.flatMap(m => m.skills),
      assessment: 'Intermediate skills evaluation'
    })
  }

  if (milestoneGroups.advanced.length > 0) {
    milestones.push({
      milestone: 'Advanced Mastery',
      skills: milestoneGroups.advanced.flatMap(m => m.skills),
      assessment: 'Advanced skills certification'
    })
  }

  return milestones
}

function createPracticalApplication(trainingContext: any, salesRepProfile: any): any {
  const { upcomingDeals, recentPerformance } = trainingContext

  // Create deal-specific training
  const dealSpecificTraining = upcomingDeals.map((deal: any, index: number) => ({
    dealId: `deal_${index + 1}`,
    company: deal.company,
    focusAreas: determineFocusAreas(deal, salesRepProfile),
    preparationMaterials: generatePreparationMaterials(deal),
    practiceScenarios: createPracticeScenarios(deal, salesRepProfile)
  }))

  // Create role-playing exercises
  const rolePlayingExercises = generateRolePlayingExercises(recentPerformance, salesRepProfile)

  // Create objection handling
  const objectionHandling = createObjectionHandling(recentPerformance.commonObjections, salesRepProfile.industry)

  return {
    dealSpecificTraining,
    rolePlayingExercises,
    objectionHandling
  }
}

function determineFocusAreas(deal: any, salesRepProfile: any): string[] {
  const focusAreas = []

  if (deal.complexity === 'complex') {
    focusAreas.push('Stakeholder management')
    focusAreas.push('Complex solution positioning')
  }

  if (deal.industry !== salesRepProfile.industry) {
    focusAreas.push('Industry-specific value propositions')
  }

  if (deal.dealSize > salesRepProfile.performanceMetrics.averageDealSize * 1.5) {
    focusAreas.push('Large deal negotiation')
  }

  focusAreas.push('Discovery and qualification')
  focusAreas.push('Objection handling')

  return focusAreas
}

function generatePreparationMaterials(deal: any): string[] {
  return [
    `${deal.company} company research and background`,
    `${deal.industry} industry trends and challenges`,
    'Competitor analysis and positioning',
    'Customized value proposition',
    'Potential objection responses',
    'Technical specification review'
  ]
}

function createPracticeScenarios(deal: any, salesRepProfile: any): any[] {
  return [
    {
      scenario: `Initial discovery call with ${deal.company}`,
      objectives: [
        'Understand company challenges and goals',
        'Identify key decision makers',
        'Qualify budget and timeline'
      ],
      preparation: 'Review company background and prepare strategic questions'
    },
    {
      scenario: `Product demonstration for ${deal.company} stakeholders`,
      objectives: [
        'Demonstrate product value clearly',
        'Address stakeholder-specific concerns',
        'Advance the sales process'
      ],
      preparation: 'Prepare customized demo script and handle potential objections'
    }
  ]
}

function generateRolePlayingExercises(recentPerformance: any, salesRepProfile: any): any[] {
  const exercises = []

  // Focus on common weaknesses
  if (recentPerformance.weaknesses.includes('objection handling')) {
    exercises.push({
      scenario: 'Handling budget concerns',
      buyerPersona: 'CFO-focused on ROI',
      keyChallenges: ['Price justification', 'ROI calculation', 'Budget approval'],
      successCriteria: ['Maintain value conversation', 'Provide clear ROI data', 'Advance to next step'],
      debriefQuestions: [
        'How did you handle the price objection?',
        'What ROI data did you provide?',
        'How did you advance the conversation?'
      ]
    })
  }

  if (recentPerformance.weaknesses.includes('discovery')) {
    exercises.push({
      scenario: 'Deep discovery with technical buyer',
      buyerPersona: 'CTO focused on technical requirements',
      keyChallenges: ['Technical qualification', 'Integration concerns', 'Scalability questions'],
      successCriteria: ['Understand technical requirements', 'Address integration concerns', 'Build technical credibility'],
      debriefQuestions: [
        'What technical questions did you ask?',
        'How did you address integration concerns?',
        'What technical value did you demonstrate?'
      ]
    })
  }

  // Add general exercises
  exercises.push({
    scenario: 'Competitor comparison discussion',
    buyerPersona: 'Decision maker evaluating options',
    keyChallenges: ['Competitor differentiation', 'Feature comparison', 'Value justification'],
    successCriteria: ['Clearly articulate advantages', 'Handle feature comparisons', 'Maintain confidence'],
    debriefQuestions: [
      'How did you differentiate from competitors?',
      'What specific advantages did you highlight?',
      'How did you handle direct feature comparisons?'
    ]
  })

  return exercises
}

function createObjectionHandling(commonObjections: string[], industry: string): any {
  const commonObjectionsFormatted = commonObjections.map(objection => ({
    objection,
    frequency: 0.7, // Assume 70% frequency for common objections
    recommendedResponse: generateObjectionResponse(objection),
    practiceScript: createPracticeScript(objection),
    followUp: generateFollowUpAction(objection)
  }))

  const industrySpecific = generateIndustrySpecificObjections(industry)

  return {
    commonObjections: commonObjectionsFormatted,
    industrySpecific
  }
}

function generateObjectionResponse(objection: string): string {
  const responses: Record<string, string> = {
    'too expensive': 'I understand budget is important. Let me show you how our solution delivers 3x ROI within 18 months through efficiency gains and cost savings.',
    'not sure about ROI': 'Great question about ROI. Based on similar companies, our customers typically see [specific metrics] within the first 6 months.',
    'current solution works': 'That\'s excellent that you have a working solution. I\'d love to understand what you like about it and explore how we might enhance or complement it.',
    'need more time': 'I completely understand the need for thorough evaluation. What specific information would help you make a decision?',
    'competitor is cheaper': 'Price is definitely a factor. Let me show you the total cost of ownership including implementation, training, and support costs.',
    'not a priority right now': 'I understand priorities shift. When this becomes a priority, what would make this solution compelling for your situation?'
  }

  return responses[objection.toLowerCase().replace(/\s+/g, '_')] ||
         'Thank you for sharing that concern. Let me address it by providing specific data and examples that demonstrate our value.'
}

function createPracticeScript(objection: string): string {
  return `Buyer: "${objection}"\n\nYou: "[Insert objection response]"\n\nBuyer: "[Potential follow-up question]"\n\nYou: "[Reinforce value and next steps]"`
}

function generateFollowUpAction(objection: string): string {
  const actions: Record<string, string> = {
    'too expensive': 'Send detailed ROI calculator and case studies',
    'not sure about ROI': 'Schedule ROI modeling session with specific metrics',
    'current solution works': 'Request meeting to understand current solution limitations',
    'need more time': 'Send additional resources and offer check-in call',
    'competitor is cheaper': 'Provide TCO analysis and competitive comparison',
    'not a priority right now': 'Set up nurture campaign for when priority increases'
  }

  return actions[objection.toLowerCase().replace(/\s+/g, '_')] ||
         'Send relevant case studies and schedule follow-up discussion'
}

function generateIndustrySpecificObjections(industry: string): Record<string, any> {
  const industryObjections: Record<string, any> = {
    healthcare: {
      'HIPAA compliance': {
        response: 'We are fully HIPAA compliant with end-to-end encryption and comprehensive security measures.',
        evidence: 'SOC 2 Type II certification and regular security audits'
      },
      'integration with EHR': {
        response: 'We offer seamless integration with all major EHR systems through our API and dedicated integration team.',
        evidence: 'Pre-built integrations with Epic, Cerner, and other major EHR platforms'
      }
    },
    finance: {
      'security and compliance': {
        response: 'We meet all financial industry standards including SOC 2, ISO 27001, and GDPR compliance.',
        evidence: 'Regular third-party security audits and compliance certifications'
      },
      'data residency': {
        response: 'We offer flexible data residency options to meet your regulatory requirements.',
        evidence: 'Multi-region deployment capabilities with customer-controlled data location'
      }
    },
    technology: {
      'integration complexity': {
        response: 'Our solution offers pre-built integrations and a comprehensive API for seamless connectivity.',
        evidence: '99.9% API uptime and extensive integration documentation'
      },
      'scalability concerns': {
        response: 'Built on cloud-native architecture designed to scale from startup to enterprise.',
        evidence: 'Auto-scaling capabilities and proven performance at scale'
      }
    }
  }

  return industryObjections[industry] || {}
}

function developProductMastery(productKnowledge: any, salesRepProfile: any): any {
  const { products, industrySpecifics } = productKnowledge

  // Create product training modules
  const productTraining = products.map((product: any) => ({
    product: product.name,
    modules: createProductModules(product, salesRepProfile.skillAssessment.productKnowledge),
    certification: createCertification(product.name, salesRepProfile.experience)
  }))

  // Create competitive intelligence
  const competitiveIntelligence = createCompetitiveIntelligence(products, industrySpecifics)

  return {
    productTraining,
    competitiveIntelligence
  }
}

function createProductModules(product: any, currentProficiency: number): any[] {
  const modules = []

  modules.push({
    topic: 'Core Features and Capabilities',
    content: `Master the core features: ${product.keyFeatures.join(', ')}`,
    assessment: 'Feature knowledge quiz',
    proficiency: Math.min(10, currentProficiency + 2)
  })

  modules.push({
    topic: 'Use Cases and Applications',
    content: `Understand key use cases: ${product.useCases.join(', ')}`,
    assessment: 'Use case application exercise',
    proficiency: Math.min(10, currentProficiency + 1.5)
  })

  if (currentProficiency >= 6) {
    modules.push({
      topic: 'Advanced Configuration and Customization',
      content: 'Learn advanced configuration options and customization capabilities',
      assessment: 'Configuration challenge',
      proficiency: Math.min(10, currentProficiency + 1)
    })
  }

  return modules
}

function createCertification(productName: string, experience: number): any {
  const requirements = [
    'Complete all product training modules',
    'Pass product knowledge assessment (80%+)',
    'Demonstrate product in customer scenario',
    'Handle 5 product-related customer questions'
  ]

  if (experience > 3) {
    requirements.push('Mentor junior team members on product knowledge')
  }

  return {
    requirements,
    assessment: `${productName} Product Certification Exam`,
    validity: '2 years'
  }
}

function createCompetitiveIntelligence(products: any[], industrySpecifics: any): any {
  // Create competitor profiles
  const competitorProfiles = [
    {
      competitor: 'Competitor A',
      keyFeatures: ['Basic features', 'Limited integration'],
      positioning: 'Budget-friendly entry-level solution',
      battleCards: ['Price comparison', 'Feature gap analysis', 'ROI calculator']
    },
    {
      competitor: 'Competitor B',
      keyFeatures: ['Advanced features', 'Strong integration'],
      positioning: 'Enterprise-grade comprehensive solution',
      battleCards: ['Total cost of ownership', 'Implementation timeline', 'Scalability comparison']
    }
  ]

  // Create differentiation training
  const differentiationTraining = [
    'Focus on unique capabilities and competitive advantages',
    'Practice articulating differentiation in customer conversations',
    'Prepare responses to competitor comparisons',
    'Develop positioning statements for different scenarios'
  ]

  return {
    competitorProfiles,
    differentiationTraining
  }
}

function developCommunicationSkills(salesRepProfile: any, skillAssessment: any): any {
  const { skillAssessment: skills } = salesRepProfile

  return {
    presentationTraining: createPresentationTraining(skills.communicationSkills),
    questioningTechniques: createQuestioningTechniques(skills),
    activeListening: createActiveListeningTraining(skills.communicationSkills)
  }
}

function createPresentationTraining(communicationLevel: number): any {
  const modules = []

  modules.push({
    skill: 'Opening and Hook',
    exercises: [
      'Practice different opening techniques',
      'Develop compelling hooks for different audiences',
      'Time opening statements for engagement'
    ],
    assessment: 'Opening effectiveness rating'
  })

  if (communicationLevel >= 6) {
    modules.push({
      skill: 'Advanced Presentation Techniques',
      exercises: [
        'Handle difficult questions during presentation',
        'Adapt presentation based on audience feedback',
        'Use storytelling techniques effectively'
      ],
      assessment: 'Advanced presentation skills evaluation'
    })
  }

  const deliveryTips = [
    'Maintain eye contact and positive body language',
    'Vary speaking pace and tone for emphasis',
    'Use pauses effectively for impact',
    'Engage audience with questions and interactions'
  ]

  const audienceAnalysis = [
    'Assess audience knowledge level and adjust accordingly',
    'Identify key decision makers and their concerns',
    'Read body language and adjust delivery style',
    'Prepare for different audience personalities'
  ]

  return {
    modules,
    deliveryTips,
    audienceAnalysis
  }
}

function createQuestioningTechniques(skills: any): any {
  return {
    discoveryQuestions: generateDiscoveryQuestions(skills),
    qualificationQuestions: generateQualificationQuestions(),
    objectionQuestions: generateObjectionQuestions(),
    practiceScenarios: createQuestioningScenarios()
  }
}

function generateDiscoveryQuestions(skills: any): string[] {
  return [
    'What are your biggest challenges in [area]?',
    'How are you currently handling [specific process]?',
    'What would success look like for you in this area?',
    'Who else is involved in making this decision?',
    'What\'s changed in your business that made this a priority now?'
  ]
}

function generateQualificationQuestions(): string[] {
  return [
    'What\'s your timeline for implementing a solution?',
    'What\'s your budget range for this initiative?',
    'Who are the key stakeholders in this decision?',
    'What are your must-have requirements?',
    'How do you measure success for this project?'
  ]
}

function generateObjectionQuestions(): string[] {
  return [
    'What specifically concerns you about [objection]?',
    'What would need to be different for this to work?',
    'What\'s the impact of not addressing this challenge?',
    'What has your experience been with similar solutions?',
    'What would make this a good fit for your situation?'
  ]
}

function createQuestioningScenarios(): string[] {
  return [
    'Discovery call with new prospect',
    'Qualification discussion with decision maker',
    'Objection handling during negotiation',
    'Technical discovery with IT stakeholder',
    'Budget discussion with finance stakeholder'
  ]
}

function createActiveListeningTraining(communicationLevel: number): any {
  const techniques = [
    'Paraphrase to confirm understanding',
    'Ask clarifying questions',
    'Maintain eye contact and engaged posture',
    'Avoid interrupting the speaker',
    'Take notes on key points and concerns'
  ]

  const exercises = [
    'Practice paraphrasing customer statements',
    'Role-play active listening scenarios',
    'Record and review listening effectiveness',
    'Practice asking follow-up questions'
  ]

  const feedback = [
    'Monitor for understanding confirmation',
    'Watch for non-verbal cues of engagement',
    'Track question quality and relevance',
    'Assess ability to uncover hidden concerns'
  ]

  return {
    techniques,
    exercises,
    feedback
  }
}

function setupPerformanceTracking(salesRepProfile: any, skillAssessment: any): any {
  const { performanceMetrics } = salesRepProfile
  const { currentLevel } = skillAssessment

  // Define progress metrics
  const progressMetrics = [
    {
      metric: 'Win Rate',
      currentValue: performanceMetrics.winRate,
      targetValue: performanceMetrics.winRate + 0.1,
      trend: 'stable'
    },
    {
      metric: 'Average Deal Size',
      currentValue: performanceMetrics.averageDealSize,
      targetValue: performanceMetrics.averageDealSize * 1.1,
      trend: 'improving'
    },
    {
      metric: 'Sales Cycle Length',
      currentValue: performanceMetrics.salesCycleLength,
      targetValue: performanceMetrics.salesCycleLength * 0.9,
      trend: 'stable'
    }
  ]

  // Track skill development
  const skillDevelopment: Record<string, any> = {}
  Object.entries(currentLevel).forEach(([skill, level]: [string, any]) => {
    const targetLevel = determineTargetLevel(skill, salesRepProfile.experience, performanceMetrics)
    skillDevelopment[formatSkillName(skill)] = {
      baseline: level,
      current: level,
      target: targetLevel,
      progress: 0
    }
  })

  // Set up certification tracking
  const certificationTracking = [
    {
      certification: 'Product Knowledge Certification',
      status: currentLevel.productKnowledge >= 8 ? 'completed' : 'in_progress',
      progress: (currentLevel.productKnowledge / 10) * 100,
      nextSteps: currentLevel.productKnowledge < 8 ? 'Complete product training modules' : 'Maintain certification'
    },
    {
      certification: 'Sales Excellence Certification',
      status: performanceMetrics.winRate > 0.6 ? 'completed' : 'in_progress',
      progress: performanceMetrics.winRate * 100,
      nextSteps: performanceMetrics.winRate <= 0.6 ? 'Focus on conversion techniques' : 'Advanced sales training'
    }
  ]

  return {
    progressMetrics,
    skillDevelopment,
    certificationTracking
  }
}

function createContinuousImprovement(salesRepProfile: any, trainingContext: any): any {
  const { recentPerformance } = trainingContext

  return {
    feedbackLoop: createFeedbackLoop(salesRepProfile),
    adaptationStrategies: createAdaptationStrategies(recentPerformance),
    advancedTraining: createAdvancedTraining(salesRepProfile)
  }
}

function createFeedbackLoop(salesRepProfile: any): any {
  return {
    selfAssessment: [
      'Weekly self-reflection on performance',
      'Skill gap identification and prioritization',
      'Goal progress evaluation',
      'Personal development planning'
    ],
    peerReview: [
      'Monthly peer coaching sessions',
      'Call recording reviews with colleagues',
      'Best practice sharing sessions',
      'Cross-functional feedback exchange'
    ],
    managerFeedback: [
      'Bi-weekly performance discussions',
      'Quarterly formal performance reviews',
      'Goal setting and adjustment sessions',
      'Career development planning'
    ],
    customerFeedback: [
      'Post-sale satisfaction surveys',
      'Customer reference call participation',
      'Win/loss analysis reviews',
      'Customer advisory board feedback'
    ]
  }
}

function createAdaptationStrategies(recentPerformance: any): any[] {
  const strategies = []

  if (recentPerformance.losses > recentPerformance.wins) {
    strategies.push({
      trigger: 'Win rate below 50%',
      adjustment: 'Focus on qualification and discovery skills',
      rationale: 'Better prospect qualification leads to higher conversion rates'
    })
  }

  if (recentPerformance.commonObjections.includes('price')) {
    strategies.push({
      trigger: 'Frequent price objections',
      adjustment: 'Enhance value proposition and ROI communication',
      rationale: 'Stronger value articulation reduces price sensitivity'
    })
  }

  strategies.push({
    trigger: 'New product launch or feature release',
    adjustment: 'Prioritize product knowledge training',
    rationale: 'Stay current with product capabilities and positioning'
  })

  strategies.push({
    trigger: 'Market condition changes',
    adjustment: 'Update industry knowledge and competitive intelligence',
    rationale: 'Adapt messaging to current market realities'
  })

  return strategies
}

function createAdvancedTraining(salesRepProfile: any): any {
  const { experience, performanceMetrics } = salesRepProfile

  const recommendations = []
  const prerequisites = []
  const expectedOutcomes = []

  if (experience > 3) {
    recommendations.push('Strategic Account Management')
    recommendations.push('Executive Presence and Communication')
    prerequisites.push('3+ years sales experience')
    expectedOutcomes.push('Enhanced executive relationship management')
  }

  if (performanceMetrics.averageDealSize > 100000) {
    recommendations.push('Large Deal Negotiation')
    recommendations.push('Complex Sale Methodology')
    prerequisites.push('Experience with $100K+ deals')
    expectedOutcomes.push('Improved large deal conversion rates')
  }

  if (performanceMetrics.winRate > 0.7) {
    recommendations.push('Sales Leadership and Mentoring')
    recommendations.push('Advanced Coaching Techniques')
    prerequisites.push('70%+ win rate')
    expectedOutcomes.push('Team development and leadership skills')
  }

  return {
    recommendations,
    prerequisites,
    expectedOutcomes
  }
}