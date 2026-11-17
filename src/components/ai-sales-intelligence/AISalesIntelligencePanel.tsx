import React, { useState } from 'react';
import { StreamingOutput } from '../ui/StreamingOutput';
import { useAIStream } from '../../hooks/useAIStream';
import { liveDisplay } from '../../lib/streaming/previewText';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { TrendingUp, MessageSquare, Target, Zap } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  role?: string;
  industry?: string;
  companySize?: number;
  currentStage?: string;
  engagementScore?: number;
  lastContactedAt?: string;
  painPoints?: string[];
  budget?: string;
  timeline?: string;
}

interface AISalesIntelligencePanelProps {
  contact: Contact;
  onNurturePlan?: () => void;
  onOptimizeMessage?: () => void;
  onGenerateDiscovery?: () => void;
  onAnalyzeHealth?: () => void;
}

interface NurtureStatus {
  sequenceProgress: string;
  nextTouch: string;
  conversionProbability: number;
  status: 'active' | 'paused' | 'completed';
}

interface NurtureReply {
  data?: {
    nurtureSequence?: Array<Record<string, unknown>>;
    contentCalendar?: Array<{ date?: string }>;
    conversionPrediction?: { probability?: number };
  };
}

export const AISalesIntelligencePanel: React.FC<AISalesIntelligencePanelProps> = ({
  contact,
  onNurturePlan,
  onOptimizeMessage,
  onGenerateDiscovery,
  onAnalyzeHealth
}) => {
  const [nurtureStatus, setNurtureStatus] = useState<NurtureStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const nurture = useAIStream<NurtureReply>();
  const [activeTab, setActiveTab] = useState<'overview' | 'nurture' | 'insights'>('overview');

  const analyzeContact = async () => {
    setLoading(true);
    try {
      // Netlify lead-nurturing is dual-mode: the strategy streams in while it is written.
      const reply = await nurture.runFunction('/.netlify/functions/lead-nurturing', {
        contact: {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          title: contact.role,
          company: contact.company,
          industry: contact.industry,
          companySize: contact.companySize,
          currentStage: contact.currentStage || 'prospecting',
          engagementScore: contact.engagementScore || 50,
          lastContactedAt: contact.lastContactedAt,
          painPoints: contact.painPoints,
          budget: contact.budget,
          timeline: contact.timeline
        },
        nurtureStrategy: 'comprehensive',
        timeframe: '90d',
        businessGoals: ['awareness', 'consideration']
      });

      const strategy = reply?.data;
      if (strategy) {
        setNurtureStatus({
          sequenceProgress: `${strategy.nurtureSequence?.length || 0}/5 completed`,
          nextTouch: strategy.contentCalendar?.[0]?.date || 'Tomorrow 10 AM',
          conversionProbability: strategy.conversionPrediction?.probability || 0.5,
          status: 'active'
        });
      }
    } catch (error) {
      console.error('Failed to analyze contact:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.8) return 'text-green-600';
    if (probability >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProbabilityIcon = (probability: number) => {
    if (probability >= 0.8) return '🟢';
    if (probability >= 0.6) return '🟡';
    return '🔴';
  };

  return (
    <GlassCard className="p-6 mb-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Zap className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Sales Intelligence</h3>
            <p className="text-sm text-gray-600">Powered by advanced analytics</p>
          </div>
        </div>
        <ModernButton
          variant="outline"
          size="toolbar"
          onClick={analyzeContact}
          loading={loading}
        >
          {loading ? 'Analyzing...' : '🔍 Analyze'}
        </ModernButton>
      </div>

      {(nurture.isStreaming || nurture.state.status === 'error') && (
        <div className="mb-4">
          {nurture.isStreaming ? (
            <StreamingOutput state={nurture.state} display={liveDisplay(nurture.state.partial, nurture.state.text)} onStop={nurture.stop} placeholder="Building the nurture strategy…" />
          ) : (
            <p className="text-sm text-red-600" role="alert">{nurture.state.error}</p>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'overview'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('nurture')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'nurture'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Nurture
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'insights'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Insights
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {contact.engagementScore || 0}%
              </div>
              <div className="text-sm text-gray-600">Engagement Score</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className={`text-2xl font-bold mb-1 ${
                nurtureStatus ? getProbabilityColor(nurtureStatus.conversionProbability) : 'text-gray-600'
              }`}>
                {nurtureStatus ? `${Math.round(nurtureStatus.conversionProbability * 100)}%` : '--'}
              </div>
              <div className="text-sm text-gray-600">Conversion Probability</div>
            </div>
          </div>

          <div className="flex gap-3">
            <ModernButton
              variant="primary"
              size="toolbar"
              onClick={onNurturePlan || (() => {})}
              className="flex-1"
            >
              🚀 Generate Nurture Plan
            </ModernButton>
            <ModernButton
              variant="outline"
              size="toolbar"
              onClick={onOptimizeMessage || (() => {})}
              className="flex-1"
            >
              💬 Optimize Message
            </ModernButton>
          </div>
        </div>
      )}

      {activeTab === 'nurture' && (
        <div className="space-y-4">
          {nurtureStatus ? (
            <>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Nurture Sequence</div>
                    <div className="text-xs text-gray-600">{nurtureStatus.sequenceProgress}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">Next Touch</div>
                  <div className="text-xs text-gray-600">{nurtureStatus.nextTouch}</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Conversion Probability</div>
                    <div className={`text-xs ${getProbabilityColor(nurtureStatus.conversionProbability)}`}>
                      {getProbabilityIcon(nurtureStatus.conversionProbability)} {Math.round(nurtureStatus.conversionProbability * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No nurture sequence active</p>
              <ModernButton size="toolbar"
                variant="primary"
                onClick={onNurturePlan || (() => {})}
              >
                🚀 Create Nurture Plan
              </ModernButton>
            </div>
          )}

          <div className="flex gap-3">
            <ModernButton
              variant="outline"
              size="toolbar"
              onClick={onGenerateDiscovery || (() => {})}
              className="flex-1"
            >
              🔍 Discovery Questions
            </ModernButton>
            <ModernButton
              variant="outline"
              size="toolbar"
              onClick={onAnalyzeHealth || (() => {})}
              className="flex-1"
            >
              ❤️ Health Analysis
            </ModernButton>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-900">AI Insights</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">💡</span>
                <span className="text-sm text-gray-700">
                  {contact.role ? `${contact.role} typically responds well to technical deep-dives` : 'Role information needed for better insights'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">💡</span>
                <span className="text-sm text-gray-700">
                  {contact.industry ? `${contact.industry} companies often prioritize ROI over features` : 'Industry context would improve recommendations'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <ModernButton
              variant="outline"
              size="toolbar"
              onClick={onOptimizeMessage || (() => {})}
              className="flex-1"
            >
              💬 Message Optimization
            </ModernButton>
            <ModernButton
              variant="outline"
              size="toolbar"
              onClick={onGenerateDiscovery || (() => {})}
              className="flex-1"
            >
              🔍 Generate Questions
            </ModernButton>
          </div>
        </div>
      )}
    </GlassCard>
  );
};