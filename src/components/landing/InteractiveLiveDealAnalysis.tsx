import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { DollarSign, Target, Loader2, CheckCircle, AlertCircle, TrendingUp, Clock, Users } from 'lucide-react';

export const InteractiveLiveDealAnalysis: React.FC = () => {
  const [dealValue, setDealValue] = useState(50000);
  const [dealStage, setDealStage] = useState('proposal');
  const [dealProbability, setDealProbability] = useState(60);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setError(null);

    setTimeout(() => {
      let riskScore = 0;
      let recommendations = [];
      let predictedOutcome = 'Deal progressing well.';

      if (dealProbability < 50) {
        riskScore += 30;
        recommendations.push('Increase deal probability by addressing key concerns.');
        predictedOutcome = 'Deal at risk of stalling or being lost.';
      }
      if (dealStage === 'negotiation' && dealProbability < 70) {
        riskScore += 20;
        recommendations.push('Focus on closing critical negotiation points.');
      }
      if (dealValue > 100000 && dealStage === 'proposal') {
        recommendations.push('Consider involving senior management for high-value deal.');
      }

      const healthScore = Math.max(0, 100 - riskScore);
      const riskLevel = riskScore > 40 ? 'High' : riskScore > 20 ? 'Medium' : 'Low';

      setAnalysisResult({
        healthScore,
        riskLevel,
        predictedOutcome,
        recommendations: recommendations.length > 0 ? recommendations : ['Deal appears healthy, continue current strategy.'],
        keyMetrics: {
          engagementScore: Math.min(100, dealProbability + 10),
          momentumScore: Math.min(100, dealProbability + 5),
          stakeholderAlignment: Math.min(100, dealProbability + 15),
        }
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <GlassCard className="p-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deal Value ($)
          </label>
          <input
            type="number"
            value={dealValue}
            onChange={(e) => setDealValue(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            min="0"
            disabled={isAnalyzing}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deal Stage
          </label>
          <select
            value={dealStage}
            onChange={(e) => setDealStage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isAnalyzing}
          >
            <option value="prospecting">Prospecting</option>
            <option value="qualification">Qualification</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
            <option value="closed_won">Closed Won</option>
            <option value="closed_lost">Closed Lost</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Probability (%)
          </label>
          <input
            type="number"
            value={dealProbability}
            onChange={(e) => setDealProbability(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            min="0"
            max="100"
            disabled={isAnalyzing}
          />
        </div>

        <ModernButton
          variant="primary"
          onClick={handleAnalyze}
          loading={isAnalyzing}
          disabled={isAnalyzing}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing Deal...</span>
            </>
          ) : (
            <>
              <Target className="w-4 h-4" />
              <span>Analyze Deal Health</span>
            </>
          )}
        </ModernButton>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {analysisResult && (
          <div className="mt-4 space-y-3">
            <h4 className="font-semibold text-gray-900 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Deal Health Analysis
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white border border-gray-200 rounded-lg text-center">
                <div className={'text-2xl font-bold ' + getHealthColor(analysisResult.healthScore)}>
                  {analysisResult.healthScore}
                </div>
                <div className="text-sm text-gray-600">Health Score</div>
              </div>
              <div className="p-3 bg-white border border-gray-200 rounded-lg text-center">
                <div className={'text-2xl font-bold ' + (analysisResult.riskLevel === 'High' ? 'text-red-500' : analysisResult.riskLevel === 'Medium' ? 'text-yellow-500' : 'text-green-500')}>
                  {analysisResult.riskLevel}
                </div>
                <div className="text-sm text-gray-600">Risk Level</div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="font-medium text-blue-900 mb-2">Predicted Outcome:</h5>
              <p className="text-sm text-blue-800">{analysisResult.predictedOutcome}</p>
            </div>

            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <h5 className="font-medium text-green-900 mb-2">Recommendations:</h5>
              <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
                {analysisResult.recommendations.map((rec: string, index: number) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-gray-50 rounded-lg">
                <TrendingUp className="w-4 h-4 text-gray-600 mx-auto mb-1" />
                <div className="text-xs text-gray-700">Engagement</div>
                <div className="text-sm font-bold">{analysisResult.keyMetrics.engagementScore}</div>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <Clock className="w-4 h-4 text-gray-600 mx-auto mb-1" />
                <div className="text-xs text-gray-700">Momentum</div>
                <div className="text-sm font-bold">{analysisResult.keyMetrics.momentumScore}</div>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <Users className="w-4 h-4 text-gray-600 mx-auto mb-1" />
                <div className="text-xs text-gray-700">Stakeholder</div>
                <div className="text-sm font-bold">{analysisResult.keyMetrics.stakeholderAlignment}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};