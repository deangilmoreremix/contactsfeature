import { supabase } from '../lib/supabase';
import type { Contact } from '../types/contact';
import type {
  UserProduct,
  ProductContactMatch,
  MatchReason,
  MatchScoreWeights,
  DEFAULT_SCORE_WEIGHTS,
  CompanySize,
} from '../types/userProduct';
import { gpt52ProductIntelligenceService, AIMatchAnalysis } from './gpt52ProductIntelligenceService';
import { logger } from './logger.service';

interface ScoreResult {
  score: number;
  maxScore: number;
  reasons: MatchReason[];
}

interface AIEnhancedMatchResult {
  ruleBasedScore: number;
  aiScore: number;
  combinedScore: number;
  aiAnalysis: AIMatchAnalysis;
  matchReasons: MatchReason[];
}

interface MatchCalculationResult {
  match_score: number;
  match_reasons: MatchReason[];
  industry_score: number;
  company_size_score: number;
  title_score: number;
  tags_score: number;
  status_score: number;
  recommended_approach: string;
  why_buy_reasons: string[];
  objections_anticipated: string[];
}

const COMPANY_SIZE_MAPPING: Record<string, CompanySize[]> = {
  '1-10': ['startup'],
  '11-50': ['startup', 'smb'],
  '51-200': ['smb'],
  '201-500': ['smb', 'mid-market'],
  '501-1000': ['mid-market'],
  '1001-5000': ['mid-market', 'enterprise'],
  '5000+': ['enterprise'],
  'startup': ['startup'],
  'small': ['startup', 'smb'],
  'medium': ['smb', 'mid-market'],
  'large': ['mid-market', 'enterprise'],
  'enterprise': ['enterprise'],
};

const QUALIFIED_STATUSES = ['hot', 'warm', 'qualified', 'opportunity', 'proposal'];
const SEMI_QUALIFIED_STATUSES = ['new', 'contacted', 'meeting scheduled'];

export class ProductMatchingService {
  private weights: MatchScoreWeights;

  constructor(weights: MatchScoreWeights = DEFAULT_SCORE_WEIGHTS) {
    this.weights = weights;
  }

  calculateIndustryScore(product: UserProduct, contact: Contact): ScoreResult {
    const reasons: MatchReason[] = [];
    const maxScore = this.weights.industry;

    if (!product.target_industries.length) {
      return { score: maxScore, maxScore, reasons: [{
        category: 'Industry',
        reason: 'No industry targeting specified - all industries considered a fit',
        score_contribution: maxScore
      }]};
    }

    const contactIndustry = (contact.industry || '').toLowerCase();
    const targetIndustries = product.target_industries.map(i => i.toLowerCase());

    if (!contactIndustry) {
      return { score: Math.floor(maxScore * 0.3), maxScore, reasons: [{
        category: 'Industry',
        reason: 'Contact industry unknown - partial score applied',
        score_contribution: Math.floor(maxScore * 0.3)
      }]};
    }

    const exactMatch = targetIndustries.some(ti =>
      contactIndustry === ti || contactIndustry.includes(ti) || ti.includes(contactIndustry)
    );

    if (exactMatch) {
      const matchedIndustry = product.target_industries.find(ti =>
        contactIndustry.includes(ti.toLowerCase()) || ti.toLowerCase().includes(contactIndustry)
      );
      reasons.push({
        category: 'Industry',
        reason: `Works in ${matchedIndustry || contact.industry} - your primary target industry`,
        score_contribution: maxScore
      });
      return { score: maxScore, maxScore, reasons };
    }

    return { score: 0, maxScore, reasons: [{
      category: 'Industry',
      reason: `${contact.industry || 'Unknown'} industry not in your target list`,
      score_contribution: 0
    }]};
  }

