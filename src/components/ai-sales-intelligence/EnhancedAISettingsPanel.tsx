/**
 * Enhanced AI Settings Panel
 * Combines existing AI settings with GPT-5.2 SDR Autopilot configuration
 */

import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { AISettingsPanel } from './AISettingsPanel';
import { SDRAutopilotSettings } from './SDRAutopilotSettings';
import { Settings, Bot, Brain } from 'lucide-react';

interface EnhancedAISettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'general' | 'sdr-autopilot';

export const EnhancedAISettingsPanel: React.FC<EnhancedAISettingsPanelProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  if (!isOpen) return null;

  const tabs = [
    {
      id: 'general' as TabType,
      label: 'General AI',
      icon: Brain,
      description: 'Model selection and behavior settings'
    },
    {
      id: 'sdr-autopilot' as TabType,
      label: 'SDR Autopilot',
      icon: Bot,
      description: 'GPT-5.2 powered autonomous campaigns'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Settings className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Enhanced AI Settings</h2>
              <p className="text-sm text-gray-600">Configure AI models and GPT-5.2 SDR Autopilot</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-6 py-4 text-center border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5 mx-auto mb-2" />
                  <div className="text-sm font-medium">{tab.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{tab.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {activeTab === 'general' && (
            <AISettingsPanel
              isOpen={true}
              onClose={() => {}} // Handled by parent
            />
          )}

          {activeTab === 'sdr-autopilot' && (
            <div className="p-6">
              <SDRAutopilotSettings />
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};