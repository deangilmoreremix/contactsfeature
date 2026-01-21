export type PricingModel = 'subscription' | 'one-time' | 'freemium' | 'custom';
export type DraftType = 'email' | 'call_script' | 'sms' | 'linkedin';
export type DraftTone = 'formal' | 'casual' | 'urgent' | 'friendly' | 'professional';
export type CompanySize = 'startup' | 'smb' | 'mid-market' | 'enterprise';
export type MatchTier = 'high' | 'medium' | 'low';

export interface PricingTier {
  name: string;
  price: string;
  period?: string;
  features: string[];
}

export interface ValueProposition {
  title: string;
  description: string;
  metrics?: string;
}

export interface UserProduct {
  id: string;
  user_id: string;
  name: string;
  tagline?: string;
  description?: string;
  category?: string;
  pricing_model: PricingModel;
  pricing_tiers: PricingTier[];
  features: string[];
  target_industries: string[];
  target_company_sizes: CompanySize[];
  target_titles: string[];
  target_departments: string[];
  ideal_customer_profile?: string;
  value_propositions: ValueProposition[];
  pain_points_addressed: string[];
  competitive_advantages: string[];
  use_cases: string[];
  collateral_urls: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  name: string;
  tagline?: string;
  description?: string;
  category?: string;
  pricing_model?: PricingModel;
  pricing_tiers?: PricingTier[];
  features?: string[];
  target_industries?: string[];
  target_company_sizes?: CompanySize[];
  target_titles?: string[];
  target_departments?: string[];
  ideal_customer_profile?: string;
  value_propositions?: ValueProposition[];
  pain_points_addressed?: string[];
  competitive_advantages?: string[];
  use_cases?: string[];
  collateral_urls?: string[];
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  is_active?: boolean;
}

export interface MatchReason {
  category: string;
  reason: string;
  score_contribution: number;
}

export interface ProductContactMatch {
  id: string;
  product_id: string;
  contact_id: string;
  user_id: string;
  match_score: number;
  match_reasons: MatchReason[];
  recommended_approach?: string;
  personalized_pitch?: string;
  why_buy_reasons: string[];
  objections_anticipated: string[];
  industry_score: number;
  company_size_score: number;
  title_score: number;
  tags_score: number;
  status_score: number;
  calculated_at: string;
}

export interface ProductContactMatchWithContact extends ProductContactMatch {
  contact: {
    id: string;
    name: string;
    email?: string;
    company?: string;
    title?: string;
    industry?: string;
    company_size?: string;
    status?: string;
    tags?: string[];
    avatar_url?: string;
  };
}

export interface PersonalizationToken {
  key: string;
  value: string;
  source: 'contact' | 'product' | 'ai_generated';
}

export interface ProductDraft {
  id: string;
  product_id: string;
  contact_id: string;
  user_id: string;
  draft_type: DraftType;
  subject?: string;
  body: string;
  tone: DraftTone;
  personalization_tokens: Record<string, PersonalizationToken>;
  is_edited: boolean;
  is_sent: boolean;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductDraftWithDetails extends ProductDraft {
  product: Pick<UserProduct, 'id' | 'name' | 'tagline'>;
  contact: {
    id: string;
    name: string;
    email?: string;
    company?: string;
    title?: string;
  };
}

export interface CreateDraftInput {
  product_id: string;
  contact_id: string;
  draft_type: DraftType;
  tone?: DraftTone;
}

export interface UpdateDraftInput {
  subject?: string;
  body?: string;
  tone?: DraftTone;
  is_edited?: boolean;
  is_sent?: boolean;
}

export interface BatchMatchRequest {
  product_id: string;
  contact_ids?: string[];
}

export interface BatchDraftRequest {
  product_id: string;
  contact_ids: string[];
  draft_type: DraftType;
  tone?: DraftTone;
}

export interface MatchScoreWeights {
  industry: number;
  company_size: number;
  title: number;
  tags: number;
  status: number;
}

export const DEFAULT_SCORE_WEIGHTS: MatchScoreWeights = {
  industry: 30,
  company_size: 20,
  title: 25,
  tags: 15,
  status: 10,
};

export const PRODUCT_CATEGORIES = [
  'SaaS',
  'Consulting',
  'Agency Services',
  'Training/Coaching',
  'Hardware',
  'Professional Services',
  'Subscription Box',
  'Marketplace',
  'Platform',
  'Other',
] as const;

export const COMMON_INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Real Estate',
  'E-commerce',
  'Manufacturing',
  'Education',
  'Legal',
  'Marketing',
  'Hospitality',
  'Retail',
  'Construction',
  'Non-profit',
  'Government',
  'Media',
  'Transportation',
  'Energy',
  'Agriculture',
] as const;

export const COMMON_DEPARTMENTS = [
  'Executive',
  'Sales',
  'Marketing',
  'Engineering',
  'Product',
  'Operations',
  'Finance',
  'HR',
  'Customer Success',
  'IT',
  'Legal',
  'Procurement',
] as const;

export const COMMON_TITLES = [
  'CEO',
  'CTO',
  'CFO',
  'COO',
  'CMO',
  'VP',
  'Director',
  'Manager',
  'Head of',
  'Lead',
  'Senior',
  'Founder',
  'Owner',
  'Partner',
] as const;

export function getMatchTier(score: number): MatchTier {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

export function getMatchTierColor(tier: MatchTier): string {
  switch (tier) {
    case 'high':
      return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'medium':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'low':
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getMatchTierLabel(tier: MatchTier): string {
  switch (tier) {
    case 'high':
      return 'High Fit';
    case 'medium':
      return 'Medium Fit';
    case 'low':
      return 'Low Fit';
  }
}
