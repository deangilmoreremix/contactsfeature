/**
 * Content Generation Service
 * Generates personalized content based on product intelligence analysis
 */

import {
  AnalysisResults,
  GeneratedContent,
  EmailContent,
  CallScript,
  SMSContent,
  QuestionSet,
  PlaybookData,
  OptimizedContent,
  HealthAnalysis
} from '../types/productIntelligence';

export class ContentGenerationService {
  private static instance: ContentGenerationService;
  private readonly API_BASE_URL = '/api/content-generation';

  static getInstance(): ContentGenerationService {
    if (!ContentGenerationService.instance) {
      ContentGenerationService.instance = new ContentGenerationService();
    }
    return ContentGenerationService.instance;
  }

  /**
   * Generate comprehensive content based on analysis results
   */
  async generateAllContent(analysis: AnalysisResults, context?: {
    contactName?: string;
    contactTitle?: string;
    contactCompany?: string;
    userRole?: string;
    userCompany?: string;
  }): Promise<GeneratedContent> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/generate-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysis,
          context,
          contentTypes: ['emails', 'callScripts', 'smsMessages', 'discoveryQuestions', 'salesPlaybook', 'communicationOptimization', 'dealHealthAnalysis']
        })
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
   * Generate personalized emails
   */
  async generateEmails(analysis: AnalysisResults, context?: any): Promise<EmailContent[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/generate-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysis, context })
      });

      if (!response.ok) {
        throw new Error(`Email generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.emails || [];
    } catch (error) {
      console.error('Email generation failed:', error);
      return this.generateFallbackEmails(analysis, context);
    }
  }

  /**
   * Generate call scripts
   */
  async generateCallScripts(analysis: AnalysisResults, context?: any): Promise<CallScript[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/generate-call-scripts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysis, context })
      });

      if (!response.ok) {
        throw new Error(`Call script generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.callScripts || [];
    } catch (error) {
      console.error('Call script generation failed:', error);
      return this.generateFallbackCallScripts(analysis, context);
    }
  }

  /**
   * Generate SMS messages
   */
  async generateSMSMessages(analysis: AnalysisResults, context?: any): Promise<SMSContent[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/generate-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysis, context })
      });

      if (!response.ok) {
        throw new Error(`SMS generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.smsMessages || [];
    } catch (error) {
      console.error('SMS generation failed:', error);
      return this.generateFallbackSMS(analysis, context);
    }
  }

  /**
   * Generate discovery questions
   */
  async generateDiscoveryQuestions(analysis: AnalysisResults, context?: any): Promise<QuestionSet> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysis, context })
      });

      if (!response.ok) {
        throw new Error(`Question generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.discoveryQuestions || this.generateFallbackQuestions(analysis);
    } catch (error) {
      console.error('Question generation failed:', error);
      return this.generateFallbackQuestions(analysis);
    }
  }

  /**
   * Generate sales playbook
   */
  async generateSalesPlaybook(analysis: AnalysisResults, context?: any): Promise<PlaybookData> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/generate-playbook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysis, context })
      });

      if (!response.ok) {
        throw new Error(`Playbook generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.salesPlaybook || this.generateFallbackPlaybook(analysis);
    } catch (error) {
      console.error('Playbook generation failed:', error);
      return this.generateFallbackPlaybook(analysis);
    }
  }

  /**
   * Optimize communication content
   */
  async optimizeCommunication(content: string, analysis: AnalysisResults, context?: any): Promise<OptimizedContent> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/optimize-communication`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, analysis, context })
      });

      if (!response.ok) {
        throw new Error(`Communication optimization failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.communicationOptimization || this.generateFallbackOptimization(content);
    } catch (error) {
      console.error('Communication optimization failed:', error);
      return this.generateFallbackOptimization(content);
    }
  }

  /**
   * Analyze deal health
   */
  async analyzeDealHealth(analysis: AnalysisResults, dealContext?: any): Promise<HealthAnalysis> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/analyze-deal-health`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysis, dealContext })
      });

      if (!response.ok) {
        throw new Error(`Deal health analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.dealHealthAnalysis || this.generateFallbackHealthAnalysis();
    } catch (error) {
      console.error('Deal health analysis failed:', error);
      return this.generateFallbackHealthAnalysis();
    }
  }

  /**
   * Process generated content response
   */
  private processGeneratedContent(data: any): GeneratedContent {
    return {
      emails: data.emails || [],
      callScripts: data.callScripts || [],
      smsMessages: data.smsMessages || [],
      discoveryQuestions: data.discoveryQuestions || this.generateFallbackQuestions({} as AnalysisResults),
      salesPlaybook: data.salesPlaybook || this.generateFallbackPlaybook({} as AnalysisResults),
      communicationOptimization: data.communicationOptimization || this.generateFallbackOptimization(''),
      dealHealthAnalysis: data.dealHealthAnalysis || this.generateFallbackHealthAnalysis()
    };
  }

  /**
   * Generate fallback content when API fails
   */
  private generateFallbackEmails(analysis: AnalysisResults, context?: any): EmailContent[] {
    const companyName = analysis.company?.name || 'the company';
    const contactName = context?.contactName || 'Valued Contact';

    return [
      {
        id: `email_intro_${Date.now()}`,
        subject: `Introduction to Our Solutions for ${companyName}`,
        body: `Hi ${contactName},

I hope this email finds you well. I came across ${companyName} and was impressed by your work in the ${analysis.company?.industry || 'industry'}.

I'd love to learn more about your current challenges and explore how we might be able to help.

Would you be open to a brief call next week?

Best regards,
${context?.userName || 'Your Name'}`,
        template: 'introduction',
        priority: 'normal'
      }
    ];
  }

  private generateFallbackCallScripts(analysis: AnalysisResults, context?: any): CallScript[] {
    return [
      {
        id: `script_intro_${Date.now()}`,
        name: 'Introduction Call',
        purpose: 'Introduce yourself and qualify interest',
        duration: 15,
        steps: [
          'Greet and confirm speaking with the right person',
          'Introduce yourself and your company',
          'Reference their company and industry',
          'Ask about their current challenges',
          'Share brief value proposition',
          'Schedule next steps'
        ],
        talkingPoints: [
          `Their work in ${analysis.company?.industry || 'the industry'}`,
          `Common challenges in ${analysis.company?.industry || 'this sector'}`,
          'How we help similar companies',
          'Next steps for moving forward'
        ],
        objectionHandling: {
          'Not interested': 'I understand. May I ask what specific challenges you\'re facing right now?',
          'Too busy': 'I completely understand. When would be a good time to follow up?',
          'Send information': 'I\'d be happy to send some information. What specific areas interest you most?'
        },
        successMetrics: [
          'Understand their current situation',
          'Identify specific pain points',
          'Schedule follow-up meeting'
        ]
      }
    ];
  }

  private generateFallbackSMS(analysis: AnalysisResults, context?: any): SMSContent[] {
    return [
      {
        id: `sms_followup_${Date.now()}`,
        message: `Hi ${context?.contactName || 'there'}, following up on our conversation about ${analysis.product?.name || 'our solutions'}. Available for a quick call?`,
        purpose: 'follow-up',
        optimalSendTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        followUpDelay: 30
      }
    ];
  }

  private generateFallbackQuestions(analysis: AnalysisResults): QuestionSet {
    return {
      qualification: [
        'What is your role in the decision-making process?',
        'What is your timeline for implementing new solutions?',
        'What is your budget range for this type of solution?'
      ],
      discovery: [
        `What are your biggest challenges in ${analysis.company?.industry || 'your industry'}?`,
        'How are you currently addressing these challenges?',
        'What outcomes are you hoping to achieve?'
      ],
      technical: [
        'What systems/platforms are you currently using?',
        'Do you have any technical requirements or constraints?',
        'Who handles implementation and training on your team?'
      ],
      budget: [
        'What is your budget range for this initiative?',
        'How do you typically make purchasing decisions?',
        'Are there any budget approvals needed?'
      ],
      timeline: [
        'When do you need this solution implemented?',
        'What are the key milestones in your decision process?',
        'Are there any time-sensitive factors?'
      ],
      decision: [
        'Who else is involved in the decision-making process?',
        'What criteria are most important in your evaluation?',
        'What would need to happen to move forward?'
      ]
    };
  }

  private generateFallbackPlaybook(analysis: AnalysisResults): PlaybookData {
    return {
      id: `playbook_${Date.now()}`,
      name: `${analysis.company?.name || 'Company'} Sales Playbook`,
      phases: [
        {
          id: 'phase_1',
          name: 'Initial Contact',
          order: 1,
          activities: [
            {
              type: 'email',
              description: 'Send personalized introduction email',
              template: 'introduction',
              timing: 'Immediately',
              owner: 'Sales Rep'
            },
            {
              type: 'call',
              description: 'Follow up with introduction call',
              timing: '2-3 days after email',
              owner: 'Sales Rep'
            }
          ],
          duration: 7,
          successCriteria: [
            'Email opened and responded to',
            'Initial call completed',
            'Basic qualification information gathered'
          ]
        },
        {
          id: 'phase_2',
          name: 'Discovery',
          order: 2,
          activities: [
            {
              type: 'meeting',
              description: 'Conduct discovery meeting',
              timing: 'Within 1 week of initial contact',
              owner: 'Sales Rep'
            },
            {
              type: 'email',
              description: 'Send discovery questions in advance',
              timing: '1 day before meeting',
              owner: 'Sales Rep'
            }
          ],
          duration: 14,
          successCriteria: [
            'Discovery meeting completed',
            'Pain points identified',
            'Budget and timeline discussed'
          ]
        }
      ],
      estimatedDuration: 45,
      successRate: 0.35,
      targetDealSize: analysis.product?.pricing?.ranges?.max || 50000
    };
  }

  private generateFallbackOptimization(content: string): OptimizedContent {
    return {
      originalContent: content,
      optimizedContent: content, // In fallback, return original
      improvements: ['Content preserved due to service unavailability'],
      score: 75,
      suggestions: [
        'Consider personalizing with specific company details',
        'Focus on outcomes rather than features',
        'Include a clear call-to-action'
      ]
    };
  }

  private generateFallbackHealthAnalysis(): HealthAnalysis {
    return {
      overallScore: 65,
      riskLevel: 'medium',
      recommendations: [
        'Schedule follow-up meeting to address concerns',
        'Provide additional case studies and references',
        'Clarify budget and timeline expectations'
      ],
      nextSteps: [
        'Send proposal with clear pricing',
        'Schedule technical demo',
        'Connect with key stakeholders'
      ],
      warningSigns: [
        'Delayed responses to communications',
        'Unclear decision-making process'
      ],
      positiveIndicators: [
        'Expressed interest in specific features',
        'Active engagement in discovery process'
      ]
    };
  }
}

// Export singleton instance
export const contentGenerationService = ContentGenerationService.getInstance();