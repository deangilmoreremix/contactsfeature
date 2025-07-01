import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Bot, RefreshCw, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

export const AIInsightsPanel: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasInsights, setHasInsights] = useState(true);

  const generateInsights = () => {
    setIsGenerating(true);
    // Simulate AI analysis
    setTimeout(() => {
      setIsGenerating(false);
      setHasInsights(true);
    }, 3000);
  };

  const insights = [
    {
      type: 'positive',
      icon: TrendingUp,
      title: 'Pipeline Health Strong',
      description: 'Your pipeline velocity has increased 23% this month with high-quality leads entering the qualification stage.',
      color: 'text-green-600'
    },
    {
      type: 'warning',
      icon: AlertCircle,
      title: 'Deal Risk Alert',
      description: '3 high-value deals show stagnation in negotiation stage. Consider immediate follow-up actions.',
      color: 'text-yellow-600'
    },
    {
      type: 'success',
      icon: CheckCircle,
      title: 'Conversion Opportunity',
      description: 'AI identified 5 prospects with 85%+ closing probability. Prioritize these for immediate attention.',
      color: 'text-blue-600'
    }
  ];

  return (
    <GlassCard className="p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-500 rounded-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Pipeline Intelligence</h3>
            <p className="text-sm text-gray-600">Real-time analysis of your sales performance</p>
          </div>
        </div>
        
        <ModernButton 
          onClick={generateInsights}
          loading={isGenerating}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{isGenerating ? 'Analyzing...' : 'Generate Insights'}</span>
        </ModernButton>
      </div>

      {isGenerating ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">AI is analyzing your pipeline data...</p>
          </div>
        </div>
      ) : hasInsights ? (
        <div className="space-y-4">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className={`p-2 rounded-lg ${insight.color} bg-opacity-10`}>
                  <Icon className={`w-5 h-5 ${insight.color}`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{insight.title}</h4>
                  <p className="text-sm text-gray-600">{insight.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Click "Generate Insights" to analyze your pipeline</p>
        </div>
      )}
    </GlassCard>
  );
};