import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Settings, Brain, Zap, Clock, Target, Save, RotateCcw } from 'lucide-react';

interface AISettings {
  model: 'gpt-4o' | 'gpt-4' | 'gpt-3.5-turbo' | 'gemini-1.5-flash' | 'gemini-1.5-pro';
  temperature: number;
  maxTokens: number;
  responseStyle: 'concise' | 'detailed' | 'comprehensive';
  creativity: 'low' | 'medium' | 'high';
  focusAreas: string[];
  enableCaching: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

interface AISettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: AISettings) => void;
  currentSettings?: Partial<AISettings>;
}

const defaultSettings: AISettings = {
  model: 'gpt-4o',
  temperature: 0.3,
  maxTokens: 1000,
  responseStyle: 'detailed',
  creativity: 'medium',
  focusAreas: ['business_strategy', 'technical_requirements', 'competitive_analysis'],
  enableCaching: true,
  autoRefresh: false,
  refreshInterval: 30
};

export const AISettingsPanel: React.FC<AISettingsPanelProps> = ({
  isOpen,
  onClose,
  onSettingsChange,
  currentSettings = {}
}) => {
  const [settings, setSettings] = useState<AISettings>({ ...defaultSettings, ...currentSettings });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load settings from Supabase or localStorage
      const { data, error } = await supabase
        .from('user_ai_settings')
        .select('*')
        .single();

      if (data && !error) {
        setSettings({ ...defaultSettings, ...data.settings });
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
      // Fall back to localStorage
      const stored = localStorage.getItem('ai_settings');
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      }
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Save to Supabase
      const { error } = await supabase
        .from('user_ai_settings')
        .upsert({
          user_id: 'current_user', // Would use actual user ID
          settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Also save to localStorage as backup
      localStorage.setItem('ai_settings', JSON.stringify(settings));

      onSettingsChange?.(settings);
      onClose();
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const updateSetting = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleFocusArea = (area: string) => {
    setSettings(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter(a => a !== area)
        : [...prev.focusAreas, area]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Settings className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI Settings</h2>
              <p className="text-sm text-gray-600">Customize AI behavior and preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading settings...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* AI Model Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Brain className="w-4 h-4 inline mr-2" />
                AI Model
              </label>
              <select
                value={settings.model}
                onChange={(e) => updateSetting('model', e.target.value as AISettings['model'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="gpt-4o">GPT-4o (Recommended)</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Choose the AI model for generating content
              </p>
            </div>

            {/* Response Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Zap className="w-4 h-4 inline mr-2" />
                  Creativity (Temperature)
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.temperature}
                    onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Conservative</span>
                    <span className="font-medium">{settings.temperature}</span>
                    <span>Creative</span>
                  </div>
                </div>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Target className="w-4 h-4 inline mr-2" />
                  Response Length
                </label>
                <select
                  value={settings.maxTokens}
                  onChange={(e) => updateSetting('maxTokens', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="500">Short (500 tokens)</option>
                  <option value="1000">Medium (1000 tokens)</option>
                  <option value="2000">Long (2000 tokens)</option>
                  <option value="4000">Very Long (4000 tokens)</option>
                </select>
              </div>
            </div>

            {/* Response Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Response Style
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['concise', 'detailed', 'comprehensive'] as const).map(style => (
                  <button
                    key={style}
                    onClick={() => updateSetting('responseStyle', style)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      settings.responseStyle === style
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium capitalize">{style}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {style === 'concise' && 'Brief and to the point'}
                      {style === 'detailed' && 'Thorough explanations'}
                      {style === 'comprehensive' && 'In-depth analysis'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Focus Areas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Focus Areas
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'business_strategy',
                  'technical_requirements',
                  'competitive_analysis',
                  'market_research',
                  'customer_insights',
                  'risk_assessment'
                ].map(area => (
                  <label key={area} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.focusAreas.includes(area)}
                      onChange={() => toggleFocusArea(area)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm capitalize">
                      {area.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Performance Settings */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Settings</h3>

              <div className="space-y-4">
                {/* Caching */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Enable Caching</div>
                    <div className="text-xs text-gray-500">Cache generated content for faster loading</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableCaching}
                      onChange={(e) => updateSetting('enableCaching', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* Auto Refresh */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Auto Refresh Cache</div>
                    <div className="text-xs text-gray-500">Automatically refresh cached content</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoRefresh}
                      onChange={(e) => updateSetting('autoRefresh', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* Refresh Interval */}
                {settings.autoRefresh && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-2" />
                      Refresh Interval (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={settings.refreshInterval}
                      onChange={(e) => updateSetting('refreshInterval', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <ModernButton
                variant="outline"
                onClick={resetSettings}
                className="flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </ModernButton>
              <div className="flex-1" />
              <ModernButton
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </ModernButton>
              <ModernButton
                variant="primary"
                onClick={saveSettings}
                loading={saving}
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </ModernButton>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};