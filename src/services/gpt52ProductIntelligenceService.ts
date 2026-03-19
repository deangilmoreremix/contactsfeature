import { gpt51ResponsesService, GPT51Request, GPT51Response } from './gpt51ResponsesService';
import { webSearchService } from './webSearchService';
import { logger } from './logger.service';
import { supabase } from '../lib/supabase';
import type { Contact } from '../types/contact';
import type { UserProduct, ProductContactMatch } from '../types/userProduct';

export interface AIMatchAnalysis {
  aiConfidence: number;
  aiReasoning: string;
  semanticScore: number;
  talkingPoints: TalkingPoint[];
  anticipatedObjections: Objection[];
  predictedConversion: number;
  optimalOutreachTime: string;
  competitivePositioning: string;
  personalizationInsights: string[];
}

export interface TalkingPoint {
  topic: string;
  content: string;
  relevance: 'high' | 'medium' | 'low';
  source?: string;
}

export interface Objection {
  objection: string;
  response: string;
  likelihood: 'high' | 'medium' | 'low';
}

export interface ProductSuggestion {
  type: string;
  content: any;
  reasoning: string;
  confidence: number;
}

export interface EnrichmentResult {
  type: string;
  data: any;
  sources: Array<{ url: string; title: string; domain: string }>;
  expiresAt: Date;
}

export interface AIContentGeneration {
  subject?: string;
  body: string;
  callToAction: string;
  personalizationTokens: Record<string, string>;
  reasoning: string;
  alternativeVersions?: string[];
}

type ReasoningEffort = 'none' | 'low' | 'medium' | 'high';

class GPT52ProductIntelligenceService {
  private static instance: GPT52ProductIntelligenceService;
  private conversationHistory: Map<string, string> = new Map();

  static getInstance(): GPT52ProductIntelligenceService {
    if (!GPT52ProductIntelligenceService.instance) {
      GPT52ProductIntelligenceService.instance = new GPT52ProductIntelligenceService();
    }
    return GPT52ProductIntelligenceService.instance;
  }

  async analyzeContactMatch(
    product: UserProduct,
    contact: Contact,
    reasoningEffort: ReasoningEffort = 'high'
  ): Promise<AIMatchAnalysis> {
    logger.info('Starting AI match analysis', {
      productId: product.id,
      contactId: contact.id,
      reasoningEffort
    });

    const prompt = this.buildMatchAnalysisPrompt(product, contact);

    try {
      const response = await gpt51ResponsesService.createResponse({
        model: 'gpt-5.2',
        input: prompt,
        reasoning: { effort: reasoningEffort },
        text: { verbosity: 'high' },
        max_output_tokens: 3000,
        instructions: `You are an expert sales intelligence analyst. Analyze the fit between the product and contact.
Return your analysis as valid JSON with this exact structure:
{
  "aiConfidence": number (0-100),
  "aiReasoning": string,
  "semanticScore": number (0-100),
  "talkingPoints": [{"topic": string, "content": string, "relevance": "high"|"medium"|"low"}],
  "anticipatedObjections": [{"objection": string, "response": string, "likelihood": "high"|"medium"|"low"}],
  "predictedConversion": number (0-100),
  "optimalOutreachTime": string,
  "competitivePositioning": string,
  "personalizationInsights": [string]
}`
      });

      return this.parseMatchAnalysisResponse(response, product, contact);
    } catch (error) {
      logger.error('AI match analysis failed', error as Error);
      return this.getFallbackMatchAnalysis(product, contact);
    }
  }

