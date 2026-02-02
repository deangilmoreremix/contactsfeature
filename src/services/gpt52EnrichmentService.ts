/**
 * GPT-5.2 Enrichment Service
 * Advanced contact enrichment using GPT-5.2 Responses API with reasoning and tools
 * Replaces the legacy aiEnrichmentService and Metorial integration
 */

import { logger } from './logger.service';
import { responsesClient, CustomTool, ResponsesAPIRequest } from '../../lib/core/responsesClient';
import { contextManager } from '../../lib/core/contextManager';

export interface EnrichmentResult {
  contact: {
    firstName?: string;
    lastName?: string;
    title?: string;
    company?: string;
    industry?: string;
    location?: {
      city?: string;
      state?: string;
      country?: string;
    };
    socialProfiles?: {
      linkedin?: string;
      twitter?: string;
      website?: string;
    };
    bio?: string;
  };
  company: {
    name: string;
    industry: string;
    size: string;
    revenue?: string;
    growth?: string;
    keyProducts: string[];
    recentNews: Array<{
      title: string;
      date: string;
      impact: 'high' | 'medium' | 'low';
    }>;
    competitors: string[];
  };
  insights: {
    painPoints: string[];
    opportunities: string[];
    decisionFactors: string[];
    timeline: string;
    budget: string;
  };
  sdrRecommendations: {
    approach: string;
    talkingPoints: string[];
    objections: string[];
    nextSteps: string[];
  };
  metadata: {
    confidence: number;
    reasoningEffort: string;
    toolsUsed: string[];
    processingTime: number;
    model: string;
  };
}

export interface EnrichmentOptions {
  reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh';
  includeCompanyResearch?: boolean;
  includeContactResearch?: boolean;
  includeSDRInsights?: boolean;
  useContext?: boolean;
  previousResponseId?: string;
}

/**
 * Research tools for GPT-5.2 enrichment
 */
const RESEARCH_TOOLS: CustomTool[] = [
  {
    type: 'function',
    name: 'research_company',
    description: 'Research a company to gather information about industry, size, products, news, and competitors',
    parameters: {
      type: 'object',
      properties: {
        companyName: {
          type: 'string',
          description: 'The name of the company to research'
        },
        depth: {
          type: 'string',
          enum: ['basic', 'comprehensive', 'executive'],
          description: 'Depth of research required'
        },
        focusAreas: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific areas to focus on (e.g., financials, products, leadership)'
        }
      },
      required: ['companyName']
    }
  },
  {
    type: 'function',
    name: 'research_contact',
    description: 'Research a contact to gather professional information, background, and interests',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The full name of the contact'
        },
        company: {
          type: 'string',
          description: 'The company the contact works for'
        },
        title: {
          type: 'string',
          description: 'The job title of the contact'
        },
        linkedinUrl: {
          type: 'string',
          description: 'LinkedIn profile URL if available'
        }
      },
      required: ['name']
    }
  },
  {
    type: 'function',
    name: 'generate_sdr_strategy',
    description: 'Generate SDR outreach strategy including talking points, objections, and next steps',
    parameters: {
      type: 'object',
      properties: {
        contactName: {
          type: 'string',
          description: 'Name of the contact'
        },
        companyName: {
          type: 'string',
          description: 'Name of the company'
        },
        industry: {
          type: 'string',
          description: 'Industry of the company'
        },
        painPoints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Identified pain points'
        },
        context: {
          type: 'string',
          description: 'Additional context about the engagement'
        }
      },
      required: ['contactName', 'companyName']
    }
  }
];

class GPT52EnrichmentService {
  private readonly defaultModel = 'gpt-5.2-thinking';
  private readonly fastModel = 'gpt-5.2';