  calculateCompanySizeScore(product: UserProduct, contact: Contact): ScoreResult {
    const reasons: MatchReason[] = [];
    const maxScore = this.weights.company_size;

    if (!product.target_company_sizes.length) {
      return { score: maxScore, maxScore, reasons: [{
        category: 'Company Size',
        reason: 'No company size targeting specified - all sizes considered a fit',
        score_contribution: maxScore
      }]};
    }

    const contactSize = (contact.company_size || contact.employees || '').toLowerCase();

    if (!contactSize) {
      return { score: Math.floor(maxScore * 0.3), maxScore, reasons: [{
        category: 'Company Size',
        reason: 'Company size unknown - partial score applied',
        score_contribution: Math.floor(maxScore * 0.3)
      }]};
    }

    const mappedSizes = COMPANY_SIZE_MAPPING[contactSize] || [];
    const hasOverlap = product.target_company_sizes.some(ts => mappedSizes.includes(ts));

    if (hasOverlap) {
      const matchedSize = product.target_company_sizes.find(ts => mappedSizes.includes(ts));
      reasons.push({
        category: 'Company Size',
        reason: `Company is ${contactSize} - matches your ${matchedSize} target`,
        score_contribution: maxScore
      });
      return { score: maxScore, maxScore, reasons };
    }

    return { score: 0, maxScore, reasons: [{
      category: 'Company Size',
      reason: `Company size (${contactSize}) outside your target range`,
      score_contribution: 0
    }]};
  }

  calculateTitleScore(product: UserProduct, contact: Contact): ScoreResult {
    const reasons: MatchReason[] = [];
    const maxScore = this.weights.title;

    if (!product.target_titles.length && !product.target_departments.length) {
      return { score: maxScore, maxScore, reasons: [{
        category: 'Title/Role',
        reason: 'No title targeting specified - all roles considered a fit',
        score_contribution: maxScore
      }]};
    }

    const contactTitle = (contact.title || contact.job_title || '').toLowerCase();
    const contactDepartment = (contact.department || '').toLowerCase();

    if (!contactTitle && !contactDepartment) {
      return { score: Math.floor(maxScore * 0.3), maxScore, reasons: [{
        category: 'Title/Role',
        reason: 'Contact role unknown - partial score applied',
        score_contribution: Math.floor(maxScore * 0.3)
      }]};
    }

    let score = 0;
    const targetTitles = product.target_titles.map(t => t.toLowerCase());
    const targetDepts = product.target_departments.map(d => d.toLowerCase());

    const titleMatch = targetTitles.some(tt =>
      contactTitle.includes(tt) || tt.includes(contactTitle)
    );

    const deptMatch = targetDepts.some(td =>
      contactDepartment.includes(td) || td.includes(contactDepartment) ||
      contactTitle.includes(td)
    );

    if (titleMatch) {
      const matchedTitle = product.target_titles.find(tt =>
        contactTitle.includes(tt.toLowerCase())
      );
      score += maxScore * 0.7;
      reasons.push({
        category: 'Title',
        reason: `${contact.title || contact.job_title} matches target title "${matchedTitle}"`,
        score_contribution: Math.floor(maxScore * 0.7)
      });
    }

    if (deptMatch) {
      const matchedDept = product.target_departments.find(td =>
        contactDepartment.includes(td.toLowerCase()) || contactTitle.includes(td.toLowerCase())
      );
      score += maxScore * 0.3;
      reasons.push({
        category: 'Department',
        reason: `Works in ${matchedDept || contactDepartment} department - key decision area`,
        score_contribution: Math.floor(maxScore * 0.3)
      });
    }

    if (score === 0) {
      reasons.push({
        category: 'Title/Role',
        reason: `Role "${contact.title || 'Unknown'}" not in your target list`,
        score_contribution: 0
      });
    }

    return { score: Math.min(score, maxScore), maxScore, reasons };
  }

