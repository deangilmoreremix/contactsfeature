import React, { useState, useCallback, memo } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { ResearchThinkingAnimation } from '../ui/ResearchThinkingAnimation';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import {
  X,
  Upload,
  Link,
  FileText,
  Brain,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Target,
  Users,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import {
  AnalysisInput,
  AnalysisResults,
  AnalysisProgress,
  GeneratedContent,
  AnalysisError
} from '../../types/productIntelligence';
import { ProductIntelligenceInput } from './ProductIntelligenceInput';
import { ProductIntelligenceResults } from './ProductIntelligenceResults';
import { ProductIntelligenceContent } from './ProductIntelligenceContent';
import { ProductIntelligenceCRM } from './ProductIntelligenceCRM';

interface ProductIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete?: (results: AnalysisResults, content: GeneratedContent) => void;
}

type ModalStep = 'input' | 'analyzing' | 'results' | 'content' | 'crm';

export const ProductIntelligenceModal: React.FC<ProductIntelligenceModalProps> = memo(({
  isOpen,
  onClose,
  onAnalysisComplete
}) => {
  const [currentStep, setCurrentStep] = useState<ModalStep>('input');
  const [analysisInput, setAnalysisInput] = useState<AnalysisInput>({});
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({
    stage: 'input',
    progress: 0,
    message: 'Ready to analyze'
  });
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<AnalysisError | null>(null);

  const handleInputSubmit = useCallback(async (input: AnalysisInput) => {
    setAnalysisInput(input);
    setCurrentStep('analyzing');
    setError(null);

    try {
      // Simulate analysis process
      setAnalysisProgress({
        stage: 'analyzing',
        progress: 10,
        message: 'Initializing analysis...',
        currentStep: 1,
        totalSteps: 5
      });

      // Step 1: Upload/Process documents
      if (input.documents?.length) {
        setAnalysisProgress(prev => ({
          ...prev,
          progress: 25,
          message: 'Processing documents...',
          currentStep: 2
        }));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Step 2: Web research
      if (input.url) {
        setAnalysisProgress(prev => ({
          ...prev,
          progress: 45,
          message: 'Researching web sources...',
          currentStep: 3
        }));
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Step 3: AI analysis
      setAnalysisProgress(prev => ({
        ...prev,
        progress: 70,
        message: 'AI analysis in progress...',
        currentStep: 4
      }));
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 4: Content generation
      setAnalysisProgress(prev => ({
        ...prev,
        progress: 90,
        message: 'Generating sales content...',
        currentStep: 5
      }));
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock results - in real implementation, this would come from AI services
      const mockResults: AnalysisResults = {
        company: {
          name: input.businessName || 'Analyzed Company',
          industry: 'Technology',
          size: '50-200 employees',
          founded: 2020,
          location: 'San Francisco, CA',
          description: 'A leading technology company providing innovative solutions.',
          website: input.url || '',
          socialProfiles: {
            linkedin: 'https://linkedin.com/company/analyzed-company',
            twitter: 'https://twitter.com/analyzedcompany'
          }
        },
        product: {
          name: 'AI Platform',
          category: 'SaaS',
          pricing: {
            model: 'subscription',
            ranges: { min: 99, max: 999, currency: 'USD' },
            examples: ['$99/month', '$499/month', '$999/month']
          },
          features: ['AI Automation', 'Analytics Dashboard', 'API Integration'],
          targetMarket: 'Enterprise SMBs',
          competitiveAdvantages: ['Advanced AI', 'Easy Integration', 'Scalable'],
          useCases: ['Process Automation', 'Data Analysis', 'Customer Insights']
        },
        contacts: [
          {
            name: 'John Smith',
            title: 'CEO',
            email: 'john@analyzedcompany.com',
            confidence: 95,
            role: 'decision-maker'
          },
          {
            name: 'Sarah Johnson',
            title: 'CTO',
            email: 'sarah@analyzedcompany.com',
            confidence: 92,
            role: 'decision-maker'
          }
        ],
        market: {
          size: '$2.5B',
          growth: '15% YoY',
          competitors: ['Competitor A', 'Competitor B'],
          trends: ['AI Adoption', 'Cloud Migration'],
          opportunities: ['Market Expansion', 'New Verticals'],
          threats: ['Competition', 'Economic Uncertainty']
        },
        financial: {
          revenue: '$10M+',
          funding: '$5M Series A',
          growthMetrics: {
            revenue: '+150%',
            users: '+200%',
            marketShare: '5%'
          }
        },
        sources: [
          {
            type: 'web',
            url: input.url || '',
            title: 'Company Website',
            confidence: 95,
            snippet: 'Leading AI platform for enterprise automation...',
            timestamp: new Date()
          }
        ],
        confidence: 88,
        analysisId: `analysis_${Date.now()}`,
        timestamp: new Date()
      };

      const mockContent: GeneratedContent = {
        emails: [
          {
            id: 'email_1',
            subject: 'Introduction to Our AI Solutions',
            body: 'Dear [Contact],\n\nI hope this email finds you well...',
            template: 'introduction',
            priority: 'normal',
            optimalSendTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
          }
        ],
        callScripts: [
          {
            id: 'call_1',
            name: 'Discovery Call Script',
            purpose: 'Qualify interest and understand needs',
            duration: 30,
            steps: ['Introduction', 'Discovery Questions', 'Value Proposition', 'Next Steps'],
            talkingPoints: ['Current challenges', 'AI adoption plans', 'Budget considerations'],
            objectionHandling: {
              'Too expensive': 'Our ROI typically pays for itself within 6 months...',
              'Not ready': 'Many companies start small and scale as they see results...'
            },
            successMetrics: ['Understanding of needs', 'Budget discussion', 'Next meeting scheduled']
          }
        ],
        smsMessages: [
          {
            id: 'sms_1',
            message: 'Hi [Contact], following up on our AI solutions discussion. Available for a quick call?',
            purpose: 'follow-up',
            optimalSendTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days later
          }
        ],
        discoveryQuestions: {
          qualification: ['What is your current tech stack?', 'Who makes purchasing decisions?'],
          discovery: ['What are your biggest operational challenges?', 'How do you measure success?'],
          technical: ['What integrations do you need?', 'What is your data infrastructure like?'],
          budget: ['What is your budget range for this solution?', 'What is your timeline?'],
          timeline: ['When do you need this implemented?', 'What are your key milestones?'],
          decision: ['What criteria are most important to you?', 'Who else is involved in the decision?']
        },
        salesPlaybook: {
          id: 'playbook_1',
          name: 'Enterprise AI Sales Playbook',
          phases: [
            {
              id: 'phase_1',
              name: 'Initial Outreach',
              order: 1,
              activities: [
                {
                  type: 'email',
                  description: 'Send personalized introduction email',
                  timing: 'Day 1',
                  owner: 'Sales Rep'
                },
                {
                  type: 'call',
                  description: 'Schedule discovery call',
                  timing: 'Day 3-5',
                  owner: 'Sales Rep'
                }
              ],
              duration: 7,
              successCriteria: ['Response received', 'Meeting scheduled']
            }
          ],
          estimatedDuration: 90,
          successRate: 75,
          targetDealSize: 50000
        },
        communicationOptimization: {
          originalContent: 'We provide AI solutions...',
          optimizedContent: 'Transform your operations with our enterprise-grade AI platform...',
          improvements: ['More compelling language', 'Clear value proposition', 'Call to action'],
          score: 85,
          suggestions: ['Add social proof', 'Include specific metrics', 'Personalize further']
        },
        dealHealthAnalysis: {
          overallScore: 78,
          riskLevel: 'medium',
          recommendations: ['Accelerate timeline', 'Address budget concerns', 'Increase stakeholder engagement'],
          nextSteps: ['Schedule technical demo', 'Provide ROI calculator', 'Share case studies'],
          warningSigns: ['Slow response times', 'Budget uncertainty'],
          positiveIndicators: ['Strong need identified', 'Decision maker engaged', 'Technical fit confirmed']
        }
      };

      setAnalysisResults(mockResults);
      setGeneratedContent(mockContent);
      setAnalysisProgress({
        stage: 'complete',
        progress: 100,
        message: 'Analysis complete! Generated sales content ready.'
      });

      setCurrentStep('results');

    } catch (err) {
      setError({
        type: 'network',
        message: 'Analysis failed. Please try again.',
        details: err,
        recoverable: true
      });
      setCurrentStep('input');
    }
  }, []);

  const handleGenerateContent = useCallback(() => {
    if (analysisResults) {
      setCurrentStep('content');
    }
  }, [analysisResults]);

  const handleCRMIntegration = useCallback(() => {
    if (analysisResults && generatedContent) {
      setCurrentStep('crm');
    }
  }, [analysisResults, generatedContent]);

  const handleComplete = useCallback(() => {
    if (analysisResults && generatedContent) {
      onAnalysisComplete?.(analysisResults, generatedContent);
    }
    onClose();
  }, [analysisResults, generatedContent, onAnalysisComplete, onClose]);

  const handleBack = useCallback(() => {
    if (currentStep === 'results') setCurrentStep('analyzing');
    else if (currentStep === 'content') setCurrentStep('results');
    else if (currentStep === 'crm') setCurrentStep('content');
  }, [currentStep]);

  const handleRetry = useCallback(() => {
    setError(null);
    setCurrentStep('input');
    setAnalysisProgress({
      stage: 'input',
      progress: 0,
      message: 'Ready to analyze'
    });
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI Product Intelligence</h2>
              <p className="text-sm text-gray-600">Analyze businesses & products, generate sales content automatically</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {currentStep === 'input' && <Upload className="w-4 h-4 text-blue-600" />}
              {currentStep === 'analyzing' && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
              {currentStep === 'results' && <CheckCircle className="w-4 h-4 text-green-600" />}
              {currentStep === 'content' && <FileText className="w-4 h-4 text-purple-600" />}
              {currentStep === 'crm' && <Target className="w-4 h-4 text-orange-600" />}
              <span className="text-sm font-medium text-gray-900 capitalize">{currentStep}</span>
            </div>
            {analysisProgress.stage !== 'input' && (
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${analysisProgress.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-700 mt-1">{analysisProgress.message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          <ErrorBoundary>
            {error ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Analysis Failed</h3>
                <p className="text-gray-600 mb-6">{error.message}</p>
                <div className="flex justify-center space-x-3">
                  <ModernButton onClick={handleRetry} className="bg-red-600 hover:bg-red-700">
                    Try Again
                  </ModernButton>
                  <ModernButton variant="outline" onClick={onClose}>
                    Cancel
                  </ModernButton>
                </div>
              </div>
            ) : (
              <>
                {currentStep === 'input' && (
                  <ProductIntelligenceInput
                    onSubmit={handleInputSubmit}
                    initialInput={analysisInput}
                  />
                )}

                {currentStep === 'analyzing' && (
                  <div className="p-8">
                    <ResearchThinkingAnimation
                        stage="analyzing"
                        message={analysisProgress.message}
                        progress={analysisProgress.progress}
                        currentStep={analysisProgress.currentStep || 1}
                        totalSteps={analysisProgress.totalSteps || 1}
                      />
                  </div>
                )}

                {currentStep === 'results' && analysisResults && (
                  <ProductIntelligenceResults
                    results={analysisResults}
                    onGenerateContent={handleGenerateContent}
                    onBack={handleBack}
                  />
                )}

                {currentStep === 'content' && generatedContent && (
                  <ProductIntelligenceContent
                    content={generatedContent}
                    onCRMIntegration={handleCRMIntegration}
                    onBack={handleBack}
                  />
                )}

                {currentStep === 'crm' && analysisResults && generatedContent && (
                  <ProductIntelligenceCRM
                    analysisResults={analysisResults}
                    generatedContent={generatedContent}
                    onComplete={handleComplete}
                    onBack={handleBack}
                  />
                )}
              </>
            )}
          </ErrorBoundary>
        </div>
      </GlassCard>
    </div>
  );
});