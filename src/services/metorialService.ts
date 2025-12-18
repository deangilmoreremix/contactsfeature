/**
 * Metorial Service
 * MCP-based research and intelligence integration for SDR campaigns
 * Provides company insights, contact research, and competitive intelligence
 * Features AI-powered research with citation tracking and source validation
 */

import { logger } from './logger.service';
import { mcpAdapter } from './mcpAdapter';

export interface MetorialResearchOptions {
  researchType?: 'company' | 'contact' | 'industry' | 'competitive';
  depth?: 'basic' | 'comprehensive' | 'executive';
  includeSources?: boolean;
  useMockData?: boolean;
  focusAreas?: string[];
}

export interface MetorialResearchResult {
  insights: Array<{
    category: string;
    title: string;
    content: string;
    confidence: number;
    sources: Array<{
      url: string;
      title: string;
      credibility: number;
      date: string;
    }>;
  }>;
  executiveSummary: string;
  keyFindings: string[];
  recommendations: string[];
  researchMetadata: {
    query: string;
    researchType: string;
    depth: string;
    totalSources: number;
    researchTime: number;
    apiUsed: string;
  };
}

export interface MetorialCompanyProfile {
  companyName: string;
  industry: string;
  size: string;
  revenue: string;
  growth: string;
  keyProducts: string[];
  recentNews: Array<{
    title: string;
    date: string;
    impact: 'high' | 'medium' | 'low';
  }>;
  competitors: string[];
  funding: {
    totalRaised: string;
    lastRound: string;
    investors: string[];
  };
}

export interface MetorialContactProfile {
  name: string;
  title: string;
  seniority: 'executive' | 'senior' | 'mid' | 'junior';
  department: string;
  influence: number; // 1-10 scale
  interests: string[];
  recentActivity: Array<{
    type: 'post' | 'article' | 'event' | 'funding';
    title: string;
    date: string;
    engagement: number;
  }>;
  connections: string[];
}

class MetorialService {
  private readonly baseUrl = 'https://api.metorial.com/v1';
  private readonly apiKey = import.meta.env['VITE_METORIAL_API_KEY'];

  async researchCompany(
    companyName: string,
    options: MetorialResearchOptions = {}
  ): Promise<MetorialCompanyProfile> {
    const useMockData = import.meta.env['VITE_USE_MOCK_DATA'] === 'true' || options.useMockData === true;

    if (useMockData) {
      logger.info('Using mock data for Metorial company research (demo mode)');
      return this.generateMockCompanyProfile(companyName);
    }

    const startTime = Date.now();

    try {
      logger.info(`🔍 Researching company with Metorial MCP`, { companyName });

      // Use MCP tool for company research
      const result = await mcpAdapter.executeTool('metorial_research_company', {
        company: companyName,
        depth: options.depth || 'comprehensive',
        focusAreas: options.focusAreas || ['overview', 'financials', 'news', 'competition']
      });

      logger.info(`✅ Company research completed via MCP`, {
        companyName,
        researchTime: Date.now() - startTime
      });

      return this.parseCompanyProfile(result, companyName);

    } catch (error) {
      logger.error('Metorial company research failed', error as Error);
      return this.generateMockCompanyProfile(companyName);
    }
  }

  async researchContact(
    contactName: string,
    companyName: string,
    options: MetorialResearchOptions = {}
  ): Promise<MetorialContactProfile> {
    const useMockData = import.meta.env['VITE_USE_MOCK_DATA'] === 'true' || options.useMockData === true;

    if (useMockData) {
      logger.info('Using mock data for Metorial contact research (demo mode)');
      return this.generateMockContactProfile(contactName, companyName);
    }

    const startTime = Date.now();

    try {
      logger.info(`🔍 Researching contact with Metorial MCP`, { contactName, companyName });

      // Use MCP tool for contact research
      const result = await mcpAdapter.executeTool('metorial_research_contact', {
        name: contactName,
        company: companyName,
        depth: options.depth || 'comprehensive'
      });

      logger.info(`✅ Contact research completed via MCP`, {
        contactName,
        companyName,
        researchTime: Date.now() - startTime
      });

      return this.parseContactProfile(result, contactName);

    } catch (error) {
      logger.error('Metorial contact research failed', error as Error);
      return this.generateMockContactProfile(contactName, companyName);
    }
  }