  calculateTagsScore(product: UserProduct, contact: Contact): ScoreResult {
    const reasons: MatchReason[] = [];
    const maxScore = this.weights.tags;

    const contactTags = contact.tags || [];
    if (!contactTags.length) {
      return { score: Math.floor(maxScore * 0.5), maxScore, reasons: [{
        category: 'Tags',
        reason: 'No tags on contact - neutral score',
        score_contribution: Math.floor(maxScore * 0.5)
      }]};
    }

    const productKeywords = [
      ...product.features,
      ...product.pain_points_addressed,
      ...product.use_cases,
      product.category || '',
    ].map(k => k.toLowerCase()).filter(Boolean);

    const tagMatches = contactTags.filter(tag =>
      productKeywords.some(pk =>
        tag.toLowerCase().includes(pk) || pk.includes(tag.toLowerCase())
      )
    );

    if (tagMatches.length > 0) {
      const score = Math.min(maxScore, (tagMatches.length / contactTags.length) * maxScore * 1.5);
      reasons.push({
        category: 'Tags',
        reason: `Tags "${tagMatches.join(', ')}" align with your product focus`,
        score_contribution: Math.floor(score)
      });
      return { score: Math.floor(score), maxScore, reasons };
    }

    return { score: Math.floor(maxScore * 0.3), maxScore, reasons: [{
      category: 'Tags',
      reason: 'Contact tags do not strongly align with product keywords',
      score_contribution: Math.floor(maxScore * 0.3)
    }]};
  }

  calculateStatusScore(product: UserProduct, contact: Contact): ScoreResult {
    const reasons: MatchReason[] = [];
    const maxScore = this.weights.status;

    const contactStatus = (contact.status || '').toLowerCase();

    if (!contactStatus) {
      return { score: Math.floor(maxScore * 0.5), maxScore, reasons: [{
        category: 'Status',
        reason: 'Contact status unknown - neutral score',
        score_contribution: Math.floor(maxScore * 0.5)
      }]};
    }

    if (QUALIFIED_STATUSES.some(s => contactStatus.includes(s))) {
      reasons.push({
        category: 'Status',
        reason: `Contact is "${contact.status}" - high qualification level`,
        score_contribution: maxScore
      });
      return { score: maxScore, maxScore, reasons };
    }

    if (SEMI_QUALIFIED_STATUSES.some(s => contactStatus.includes(s))) {
      const score = Math.floor(maxScore * 0.6);
      reasons.push({
        category: 'Status',
        reason: `Contact is "${contact.status}" - moderate qualification`,
        score_contribution: score
      });
      return { score, maxScore, reasons };
    }

    return { score: 0, maxScore, reasons: [{
      category: 'Status',
      reason: `Contact status "${contact.status}" indicates low readiness`,
      score_contribution: 0
    }]};
  }

  generateRecommendedApproach(product: UserProduct, contact: Contact, matchScore: number): string {
    const tier = matchScore >= 80 ? 'high' : matchScore >= 50 ? 'medium' : 'low';
    const hasEmail = !!contact.email;
    const hasPhone = !!contact.phone;
    const title = (contact.title || '').toLowerCase();
    const isExecutive = ['ceo', 'cto', 'cfo', 'coo', 'vp', 'director', 'head', 'chief'].some(t => title.includes(t));

    if (tier === 'high') {
      if (isExecutive) {
        return 'Direct outreach with executive-level value proposition. Lead with ROI metrics and strategic outcomes. Consider warm introduction if available.';
      }
      return 'Priority outreach recommended. Personalize with specific pain points and use cases relevant to their role.';
    }

    if (tier === 'medium') {
      return 'Nurture campaign suggested. Share educational content first, then follow up with product-specific value after engagement.';
    }

    return 'Add to awareness campaign. Low-touch approach with broad educational content until profile data improves.';
  }

  generateWhyBuyReasons(product: UserProduct, contact: Contact): string[] {
    const reasons: string[] = [];
    const industry = contact.industry || 'their industry';
    const company = contact.company || 'their company';

    if (product.pain_points_addressed.length > 0) {
      reasons.push(`Addresses common ${industry} challenges: ${product.pain_points_addressed.slice(0, 2).join(', ')}`);
    }

    if (product.competitive_advantages.length > 0) {
      reasons.push(`Unique advantage: ${product.competitive_advantages[0]}`);
    }

    if (product.value_propositions.length > 0) {
      const vp = product.value_propositions[0];
      reasons.push(`${vp.title}: ${vp.description}`);
    }

    if (product.use_cases.length > 0) {
      reasons.push(`Proven use case: ${product.use_cases[0]}`);
    }

    reasons.push(`Designed for ${product.target_company_sizes.join('/')} companies like ${company}`);

    return reasons.slice(0, 5);
  }