  async enrichContactWithWebResearch(
    contact: Contact,
    product: UserProduct
  ): Promise<EnrichmentResult[]> {
    logger.info('Starting web enrichment for contact', {
      contactId: contact.id,
      contactName: contact.name,
      company: contact.company
    });

    const enrichments: EnrichmentResult[] = [];
    const searchQueries = this.buildEnrichmentQueries(contact, product);

    for (const query of searchQueries) {
      try {
        const result = await webSearchService.searchWithAI(
          query.query,
          'You are a sales intelligence researcher. Find relevant business information.',
          query.userPrompt,
          {
            searchContextSize: 'high',
            includeSources: true
          }
        );

        enrichments.push({
          type: query.type,
          data: {
            content: result.content,
            summary: this.extractKeySummary(result.content),
            keyFacts: this.extractKeyFacts(result.content)
          },
          sources: result.sources,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
      } catch (error) {
        logger.warn(`Enrichment query failed: ${query.type}`, error as Error);
      }
    }

    await this.saveEnrichments(contact.id, enrichments);

    return enrichments;
  }

  async generateProductSuggestions(
    product: UserProduct,
    conversationId?: string
  ): Promise<ProductSuggestion[]> {
    logger.info('Generating AI product suggestions', { productId: product.id });

    const previousResponseId = conversationId ? this.conversationHistory.get(conversationId) : undefined;

    const prompt = `Analyze this product and suggest improvements:

Product Name: ${product.name}
Description: ${product.description || 'Not provided'}
Target Industries: ${product.target_industries?.join(', ') || 'Not specified'}
Target Titles: ${product.target_titles?.join(', ') || 'Not specified'}
Pain Points Addressed: ${product.pain_points_addressed?.join(', ') || 'Not specified'}
Value Propositions: ${product.value_propositions?.join(', ') || 'Not specified'}

Provide suggestions to improve targeting and positioning. Return as JSON array:
[{
  "type": "target_industry"|"target_title"|"pain_point"|"value_proposition"|"competitive_advantage"|"ideal_customer_profile",
  "content": object with suggestion details,
  "reasoning": string explaining why this suggestion,
  "confidence": number 0-100
}]`;

    try {
      const response = await gpt51ResponsesService.createResponse({
        model: 'gpt-5.2',
        input: prompt,
        reasoning: { effort: 'high' },
        text: { verbosity: 'high' },
        max_output_tokens: 2500,
        previous_response_id: previousResponseId
      });

      if (conversationId) {
        this.conversationHistory.set(conversationId, response.id);
      }

      return this.parseSuggestions(response.output_text);
    } catch (error) {
      logger.error('Failed to generate product suggestions', error as Error);
      return [];
    }
  }

  async generatePersonalizedContent(
    product: UserProduct,
    contact: Contact,
    match: ProductContactMatch,
    contentType: 'email' | 'call_script' | 'linkedin_message' | 'sms',
    tone: 'formal' | 'casual' | 'urgent' | 'friendly' | 'professional' = 'professional'
  ): Promise<AIContentGeneration> {
    logger.info('Generating personalized content', {
      contentType,
      tone,
      contactId: contact.id,
      productId: product.id
    });

    const enrichmentData = match.ai_enrichment_data || {};

    const prompt = `Generate a highly personalized ${contentType} for this sales outreach:

PRODUCT:
- Name: ${product.name}
- Value Props: ${product.value_propositions?.join(', ') || 'Not specified'}
- Pain Points Solved: ${product.pain_points_addressed?.join(', ') || 'Not specified'}

CONTACT:
- Name: ${contact.name}
- Title: ${contact.title || contact.job_title || 'Unknown'}
- Company: ${contact.company || 'Unknown'}
- Industry: ${contact.industry || 'Unknown'}

MATCH CONTEXT:
- Match Score: ${match.match_score}%
- Key Reasons: ${match.match_reasons?.map((r: any) => r.reason).join('; ') || 'Not analyzed'}
- Talking Points: ${JSON.stringify(match.ai_talking_points || [])}

ENRICHMENT DATA:
${JSON.stringify(enrichmentData, null, 2)}

TONE: ${tone}

Return as JSON:
{
  "subject": string (for email only),
  "body": string,
  "callToAction": string,
  "personalizationTokens": {"key": "value"},
  "reasoning": string explaining personalization choices,
  "alternativeVersions": [string] (2 alternatives)
}`;

    try {
      const response = await gpt51ResponsesService.createResponse({
        model: 'gpt-5.2',
        input: prompt,
        reasoning: { effort: 'high' },
        text: { verbosity: 'high' },
        max_output_tokens: 2000
      });

      return this.parseContentGeneration(response.output_text, contentType);
    } catch (error) {
      logger.error('Content generation failed', error as Error);
      return this.getFallbackContent(product, contact, contentType, tone);
    }
  }

  async refineContentWithFeedback(
    originalContent: string,
    feedback: string,
    conversationId: string
  ): Promise<AIContentGeneration> {
    const previousResponseId = this.conversationHistory.get(conversationId);

    const prompt = `Refine this content based on feedback:

ORIGINAL:
${originalContent}

FEEDBACK:
${feedback}

Apply the feedback and return improved content in the same JSON format as before.`;

    try {
      const response = await gpt51ResponsesService.createResponse({
        model: 'gpt-5.2',
        input: prompt,
        reasoning: { effort: 'medium' },
        text: { verbosity: 'medium' },
        max_output_tokens: 1500,
        previous_response_id: previousResponseId
      });

      this.conversationHistory.set(conversationId, response.id);

      return this.parseContentGeneration(response.output_text, 'email');
    } catch (error) {
      logger.error('Content refinement failed', error as Error);
      throw error;
    }
  }

  async batchAnalyzeMatches(
    product: UserProduct,
    contacts: Contact[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, AIMatchAnalysis>> {
    logger.info('Starting batch AI analysis', {
      productId: product.id,
      contactCount: contacts.length
    });

    const results = new Map<string, AIMatchAnalysis>();
    const batchSize = 5;

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);

      const batchPromises = batch.map(async (contact) => {
        const analysis = await this.analyzeContactMatch(product, contact, 'medium');
        return { contactId: contact.id, analysis };
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.set(result.value.contactId, result.value.analysis);
        }
      });

      if (onProgress) {
        onProgress(Math.min(i + batchSize, contacts.length), contacts.length);
      }

      if (i + batchSize < contacts.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  async getConversationalAssistance(
    userMessage: string,
    context: {
      product?: UserProduct;
      contact?: Contact;
      currentStep?: string;
    },
    conversationId: string
  ): Promise<{ response: string; suggestions?: string[] }> {
    const previousResponseId = this.conversationHistory.get(conversationId);

    let systemContext = 'You are a helpful AI sales assistant helping the user set up their product for prospecting.';

    if (context.product) {
      systemContext += `\n\nCurrent product: ${context.product.name}`;
      if (context.product.description) {
        systemContext += `\nDescription: ${context.product.description}`;
      }
    }

    if (context.currentStep) {
      systemContext += `\n\nUser is currently on step: ${context.currentStep}`;
    }

    const prompt = `${systemContext}

User message: ${userMessage}

Provide helpful guidance. If making suggestions, return as JSON:
{
  "response": string,
  "suggestions": [string] (optional action items)
}`;

    try {
      const response = await gpt51ResponsesService.createResponse({
        model: 'gpt-5.2',
        input: prompt,
        reasoning: { effort: 'medium' },
        text: { verbosity: 'medium' },
        max_output_tokens: 1000,
        previous_response_id: previousResponseId
      });

      this.conversationHistory.set(conversationId, response.id);

      try {
        const parsed = JSON.parse(response.output_text);
        return {
          response: parsed.response,
          suggestions: parsed.suggestions
        };
      } catch {
        return { response: response.output_text };
      }
    } catch (error) {
      logger.error('Conversational assistance failed', error as Error);
      return {
        response: 'I apologize, but I encountered an issue processing your request. Please try again.'
      };
    }
  }

  private buildMatchAnalysisPrompt(product: UserProduct, contact: Contact): string {
    return `Analyze the sales fit between this product and contact:

PRODUCT:
- Name: ${product.name}
- Description: ${product.description || 'Not provided'}
- Target Industries: ${product.target_industries?.join(', ') || 'All industries'}
- Target Titles: ${product.target_titles?.join(', ') || 'All titles'}
- Target Company Sizes: ${product.target_company_sizes?.join(', ') || 'All sizes'}
- Pain Points Addressed: ${product.pain_points_addressed?.join(', ') || 'Not specified'}
- Value Propositions: ${product.value_propositions?.join(', ') || 'Not specified'}
- Competitive Advantages: ${product.competitive_advantages?.join(', ') || 'Not specified'}

CONTACT:
- Name: ${contact.name}
- Title: ${contact.title || contact.job_title || 'Unknown'}
- Company: ${contact.company || 'Unknown'}
- Industry: ${contact.industry || 'Unknown'}
- Company Size: ${contact.company_size || 'Unknown'}
- Lead Score: ${contact.lead_score || 0}
- Status: ${contact.status || 'Unknown'}
- Tags: ${contact.tags?.join(', ') || 'None'}
- Notes: ${contact.notes || 'None'}

Analyze semantic fit beyond keyword matching. Consider:
1. Industry adjacencies and related markets
2. Title/role implications for decision-making authority
3. Company growth stage and technology adoption patterns
4. Pain point alignment with contact's likely challenges
5. Optimal messaging angles and talking points`;
  }

  private buildEnrichmentQueries(contact: Contact, product: UserProduct): Array<{
    type: string;
    query: string;
    userPrompt: string;
  }> {
    const companyName = contact.company || 'Unknown Company';
    const contactName = contact.name;

    return [
      {
        type: 'company_news',
        query: `${companyName} recent news announcements`,
        userPrompt: `Find recent news about ${companyName}. Focus on business developments, product launches, partnerships, and strategic initiatives.`
      },
      {
        type: 'funding_rounds',
        query: `${companyName} funding investment`,
        userPrompt: `Find information about ${companyName}'s funding history, investors, and financial milestones.`
      },
      {
        type: 'buying_signals',
        query: `${companyName} hiring ${product.target_titles?.[0] || 'technology'}`,
        userPrompt: `Find hiring trends and expansion signals at ${companyName} that might indicate buying intent for ${product.name}.`
      },
      {
        type: 'competitive_landscape',
        query: `${companyName} competitors ${contact.industry || 'technology'}`,
        userPrompt: `Identify ${companyName}'s main competitors and market positioning in the ${contact.industry || 'technology'} space.`
      }
    ];
  }

  private parseMatchAnalysisResponse(
    response: GPT51Response,
    product: UserProduct,
    contact: Contact
  ): AIMatchAnalysis {
    try {
      const parsed = JSON.parse(response.output_text);
      return {
        aiConfidence: parsed.aiConfidence || 50,
        aiReasoning: parsed.aiReasoning || 'Analysis completed',
        semanticScore: parsed.semanticScore || 50,
        talkingPoints: parsed.talkingPoints || [],
        anticipatedObjections: parsed.anticipatedObjections || [],
        predictedConversion: parsed.predictedConversion || 25,
        optimalOutreachTime: parsed.optimalOutreachTime || 'Tuesday-Thursday, 10am-2pm',
        competitivePositioning: parsed.competitivePositioning || '',
        personalizationInsights: parsed.personalizationInsights || []
      };
    } catch {
      logger.warn('Failed to parse AI match analysis, using fallback');
      return this.getFallbackMatchAnalysis(product, contact);
    }
  }

  private getFallbackMatchAnalysis(product: UserProduct, contact: Contact): AIMatchAnalysis {
    const hasIndustryMatch = product.target_industries?.some(
      i => contact.industry?.toLowerCase().includes(i.toLowerCase())
    );

    const hasTitleMatch = product.target_titles?.some(
      t => contact.title?.toLowerCase().includes(t.toLowerCase()) ||
           contact.job_title?.toLowerCase().includes(t.toLowerCase())
    );

    const baseScore = 50 + (hasIndustryMatch ? 20 : 0) + (hasTitleMatch ? 15 : 0);

    return {
      aiConfidence: baseScore,
      aiReasoning: 'Fallback analysis based on basic matching criteria',
      semanticScore: baseScore,
      talkingPoints: [
        {
          topic: 'Value Introduction',
          content: `Introduce ${product.name} and its key benefits`,
          relevance: 'high'
        }
      ],
      anticipatedObjections: [
        {
          objection: 'Budget constraints',
          response: 'Focus on ROI and cost savings',
          likelihood: 'medium'
        }
      ],
      predictedConversion: Math.max(10, baseScore - 30),
      optimalOutreachTime: 'Tuesday-Thursday, 10am-2pm',
      competitivePositioning: 'Highlight unique value propositions',
      personalizationInsights: ['Use contact name', 'Reference company']
    };
  }

  private parseSuggestions(output: string): ProductSuggestion[] {
    try {
      const parsed = JSON.parse(output);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch {
      logger.warn('Failed to parse product suggestions');
      return [];
    }
  }

  private parseContentGeneration(output: string, contentType: string): AIContentGeneration {
    try {
      const parsed = JSON.parse(output);
      return {
        subject: contentType === 'email' ? parsed.subject : undefined,
        body: parsed.body || '',
        callToAction: parsed.callToAction || '',
        personalizationTokens: parsed.personalizationTokens || {},
        reasoning: parsed.reasoning || '',
        alternativeVersions: parsed.alternativeVersions
      };
    } catch {
      return {
        body: output,
        callToAction: 'Let me know if you would like to learn more.',
        personalizationTokens: {},
        reasoning: 'Direct AI output'
      };
    }
  }

  private getFallbackContent(
    product: UserProduct,
    contact: Contact,
    contentType: string,
    tone: string
  ): AIContentGeneration {
    const firstName = contact.name?.split(' ')[0] || 'there';
    const companyRef = contact.company ? ` at ${contact.company}` : '';

    const greetings: Record<string, string> = {
      formal: `Dear ${contact.name || 'Professional'},`,
      casual: `Hey ${firstName}!`,
      urgent: `${firstName} - Quick note:`,
      friendly: `Hi ${firstName}!`,
      professional: `Hello ${firstName},`
    };

    return {
      subject: contentType === 'email' ? `Quick question about ${contact.company || 'your team'}` : undefined,
      body: `${greetings[tone] || greetings.professional}

I wanted to reach out because I believe ${product.name} could be valuable for ${contact.company || 'your organization'}.

${product.value_propositions?.[0] || 'We help companies like yours achieve better results.'}

Would you be open to a brief conversation to explore if this might be a fit?`,
      callToAction: 'Let me know a time that works for a quick call.',
      personalizationTokens: {
        first_name: firstName,
        company: contact.company || 'your company',
        product_name: product.name
      },
      reasoning: 'Fallback template-based generation'
    };
  }

  private extractKeySummary(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).join('. ') + '.';
  }

  private extractKeyFacts(content: string): string[] {
    const facts: string[] = [];
    const patterns = [
      /(?:founded|established|started)\s+(?:in\s+)?(\d{4})/i,
      /(?:raised|secured|received)\s+\$?([\d.]+[MBK]?)/i,
      /(?:employs?|has)\s+([\d,]+)\s+(?:employees?|people|staff)/i,
      /(?:headquartered|based|located)\s+(?:in\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
    ];

    patterns.forEach(pattern => {
      const match = content.match(pattern);
      if (match) {
        facts.push(match[0]);
      }
    });

    return facts;
  }

  private async saveEnrichments(contactId: string, enrichments: EnrichmentResult[]): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const records = enrichments.map(e => ({
        user_id: user.id,
        match_id: contactId,
        enrichment_type: e.type,
        enrichment_data: e.data,
        sources: e.sources,
        expires_at: e.expiresAt.toISOString()
      }));

      await supabase.from('product_ai_enrichments').insert(records);
    } catch (error) {
      logger.warn('Failed to save enrichments', error as Error);
    }
  }

  clearConversation(conversationId: string): void {
    this.conversationHistory.delete(conversationId);
  }
}

export const gpt52ProductIntelligenceService = GPT52ProductIntelligenceService.getInstance();