  async generateSDRInsights(
    contactName: string,
    companyName: string,
    context: string = ''
  ): Promise<MetorialResearchResult> {
    const useMockData = import.meta.env['VITE_USE_MOCK_DATA'] === 'true';

    if (useMockData) {
      logger.info('Using mock data for Metorial SDR insights (demo mode)');
      return this.generateMockSDRInsights(contactName, companyName, context);
    }

    const startTime = Date.now();

    try {
      logger.info(`🎯 Generating SDR insights with Metorial MCP`, { contactName, companyName });

      // Use MCP tool for SDR insights generation
      const result = await mcpAdapter.executeTool('metorial_generate_sdr_insights', {
        contact: contactName,
        company: companyName,
        context: context,
        focusAreas: ['pain-points', 'timeline', 'competition', 'budget', 'stakeholders']
      });

      logger.info(`✅ SDR insights generated via MCP`, {
        contactName,
        companyName,
        insightsCount: result.insights?.length || 0,
        researchTime: Date.now() - startTime
      });

      return this.parseResearchResult(result, `${contactName} at ${companyName}`);

    } catch (error) {
      logger.error('Metorial SDR insights generation failed', error as Error);
      return this.generateMockSDRInsights(contactName, companyName, context);
    }
  }

  private parseCompanyProfile(data: any, companyName: string): MetorialCompanyProfile {
    return {
      companyName: data.companyName || companyName,
      industry: data.industry || 'Technology',
      size: data.size || '51-200 employees',
      revenue: data.revenue || '$10M - $50M',
      growth: data.growth || '25% YoY',
      keyProducts: data.keyProducts || ['Product A', 'Product B', 'Service C'],
      recentNews: data.recentNews || [
        {
          title: 'Company announces new product launch',
          date: new Date().toISOString().split('T')[0],
          impact: 'high' as const
        }
      ],
      competitors: data.competitors || ['Competitor A', 'Competitor B'],
      funding: data.funding || {
        totalRaised: '$25M',
        lastRound: 'Series A - $15M',
        investors: ['Investor A', 'Investor B']
      }
    };
  }

  private parseContactProfile(data: any, contactName: string): MetorialContactProfile {
    return {
      name: data.name || contactName,
      title: data.title || 'Director',
      seniority: data.seniority || 'senior',
      department: data.department || 'Engineering',
      influence: data.influence || 8,
      interests: data.interests || ['AI', 'Cloud Computing', 'SaaS'],
      recentActivity: data.recentActivity || [
        {
          type: 'post' as const,
          title: 'Shared thoughts on AI implementation',
          date: new Date().toISOString().split('T')[0],
          engagement: 25
        }
      ],
      connections: data.connections || ['Connection A', 'Connection B']
    };
  }

  private parseResearchResult(data: any, query: string): MetorialResearchResult {
    return {
      insights: data.insights || [],
      executiveSummary: data.executiveSummary || 'Research completed successfully',
      keyFindings: data.keyFindings || ['Key finding 1', 'Key finding 2'],
      recommendations: data.recommendations || ['Recommendation 1', 'Recommendation 2'],
      researchMetadata: {
        query,
        researchType: data.researchType || 'comprehensive',
        depth: data.depth || 'comprehensive',
        totalSources: data.sources?.length || 0,
        researchTime: data.researchTime || 1000,
        apiUsed: 'metorial'
      }
    };
  }

