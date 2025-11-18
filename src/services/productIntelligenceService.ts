/**
 * AI Product Intelligence Service
 * Handles web scraping, document analysis, and intelligence generation
 */

import { AnalysisResults, GeneratedContent, AnalysisInput, AnalysisProgress, AnalysisError } from '../types/productIntelligence';

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
   * Analyze web content from URLs
   */
  async analyzeWebContent(urls: string[], context?: string): Promise<AnalysisResults> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/analyze-web`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls,
          context,
          analysisType: 'comprehensive'
        })
      });

      if (!response.ok) {
        throw new Error(`Web analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.processAnalysisResult(data);
    } catch (error) {
      console.error('Web content analysis failed:', error);
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
   * Generate content based on analysis results
   */
  async generateContent(analysisId: string, context?: string): Promise<GeneratedContent> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysisId, context })
      });

      if (!response.ok) {
        throw new Error(`Content generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.processGeneratedContent(data);
    } catch (error) {
      console.error('Content generation failed:', error);
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