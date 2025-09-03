/**
 * Web Search Service
 * Unified service for OpenAI GPT-5 web search tool integration
 * Provides web search capabilities with citation handling and source tracking
 * Features intelligent model fallback and advanced search parameters
 */

import { logger } from './logger.service';

export interface WebSearchOptions {
  searchContextSize?: 'low' | 'medium' | 'high';
  userLocation?: {
    type: 'approximate';
    country: string;
    city?: string;
    region?: string;
    timezone?: string;
  };
  allowedDomains?: string[];
  includeSources?: boolean;
}

export interface WebSearchResult {
  content: string;
  citations: Array<{
    type: 'url_citation';
    startIndex: number;
    endIndex: number;
    url: string;
    title: string;
  }>;
  sources: Array<{
    url: string;
    title: string;
    domain: string;
  }>;
  searchMetadata: {
    query: string;
    totalSources: number;
    searchTime: number;
    modelUsed: string;
  };
}

export interface WebSearchCall {
  id: string;
  type: 'web_search_call';
  status: 'completed' | 'failed';
  action: {
    type: 'search' | 'open_page' | 'find_in_page';
    query?: string;
    domains?: string[];
    sources?: Array<{
      url: string;
      title: string;
      domain: string;
    }>;
  };
}

class WebSearchService {
  private readonly baseUrl = 'https://api.openai.com/v1/responses';