  generateObjectionsAnticipated(product: UserProduct, contact: Contact): string[] {
    const objections: string[] = [];
    const companySize = (contact.company_size || '').toLowerCase();

    if (companySize.includes('startup') || companySize.includes('small')) {
      objections.push('Budget constraints - emphasize ROI and flexible pricing');
    }

    if (companySize.includes('enterprise') || companySize.includes('large')) {
      objections.push('Integration complexity - highlight existing integrations and support');
      objections.push('Procurement process - prepare for longer sales cycle');
    }

    if (product.pricing_model === 'subscription') {
      objections.push('Ongoing costs - demonstrate long-term value over one-time solutions');
    }

    objections.push('Current solution satisfaction - focus on gaps and improvement areas');
    objections.push('Implementation time - clarify onboarding process and timeline');

    return objections.slice(0, 5);
  }

  calculateMatch(product: UserProduct, contact: Contact): MatchCalculationResult {
    const industryResult = this.calculateIndustryScore(product, contact);
    const companySizeResult = this.calculateCompanySizeScore(product, contact);
    const titleResult = this.calculateTitleScore(product, contact);
    const tagsResult = this.calculateTagsScore(product, contact);
    const statusResult = this.calculateStatusScore(product, contact);

    const totalScore = industryResult.score + companySizeResult.score +
                       titleResult.score + tagsResult.score + statusResult.score;

    const allReasons = [
      ...industryResult.reasons,
      ...companySizeResult.reasons,
      ...titleResult.reasons,
      ...tagsResult.reasons,
      ...statusResult.reasons,
    ].sort((a, b) => b.score_contribution - a.score_contribution);

    return {
      match_score: Math.round(totalScore),
      match_reasons: allReasons,
      industry_score: industryResult.score,
      company_size_score: companySizeResult.score,
      title_score: titleResult.score,
      tags_score: tagsResult.score,
      status_score: statusResult.score,
      recommended_approach: this.generateRecommendedApproach(product, contact, totalScore),
      why_buy_reasons: this.generateWhyBuyReasons(product, contact),
      objections_anticipated: this.generateObjectionsAnticipated(product, contact),
    };
  }

  async calculateAndSaveMatch(
    product: UserProduct,
    contact: Contact,
    userId: string
  ): Promise<ProductContactMatch | null> {
    const matchResult = this.calculateMatch(product, contact);

    const { data, error } = await supabase
      .from('product_contact_matches')
      .upsert({
        product_id: product.id,
        contact_id: contact.id,
        user_id: userId,
        ...matchResult,
        calculated_at: new Date().toISOString(),
      }, {
        onConflict: 'product_id,contact_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving match:', error);
      return null;
    }

    return data as ProductContactMatch;
  }

  async batchCalculateMatches(
    product: UserProduct,
    contacts: Contact[],
    userId: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<ProductContactMatch[]> {
    const matches: ProductContactMatch[] = [];
    const batchSize = 50;

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      const batchMatches = batch.map(contact => {
        const matchResult = this.calculateMatch(product, contact);
        return {
          product_id: product.id,
          contact_id: contact.id,
          user_id: userId,
          ...matchResult,
          calculated_at: new Date().toISOString(),
        };
      });

      const { data, error } = await supabase
        .from('product_contact_matches')
        .upsert(batchMatches, {
          onConflict: 'product_id,contact_id',
        })
        .select();

      if (error) {
        console.error('Error in batch save:', error);
      } else if (data) {
        matches.push(...(data as ProductContactMatch[]));
      }

      if (onProgress) {
        onProgress(Math.min(i + batchSize, contacts.length), contacts.length);
      }
    }

    return matches;
  }

