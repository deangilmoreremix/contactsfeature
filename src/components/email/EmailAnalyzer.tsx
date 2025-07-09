import React, { useState } from 'react';
import { useEmailAI } from '../../hooks/useEmailAI';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Contact } from '../../types/contact';
import { 
  Mail, 
  BarChart3, 
  ThumbsUp, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  MessageSquare,
  Loader2, 
  Sparkles,
  Target,
  PieChart,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from 'lucide-react';

interface EmailAnalyzerProps {
  contact?: Contact;
  defaultSubject?: string;
  defaultBody?: string;
  className?: string;
}

export const EmailAnalyzer: React.FC<EmailAnalyzerProps> = ({
  contact,
  defaultSubject = '',
  defaultBody = '',
  className = ''
}) => {
  const { analyzeEmail, isAnalyzing, emailAnalysis, error } = useEmailAI();
  
  const [emailSubject, setEmailSubject] = useState(defaultSubject);
  const [emailBody, setEmailBody] = useState(defaultBody);
  const [context, setContext] = useState('');
  const [showContext, setShowContext] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const handleAnalyzeEmail = async () => {
    if (!emailSubject || !emailBody) return;
    
    try {
      await analyzeEmail(emailSubject, emailBody, context, contact);
      setHasAnalyzed(true);
    } catch (error) {
      console.error('Failed to analyze email:', error);
    }
  };

  // Render the tone analysis as a horizontal bar chart
  const renderToneChart = () => {
    if (!emailAnalysis?.toneAnalysis) return null;
    
    return (
      <div className="space-y-3">
        {Object.entries(emailAnalysis.toneAnalysis)
          .sort(([, a], [, b]) => b - a)
          .map(([tone, percentage]) => (
            <div key={tone} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium capitalize">{tone}</span>
                <span className="text-xs text-gray-500">{percentage}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${getToneColor(tone)}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          ))
        }
      </div>
    );
  };

  // Helper function to get color for tone
  const getToneColor = (tone: string): string => {
    switch (tone) {
      case 'formal': return 'bg-blue-500';
      case 'friendly': return 'bg-green-500';
      case 'persuasive': return 'bg-purple-500';
      case 'urgent': return 'bg-red-500';
      case 'informative': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  // Helper function to get color based on score
  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-green-400';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScoreTextColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  // Render improvement color based on type
  const getImprovementColor = (type: string): string => {
    switch (type) {
      case 'issue': return 'text-red-600 bg-red-50 border-red-100';
      case 'suggestion': return 'text-yellow-600 bg-yellow-50 border-yellow-100';
      case 'structural': return 'text-purple-600 bg-purple-50 border-purple-100';
      case 'subject': return 'text-blue-600 bg-blue-50 border-blue-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-purple-500" />
          Email Analyzer
        </h3>
        {hasAnalyzed && !isAnalyzing && (
          <ModernButton
            variant="outline"
            size="sm"
            onClick={() => {
              setHasAnalyzed(false);
              setEmailSubject('');
              setEmailBody('');
              setContext('');
            }}
            className="flex items-center space-x-1"
          >
            <RefreshCw className="w-4 h-4" />
            <span>New Analysis</span>
          </ModernButton>
        )}
      </div>

      {!hasAnalyzed ? (
        <div className="space-y-4">
          {/* Email Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Subject
            </label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              disabled={isAnalyzing}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter your email subject"
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Body
            </label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              disabled={isAnalyzing}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 min-h-32"
              placeholder="Enter your email content"
              rows={6}
            />
          </div>

          {/* Advanced Options - Optional Context */}
          <div>
            <button
              onClick={() => setShowContext(!showContext)}
              className="text-sm text-purple-600 hover:text-purple-800 flex items-center"
            >
              {showContext ? 'Hide Advanced Options' : 'Show Advanced Options'}
            </button>
            
            {showContext && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Context (optional)
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  disabled={isAnalyzing}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter additional context about this email (e.g., previous conversations, specific goals)"
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Analyze Button */}
          <ModernButton
            variant="primary"
            onClick={handleAnalyzeEmail}
            loading={isAnalyzing}
            disabled={!emailSubject || !emailBody}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing Email...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyze Email</span>
              </>
            )}
          </ModernButton>
          
          {!emailSubject || !emailBody ? (
            <p className="text-xs text-gray-500 text-center">
              Please enter both subject and body to analyze your email.
            </p>
          ) : null}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
              <p className="text-gray-700">Analyzing your email...</p>
              <p className="text-sm text-gray-500 mt-2">
                Our AI is examining tone, structure, and effectiveness
              </p>
            </div>
          ) : emailAnalysis ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Quality Score */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-2">Quality Score</div>
                  <div className="text-2xl font-bold mb-1 flex items-center">
                    <span className={getScoreTextColor(emailAnalysis.qualityScore)}>
                      {emailAnalysis.qualityScore}%
                    </span>
                  </div>
                  <div className={`w-12 h-2 rounded-full ${getScoreColor(emailAnalysis.qualityScore)}`} />
                </div>
                
                {/* Response Likelihood */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-2">Response Likelihood</div>
                  <div className="text-2xl font-bold mb-1 flex items-center">
                    <span className={getScoreTextColor(emailAnalysis.responseLikelihood)}>
                      {emailAnalysis.responseLikelihood}%
                    </span>
                  </div>
                  <div className={`w-12 h-2 rounded-full ${getScoreColor(emailAnalysis.responseLikelihood)}`} />
                </div>
                
                {/* Dominant Tone */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-2">Dominant Tone</div>
                  <div className="text-md font-bold capitalize mb-1">{emailAnalysis.dominantTone}</div>
                  <div className={`w-12 h-2 rounded-full ${getToneColor(emailAnalysis.dominantTone)}`} />
                </div>
                
                {/* Metrics */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-2">Email Metrics</div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>Words:</span>
                      <span className="font-medium">{emailAnalysis.metrics.wordCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sentences:</span>
                      <span className="font-medium">{emailAnalysis.metrics.sentenceCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Length:</span>
                      <span className="font-medium">{emailAnalysis.metrics.avgSentenceLength}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overall Assessment */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  {emailAnalysis.qualityScore >= 75 ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                  )}
                  <h4 className="font-medium text-gray-900">Overall Assessment</h4>
                </div>
                <p className="text-gray-700">{emailAnalysis.assessment}</p>
              </div>

              {/* Tone Analysis */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <MessageSquare className="w-5 h-5 text-purple-500 mr-2" />
                  <h4 className="font-medium text-gray-900">Tone Analysis</h4>
                </div>
                {renderToneChart()}
              </div>

              {/* Improvements */}
              {emailAnalysis.improvements.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <Target className="w-5 h-5 text-blue-500 mr-2" />
                    <h4 className="font-medium text-gray-900">Suggested Improvements</h4>
                  </div>
                  <div className="space-y-2">
                    {emailAnalysis.improvements.map((improvement, index) => (
                      <div 
                        key={index} 
                        className={`p-3 border rounded-lg ${getImprovementColor(improvement.type)}`}
                      >
                        <div className="flex items-start">
                          {improvement.type === 'issue' ? (
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                          ) : (
                            <ThumbsUp className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                          )}
                          <p className="text-sm">{improvement.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Provider Info */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center">
                    <Sparkles className="w-3 h-3 mr-1 text-purple-500" />
                    <span>Analysis by {emailAnalysis.model}</span>
                  </div>
                  {emailAnalysis.confidence && (
                    <div className="flex items-center">
                      <Target className="w-3 h-3 mr-1" />
                      <span>Confidence: {emailAnalysis.confidence}%</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </GlassCard>
  );
};