  async searchWithAI(
    query: string,
    systemPrompt: string,
    userPrompt: string,
    options: WebSearchOptions = {}
  ): Promise<WebSearchResult> {
    const apiKey = import.meta.env['VITE_OPENAI_API_KEY'];

    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const startTime = Date.now();

    // Build tools array with web search
    const tools = [{
      type: 'web_search',
      search_context_size: options.searchContextSize || 'medium',
      ...(options.userLocation && { user_location: options.userLocation }),
      ...(options.allowedDomains && {
        filters: {
          allowed_domains: options.allowedDomains
        }
      })
    }];

    // Build include array for sources if requested
    const include = options.includeSources ? ['web_search_call.action.sources'] : [];

    // Intelligent model fallback: GPT-5 → GPT-5-mini → GPT-4o-mini
    const models = [
      'gpt-5',
      import.meta.env['VITE_OPENAI_MODEL_MINI'] || 'gpt-5-mini',
      import.meta.env['VITE_OPENAI_MODEL_FAST'] || 'gpt-4o-mini'
    ];

    let lastError: Error | null = null;

    for (const model of models) {
      try {
        logger.info(`🔍 Attempting web search with GPT-5 model: ${model}`, { query });

        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            reasoning: {
              effort: import.meta.env['VITE_OPENAI_REASONING_EFFORT'] || 'medium'
            },
            verbosity: import.meta.env['VITE_OPENAI_VERBOSITY'] || 'medium',
            tools,
            ...(include.length > 0 && { include }),
            input: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: userPrompt
              }
            ],
            temperature: 0.3,
            response_format: { type: "json_object" }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();

        // Extract web search calls
        const webSearchCalls: WebSearchCall[] = data.output?.filter(
          (item: any) => item.type === 'web_search_call'
        ) || [];

        // Extract message content and citations
        const messageItem = data.output?.find((item: any) => item.type === 'message');
        const content = messageItem?.content?.[0]?.text || '';

        if (!content) {
          throw new Error('Invalid response from OpenAI GPT-5 Responses API');
        }

        const citations = messageItem?.content?.[0]?.annotations?.filter(
          (annotation: any) => annotation.type === 'url_citation'
        ).map((citation: any) => ({
          type: 'url_citation' as const,
          startIndex: citation.start_index,
          endIndex: citation.end_index,
          url: citation.url,
          title: citation.title
        })) || [];

        // Extract sources if requested
        const sources = options.includeSources ?
          this.extractSourcesFromWebSearchCalls(webSearchCalls) : [];

        const searchTime = Date.now() - startTime;

        logger.info(`✅ GPT-5 web search completed successfully with model: ${model}`, {
          query,
          searchTime,
          citationCount: citations.length,
          sourceCount: sources.length
        });

        return {
          content,
          citations,
          sources,
          searchMetadata: {
            query,
            totalSources: sources.length,
            searchTime,
            modelUsed: model
          }
        };

      } catch (error) {
        lastError = error as Error;
        logger.warn(`⚠️ GPT-5 web search failed with model ${model}, trying next model`, {
          model,
          error: lastError.message
        });

        // Continue to next model if this one fails
        continue;
      }
    }

    // If all models failed, throw the last error
    throw lastError || new Error('All GPT-5 AI models failed for web search');
  }

  private extractSourcesFromWebSearchCalls(webSearchCalls: WebSearchCall[]): Array<{
    url: string;
    title: string;
    domain: string;
  }> {
    const sources: Array<{
      url: string;
      title: string;
      domain: string;
    }> = [];

    webSearchCalls.forEach(call => {
      if (call.action?.sources) {
        call.action.sources.forEach((source: any) => {
          if (source.url) {
            try {
              const domain = new URL(source.url).hostname;
              sources.push({
                url: source.url,
                title: source.title || domain,
                domain
              });
            } catch (error) {
              logger.warn('Invalid URL in web search sources', { url: source.url });
            }
          }
        });
      }
    });

    return sources;
  }

  // Helper method to format citations for display
  formatCitationsForDisplay(content: string, citations: WebSearchResult['citations']): {
    formattedContent: string;
    citationLinks: Array<{ index: number; url: string; title: string }>;
  } {
    let formattedContent = content;
    const citationLinks: Array<{ index: number; url: string; title: string }> = [];

    // Sort citations by start index in reverse order to avoid index shifting
    const sortedCitations = [...citations].sort((a, b) => b.startIndex - a.startIndex);

    sortedCitations.forEach((citation, citationIndex) => {
      const citationNumber = citationIndex + 1;
      const citationText = `[${citationNumber}]`;

      // Insert citation number
      formattedContent =
        formattedContent.slice(0, citation.endIndex) +
        citationText +
        formattedContent.slice(citation.endIndex);

      citationLinks.push({
        index: citationNumber,
        url: citation.url,
        title: citation.title
      });
    });

    return {
      formattedContent,
      citationLinks
    };
  }

  // Helper method to create industry-specific search options
  createIndustrySearchOptions(industry: string): WebSearchOptions {
    const industryDomains = this.getIndustryDomains(industry);

    return {
      searchContextSize: 'high',
      allowedDomains: industryDomains,
      includeSources: true,
      userLocation: {
        type: 'approximate',
        country: 'US' // Default to US, can be made configurable
      }
    };
  }

  private getIndustryDomains(industry: string): string[] {
    const industryDomainMap: Record<string, string[]> = {
      'technology': ['techcrunch.com', 'venturebeat.com', 'wired.com', 'arstechnica.com'],
      'healthcare': ['medscape.com', 'healthcarefinancenews.com', 'modernhealthcare.com'],
      'finance': ['bloomberg.com', 'reuters.com', 'wsj.com', 'ft.com'],
      'retail': ['retaildive.com', 'chainstoreage.com', 'stores.org'],
      'manufacturing': ['industryweek.com', 'manufacturing.net', 'automationworld.com'],
      'real estate': ['realtor.com', 'wsj.com', 'bloomberg.com'],
      'education': ['edweek.org', 'higheredjobs.com', 'universitybusiness.com'],
      'energy': ['energyintel.com', 'platts.com', 'rigzone.com'],
      'automotive': ['autonews.com', 'wardsauto.com', 'saemobilus.org'],
      'pharmaceuticals': ['pharmalive.com', 'fiercepharma.com', 'biopharmadive.com']
    };

    return industryDomainMap[industry.toLowerCase()] || [];
  }
}

export const webSearchService = new WebSearchService();