  async calculateAIEnhancedMatch(
    product: UserProduct,
    contact: Contact,
    reasoningEffort: 'none' | 'low' | 'medium' | 'high' = 'medium'
  ): Promise<AIEnhancedMatchResult> {
    logger.info('Starting AI-enhanced match calculation', {
      productId: product.id,
      contactId: contact.id,
      reasoningEffort
    });

    const ruleBasedResult = this.calculateMatch(product, contact);
    const aiAnalysis = await gpt52ProductIntelligenceService.analyzeContactMatch(
      product,
      contact,
      reasoningEffort
    );

    const aiWeight = reasoningEffort === 'high' ? 0.6 : reasoningEffort === 'medium' ? 0.5 : 0.3;
    const ruleWeight = 1 - aiWeight;

    const combinedScore = Math.round(
      (ruleBasedResult.match_score * ruleWeight) + (aiAnalysis.semanticScore * aiWeight)
    );

    const aiReasons: MatchReason[] = aiAnalysis.talkingPoints.map(tp => ({
      category: 'AI Insight',
      reason: tp.content,
      score_contribution: tp.relevance === 'high' ? 15 : tp.relevance === 'medium' ? 10 : 5
    }));

    return {
      ruleBasedScore: ruleBasedResult.match_score,
      aiScore: aiAnalysis.semanticScore,
      combinedScore,
      aiAnalysis,
      matchReasons: [...ruleBasedResult.match_reasons, ...aiReasons]
        .sort((a, b) => b.score_contribution - a.score_contribution)
    };
  }

  async calculateAndSaveAIEnhancedMatch(
    product: UserProduct,
    contact: Contact,
    userId: string,
    reasoningEffort: 'none' | 'low' | 'medium' | 'high' = 'medium'
  ): Promise<ProductContactMatch | null> {
    try {
      const aiResult = await this.calculateAIEnhancedMatch(product, contact, reasoningEffort);
      const ruleBasedResult = this.calculateMatch(product, contact);

      const { data, error } = await supabase
        .from('product_contact_matches')
        .upsert({
          product_id: product.id,
          contact_id: contact.id,
          user_id: userId,
          match_score: aiResult.combinedScore,
          match_reasons: aiResult.matchReasons,
          industry_score: ruleBasedResult.industry_score,
          company_size_score: ruleBasedResult.company_size_score,
          title_score: ruleBasedResult.title_score,
          tags_score: ruleBasedResult.tags_score,
          status_score: ruleBasedResult.status_score,
          recommended_approach: ruleBasedResult.recommended_approach,
          why_buy_reasons: ruleBasedResult.why_buy_reasons,
          objections_anticipated: ruleBasedResult.objections_anticipated,
          ai_confidence: aiResult.aiAnalysis.aiConfidence,
          ai_reasoning: aiResult.aiAnalysis.aiReasoning,
          ai_talking_points: aiResult.aiAnalysis.talkingPoints,
          ai_objections: aiResult.aiAnalysis.anticipatedObjections,
          predicted_conversion: aiResult.aiAnalysis.predictedConversion,
          optimal_outreach_time: aiResult.aiAnalysis.optimalOutreachTime,
          ai_processed_at: new Date().toISOString(),
          calculated_at: new Date().toISOString(),
        }, {
          onConflict: 'product_id,contact_id',
        })
        .select()
        .single();

      if (error) {
        logger.error('Error saving AI-enhanced match', error);
        return null;
      }

      return data as ProductContactMatch;
    } catch (error) {
      logger.error('AI-enhanced match calculation failed', error as Error);
      return this.calculateAndSaveMatch(product, contact, userId);
    }
  }

