import React, { useState } from 'react';
import { SDRUserPreferences, createDefaultPreferences, validatePreferences } from '../../types/sdr-preferences';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { CampaignBuilder } from './CampaignBuilder';
import { X, Settings, Clock, Target, Zap, Save, RotateCcw, Workflow } from 'lucide-react';

type TabId = 'basic' | 'advanced' | 'ai' | 'timing';
type ToneValue = SDRUserPreferences['tone'];
type ChannelValue = SDRUserPreferences['channels'][number];
type PersonalizationValue = SDRUserPreferences['personalizationLevel'];
type ActionValue = 'continue' | 'escalate' | 'handover' | 'stop' | 'pause';
type ModelValue = SDRUserPreferences['aiSettings']['model'];

interface SDRAgentConfiguratorProps {
  agentId: string;
  agentName: string;
  currentConfig?: Partial<SDRUserPreferences>;
  onSave: (config: SDRUserPreferences) => void;
  onClose: () => void;
  onReset?: () => void;
  loading?: boolean;
}

export const SDRAgentConfigurator: React.FC<SDRAgentConfiguratorProps> = ({
  agentId,
  agentName,
  currentConfig,
  onSave,
  onClose,
  onReset,
  loading = false
}) => {
  const [config, setConfig] = useState<SDRUserPreferences>(
    currentConfig ? { ...createDefaultPreferences('temp-user', agentId), ...currentConfig } :
    createDefaultPreferences('temp-user', agentId)
  );
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);

  const updateConfig = (updates: Partial<SDRUserPreferences>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    const validationErrors = validatePreferences(config);
    setErrors(validationErrors);

    if (validationErrors.length > 0) {
      return;
    }

    setSaving(true);
    try {
      await onSave(config);
      onClose();
    } catch (error) {
      console.error('Failed to save SDR configuration:', error);
      setErrors(['Failed to save configuration. Please try again.']);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaultConfig = createDefaultPreferences('temp-user', agentId);
    setConfig(defaultConfig);
    setErrors([]);
    onReset?.();
  };

  const tabs = [
    { id: 'basic', label: 'Basic Settings', icon: Settings },
    { id: 'timing', label: 'Timing & Schedule', icon: Clock },
    { id: 'advanced', label: 'Advanced', icon: Target },
    { id: 'ai', label: 'AI Settings', icon: Zap }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <GlassCard className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Configure {agentName}
              </h3>
              <p className="text-sm text-gray-600">
                Customize how this SDR agent behaves and communicates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
            disabled={saving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-4 bg-gray-50 border-b border-gray-200">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as TabId)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === id
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 max-h-96">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Campaign Length - Enhanced with 1-20 step options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Length
                  </label>
                  <select
                    value={config.campaignLength}
                    onChange={(e) => updateConfig({ campaignLength: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Single Touch (1 message)</option>
                    <option value={2}>Double Touch (2 messages)</option>
                    <option value={3}>Triple Touch (3 messages)</option>
                    <option value={4}>Quad Touch (4 messages)</option>
                    <option value={5}>Five Touch (5 messages)</option>
                    <option value={7}>Extended (7 messages)</option>
                    <option value={10}>Long Nurture (10 messages)</option>
                    <option value={15}>Extended Nurture (15 messages)</option>
                    <option value={20}>Marathon Campaign (20 messages)</option>
                  </select>
                </div>

                {/* Tone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Communication Tone
                  </label>
                  <select
                    value={config.tone}
                    onChange={(e) => updateConfig({ tone: e.target.value as ToneValue })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="friendly">Friendly</option>
                    <option value="enthusiastic">Enthusiastic</option>
                  </select>
                </div>
              </div>

              {/* Channels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Communication Channels
                </label>
                <div className="flex gap-4">
                  {([
                    { key: 'email' as ChannelValue, label: 'Email' },
                    { key: 'linkedin' as ChannelValue, label: 'LinkedIn' },
                    { key: 'whatsapp' as ChannelValue, label: 'WhatsApp' },
                    { key: 'phone' as ChannelValue, label: 'Phone' }
                  ]).map(({ key, label }) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.channels.includes(key)}
                        onChange={(e) => {
                          const newChannels = e.target.checked
                            ? [...config.channels, key]
                            : config.channels.filter(c => c !== key);
                          updateConfig({ channels: newChannels });
                        }}
                        className="mr-2"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Personalization Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personalization Level
                </label>
                <select
                  value={config.personalizationLevel}
                  onChange={(e) => updateConfig({ personalizationLevel: e.target.value as PersonalizationValue })}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low - Generic messaging</option>
                  <option value="medium">Medium - Basic personalization</option>
                  <option value="high">High - Deep personalization</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'timing' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Message Delay */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hours Between Messages
                  </label>
                  <input
                    type="number"
                    value={config.messageDelay}
                    onChange={(e) => updateConfig({ messageDelay: parseInt(e.target.value) })}
                    min={1}
                    max={168}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 24-72 hours for most campaigns
                  </p>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={config.timingRules.timezone}
                    onChange={(e) => updateConfig({
                      timingRules: { ...config.timingRules, timezone: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                  </select>
                </div>
              </div>

              {/* Timing Rules */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.timingRules.businessHoursOnly}
                    onChange={(e) => updateConfig({
                      timingRules: { ...config.timingRules, businessHoursOnly: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <label className="text-sm text-gray-700">
                    Send only during business hours (9 AM - 5 PM)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.timingRules.respectWeekends}
                    onChange={(e) => updateConfig({
                      timingRules: { ...config.timingRules, respectWeekends: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <label className="text-sm text-gray-700">
                    Respect weekends (no messages on Saturday/Sunday)
                  </label>
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Messages Per Day
                  </label>
                  <input
                    type="number"
                    value={config.timingRules.maxPerDay}
                    onChange={(e) => updateConfig({
                      timingRules: { ...config.timingRules, maxPerDay: parseInt(e.target.value) }
                    })}
                    min={1}
                    max={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Messages Per Week
                  </label>
                  <input
                    type="number"
                    value={config.timingRules.maxPerWeek}
                    onChange={(e) => updateConfig({
                      timingRules: { ...config.timingRules, maxPerWeek: parseInt(e.target.value) }
                    })}
                    min={1}
                    max={50}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              {/* Success Criteria */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Success Criteria & Actions</h4>
                <div className="space-y-3">
                  {Object.entries(config.successCriteria).map(([criterion, settings]) => (
                    <div key={criterion} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-24 text-sm font-medium capitalize">{criterion}</div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-600">Weight</label>
                        <input
                          type="number"
                          value={settings.weight}
                          onChange={(e) => updateConfig({
                            successCriteria: {
                              ...config.successCriteria,
                              [criterion]: { ...settings, weight: parseFloat(e.target.value) }
                            }
                          })}
                          min={0}
                          max={2}
                          step={0.1}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-600">Action</label>
                        <select
                          value={settings.action}
                          onChange={(e) => updateConfig({
                            successCriteria: {
                              ...config.successCriteria,
                              [criterion]: { ...settings, action: e.target.value as ActionValue }
                            }
                          })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        >
                          <option value="continue">Continue</option>
                          <option value="escalate">Escalate</option>
                          <option value="handover">Handover to Human</option>
                          <option value="stop">Stop Campaign</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Branding */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Branding</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={config.branding.companyName}
                      onChange={(e) => updateConfig({
                        branding: { ...config.branding, companyName: e.target.value }
                      })}
                      placeholder="Your Company Name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Email Signature</label>
                    <input
                      type="text"
                      value={config.branding.signature}
                      onChange={(e) => updateConfig({
                        branding: { ...config.branding, signature: e.target.value }
                      })}
                      placeholder="Best regards, [Your Name]"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* AI Model */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Model
                  </label>
                  <select
                    value={config.aiSettings.model}
                    onChange={(e) => updateConfig({
                      aiSettings: { ...config.aiSettings, model: e.target.value as ModelValue }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="gpt-4">GPT-4 (Most Capable)</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast)</option>
                    <option value="claude-3">Claude 3 (Balanced)</option>
                    <option value="claude-2">Claude 2 (Stable)</option>
                  </select>
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Creativity Level (Temperature)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={config.aiSettings.temperature}
                    onChange={(e) => updateConfig({
                      aiSettings: { ...config.aiSettings, temperature: parseFloat(e.target.value) }
                    })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Conservative</span>
                    <span className="font-medium">{config.aiSettings.temperature}</span>
                    <span>Creative</span>
                  </div>
                </div>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Response Length
                </label>
                <select
                  value={config.aiSettings.maxTokens}
                  onChange={(e) => updateConfig({
                    aiSettings: { ...config.aiSettings, maxTokens: parseInt(e.target.value) }
                  })}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={500}>Short (500 tokens)</option>
                  <option value={1000}>Medium (1000 tokens)</option>
                  <option value={1500}>Long (1500 tokens)</option>
                  <option value={2000}>Very Long (2000 tokens)</option>
                </select>
              </div>

              {/* Custom Prompts */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Instructions (Optional)
                </label>
                <textarea
                  value={config.customPrompts['general'] || ''}
                  onChange={(e) => updateConfig({
                    customPrompts: { ...config.customPrompts, general: e.target.value }
                  })}
                  placeholder="Add any specific instructions for how this agent should behave..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="px-6 pb-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-800">
                <strong>Please fix the following errors:</strong>
                <ul className="mt-1 list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <ModernButton
            variant="outline"
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </ModernButton>

          <div className="flex gap-3">
            <ModernButton
              variant="outline"
              onClick={() => setShowCampaignBuilder(true)}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Workflow className="w-4 h-4" />
              Campaign Builder
            </ModernButton>
            <ModernButton
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </ModernButton>
            <ModernButton
              variant="primary"
              onClick={handleSave}
              loading={saving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </ModernButton>
          </div>
        </div>
      </GlassCard>

      {/* Campaign Builder Modal */}
      {showCampaignBuilder && (
        <CampaignBuilder
          agentId={agentId}
          agentName={agentName}
          preferences={config}
          onSave={(template) => {
            console.log('Campaign template saved:', template);
            // Here you could integrate with the SDR preferences to store campaign sequences
          }}
          onPreview={(sequence) => {
            console.log('Preview campaign sequence:', sequence);
          }}
          onClose={() => setShowCampaignBuilder(false)}
        />
      )}
    </div>
  );
};