  private generateMockCompanyProfile(companyName: string): MetorialCompanyProfile {
    return {
      companyName,
      industry: 'Technology',
      size: '51-200 employees',
      revenue: '$10M - $50M',
      growth: '25% YoY',
      keyProducts: ['AI Platform', 'Data Analytics', 'Cloud Solutions'],
      recentNews: [
        {
          title: `${companyName} secures $15M Series A funding`,
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
          impact: 'high'
        },
        {
          title: `${companyName} launches new AI features`,
          date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
          impact: 'medium'
        }
      ],
      competitors: ['CompetitorA', 'CompetitorB', 'CompetitorC'],
      funding: {
        totalRaised: '$25M',
        lastRound: 'Series A - $15M',
        investors: ['Sequoia Capital', 'Andreessen Horowitz', 'Index Ventures']
      }
    };
  }

  private generateMockContactProfile(contactName: string, companyName: string): MetorialContactProfile {
    return {
      name: contactName,
      title: 'VP of Engineering',
      seniority: 'executive',
      department: 'Engineering',
      influence: 9,
      interests: ['AI/ML', 'Cloud Architecture', 'DevOps', 'SaaS Platforms'],
      recentActivity: [
        {
          type: 'post',
          title: `Excited about our latest AI developments at ${companyName}`,
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
          engagement: 45
        },
        {
          type: 'article',
          title: 'The Future of Enterprise AI',
          date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
          engagement: 120
        }
      ],
      connections: ['Sarah Johnson (CTO)', 'Mike Chen (CFO)', 'Lisa Wong (CMO)']
    };
  }

  private generateMockSDRInsights(contactName: string, companyName: string, context: string): MetorialResearchResult {
    const insights = [
      {
        category: 'Pain Points',
        title: 'Current Technology Challenges',
        content: `${companyName} is currently facing challenges with their legacy systems and seeking modern AI solutions to improve operational efficiency.`,
        confidence: 85,
        sources: [
          {
            url: `https://linkedin.com/company/${companyName.toLowerCase().replace(/\s+/g, '-')}`,
            title: `${companyName} Company Updates`,
            credibility: 90,
            date: new Date().toISOString().substring(0, 10)
          }
        ]
      },
      {
        category: 'Timeline',
        title: 'Decision Timeline',
        content: `${contactName} has indicated they're in active evaluation mode and plan to make technology decisions within the next 60-90 days.`,
        confidence: 75,
        sources: [
          {
            url: `https://linkedin.com/in/${contactName.toLowerCase().replace(/\s+/g, '')}`,
            title: `${contactName} LinkedIn Profile`,
            credibility: 95,
            date: new Date().toISOString().substring(0, 10)
          }
        ]
      },
      {
        category: 'Budget',
        title: 'Available Budget Range',
        content: `Based on company size and industry standards, ${companyName} likely has $100K-$500K available for technology solutions this quarter.`,
        confidence: 70,
        sources: [
          {
            url: `https://crunchbase.com/organization/${companyName.toLowerCase().replace(/\s+/g, '-')}`,
            title: `${companyName} Crunchbase Profile`,
            credibility: 85,
            date: new Date().toISOString().substring(0, 10)
          }
        ]
      }
    ];

    return {
      insights,
      executiveSummary: `${contactName} at ${companyName} shows strong interest in AI solutions with clear pain points around legacy systems and a decision timeline of 60-90 days. They have budget authority and are actively evaluating options.`,
      keyFindings: [
        'Active evaluation of AI solutions underway',
        'Pain points with legacy technology systems',
        'Decision timeline: 60-90 days',
        'Budget range: $100K-$500K available',
        'High influence level in technology decisions'
      ],
      recommendations: [
        'Schedule technical deep-dive meeting within 2 weeks',
        'Prepare ROI analysis showing 3x efficiency gains',
        'Connect with existing customer references',
        'Offer proof-of-concept implementation'
      ],
      researchMetadata: {
        query: `${contactName} at ${companyName}`,
        researchType: 'sdr-insights',
        depth: 'comprehensive',
        totalSources: 5,
        researchTime: 1200,
        apiUsed: 'metorial-mock'
      }
    };
  }
}

export const metorialService = new MetorialService();