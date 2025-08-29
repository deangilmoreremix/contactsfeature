import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Feature Analysis Edge Function - ProductIntel Pro
 *
 * Multi-modal feature extraction and competitive analysis for sales professionals
 * to understand product capabilities and differentiation opportunities.
 *
 * @route POST /functions/v1/feature-analysis
 */

interface FeatureAnalysisRequest {
  productData: {
    name: string;
    description: string;
    category: string;
    targetMarket: string;
    keyFeatures?: string[];
    pricing?: any;
    competitors?: string[];
  };
  analysisType: 'comprehensive' | 'competitive' | 'feature_comparison' | 'market_positioning';
  comparisonTargets?: Array<{
    name: string;
    features: string[];
    pricing: any;
    strengths: string[];
    weaknesses: string[];
  }>;
  salesContext?: {
    industry: string;
    buyerPersona: string;
    dealStage: string;
    keyRequirements: string[];
  };
}

interface FeatureAnalysis {
  analysisId: string;
  productOverview: {
    name: string;
    category: string;
    coreValueProposition: string;
    targetMarket: string;
    uniqueSellingPoints: string[];
  };
  featureAnalysis: {
    coreFeatures: Array<{
      feature: string;
      category: string;
      importance: 'critical' | 'important' | 'nice_to_have';
      differentiation: string;
      useCases: string[];
      competitiveAdvantage: string;
    }>;
    featureClusters: Record<string, string[]>;
    featureGaps: string[];
    innovationOpportunities: string[];
  };
  competitiveAnalysis: {
    marketPosition: string;
    competitiveAdvantages: Array<{
      advantage: string;
      impact: string;
      evidence: string;
    }>;
    competitiveDisadvantages: Array<{
      disadvantage: string;
      mitigation: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    competitorComparison: Array<{
      competitor: string;
      similarity: number;
      keyDifferences: string[];
      positioning: string;
    }>;
  };
  salesImplications: {
    idealCustomerProfile: {
      industries: string[];
      companySizes: string[];
      roles: string[];
      painPoints: string[];
    };
    messagingStrategy: {
      keyMessages: string[];
      objectionHandling: Record<string, string>;
      valueDrivers: string[];
    };
    pricingStrategy: {
      positioning: string;
      justification: string;
      negotiationPoints: string[];
    };
  };
  recommendations: {
    immediateActions: string[];
    strategicImprovements: string[];
    competitiveResponses: string[];
    marketOpportunities: string[];
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

    const requestData: FeatureAnalysisRequest = await req.json()

    if (!requestData.productData) {
      return new Response(
        JSON.stringify({ error: 'Product data is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate feature analysis
    const analysis = await generateFeatureAnalysis(requestData)

    // Log the analysis generation
    await supabaseClient
      .from('ai_usage_logs')
      .insert({
        user_id: user.user.id,
        feature_used: 'feature-analysis',
        model_id: 'feature-ai',
        tokens_used: JSON.stringify(analysis).length,
        success: true
      })

    return new Response(
      JSON.stringify({ analysis }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Feature analysis error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error during feature analysis'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function generateFeatureAnalysis(request: FeatureAnalysisRequest): Promise<FeatureAnalysis> {
  const { productData, analysisType, comparisonTargets, salesContext } = request

  // Extract and analyze features
  const featureAnalysis = await analyzeFeatures(productData, analysisType)

  // Perform competitive analysis
  const competitiveAnalysis = await analyzeCompetition(productData, comparisonTargets)

  // Generate sales implications
  const salesImplications = generateSalesImplications(featureAnalysis, competitiveAnalysis, salesContext)

  // Create recommendations
  const recommendations = generateRecommendations(featureAnalysis, competitiveAnalysis, salesContext)

  const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  return {
    analysisId,
    productOverview: {
      name: productData.name,
      category: productData.category,
      coreValueProposition: generateValueProposition(productData),
      targetMarket: productData.targetMarket,
      uniqueSellingPoints: extractUniqueSellingPoints(featureAnalysis, competitiveAnalysis)
    },
    featureAnalysis,
    competitiveAnalysis,
    salesImplications,
    recommendations
  }
}

async function analyzeFeatures(productData: any, analysisType: string): Promise<any> {
  const { description, keyFeatures, category } = productData

  // Extract features from description if not provided
  const features = keyFeatures || extractFeaturesFromDescription(description)

  // Categorize features
  const categorizedFeatures = categorizeFeatures(features, category)

  // Analyze feature importance and differentiation
  const analyzedFeatures = features.map((feature: string) => ({
    feature,
    category: determineFeatureCategory(feature, category),
    importance: assessFeatureImportance(feature, category),
    differentiation: analyzeDifferentiation(feature, category),
    useCases: generateUseCases(feature),
    competitiveAdvantage: assessCompetitiveAdvantage(feature)
  }))

  // Group features into clusters
  const featureClusters = clusterFeatures(analyzedFeatures)

  // Identify gaps and opportunities
  const featureGaps = identifyFeatureGaps(analyzedFeatures, category)
  const innovationOpportunities = identifyInnovationOpportunities(analyzedFeatures, category)

  return {
    coreFeatures: analyzedFeatures,
    featureClusters,
    featureGaps,
    innovationOpportunities
  }
}

function extractFeaturesFromDescription(description: string): string[] {
  // Simple feature extraction - in production, this would use NLP
  const featureIndicators = [
    'includes', 'provides', 'offers', 'features', 'capabilities',
    'supports', 'enables', 'allows', 'integrates', 'connects'
  ]

  const sentences = description.split(/[.!?]+/)
  const features = []

  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase()
    if (featureIndicators.some(indicator => lowerSentence.includes(indicator))) {
      features.push(sentence.trim())
    }
  })

  return features.slice(0, 10) // Limit to top 10 features
}

function categorizeFeatures(features: string[], category: string): Record<string, string[]> {
  const clusters: Record<string, string[]> = {}

  features.forEach(feature => {
    const category = determineFeatureCategory(feature, category)
    if (!clusters[category]) clusters[category] = []
    clusters[category].push(feature)
  })

  return clusters
}

function determineFeatureCategory(feature: string, productCategory: string): string {
  const featureLower = feature.toLowerCase()

  if (featureLower.includes('security') || featureLower.includes('privacy') || featureLower.includes('compliance')) {
    return 'Security & Compliance'
  }
  if (featureLower.includes('integration') || featureLower.includes('api') || featureLower.includes('connect')) {
    return 'Integration & Connectivity'
  }
  if (featureLower.includes('analytics') || featureLower.includes('reporting') || featureLower.includes('insights')) {
    return 'Analytics & Intelligence'
  }
  if (featureLower.includes('automation') || featureLower.includes('workflow') || featureLower.includes('process')) {
    return 'Automation & Workflow'
  }
  if (featureLower.includes('user') || featureLower.includes('interface') || featureLower.includes('experience')) {
    return 'User Experience'
  }
  if (featureLower.includes('mobile') || featureLower.includes('app') || featureLower.includes('responsive')) {
    return 'Mobile & Accessibility'
  }

  return 'Core Functionality'
}

function assessFeatureImportance(feature: string, category: string): 'critical' | 'important' | 'nice_to_have' {
  const featureLower = feature.toLowerCase()

  // Category-specific critical features
  if (category === 'security' && featureLower.includes('encryption')) return 'critical'
  if (category === 'healthcare' && featureLower.includes('hipaa')) return 'critical'
  if (category === 'finance' && featureLower.includes('compliance')) return 'critical'

  // Generally critical features
  if (featureLower.includes('security') || featureLower.includes('performance') || featureLower.includes('reliability')) {
    return 'critical'
  }

  // Important features
  if (featureLower.includes('integration') || featureLower.includes('scalability') || featureLower.includes('support')) {
    return 'important'
  }

  return 'nice_to_have'
}

function analyzeDifferentiation(feature: string, category: string): string {
  const featureLower = feature.toLowerCase()

  if (featureLower.includes('ai') || featureLower.includes('machine learning')) {
    return 'AI-powered capability provides competitive edge'
  }
  if (featureLower.includes('real-time') || featureLower.includes('instant')) {
    return 'Speed advantage over traditional solutions'
  }
  if (featureLower.includes('custom') || featureLower.includes('personalized')) {
    return 'Tailored experience differentiates from generic offerings'
  }
  if (featureLower.includes('integration') || featureLower.includes('seamless')) {
    return 'Reduced friction compared to disconnected solutions'
  }

  return 'Standard industry capability'
}

function generateUseCases(feature: string): string[] {
  const featureLower = feature.toLowerCase()
  const useCases = []

  if (featureLower.includes('analytics') || featureLower.includes('reporting')) {
    useCases.push('Data-driven decision making')
    useCases.push('Performance monitoring and optimization')
  }
  if (featureLower.includes('automation') || featureLower.includes('workflow')) {
    useCases.push('Streamlining repetitive processes')
    useCases.push('Reducing manual errors and time')
  }
  if (featureLower.includes('integration') || featureLower.includes('api')) {
    useCases.push('Connecting disparate systems')
    useCases.push('Creating unified workflows across tools')
  }
  if (featureLower.includes('security') || featureLower.includes('compliance')) {
    useCases.push('Meeting regulatory requirements')
    useCases.push('Protecting sensitive data and systems')
  }

  return useCases
}

function assessCompetitiveAdvantage(feature: string): string {
  const featureLower = feature.toLowerCase()

  if (featureLower.includes('ai') || featureLower.includes('intelligent')) {
    return 'AI capabilities provide significant competitive advantage'
  }
  if (featureLower.includes('real-time') || featureLower.includes('instant')) {
    return 'Speed and responsiveness differentiate from competitors'
  }
  if (featureLower.includes('user-friendly') || featureLower.includes('intuitive')) {
    return 'Superior user experience reduces training time and adoption barriers'
  }

  return 'Competitive parity with market standards'
}

function clusterFeatures(analyzedFeatures: any[]): Record<string, string[]> {
  const clusters: Record<string, string[]> = {}

  analyzedFeatures.forEach(feature => {
    const cluster = feature.category
    if (!clusters[cluster]) clusters[cluster] = []
    clusters[cluster].push(feature.feature)
  })

  return clusters
}

function identifyFeatureGaps(analyzedFeatures: any[], category: string): string[] {
  const gaps = []

  // Check for common features that might be missing
  const hasSecurity = analyzedFeatures.some(f => f.category === 'Security & Compliance')
  const hasIntegration = analyzedFeatures.some(f => f.category === 'Integration & Connectivity')
  const hasAnalytics = analyzedFeatures.some(f => f.category === 'Analytics & Intelligence')

  if (!hasSecurity) gaps.push('Security and compliance features may be limited')
  if (!hasIntegration) gaps.push('Integration capabilities may need enhancement')
  if (!hasAnalytics) gaps.push('Analytics and reporting features could be expanded')

  return gaps
}

function identifyInnovationOpportunities(analyzedFeatures: any[], category: string): string[] {
  const opportunities = []

  const hasAI = analyzedFeatures.some(f => f.feature.toLowerCase().includes('ai'))
  const hasAutomation = analyzedFeatures.some(f => f.category === 'Automation & Workflow')

  if (!hasAI) opportunities.push('AI/ML integration could provide significant competitive advantage')
  if (!hasAutomation) opportunities.push('Workflow automation features could improve efficiency')

  opportunities.push('Mobile-first enhancements for remote work')
  opportunities.push('Advanced personalization using behavioral data')

  return opportunities
}

async function analyzeCompetition(productData: any, comparisonTargets?: any[]): Promise<any> {
  const { competitors, category } = productData

  // Assess market position
  const marketPosition = assessMarketPosition(productData, comparisonTargets)

  // Analyze competitive advantages
  const competitiveAdvantages = identifyCompetitiveAdvantages(productData, comparisonTargets)

  // Analyze competitive disadvantages
  const competitiveDisadvantages = identifyCompetitiveDisadvantages(productData, comparisonTargets)

  // Compare with specific competitors
  const competitorComparison = comparisonTargets ? compareWithCompetitors(productData, comparisonTargets) : []

  return {
    marketPosition,
    competitiveAdvantages,
    competitiveDisadvantages,
    competitorComparison
  }
}

function assessMarketPosition(productData: any, comparisonTargets?: any[]): string {
  if (!comparisonTargets || comparisonTargets.length === 0) {
    return 'Market leader in specialized segment'
  }

  // Simple market position assessment
  const hasUniqueFeatures = productData.keyFeatures?.some((f: string) =>
    f.toLowerCase().includes('ai') || f.toLowerCase().includes('unique') || f.toLowerCase().includes('innovative')
  )

  if (hasUniqueFeatures) return 'Innovative leader with first-mover advantage'
  return 'Strong competitor in established market'
}

function identifyCompetitiveAdvantages(productData: any, comparisonTargets?: any[]): any[] {
  const advantages = []

  if (productData.keyFeatures) {
    productData.keyFeatures.forEach((feature: string) => {
      if (feature.toLowerCase().includes('ai') || feature.toLowerCase().includes('machine learning')) {
        advantages.push({
          advantage: 'AI-powered capabilities',
          impact: 'Significant differentiation from traditional solutions',
          evidence: 'AI features provide automation and intelligence not available in competing products'
        })
      }
      if (feature.toLowerCase().includes('integration') || feature.toLowerCase().includes('seamless')) {
        advantages.push({
          advantage: 'Superior integration capabilities',
          impact: 'Reduces implementation time and technical barriers',
          evidence: 'Seamless integration reduces customer onboarding friction'
        })
      }
    })
  }

  return advantages
}

function identifyCompetitiveDisadvantages(productData: any, comparisonTargets?: any[]): any[] {
  const disadvantages = []

  // Check for potential weaknesses
  if (!productData.pricing || productData.pricing === 'premium') {
    disadvantages.push({
      disadvantage: 'Premium pricing may limit market penetration',
      mitigation: 'Focus on ROI and long-term value justification',
      priority: 'medium'
    })
  }

  if (!productData.keyFeatures?.some((f: string) => f.toLowerCase().includes('mobile'))) {
    disadvantages.push({
      disadvantage: 'Limited mobile capabilities',
      mitigation: 'Emphasize web-based accessibility and responsive design',
      priority: 'low'
    })
  }

  return disadvantages
}

function compareWithCompetitors(productData: any, comparisonTargets: any[]): any[] {
  return comparisonTargets.map(competitor => ({
    competitor: competitor.name,
    similarity: calculateSimilarity(productData, competitor),
    keyDifferences: identifyKeyDifferences(productData, competitor),
    positioning: determineCompetitivePositioning(productData, competitor)
  }))
}

function calculateSimilarity(product: any, competitor: any): number {
  // Simple similarity calculation based on features
  const productFeatures = product.keyFeatures || []
  const competitorFeatures = competitor.features || []

  const commonFeatures = productFeatures.filter((f: string) =>
    competitorFeatures.some((cf: string) => f.toLowerCase().includes(cf.toLowerCase().split(' ')[0]))
  )

  return commonFeatures.length / Math.max(productFeatures.length, competitorFeatures.length)
}

function identifyKeyDifferences(product: any, competitor: any): string[] {
  const differences = []

  if (product.keyFeatures?.some((f: string) => f.toLowerCase().includes('ai'))) {
    differences.push('AI capabilities not available in competitor solution')
  }

  if (competitor.pricing === 'enterprise_only' && product.pricing !== 'enterprise_only') {
    differences.push('More flexible pricing options available')
  }

  return differences
}

function determineCompetitivePositioning(product: any, competitor: any): string {
  const productStrengths = product.keyFeatures?.length || 0
  const competitorStrengths = competitor.strengths?.length || 0

  if (productStrengths > competitorStrengths) return 'Superior feature set'
  if (competitorStrengths > productStrengths) return 'Feature-rich competitor'
  return 'Competitive parity'
}

function generateSalesImplications(featureAnalysis: any, competitiveAnalysis: any, salesContext?: any): any {
  return {
    idealCustomerProfile: generateIdealCustomerProfile(featureAnalysis, competitiveAnalysis, salesContext),
    messagingStrategy: generateMessagingStrategy(featureAnalysis, competitiveAnalysis),
    pricingStrategy: generatePricingStrategy(featureAnalysis, competitiveAnalysis)
  }
}

function generateIdealCustomerProfile(featureAnalysis: any, competitiveAnalysis: any, salesContext?: any): any {
  const industries = []
  const companySizes = []
  const roles = []
  const painPoints = []

  // Determine based on feature analysis
  if (featureAnalysis.coreFeatures.some((f: any) => f.category === 'Security & Compliance')) {
    industries.push('Healthcare', 'Finance', 'Government')
    painPoints.push('Regulatory compliance', 'Data security')
  }

  if (featureAnalysis.coreFeatures.some((f: any) => f.category === 'Analytics & Intelligence')) {
    roles.push('CEO', 'COO', 'VP Sales', 'CMO')
    painPoints.push('Data-driven decision making', 'Performance visibility')
  }

  if (competitiveAnalysis.marketPosition.includes('enterprise')) {
    companySizes.push('Enterprise (1000+ employees)')
  } else {
    companySizes.push('Mid-market (200-1000 employees)', 'Small business (50-200 employees)')
  }

  return {
    industries,
    companySizes,
    roles,
    painPoints
  }
}

function generateMessagingStrategy(featureAnalysis: any, competitiveAnalysis: any): any {
  const keyMessages = []
  const objectionHandling = {}
  const valueDrivers = []

  // Generate key messages based on competitive advantages
  competitiveAnalysis.competitiveAdvantages.forEach((advantage: any) => {
    keyMessages.push(advantage.advantage)
    valueDrivers.push(advantage.impact)
  })

  // Generate objection handling
  competitiveAnalysis.competitiveDisadvantages.forEach((disadvantage: any) => {
    objectionHandling[disadvantage.disadvantage] = disadvantage.mitigation
  })

  return {
    keyMessages,
    objectionHandling,
    valueDrivers
  }
}

function generatePricingStrategy(featureAnalysis: any, competitiveAnalysis: any): any {
  let positioning = 'Premium'
  let justification = 'Superior capabilities and ROI'
  const negotiationPoints = []

  if (competitiveAnalysis.marketPosition.includes('innovative')) {
    positioning = 'Premium innovator'
    justification = 'First-mover advantage and advanced capabilities'
    negotiationPoints.push('Focus on long-term ROI rather than initial cost')
  }

  return {
    positioning,
    justification,
    negotiationPoints
  }
}

function generateRecommendations(featureAnalysis: any, competitiveAnalysis: any, salesContext?: any): any {
  return {
    immediateActions: generateImmediateActions(featureAnalysis, competitiveAnalysis),
    strategicImprovements: generateStrategicImprovements(featureAnalysis),
    competitiveResponses: generateCompetitiveResponses(competitiveAnalysis),
    marketOpportunities: generateMarketOpportunities(featureAnalysis, salesContext)
  }
}

function generateImmediateActions(featureAnalysis: any, competitiveAnalysis: any): string[] {
  const actions = []

  if (competitiveAnalysis.competitiveAdvantages.length > 0) {
    actions.push('Highlight top 3 competitive advantages in all sales conversations')
  }

  if (featureAnalysis.featureGaps.length > 0) {
    actions.push('Prepare responses for feature gap questions from prospects')
  }

  actions.push('Create feature comparison matrix for top 3 competitors')
  actions.push('Develop ROI calculator based on key value drivers')

  return actions
}

function generateStrategicImprovements(featureAnalysis: any): string[] {
  const improvements = []

  if (featureAnalysis.innovationOpportunities.length > 0) {
    improvements.push('Invest in AI/ML capabilities for competitive differentiation')
  }

  improvements.push('Enhance mobile and remote work capabilities')
  improvements.push('Develop advanced integration options')

  return improvements
}

function generateCompetitiveResponses(competitiveAnalysis: any): string[] {
  const responses = []

  competitiveAnalysis.competitiveDisadvantages.forEach((disadvantage: any) => {
    responses.push(`Prepare competitive response for: ${disadvantage.disadvantage}`)
  })

  responses.push('Monitor competitor pricing and feature updates')
  responses.push('Develop win/loss analysis process')

  return responses
}

function generateMarketOpportunities(featureAnalysis: any, salesContext?: any): string[] {
  const opportunities = []

  if (salesContext?.industry) {
    opportunities.push(`Target ${salesContext.industry} companies with specific industry pain points`)
  }

  opportunities.push('Focus on companies undergoing digital transformation')
  opportunities.push('Target organizations with complex integration requirements')

  return opportunities
}

function generateValueProposition(productData: any): string {
  const { name, description, category } = productData

  if (description.toLowerCase().includes('ai') || description.toLowerCase().includes('intelligent')) {
    return `${name} leverages AI to deliver intelligent ${category} solutions that adapt to your business needs.`
  }

  if (description.toLowerCase().includes('integration') || description.toLowerCase().includes('connect')) {
    return `${name} seamlessly integrates with your existing ${category} ecosystem, eliminating silos and improving efficiency.`
  }

  return `${name} delivers comprehensive ${category} capabilities that drive business results and competitive advantage.`
}

function extractUniqueSellingPoints(featureAnalysis: any, competitiveAnalysis: any): string[] {
  const usps = []

  // Extract from competitive advantages
  competitiveAnalysis.competitiveAdvantages.forEach((advantage: any) => {
    usps.push(advantage.advantage)
  })

  // Extract from unique features
  featureAnalysis.coreFeatures.forEach((feature: any) => {
    if (feature.competitiveAdvantage.includes('significant') || feature.competitiveAdvantage.includes('unique')) {
      usps.push(feature.feature)
    }
  })

  return usps.slice(0, 5) // Top 5 USPs
}