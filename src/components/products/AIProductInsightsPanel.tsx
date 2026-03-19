import { useState, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  TrendingUp,
  MessageSquare,
  Shield,
  Clock,
  Target,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Globe,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Zap
} from 'lucide-react';
import type { Contact } from '../../types/contact';
import type { UserProduct, ProductContactMatch } from '../../types/userProduct';
import { gpt52ProductIntelligenceService, AIMatchAnalysis, TalkingPoint, Objection } from '../../services/gpt52ProductIntelligenceService';
import { productMatchingService } from '../../services/productMatchingService';

interface AIProductInsightsPanelProps {
  product: UserProduct;
  contact: Contact;
  match?: ProductContactMatch;
  onMatchUpdated?: (match: ProductContactMatch) => void;
}

export function AIProductInsightsPanel({
  product,
  contact,
  match,
  onMatchUpdated
}: AIProductInsightsPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIMatchAnalysis | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    talkingPoints: true,
    objections: false,
    insights: false,
    enrichment: false
  });
  const [reasoningEffort, setReasoningEffort] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    if (match?.ai_confidence && match?.ai_reasoning) {
      setAiAnalysis({
        aiConfidence: match.ai_confidence,
        aiReasoning: match.ai_reasoning,
        semanticScore: match.ai_confidence,
        talkingPoints: (match.ai_talking_points as TalkingPoint[]) || [],
        anticipatedObjections: (match.ai_objections as Objection[]) || [],
        predictedConversion: match.predicted_conversion || 0,
        optimalOutreachTime: match.optimal_outreach_time || '',
        competitivePositioning: '',
        personalizationInsights: []
      });
    }
  }, [match]);

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const analysis = await gpt52ProductIntelligenceService.analyzeContactMatch(
        product,
        contact,
        reasoningEffort
      );
      setAiAnalysis(analysis);

      if (match?.id) {
        const { data: { user } } = await import('../../lib/supabase').then(m => m.supabase.auth.getUser());
        if (user) {
          const updatedMatch = await productMatchingService.calculateAndSaveAIEnhancedMatch(
            product,
            contact,
            user.id,
            reasoningEffort
          );
          if (updatedMatch && onMatchUpdated) {
            onMatchUpdated(updatedMatch);
          }
        }
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runWebEnrichment = async () => {
    setIsEnriching(true);
    try {
      if (match?.id) {
        await productMatchingService.enrichMatchWithWebResearch(product, contact, match.id);
      }
    } catch (error) {
      console.error('Web enrichment failed:', error);
    } finally {
      setIsEnriching(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-emerald-600 bg-emerald-50';
    if (confidence >= 60) return 'text-blue-600 bg-blue-50';
    if (confidence >= 40) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getRelevanceColor = (relevance: 'high' | 'medium' | 'low') => {
    switch (relevance) {
      case 'high': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getLikelihoodIcon = (likelihood: 'high' | 'medium' | 'low') => {
    switch (likelihood) {
      case 'high': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'medium': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">GPT-5.2 Product Intelligence</h3>
              <p className="text-slate-300 text-sm">AI-powered match analysis and insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={reasoningEffort}
              onChange={(e) => setReasoningEffort(e.target.value as 'low' | 'medium' | 'high')}
              className="text-xs bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              <option value="low" className="text-gray-900">Quick Analysis</option>
              <option value="medium" className="text-gray-900">Standard</option>
              <option value="high" className="text-gray-900">Deep Analysis</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex gap-3">
          <button
            onClick={runAIAnalysis}
            disabled={isAnalyzing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Run AI Analysis</span>
              </>
            )}
          </button>
          <button
            onClick={runWebEnrichment}
            disabled={isEnriching || !match?.id}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEnriching ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Researching...</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                <span>Enrich</span>
              </>
            )}
          </button>
        </div>

        {aiAnalysis && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">AI Confidence</span>
                </div>
                <div className={`text-2xl font-bold ${getConfidenceColor(aiAnalysis.aiConfidence).split(' ')[0]}`}>
                  {aiAnalysis.aiConfidence}%
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Conversion</span>
                </div>
                <div className="text-2xl font-bold text-emerald-700">
                  {aiAnalysis.predictedConversion}%
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Semantic Score</span>
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {aiAnalysis.semanticScore}%
                </div>
              </div>

              <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl p-4 border border-violet-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-violet-600" />
                  <span className="text-xs font-medium text-violet-600 uppercase tracking-wide">Best Time</span>
                </div>
                <div className="text-sm font-semibold text-violet-700 leading-tight">
                  {aiAnalysis.optimalOutreachTime || 'Tue-Thu 10am'}
                </div>
              </div>
            </div>

            {aiAnalysis.aiReasoning && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Lightbulb className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-amber-900 mb-1">AI Reasoning</h4>
                    <p className="text-sm text-amber-800 leading-relaxed">{aiAnalysis.aiReasoning}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('talkingPoints')}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-900">Talking Points</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {aiAnalysis.talkingPoints.length}
                  </span>
                </div>
                {expandedSections.talkingPoints ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {expandedSections.talkingPoints && (
                <div className="p-4 space-y-3">
                  {aiAnalysis.talkingPoints.length > 0 ? (
                    aiAnalysis.talkingPoints.map((point, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-lg">
                        <span className={`text-xs px-2 py-1 rounded-full border ${getRelevanceColor(point.relevance)}`}>
                          {point.relevance}
                        </span>
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 text-sm">{point.topic}</h5>
                          <p className="text-sm text-gray-600 mt-1">{point.content}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">Run AI analysis to generate talking points</p>
                  )}
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('objections')}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-600" />
                  <span className="font-medium text-gray-900">Anticipated Objections</span>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {aiAnalysis.anticipatedObjections.length}
                  </span>
                </div>
                {expandedSections.objections ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {expandedSections.objections && (
                <div className="p-4 space-y-3">
                  {aiAnalysis.anticipatedObjections.length > 0 ? (
                    aiAnalysis.anticipatedObjections.map((obj, index) => (
                      <div key={index} className="p-4 bg-white border border-gray-100 rounded-lg">
                        <div className="flex items-start gap-3 mb-3">
                          {getLikelihoodIcon(obj.likelihood)}
                          <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wide">
                              {obj.likelihood} likelihood
                            </span>
                            <h5 className="font-medium text-gray-900">{obj.objection}</h5>
                          </div>
                        </div>
                        <div className="ml-7 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                          <span className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Suggested Response</span>
                          <p className="text-sm text-emerald-800 mt-1">{obj.response}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">Run AI analysis to predict objections</p>
                  )}
                </div>
              )}
            </div>

            {aiAnalysis.personalizationInsights.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('insights')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-violet-600" />
                    <span className="font-medium text-gray-900">Personalization Insights</span>
                  </div>
                  {expandedSections.insights ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {expandedSections.insights && (
                  <div className="p-4">
                    <ul className="space-y-2">
                      {aiAnalysis.personalizationInsights.map((insight, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {aiAnalysis.competitivePositioning && (
              <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Target className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">Competitive Positioning</h4>
                    <p className="text-sm text-slate-700 leading-relaxed">{aiAnalysis.competitivePositioning}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!aiAnalysis && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">AI Analysis Available</h4>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Click "Run AI Analysis" to get GPT-5.2 powered insights including semantic scoring,
              talking points, objection handling, and conversion predictions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
