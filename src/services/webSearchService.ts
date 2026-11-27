/**
 * Web Search Service
 * Uses the hosted web_search tool of the Responses API through the server-side AI proxy
 * (src/services/aiClient.ts). Citations come straight from the API response; on failure
 * an error is thrown (no mock/demo fallback).
 */

import { logger } from './logger.service';
import type { AIWebSearchTool } from './aiClient';
import { aiCall, type LiveOptions } from './liveOptions';

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
  /** @deprecated Ignored. Web search always uses the real hosted tool; failures are thrown. */
  useMockData?: boolean;
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
  async searchWithAI(
    query: string,
    systemPrompt: string,
    userPrompt: string,
    options: WebSearchOptions = {},
    live?: LiveOptions
  ): Promise<WebSearchResult> {
    const startTime = Date.now();

    const tool: AIWebSearchTool = { type: 'web_search' };
    if (options.searchContextSize) tool.search_context_size = options.searchContextSize;
    if (options.userLocation) {
      const { type, country, city, region, timezone } = options.userLocation;
      tool.user_location = {
        type,
        country,
        ...(city ? { city } : {}),
        ...(region ? { region } : {}),
        ...(timezone ? { timezone } : {})
      };
    }
    if (options.allowedDomains?.length) tool.filters = { allowed_domains: options.allowedDomains };

    try {
      logger.info('Running hosted web search', { query });

      const res = await aiCall({
        role: 'default',
        instructions: `${systemPrompt}\n\nUse web search to ground your answer in current sources. Cite the sources you rely on.`,
        input: userPrompt,
        tools: [tool],
        maxOutputTokens: 4000
      }, live);

      const content = res.text || '';
      if (!content) {
        throw new Error('No content received from AI');
      }

      const seen = new Set<string>();
      const sources: WebSearchResult['sources'] = [];
      const citations: WebSearchResult['citations'] = [];

      for (const c of res.citations || []) {
        if (!c.url) continue;
        let domain: string;
        try {
          domain = new URL(c.url).hostname;
        } catch {
          logger.warn('Invalid URL in web search citations', { url: c.url });
          continue;
        }
        const title = c.title || domain;
        if (!seen.has(c.url)) {
          seen.add(c.url);
          sources.push({ url: c.url, title, domain });
        }
        const at = content.indexOf(title);
        const endIndex = at !== -1 ? at + title.length : content.length;
        citations.push({
          type: 'url_citation',
          startIndex: at !== -1 ? at : content.length,
          endIndex,
          url: c.url,
          title
        });
      }

      const searchTime = Date.now() - startTime;
      logger.info('Web search completed', { query, searchTime, sourceCount: sources.length });

      return {
        content,
        citations,
        sources,
        searchMetadata: {
          query,
          totalSources: sources.length,
          searchTime,
          modelUsed: 'default (server-resolved)'
        }
      };
    } catch (error) {
      logger.error('Web search failed', error as Error);
      throw error;
    }
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
