// AI Product Intelligence Types
export interface AnalysisInput {
  url?: string | undefined;
  documents?: File[] | undefined;
  businessName?: string | undefined;
}

export interface AnalysisResults {
  company: CompanyAnalysis;
  product: ProductAnalysis;
  contacts: ContactAnalysis[];
  market: MarketAnalysis;
  financial: FinancialAnalysis;
  sources: AnalysisSource[];
  confidence: number;
  analysisId: string;
  timestamp: Date;
}

export interface CompanyAnalysis {
  name: string;
  industry: string;
  size: string;
  founded?: number;
  location: string;
  description: string;
  website?: string;
  socialProfiles: { [key: string]: string };
}

export interface ProductAnalysis {
  name: string;
  category: string;
  pricing: PricingInfo;
  features: string[];
  targetMarket: string;
  competitiveAdvantages: string[];
  useCases: string[];
}

export interface PricingInfo {
  model: 'subscription' | 'one-time' | 'freemium' | 'enterprise';
  ranges: {
    min: number;
    max: number;
    currency: string;
  };
  examples: string[];
}

export interface ContactAnalysis {
  name: string;
  title: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  confidence: number;
  role: 'decision-maker' | 'influencer' | 'user';
}

export interface MarketAnalysis {
  size: string;
  growth: string;
  competitors: string[];
  trends: string[];
  opportunities: string[];
  threats: string[];
}

export interface FinancialAnalysis {
  revenue?: string;
  funding?: string;
  valuation?: string;
  profitability?: string;
  growthMetrics?: {
    revenue: string;
    users: string;
    marketShare: string;
  };
}

export interface AnalysisSource {
  type: 'web' | 'document' | 'social' | 'news';
  url?: string;
  title: string;
  confidence: number;
  snippet: string;
  timestamp: Date;
}

// Generated Content Types
export interface GeneratedContent {
  emails: EmailContent[];
  callScripts: CallScript[];
  smsMessages: SMSContent[];
  discoveryQuestions: QuestionSet;
  salesPlaybook: PlaybookData;
  communicationOptimization: OptimizedContent;
  dealHealthAnalysis: HealthAnalysis;
}

export interface EmailContent {
  id: string;
  subject: string;
  body: string;
  template: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  optimalSendTime?: Date;
  abTestVariants?: EmailContent[];
}

export interface CallScript {
  id: string;
  name: string;
  purpose: string;
  duration: number; // minutes
  steps: string[];
  talkingPoints: string[];
  objectionHandling: { [objection: string]: string };
  successMetrics: string[];
}

export interface SMSContent {
  id: string;
  message: string;
  purpose: string;
  optimalSendTime?: Date;
  followUpDelay?: number; // minutes
}

export interface QuestionSet {
  qualification: string[];
  discovery: string[];
  technical: string[];
  budget: string[];
  timeline: string[];
  decision: string[];
}

export interface PlaybookData {
  id: string;
  name: string;
  phases: PlaybookPhase[];
  estimatedDuration: number; // days
  successRate: number;
  targetDealSize: number;
}

export interface PlaybookPhase {
  id: string;
  name: string;
  order: number;
  activities: PlaybookActivity[];
  duration: number; // days
  successCriteria: string[];
}

export interface PlaybookActivity {
  type: 'email' | 'call' | 'meeting' | 'demo' | 'proposal' | 'follow-up';
  description: string;
  template?: string;
  timing: string;
  owner: string;
}

export interface OptimizedContent {
  originalContent: string;
  optimizedContent: string;
  improvements: string[];
  score: number;
  suggestions: string[];
}

export interface HealthAnalysis {
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  nextSteps: string[];
  warningSigns: string[];
  positiveIndicators: string[];
}

// CRM Integration Types
export interface CRMProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  pricing: PricingInfo;
  features: string[];
  targetMarket: string;
  competitors: string[];
  analysisId: string;
}

export interface CRMSalesOpportunity {
  id: string;
  productId: string;
  contactIds: string[];
  value: number;
  probability: number;
  stage: string;
  expectedCloseDate?: Date;
  generatedContent: GeneratedContent;
  analysisId: string;
}

// Workflow Types
export interface AutomatedWorkflow {
  id: string;
  opportunityId: string;
  status: 'pending' | 'active' | 'completed' | 'paused';
  steps: WorkflowStep[];
  currentStep: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStep {
  id: string;
  type: 'email' | 'call' | 'sms' | 'task' | 'meeting';
  status: 'pending' | 'completed' | 'failed' | 'skipped';
  scheduledFor?: Date;
  completedAt?: Date;
  contentId?: string;
  contactId?: string;
  notes?: string;
}

// Service Types
export interface AnalysisProgress {
  stage: 'input' | 'uploading' | 'analyzing' | 'generating' | 'integrating' | 'complete';
  progress: number;
  message: string;
  currentStep?: number;
  totalSteps?: number;
}

export interface AnalysisError {
  type: 'network' | 'parsing' | 'validation' | 'generation' | 'integration';
  message: string;
  details?: any;
  recoverable: boolean;
}