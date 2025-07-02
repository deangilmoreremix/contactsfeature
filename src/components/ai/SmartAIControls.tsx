import React, { useState } from 'react';
import { useSmartAI, useTaskOptimization } from '../../hooks/useSmartAI';
import { ModernButton } from '../ui/ModernButton';
import { GlassCard } from '../ui/GlassCard';
import { Contact } from '../../types/contact';
import {
  Brain,
  Zap,
  Target,
  BarChart3,
  Settings,
  Sparkles,
  TrendingUp,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Info,
  Layers,
  RefreshCw
} from 'lucide-react';

interface SmartAIControlsProps {
  contact?: Contact;
  contacts?: Contact[];
  onAnalysisComplete?: (results: any) => void;
}

export const SmartAIControls: React.FC<SmartAIControlsProps> = ({
  contact,
  contacts = [],
  onAnalysisComplete
}) => {
  const {
    smartScoreContact,
    smartEnrichContact,
    smartCategorizeAndTag,
    smartQualifyLead,
    smartBulkAnalysis,
    analyzing,
    enriching,
    results,
    errors
  } = useSmartAI();

  const { getRecommendations, getInsights, performance } = useTaskOptimization();

  const [selectedOperation, setSelectedOperation] = useState<string>('score');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [bulkSettings, setBulkSettings] = useState({
    costLimit: 1.0,
    timeLimit: 30000,
    analysisType: 'contact_scoring' as const
  });

  const handleSingleAnalysis = async () => {
    if (!contact) return;

    try {
      let result;
      
      switch (selectedOperation) {
        case 'score':
          result = await smartScoreContact(contact.id, contact, urgency);
          break;
        case 'enrich':
          result = await smartEnrichContact(contact.id, contact, urgency === 'high' ? 'premium' : 'standard');
          break;
        case 'categorize':
          result = await smartCategorizeAndTag(contact.id, contact);
          break;
        case 'qualify':
          result = await smartQualifyLead(contact.id, contact);
          break;
      }
      
      if (onAnalysisComplete && result) {
        onAnalysisComplete(result);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  const handleBulkAnalysis = async () => {
    if (contacts.length === 0) return;

    try {
      const contactData = contacts.map(c => ({ contactId: c.id, contact: c }));
      
      const result = await smartBulkAnalysis(contactData, bulkSettings.analysisType, {
        urgency,
        costLimit: bulkSettings.costLimit,
        timeLimit: bulkSettings.timeLimit
      });
      
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
    } catch (error) {
      console.error('Bulk analysis failed:', error);
    }
  };

  const getRecommendationsForTask = (taskType: string) => {
    const recommendations = getRecommendations(taskType);
    return recommendations;
  };

  const operations = [
    {
      id: 'score',
      name: 'Smart Scoring',
      description: 'AI-powered contact scoring with optimal model selection',
      icon: Target,
      color: 'bg-blue-500',
      estimatedTime: '2-5s',
      bestModel: 'Auto-selected'
    },
    {
      id: 'enrich',
      name: 'Smart Enrichment',
      description: 'Comprehensive data enrichment using best available models',
      icon: Sparkles,
      color: 'bg-purple-500',
      estimatedTime: '3-8s',
      bestModel: 'Auto-selected'
    },
    {
      id: 'categorize',
      name: 'Quick Categorize',
      description: 'Fast categorization and tagging with optimized models',
      icon: Layers,
      color: 'bg-green-500',
      estimatedTime: '1-3s',
      bestModel: 'Gemma preferred'
    },
    {
      id: 'qualify',
      name: 'Lead Qualification',
      description: 'Comprehensive lead qualification with business context',
      icon: CheckCircle,
      color: 'bg-orange-500',
      estimatedTime: '4-10s',
      bestModel: 'High accuracy'
    }
  ];

  return (
    <div className="space-y-6">
      {/* AI Model Performance Overview */}
      {performance && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
            AI Performance Overview
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{performance.totalTasks}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(performance.overallSuccessRate * 100)}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(performance.avgResponseTime)}ms
              </div>
              <div className="text-sm text-gray-600">Avg Response</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {performance.modelPerformance.length}
              </div>
              <div className="text-sm text-gray-600">Active Models</div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Single Contact Analysis */}
      {contact && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-600" />
            Smart AI Analysis - {contact.name}
          </h3>
          
          {/* Operation Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {operations.map((op) => {
              const Icon = op.icon;
              const recommendations = getRecommendationsForTask(op.id.replace('score', 'contact_scoring'));
              
              return (
                <div
                  key={op.id}
                  onClick={() => setSelectedOperation(op.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedOperation === op.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`p-2 rounded-lg ${op.color}`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{op.name}</h4>
                      <p className="text-sm text-gray-600">{op.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{op.estimatedTime}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Target className="w-3 h-3" />
                      <span>{op.bestModel}</span>
                    </div>
                  </div>
                  
                  {recommendations && (
                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                      <strong>Recommended:</strong> {recommendations.recommendedProvider}/{recommendations.recommendedModel}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Urgency Setting */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Analysis Urgency (affects model selection)
            </label>
            <div className="flex space-x-2">
              {[
                { value: 'low', label: 'Low', desc: 'Cost-optimized' },
                { value: 'medium', label: 'Medium', desc: 'Balanced' },
                { value: 'high', label: 'High', desc: 'Accuracy-focused' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setUrgency(option.value as any)}
                  className={`flex-1 p-3 rounded-lg border text-center transition-colors ${
                    urgency === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Execute Button */}
          <ModernButton
            onClick={handleSingleAnalysis}
            loading={analyzing || enriching}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600"
          >
            <Zap className="w-4 h-4" />
            <span>
              {analyzing || enriching 
                ? 'Analyzing with optimal model...' 
                : `Run ${operations.find(op => op.id === selectedOperation)?.name}`}
            </span>
          </ModernButton>

          {/* Results Display */}
          {Object.keys(results).length > 0 && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Analysis Complete
              </h4>
              <div className="space-y-2">
                {Object.entries(results).map(([key, result]: [string, any]) => (
                  <div key={key} className="text-sm">
                    <span className="font-medium text-green-800">{key}:</span>
                    <span className="text-green-700 ml-2">
                      {result.modelUsed && `Used ${result.modelUsed}`}
                      {result.results && Object.keys(result.results).length > 0 && ` - ${Object.keys(result.results).length} tasks completed`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors Display */}
          {Object.keys(errors).length > 0 && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg">
              <h4 className="font-semibold text-red-900 mb-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Analysis Errors
              </h4>
              <div className="space-y-1">
                {Object.entries(errors).map(([key, error]) => (
                  <div key={key} className="text-sm text-red-700">
                    <span className="font-medium">{key}:</span> {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* Bulk Analysis */}
      {contacts.length > 1 && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Layers className="w-5 h-5 mr-2 text-green-600" />
            Smart Bulk Analysis ({contacts.length} contacts)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Analysis Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bulk Analysis Type
              </label>
              <select
                value={bulkSettings.analysisType}
                onChange={(e) => setBulkSettings(prev => ({ ...prev, analysisType: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="contact_scoring">Contact Scoring</option>
                <option value="categorization">Categorization</option>
                <option value="tagging">Tagging</option>
                <option value="lead_qualification">Lead Qualification</option>
              </select>
            </div>

            {/* Constraints */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost Limit ($)
              </label>
              <input
                type="number"
                step="0.10"
                value={bulkSettings.costLimit}
                onChange={(e) => setBulkSettings(prev => ({ ...prev, costLimit: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1.00"
              />
            </div>
          </div>

          {/* Estimated Metrics */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <DollarSign className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <div className="text-sm font-medium text-blue-900">Est. Cost</div>
              <div className="text-xs text-blue-700">${(contacts.length * 0.05).toFixed(2)}</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <Clock className="w-4 h-4 text-green-600 mx-auto mb-1" />
              <div className="text-sm font-medium text-green-900">Est. Time</div>
              <div className="text-xs text-green-700">{Math.ceil(contacts.length / 10)}s</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg text-center">
              <Brain className="w-4 h-4 text-purple-600 mx-auto mb-1" />
              <div className="text-sm font-medium text-purple-900">Auto Model</div>
              <div className="text-xs text-purple-700">Optimized</div>
            </div>
          </div>

          <ModernButton
            onClick={handleBulkAnalysis}
            loading={analyzing}
            className="w-full mt-6 flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-blue-600"
          >
            <Layers className="w-4 h-4" />
            <span>
              {analyzing 
                ? `Processing ${contacts.length} contacts...` 
                : `Analyze ${contacts.length} Contacts`}
            </span>
          </ModernButton>
        </GlassCard>
      )}

      {/* Model Performance Stats */}
      {performance?.modelPerformance && performance.modelPerformance.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            Model Performance Stats
          </h3>
          
          <div className="space-y-3">
            {performance.modelPerformance.slice(0, 5).map((model: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{model.model}</div>
                  <div className="text-sm text-gray-600">
                    {Math.round(model.successRate * 100)}% success • {Math.round(model.avgTime)}ms avg
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    ${model.avgCost.toFixed(4)}
                  </div>
                  <div className="text-xs text-gray-500">avg cost</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
};