  /**
   * Enrich a contact using GPT-5.2 with reasoning and tools
   */
  async enrichContact(
    contactData: {
      email?: string;
      firstName?: string;
      lastName?: string;
      name?: string;
      company?: string;
      title?: string;
      linkedin?: string;
    },
    options: EnrichmentOptions = {}
  ): Promise<EnrichmentResult> {
    const startTime = Date.now();
    const contactName = contactData.name || `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim();
    const companyName = contactData.company || 'Unknown Company';

    logger.info(`Starting GPT-5.2 enrichment`, {
      contact: contactName,
      company: companyName,
      reasoningEffort: options.reasoningEffort || 'high'
    });

    try {
      // Build the enrichment prompt
      const prompt = this.buildEnrichmentPrompt(contactData);

      // Determine which tools to enable
      const tools = this.selectTools(options);

      // Create the request
      const request: ResponsesAPIRequest = {
        model: this.defaultModel,
        input: prompt,
        instructions: this.getSystemInstructions(),
        reasoning: {
          effort: options.reasoningEffort || 'high',
          generateSummary: 'auto'
        },
        text: {
          verbosity: 'medium'
        },
        tools: tools,
        toolChoice: tools.length > 0 ? {
          type: 'allowed_tools',
          mode: 'auto',
          tools: tools.map(t => t.name)
        } : 'auto',
        temperature: 0.3,
        maxOutputTokens: 4000
      };

      // Add previousResponseId only if provided
      if (options.useContext && options.previousResponseId) {
        (request as any).previousResponseId = options.previousResponseId;
      }

      // Execute the enrichment
      const response = await responsesClient.createResponse(request);

      // Extract the result
      const textContent = responsesClient.extractTextContent(response.output);
      const functionCalls = responsesClient.extractFunctionCalls(response.output);
      const reasoningSummaries = responsesClient.extractReasoningSummaries(response.output);

      // Parse the enrichment result
      const result = this.parseEnrichmentResult(textContent, contactData, functionCalls);

      // Store context for future use
      if (options.useContext) {
        contextManager.addItem({
          type: 'assistant',
          content: JSON.stringify({
            responseId: response.id,
            reasoning: reasoningSummaries,
            result: result
          }),
          metadata: {
            importance: 0.8,
            confidence: result.metadata.confidence
          }
        });
      }

      const processingTime = Date.now() - startTime;

      logger.info(`GPT-5.2 enrichment completed`, {
        contact: contactName,
        company: companyName,
        confidence: result.metadata.confidence,
        processingTime,
        toolsUsed: result.metadata.toolsUsed
      });

      return {
        ...result,
        metadata: {
          ...result.metadata,
          processingTime,
          reasoningEffort: options.reasoningEffort || 'high',
          model: response.model
        }
      };

    } catch (error) {
      logger.error('GPT-5.2 enrichment failed', error as Error, {
        contact: contactName,
        company: companyName
      });

      // Return graceful fallback
      return this.generateFallbackResult(contactData);
    }
  }

  /**
   * Generate SDR insights for a contact using GPT-5.2
   */
  async generateSDRInsights(
    contactName: string,
    companyName: string,
    context: string = ''
  ): Promise<EnrichmentResult> {
    logger.info(`Generating SDR insights with GPT-5.2`, { contact: contactName, company: companyName });

    return this.enrichContact(
      { name: contactName, company: companyName },
      {
        reasoningEffort: 'xhigh',
        includeCompanyResearch: true,
        includeContactResearch: true,
        includeSDRInsights: true
      }
    );
  }

  /**
   * Quick enrichment using fast model
   */
  async quickEnrich(contactData: { email?: string; name?: string; company?: string }): Promise<Partial<EnrichmentResult>> {
    const startTime = Date.now();

    try {
      const request: ResponsesAPIRequest = {
        model: this.fastModel,
        input: `Quick enrichment for: ${JSON.stringify(contactData)}`,
        instructions: 'Provide a quick enrichment with basic company and contact info. Be concise.',
        reasoning: { effort: 'low' },
        text: { verbosity: 'low' },
        temperature: 0.3,
        maxOutputTokens: 1000
      };

      const response = await responsesClient.createResponse(request);
      const textContent = responsesClient.extractTextContent(response.output);

      logger.info(`Quick enrichment completed`, {
        contact: contactData.name || contactData.email,
        processingTime: Date.now() - startTime
      });

      return this.parseEnrichmentResult(textContent, contactData, []);

    } catch (error) {
      logger.error('Quick enrichment failed', error as Error);
      return this.generateFallbackResult(contactData);
    }
  }

  /**
   * Build the enrichment prompt
   */
  private buildEnrichmentPrompt(contactData: any): string {
    return `Enrich this contact with comprehensive research:

Contact Information:
${JSON.stringify(contactData, null, 2)}

Please provide:
1. Contact details (name, title, bio, social profiles)
2. Company information (industry, size, products, competitors, recent news)
3. Sales insights (pain points, opportunities, decision factors, timeline, budget)
4. SDR recommendations (approach strategy, talking points, objections, next steps)

Use the available research tools to gather real-time information. Return the result as a structured JSON object.`;
  }

  /**
   * Get system instructions for enrichment
   */
  private getSystemInstructions(): string {
    return `You are an expert AI sales intelligence assistant specializing in contact enrichment and SDR research.

Your task is to research contacts and companies to provide actionable sales intelligence.

Guidelines:
- Use the research_company tool to gather company information
- Use the research_contact tool to gather professional background
- Use the generate_sdr_strategy tool to create outreach strategies
- Be thorough but focus on actionable insights
- Cite specific data points when possible
- Provide confidence scores (0-100) for each piece of information
- Return results in structured JSON format

Always return a complete enrichment result with all fields populated, even if some data is estimated.`;
  }

  /**
   * Select which tools to enable based on options
   */
  private selectTools(options: EnrichmentOptions): CustomTool[] {
    const tools: CustomTool[] = [];

    if (options.includeCompanyResearch !== false) {
      tools.push(RESEARCH_TOOLS.find(t => t.name === 'research_company')!);
    }

    if (options.includeContactResearch !== false) {
      tools.push(RESEARCH_TOOLS.find(t => t.name === 'research_contact')!);
    }

    if (options.includeSDRInsights !== false) {
      tools.push(RESEARCH_TOOLS.find(t => t.name === 'generate_sdr_strategy')!);
    }

    return tools;
  }

  /**
   * Parse the enrichment result from AI response
   */
  private parseEnrichmentResult(
    textContent: string,
    contactData: any,
    functionCalls: any[]
  ): EnrichmentResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.normalizeResult(parsed, contactData, functionCalls);
      }
    } catch (parseError) {
      logger.warn('Failed to parse enrichment JSON, using fallback');
    }

    return this.generateFallbackResult(contactData);
  }

  /**
   * Normalize the parsed result to match EnrichmentResult interface
   */
  private normalizeResult(parsed: any, contactData: any, functionCalls: any[]): EnrichmentResult {
    const toolsUsed = functionCalls.map(fc => fc.name);

    return {
      contact: {
        firstName: parsed.contact?.firstName || contactData.firstName,
        lastName: parsed.contact?.lastName || contactData.lastName,
        title: parsed.contact?.title || contactData.title || 'Unknown',
        company: parsed.contact?.company || contactData.company,
        industry: parsed.contact?.industry || parsed.company?.industry || 'Technology',
        location: parsed.contact?.location || { city: 'Unknown', state: 'Unknown', country: 'Unknown' },
        socialProfiles: parsed.contact?.socialProfiles || {
          linkedin: contactData.linkedin,
          website: contactData.company ? `https://${contactData.company.toLowerCase().replace(/\s+/g, '')}.com` : undefined
        },
        bio: parsed.contact?.bio || `Professional at ${contactData.company || 'Unknown Company'}`
      },
      company: {
        name: parsed.company?.name || contactData.company || 'Unknown Company',
        industry: parsed.company?.industry || 'Technology',
        size: parsed.company?.size || '51-200 employees',
        revenue: parsed.company?.revenue,
        growth: parsed.company?.growth,
        keyProducts: parsed.company?.keyProducts || ['Product A', 'Product B'],
        recentNews: parsed.company?.recentNews || [],
        competitors: parsed.company?.competitors || []
      },
      insights: {
        painPoints: parsed.insights?.painPoints || ['Legacy systems', 'Scaling challenges'],
        opportunities: parsed.insights?.opportunities || ['Digital transformation', 'AI adoption'],
        decisionFactors: parsed.insights?.decisionFactors || ['ROI', 'Ease of implementation'],
        timeline: parsed.insights?.timeline || '60-90 days',
        budget: parsed.insights?.budget || '$50K-$200K'
      },
      sdrRecommendations: {
        approach: parsed.sdrRecommendations?.approach || 'Professional and consultative',
        talkingPoints: parsed.sdrRecommendations?.talkingPoints || ['Industry trends', 'Competitive advantages'],
        objections: parsed.sdrRecommendations?.objections || ['Budget constraints', 'Timing'],
        nextSteps: parsed.sdrRecommendations?.nextSteps || ['Schedule discovery call', 'Send case studies']
      },
      metadata: {
        confidence: parsed.metadata?.confidence || 75,
        reasoningEffort: parsed.metadata?.reasoningEffort || 'high',
        toolsUsed: toolsUsed,
        processingTime: 0,
        model: 'gpt-5.2-thinking'
      }
    };
  }

  /**
   * Generate fallback result when enrichment fails
   */
  private generateFallbackResult(contactData: any): EnrichmentResult {
    const companyName = contactData.company || 'Unknown Company';
    const contactName = contactData.name || `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim() || 'Unknown Contact';

    return {
      contact: {
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        title: contactData.title || 'Unknown',
        company: companyName,
        industry: 'Technology',
        location: { city: 'Unknown', state: 'Unknown', country: 'Unknown' },
        socialProfiles: {
          linkedin: contactData.linkedin
        },
        bio: `Contact at ${companyName}`
      },
      company: {
        name: companyName,
        industry: 'Technology',
        size: 'Unknown',
        keyProducts: [],
        recentNews: [],
        competitors: []
      },
      insights: {
        painPoints: ['Information not available'],
        opportunities: ['Information not available'],
        decisionFactors: ['Information not available'],
        timeline: 'Unknown',
        budget: 'Unknown'
      },
      sdrRecommendations: {
        approach: 'Research-based approach recommended',
        talkingPoints: ['Request more information'],
        objections: ['Lack of information'],
        nextSteps: ['Gather more contact data']
      },
      metadata: {
        confidence: 30,
        reasoningEffort: 'none',
        toolsUsed: [],
        processingTime: 0,
        model: 'fallback'
      }
    };
  }
}

export const gpt52EnrichmentService = new GPT52EnrichmentService();
