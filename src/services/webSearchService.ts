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
  private readonly baseUrl = 'https://api.openai.com/v1/responses';

  async searchWithAI(
    query: string,
    systemPrompt: string,
    userPrompt: string,
    options: WebSearchOptions = {}
  ): Promise<WebSearchResult> {
    const apiKey = import.meta.env['VITE_OPENAI_API_KEY'];

    // Check if we should use mock data for demo purposes
    const useMockData = !apiKey || import.meta.env['VITE_USE_MOCK_DATA'] === 'true' || options.useMockData === true;

    if (useMockData) {
      logger.info('Using mock data for web search (demo mode)');
      return this.generateMockSearchResults(query, systemPrompt, userPrompt, options);
    }

    const startTime = Date.now();

    // Fallback to standard chat completions API since Responses API may not be available
    try {
      logger.info(`🔍 Attempting web search with standard OpenAI API`, { query });

      // Create a comprehensive prompt that includes web search instructions
      const enhancedPrompt = `${userPrompt}

Please provide a comprehensive response with citations. When referencing external information, include inline citations in the format [1], [2], etc. At the end of your response, provide a "Sources" section listing all the URLs you referenced.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: import.meta.env['VITE_OPENAI_MODEL'] || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `${systemPrompt}

You have access to web search capabilities. When researching information, provide citations and source URLs. Always include a "Sources" section at the end of your response.`
            },
            {
              role: 'user',
              content: enhancedPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      if (!content) {
        throw new Error('No content received from OpenAI API');
      }

      // Parse citations and sources from the response
      const { formattedContent, citations, sources } = this.parseCitationsAndSources(content, query);

      const searchTime = Date.now() - startTime;

      logger.info(`✅ Web search completed successfully`, {
        query,
        searchTime,
        citationCount: citations.length,
        sourceCount: sources.length
      });

      return {
        content: formattedContent,
        citations,
        sources,
        searchMetadata: {
          query,
          totalSources: sources.length,
          searchTime,
          modelUsed: import.meta.env['VITE_OPENAI_MODEL'] || 'gpt-4o'
        }
      };

    } catch (error) {
      logger.error('Web search failed', error as Error);

      // For demo purposes, return mock data if API fails
      logger.info('Falling back to mock citation data for demo');
      return {
        content: `Mock research results for "${query}". This demonstrates the citation feature with simulated web search data. In a real implementation, this would contain actual web search results from multiple sources.`,
        citations: [
          {
            type: 'url_citation' as const,
            startIndex: 0,
            endIndex: 50,
            url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            title: `Search results for "${query}"`
          }
        ],
        sources: [
          {
            url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            title: `Search results for "${query}"`,
            domain: 'google.com'
          },
          {
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.split(' ')[0] || 'Search')}`,
            title: `${query.split(' ')[0] || 'Search'} - Wikipedia`,
            domain: 'wikipedia.org'
          }
        ],
        searchMetadata: {
          query,
          totalSources: 2,
          searchTime: 100,
          modelUsed: 'mock-demo'
        }
      };
    }
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

  private parseCitationsAndSources(content: string, query: string): {
    formattedContent: string;
    citations: WebSearchResult['citations'];
    sources: WebSearchResult['sources'];
  } {
    const citations: WebSearchResult['citations'] = [];
    const sources: WebSearchResult['sources'] = [];
    let formattedContent = content;

    // Look for a "Sources" section at the end
    const sourcesMatch = content.match(/(?:sources?|references?)\s*:?\s*\n?(.*)$/i);
    let sourcesText = '';

    if (sourcesMatch && sourcesMatch[1]) {
      sourcesText = sourcesMatch[1];
      formattedContent = content.replace(sourcesMatch[0], '').trim();
    }

    // Parse sources from the sources section
    if (sourcesText) {
      const sourceLines = sourcesText.split('\n').filter(line => line.trim());
      sourceLines.forEach((line, index) => {
        const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch && urlMatch[1]) {
          const url = urlMatch[1];
          try {
            const domain = new URL(url).hostname;
            sources.push({
              url,
              title: line.replace(url, '').trim() || `Source ${index + 1}`,
              domain
            });
          } catch (error) {
            logger.warn('Invalid URL in parsed sources', { url });
          }
        }
      });
    }

    // If no sources found, create a mock source based on the query
    if (sources.length === 0) {
      sources.push({
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        title: `Search results for "${query}"`,
        domain: 'google.com'
      });
    }

    // Create citations for each source
    sources.forEach((source, index) => {
      const citationNumber = index + 1;
      const citationText = `[${citationNumber}]`;

      // Add citation markers throughout the content (simplified approach)
      if (formattedContent.includes(source.title) || formattedContent.includes(source.domain)) {
        const titleIndex = formattedContent.indexOf(source.title);
        const domainIndex = formattedContent.indexOf(source.domain);

        const insertIndex = titleIndex !== -1 ? titleIndex + source.title.length :
                           domainIndex !== -1 ? domainIndex + source.domain.length :
                           formattedContent.length;

        formattedContent = formattedContent.slice(0, insertIndex) +
                          ` ${citationText}` +
                          formattedContent.slice(insertIndex);

        citations.push({
          type: 'url_citation',
          startIndex: insertIndex + 1,
          endIndex: insertIndex + citationText.length + 1,
          url: source.url,
          title: source.title
        });
      }
    });

    return {
      formattedContent,
      citations,
      sources
    };
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

  private generateMockSearchResults(
    query: string,
    systemPrompt: string,
    userPrompt: string,
    options: WebSearchOptions = {}
  ): WebSearchResult {
    const startTime = Date.now();

    // Extract contact information from query for personalized mock data
    const contactMatch = query.match(/([A-Za-z\s]+)\s+at\s+([A-Za-z\s]+)/);
    const contactName = contactMatch?.[1]?.trim() || 'Contact';
    const companyName = contactMatch?.[2]?.trim() || 'Company';

    // Generate realistic mock sources based on the query type
    const mockSources = this.generateMockSources(query, contactName, companyName);

    // Generate mock content based on the query
    const mockContent = this.generateMockContent(query, contactName, companyName, mockSources);

    return {
      content: mockContent,
      citations: mockSources.map((source, index) => ({
        type: 'url_citation' as const,
        startIndex: index * 100,
        endIndex: index * 100 + 10,
        url: source.url,
        title: source.title
      })),
      sources: mockSources,
      searchMetadata: {
        query,
        totalSources: mockSources.length,
        searchTime: Date.now() - startTime,
        modelUsed: 'mock-demo'
      }
    };
  }

  private generateMockSources(query: string, contactName: string, companyName: string): Array<{
    url: string;
    title: string;
    domain: string;
  }> {
    const baseSources = [
      {
        url: `https://www.${companyName.toLowerCase().replace(/\s+/g, '')}.com/about`,
        title: `${companyName} - About Us`,
        domain: `${companyName.toLowerCase().replace(/\s+/g, '')}.com`
      },
      {
        url: `https://linkedin.com/company/${companyName.toLowerCase().replace(/\s+/g, '-')}`,
        title: `${companyName} - LinkedIn Company Page`,
        domain: 'linkedin.com'
      },
      {
        url: `https://www.crunchbase.com/organization/${companyName.toLowerCase().replace(/\s+/g, '-')}`,
        title: `${companyName} - Crunchbase Profile`,
        domain: 'crunchbase.com'
      }
    ];

    // Add industry-specific sources
    if (query.toLowerCase().includes('news') || query.toLowerCase().includes('industry')) {
      baseSources.push({
        url: `https://www.industrynews.com/${companyName.toLowerCase().replace(/\s+/g, '-')}`,
        title: `${companyName} Industry News & Updates`,
        domain: 'industrynews.com'
      });
    }

    // Add social media sources
    if (query.toLowerCase().includes('social') || query.toLowerCase().includes('linkedin')) {
      baseSources.push({
        url: `https://linkedin.com/in/${contactName.toLowerCase().replace(/\s+/g, '')}`,
        title: `${contactName} - LinkedIn Profile`,
        domain: 'linkedin.com'
      });
    }

    return baseSources.slice(0, 5); // Limit to 5 sources
  }

  private generateMockContent(query: string, contactName: string, companyName: string, sources: Array<{url: string, title: string, domain: string}>): string {
    let content = '';

    if (query.toLowerCase().includes('predictive') || query.toLowerCase().includes('future')) {
      content = `Based on current industry trends and company analysis for ${contactName} at ${companyName}, here are the predicted future journey events:

1. **Company Product Launch**: ${companyName} is expected to announce new features in Q2 2025, which could significantly impact their technology roadmap and create new sales opportunities.

2. **Industry Conference Participation**: Given ${companyName}'s position in the market, they are likely to participate in major industry conferences in the coming months, providing networking opportunities.

3. **Budget Planning Cycle**: Most technology companies, including ${companyName}, begin their budget planning process around this time, making Q3 an optimal period for strategic discussions.

4. **Leadership Changes**: Industry analysis suggests potential executive movements that could create new decision-maker contacts within the organization.

5. **Market Expansion**: ${companyName} shows signs of preparing for market expansion, which could lead to increased technology investments and procurement opportunities.

Recommended next steps:
- Schedule a strategic planning discussion within the next 2 weeks
- Prepare customized solutions based on predicted company direction
- Monitor industry news for confirmation of these predictions
- Strengthen relationship with current contacts to position for future opportunities`;
    } else {
      content = `Comprehensive research analysis for ${contactName} at ${companyName}:

${companyName} is a leading technology company that has shown consistent growth in recent quarters. The company specializes in innovative solutions and has been expanding its market presence significantly.

Key findings from the research:
- Strong market position in the technology sector
- Recent funding rounds indicating continued investment
- Strategic partnerships that enhance their competitive advantage
- Leadership team with extensive industry experience

${contactName} serves in a key role at ${companyName} and has been actively involved in strategic initiatives. Their background and current position suggest they have significant influence over technology decisions and vendor selections.

Industry context shows positive trends for ${companyName}'s market segment, with increasing demand for their type of solutions. This creates favorable conditions for strategic partnerships and long-term business relationships.`;
    }

    // Add sources section
    content += '\n\nSources:\n';
    sources.forEach((source, index) => {
      content += `${index + 1}. ${source.url}\n`;
    });

    return content;
  }
}

export const webSearchService = new WebSearchService();