  async batchCalculateAIEnhancedMatches(
    product: UserProduct,
    contacts: Contact[],
    userId: string,
    reasoningEffort: 'none' | 'low' | 'medium' | 'high' = 'low',
    onProgress?: (completed: number, total: number, currentContact?: string) => void
  ): Promise<ProductContactMatch[]> {
    logger.info('Starting batch AI-enhanced matching', {
      productId: product.id,
      contactCount: contacts.length,
      reasoningEffort
    });

    const matches: ProductContactMatch[] = [];

    const aiResults = await gpt52ProductIntelligenceService.batchAnalyzeMatches(
      product,
      contacts,
      (completed, total) => {
        if (onProgress) {
          const currentContact = contacts[completed - 1]?.name || '';
          onProgress(completed, total, currentContact);
        }
      }
    );

    const batchSize = 50;
    const contactsWithAI = contacts.map(contact => ({
      contact,
      aiAnalysis: aiResults.get(contact.id)
    }));

    for (let i = 0; i < contactsWithAI.length; i += batchSize) {
      const batch = contactsWithAI.slice(i, i + batchSize);

      const batchMatches = batch.map(({ contact, aiAnalysis }) => {
        const ruleBasedResult = this.calculateMatch(product, contact);

        if (aiAnalysis) {
          const aiWeight = reasoningEffort === 'high' ? 0.6 : reasoningEffort === 'medium' ? 0.5 : 0.3;
          const ruleWeight = 1 - aiWeight;
          const combinedScore = Math.round(
            (ruleBasedResult.match_score * ruleWeight) + (aiAnalysis.semanticScore * aiWeight)
          );

          return {
            product_id: product.id,
            contact_id: contact.id,
            user_id: userId,
            match_score: combinedScore,
            match_reasons: ruleBasedResult.match_reasons,
            industry_score: ruleBasedResult.industry_score,
            company_size_score: ruleBasedResult.company_size_score,
            title_score: ruleBasedResult.title_score,
            tags_score: ruleBasedResult.tags_score,
            status_score: ruleBasedResult.status_score,
            recommended_approach: ruleBasedResult.recommended_approach,
            why_buy_reasons: ruleBasedResult.why_buy_reasons,
            objections_anticipated: ruleBasedResult.objections_anticipated,
            ai_confidence: aiAnalysis.aiConfidence,
            ai_reasoning: aiAnalysis.aiReasoning,
            ai_talking_points: aiAnalysis.talkingPoints,
            ai_objections: aiAnalysis.anticipatedObjections,
            predicted_conversion: aiAnalysis.predictedConversion,
            optimal_outreach_time: aiAnalysis.optimalOutreachTime,
            ai_processed_at: new Date().toISOString(),
            calculated_at: new Date().toISOString(),
          };
        }

        return {
          product_id: product.id,
          contact_id: contact.id,
          user_id: userId,
          ...ruleBasedResult,
          calculated_at: new Date().toISOString(),
        };
      });

      const { data, error } = await supabase
        .from('product_contact_matches')
        .upsert(batchMatches, {
          onConflict: 'product_id,contact_id',
        })
        .select();

      if (error) {
        logger.error('Error in batch AI-enhanced save', error);
      } else if (data) {
        matches.push(...(data as ProductContactMatch[]));
      }
    }

    logger.info('Batch AI-enhanced matching complete', {
      totalMatches: matches.length,
      aiEnhancedCount: Array.from(aiResults.values()).length
    });

    return matches;
  }

  async enrichMatchWithWebResearch(
    product: UserProduct,
    contact: Contact,
    matchId: string
  ): Promise<void> {
    logger.info('Enriching match with web research', { matchId, contactId: contact.id });

    try {
      const enrichments = await gpt52ProductIntelligenceService.enrichContactWithWebResearch(
        contact,
        product
      );

      const enrichmentData: Record<string, any> = {};
      enrichments.forEach(e => {
        enrichmentData[e.type] = {
          data: e.data,
          sources: e.sources,
          fetchedAt: new Date().toISOString()
        };
      });

      await supabase
        .from('product_contact_matches')
        .update({
          ai_enrichment_data: enrichmentData,
          ai_processed_at: new Date().toISOString()
        })
        .eq('id', matchId);

      logger.info('Match enrichment complete', { matchId, enrichmentTypes: Object.keys(enrichmentData) });
    } catch (error) {
      logger.error('Match enrichment failed', error as Error);
    }
  }
}

export const productMatchingService = new ProductMatchingService();
