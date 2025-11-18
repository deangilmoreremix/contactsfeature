import React, { useState, useCallback, memo } from 'react';
import { X, AlertCircle, CheckCircle, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { ProductIntelligenceInput } from './ProductIntelligenceInput';
import { ProductIntelligenceResults } from './ProductIntelligenceResults';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { productIntelligenceService } from '../../services/productIntelligenceService';
import { contentGenerationService } from '../../services/contentGenerationService';
import { crmIntegrationService } from '../../services/crmIntegrationService';
import { AnalysisResults, GeneratedContent, AnalysisProgress, AnalysisError } from '../../types/productIntelligence';

interface ProductIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactIds?: string[]; // Optional contact IDs to associate with the analysis
}

type ModalStep = 'input' | 'analyzing' | 'results' | 'error';

interface ModalState {
  step: ModalStep;
  analysis?: AnalysisResults;
  generatedContent?: GeneratedContent;
  progress?: AnalysisProgress;
  error?: AnalysisError;
  isGeneratingContent?: boolean;
  isCreatingCRM?: boolean;
}

export const ProductIntelligenceModal: React.FC<ProductIntelligenceModalProps> = memo(({
  isOpen,
  onClose,
  contactIds = []
}) => {
  const [state, setState] = useState<ModalState>({ step: 'input' });

  const handleAnalysisStart = useCallback(async (input: { urls: string[], documents: File[], businessName?: string }) => {
    setState({ step: 'analyzing', progress: { stage: 'input', progress: 0, message: 'Initializing analysis...' } });

    try {
      // Start analysis process
      setState(prev => ({
        ...prev,
        progress: { stage: 'analyzing', progress: 10, message: 'Analyzing web content and documents...' }
      }));

      let analysisResult: AnalysisResults;

      // Analyze web content if URLs provided
      if (input.urls.length > 0) {
        analysisResult = await productIntelligenceService.analyzeWebContent(input.urls, input.businessName);
      } else if (input.documents.length > 0 && input.documents[0]) {
        // For documents, analyze the first one (in a real implementation, you'd handle multiple)
        analysisResult = await productIntelligenceService.analyzeDocument(input.documents[0], input.businessName);
      } else {
        throw new Error('No URLs or documents provided for analysis');
      }

      setState({
        step: 'results',
        analysis: analysisResult
      });

    } catch (error) {
      console.error('Analysis failed:', error);
      setState({
        step: 'error',
        error: {
          type: 'generation',
          message: error instanceof Error ? error.message : 'Analysis failed. Please try again.',
          recoverable: true
        }
      });
    }
  }, []);

  const handleGenerateContent = useCallback(async () => {
    if (!state.analysis) return;

    setState(prev => ({ ...prev, isGeneratingContent: true }));

    try {
      const generatedContent = await contentGenerationService.generateAllContent(state.analysis);

      setState(prev => ({
        ...prev,
        generatedContent,
        isGeneratingContent: false
      }));

    } catch (error) {
      console.error('Content generation failed:', error);
      setState(prev => ({
        ...prev,
        error: {
          type: 'generation',
          message: 'Failed to generate content. Please try again.',
          recoverable: true
        },
        isGeneratingContent: false
      }));
    }
  }, [state.analysis]);

  const handleCreateCRMRecords = useCallback(async () => {
    if (!state.analysis || !state.generatedContent) return;

    setState(prev => ({ ...prev, isCreatingCRM: true }));

    try {
      const crmSetup = await crmIntegrationService.createCompleteCRMSetup(
        state.analysis,
        state.generatedContent,
        contactIds,
        {
          priority: 'high',
          expectedValue: state.analysis.product.pricing.ranges.max * 1000 // Estimate annual value
        }
      );

      // Show success message
      alert(`CRM setup completed successfully!\n\nCreated:\n• Product: ${crmSetup.product.name}\n• Opportunity: $${crmSetup.opportunity.value.toLocaleString()}\n• Workflow: ${crmSetup.workflow.steps.length} steps`);

      setState(prev => ({ ...prev, isCreatingCRM: false }));

    } catch (error) {
      console.error('CRM integration failed:', error);
      setState(prev => ({
        ...prev,
        error: {
          type: 'integration',
          message: 'Failed to create CRM records. Please try again.',
          recoverable: true
        },
        isCreatingCRM: false
      }));
    }
  }, [state.analysis, state.generatedContent, contactIds]);

  const handleExportReport = useCallback(() => {
    if (!state.analysis) return;

    // Create a simple text report (in a real implementation, this would generate a PDF or detailed report)
    const report = `
AI Product Intelligence Report
============================

Analysis ID: ${state.analysis.analysisId}
Generated: ${state.analysis.timestamp.toLocaleString()}

COMPANY OVERVIEW
----------------
Name: ${state.analysis.company.name}
Industry: ${state.analysis.company.industry}
Size: ${state.analysis.company.size}
Location: ${state.analysis.company.location}
Description: ${state.analysis.company.description}

PRODUCT ANALYSIS
---------------
Name: ${state.analysis.product.name}
Category: ${state.analysis.product.category}
Target Market: ${state.analysis.product.targetMarket}
Pricing: $${state.analysis.product.pricing.ranges.min} - $${state.analysis.product.pricing.ranges.max}

MARKET ANALYSIS
--------------
Size: ${state.analysis.market.size}
Growth: ${state.analysis.market.growth}
Competitors: ${state.analysis.market.competitors.join(', ')}
Opportunities: ${state.analysis.market.opportunities.join(', ')}

CONTACTS FOUND: ${state.analysis.contacts.length}
DATA SOURCES: ${state.analysis.sources.length}
CONFIDENCE: ${state.analysis.confidence}%

${state.generatedContent ? `
GENERATED CONTENT
-----------------
Emails: ${state.generatedContent.emails.length}
Call Scripts: ${state.generatedContent.callScripts.length}
SMS Messages: ${state.generatedContent.smsMessages.length}
Sales Playbook: 1
` : ''}
    `;

    // Download as text file
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-intelligence-report-${state.analysis.analysisId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state.analysis, state.generatedContent]);

  const handleRetry = useCallback(() => {
    setState({ step: 'input' });
  }, []);

  const handleBack = useCallback(() => {
    if (state.step === 'results') {
      setState({ step: 'input' });
    }
  }, [state.step]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI Product Intelligence</h2>
              <p className="text-sm text-gray-600">
                {state.step === 'input' && 'Enter URLs or upload documents to analyze'}
                {state.step === 'analyzing' && 'Analyzing content with AI...'}
                {state.step === 'results' && 'Analysis complete - review insights and generate content'}
                {state.step === 'error' && 'An error occurred during analysis'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {state.step === 'results' && (
              <ModernButton
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </ModernButton>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        {state.step === 'analyzing' && state.progress && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900">{state.progress.message}</div>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${state.progress.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {state.step === 'input' && (
            <div className="p-6">
              <ProductIntelligenceInput
                onAnalysisStart={handleAnalysisStart}
                isAnalyzing={false}
              />
            </div>
          )}

          {state.step === 'analyzing' && (
            <div className="flex items-center justify-center p-12">
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Analyzing Content</h3>
                  <p className="text-gray-600">This may take a few minutes...</p>
                </div>
              </div>
            </div>
          )}

          {state.step === 'results' && state.analysis && (
            <div className="p-6">
              <ProductIntelligenceResults
                analysis={state.analysis}
                {...(state.generatedContent && { generatedContent: state.generatedContent })}
                {...(!state.generatedContent && { onGenerateContent: handleGenerateContent })}
                {...(state.generatedContent && { onCreateCRMRecords: handleCreateCRMRecords })}
                onExportReport={handleExportReport}
                isGeneratingContent={state.isGeneratingContent || false}
                isCreatingCRM={state.isCreatingCRM || false}
              />
            </div>
          )}

          {state.step === 'error' && state.error && (
            <div className="p-6">
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900">Analysis Failed</h3>
                  <p className="text-gray-600 mt-2">{state.error.message}</p>
                </div>

                {state.error.recoverable && (
                  <div className="flex justify-center space-x-3">
                    <ModernButton onClick={handleRetry} variant="primary">
                      Try Again
                    </ModernButton>
                    <ModernButton onClick={onClose} variant="outline">
                      Close
                    </ModernButton>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {state.step === 'input' && 'Step 1: Provide analysis input'}
            {state.step === 'analyzing' && 'Step 2: AI analysis in progress'}
            {state.step === 'results' && 'Step 3: Review results and take action'}
            {state.step === 'error' && 'Error occurred during analysis'}
          </div>

          {state.step === 'results' && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Analysis Complete</span>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
});