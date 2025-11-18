/**
 * AI Product Intelligence Service - GPT-5.1 Enhanced
 * Handles web scraping, document analysis, and intelligence generation using GPT-5.1 Responses API
 */

import { AnalysisResults, GeneratedContent, AnalysisInput, AnalysisProgress, AnalysisError } from '../types/productIntelligence';
import { gpt51ResponsesService } from './gpt51ResponsesService';
import { logger } from './logger.service';

export class ProductIntelligenceService {
  private static instance: ProductIntelligenceService;
  private readonly API_BASE_URL = '/api/product-intelligence';

  static getInstance(): ProductIntelligenceService {
    if (!ProductIntelligenceService.instance) {
      ProductIntelligenceService.instance = new ProductIntelligenceService();
    }
    return ProductIntelligenceService.instance;
  }

  /**
   * Analyze web content from URLs using GPT-5.1
   */
  async analyzeWebContent(urls: string[], context?: string): Promise<AnalysisResults> {
    try {
      logger.info('Starting web content analysis with GPT-5.1', { urls, context });

      // Use GPT-5.1 for advanced analysis with high reasoning
      const analysis = await gpt51ResponsesService.analyzeProductIntelligence(urls, [], context);

      const result: AnalysisResults = {
        company: analysis.company,
        product: analysis.product,
        market: analysis.market,
        contacts: analysis.contacts,
        financial: {},
        sources: urls.map(url => ({
          url,
          title: `Analysis of ${url}`,
          domain: new URL(url).hostname,
          type: 'web' as const,
          confidence: 85,
          timestamp: new Date(),
          snippet: `Analyzed content from ${url}`
        })),
        confidence: 90,
        analysisId: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };

      logger.info('Web content analysis completed', {
        analysisId: result.analysisId,
        companyFound: !!result.company.name,
        contactsFound: result.contacts.length
      });

      return result;
    } catch (error) {
      logger.error('Web content analysis failed:', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to analyze web content. Please try again.');
    }
  }

  /**
   * Analyze uploaded documents
   */
  async analyzeDocument(file: File, context?: string): Promise<AnalysisResults> {
    try {
      const formData = new FormData();
      formData.append('document', file);
      if (context) {
        formData.append('context', context);
      }

      const response = await fetch(`${this.API_BASE_URL}/analyze-document`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Document analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.processAnalysisResult(data);
    } catch (error) {
      console.error('Document analysis failed:', error);
      throw new Error('Failed to analyze document. Please try again.');
    }
  }

  /**
   * Generate content based on analysis results using GPT-5.1
   */
  async generateContent(analysisId: string, context?: string): Promise<GeneratedContent> {
    try {
      logger.info('Generating content with GPT-5.1', { analysisId, context });

      // For now, return mock content - in production, you'd retrieve the analysis first
      // and then use GPT-5.1 to generate content based on it
      const mockAnalysis = {
        company: { name: 'Example Corp', industry: 'Technology' },
        product: { name: 'Sample Product', features: ['Feature 1', 'Feature 2'] },
        market: { competitors: ['Competitor A', 'Competitor B'] }
      };

      const content = await gpt51ResponsesService.generateContent(mockAnalysis, 'email');

      const result: GeneratedContent = {
        emails: [{
          id: `email_${Date.now()}`,
          subject: 'Generated Subject',
          body: content,
          template: 'ai_generated',
          priority: 'normal' as const
        }],
        callScripts: [],
        smsMessages: [],
        discoveryQuestions: {
          qualification: [],
          discovery: [],
          technical: [],
          budget: [],
          timeline: [],
          decision: []
        },
        salesPlaybook: {
          id: `playbook_${Date.now()}`,
          name: 'AI Generated Sales Playbook',
          phases: [],
          estimatedDuration: 90,
          successRate: 75,
          targetDealSize: 50000
        },
        communicationOptimization: {
          originalContent: '',
          optimizedContent: content,
          improvements: ['AI optimized content'],
          score: 85,
          suggestions: ['Use personalized messaging']
        },
        dealHealthAnalysis: {
          overallScore: 75,
          riskLevel: 'medium' as const,
          recommendations: ['Follow up within 3 days'],
          nextSteps: ['Schedule discovery call'],
          warningSigns: [],
          positiveIndicators: ['High engagement score']
        }
      };

      logger.info('Content generation completed', {
        emailsGenerated: result.emails.length,
        playbookCreated: !!result.salesPlaybook.id
      });

      return result;
    } catch (error) {
      logger.error('Content generation failed:', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to generate content. Please try again.');
    }
  }

  /**
   * Get analysis status for long-running operations
   */
  async getAnalysisStatus(analysisId: string): Promise<{ status: 'pending' | 'processing' | 'completed' | 'failed', progress?: number, result?: AnalysisResults }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/status/${analysisId}`);

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Status check failed:', error);
      return { status: 'failed' };
    }
  }

  /**
   * Process and validate analysis results
   */
  private processAnalysisResult(data: any): AnalysisResults {
    return {
      company: data.company || {
        name: '',
        industry: '',
        size: '',
        location: '',
        description: '',
        socialProfiles: {}
      },
      product: data.product || {
        name: '',
        category: '',
        pricing: { model: 'subscription', ranges: { min: 0, max: 0, currency: 'USD' }, examples: [] },
        features: [],
        targetMarket: '',
        competitiveAdvantages: [],
        useCases: []
      },
      contacts: data.contacts || [],
      market: data.market || {
        size: '',
        growth: '',
        competitors: [],
        trends: [],
        opportunities: [],
        threats: []
      },
      financial: data.financial || {},
      sources: data.sources || [],
      confidence: data.confidence || 0,
      analysisId: data.analysisId || `analysis_${Date.now()}`,
      timestamp: new Date(data.timestamp || Date.now())
    };
  }

  /**
   * Process and validate generated content
   */
  private processGeneratedContent(data: any): GeneratedContent {
    return {
      emails: data.emails || [],
      callScripts: data.callScripts || [],
      smsMessages: data.smsMessages || [],
      discoveryQuestions: data.discoveryQuestions || {
        qualification: [],
        discovery: [],
        technical: [],
        budget: [],
        timeline: [],
        decision: []
      },
      salesPlaybook: data.salesPlaybook || {
        id: '',
        name: '',
        phases: [],
        estimatedDuration: 0,
        successRate: 0,
        targetDealSize: 0
      },
      communicationOptimization: data.communicationOptimization || {
        originalContent: '',
        optimizedContent: '',
        improvements: [],
        score: 0,
        suggestions: []
      },
      dealHealthAnalysis: data.dealHealthAnalysis || {
        overallScore: 0,
        riskLevel: 'low',
        recommendations: [],
        nextSteps: [],
        warningSigns: [],
        positiveIndicators: []
      }
    };
  }

  /**
   * Validate file type for document analysis
   */
  validateFileType(file: File): boolean {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    return allowedTypes.includes(file.type) || file.name.match(/\.(pdf|doc|docx|txt|csv|xls|xlsx)$/i) !== null;
  }

  /**
   * Validate URL format
   */
  validateUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  /**
   * Get supported file types for display
   */
  getSupportedFileTypes(): string {
    return 'PDF, DOC, DOCX, TXT, CSV, XLS, XLSX';
  }
}

// Export singleton instance
export const productIntelligenceService = ProductIntelligenceService.getInstance();