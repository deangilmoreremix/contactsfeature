/**
 * SDR Autopilot Settings Component
 * GPT-5.2 powered SDR automation configuration
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ModernButton } from '../ui/ModernButton';
import { Bot, Mail, Calendar, Target, Settings as SettingsIcon, Play, Pause, Square } from 'lucide-react';

interface SDRAutopilotSettings {
  enabled: boolean;
  defaultMailbox: string;
  defaultCampaignLength: number;
  autoResumeOnReply: boolean;
  maxConcurrentCampaigns: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  followUpDelayDays: number;
  enablePersonalization: boolean;
  enableABTesting: boolean;
}

interface SDRAutopilotSettingsProps {
  onSettingsChange?: (settings: SDRAutopilotSettings) => void;
}

const defaultSDRAutopilotSettings: SDRAutopilotSettings = {
  enabled: false,
  defaultMailbox: 'deansales',
  defaultCampaignLength: 30,
  autoResumeOnReply: true,
  maxConcurrentCampaigns: 50,
  quietHoursStart: '18:00',
  quietHoursEnd: '08:00',
  followUpDelayDays: 3,
  enablePersonalization: true,
  enableABTesting: false
};

export const SDRAutopilotSettings: React.FC<SDRAutopilotSettingsProps> = ({
  onSettingsChange
}) => {
  const [settings, setSettings] = useState<SDRAutopilotSettings>(defaultSDRAutopilotSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSDRAutopilotSettings();
  }, []);

  const loadSDRAutopilotSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_ai_settings')
        .select('sdr_autopilot_settings')
        .single();

      if (data?.sdr_autopilot_settings && !error) {
        setSettings({ ...defaultSDRAutopilotSettings, ...data.sdr_autopilot_settings });
      }
    } catch (error) {
      console.error('Failed to load SDR Autopilot settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSDRAutopilotSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_ai_settings')
        .upsert({
          user_id: 'current_user',
          sdr_autopilot_settings: settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      onSettingsChange?.(settings);
    } catch (error) {
      console.error('Failed to save SDR Autopilot settings:', error);
      alert('Failed to save SDR Autopilot settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof SDRAutopilotSettings>(
    key: K,
    value: SDRAutopilotSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Loading SDR Autopilot settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Bot className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">SDR Autopilot (GPT-5.2)</h3>
            <p className="text-sm text-gray-600">AI-powered autonomous sales campaigns</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>GPT-5.2 SDR Autopilot</strong> enables fully autonomous sales campaigns with intelligent
            email sequencing, CRM updates, meeting scheduling, and adaptive responses to inbound replies.
          </p>
        </div>
      </div>

      {/* Enable SDR Autopilot */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
        <div>
          <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Play className="w-4 h-4" />
            Enable SDR Autopilot
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Allow GPT-5.2 to run autonomous SDR campaigns with tool calling
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => updateSetting('enabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {settings.enabled && (
        <>
          {/* Campaign Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Default Mailbox */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Mail className="w-4 h-4 inline mr-2" />
                Default SDR Mailbox
              </label>
              <select
                value={settings.defaultMailbox}
                onChange={(e) => updateSetting('defaultMailbox', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="deansales">Dean Sales (dean@agentmail.to)</option>
                <option value="sarahbizdev">Sarah BizDev (sarah@agentmail.to)</option>
                <option value="techsales">Tech Sales (tech@agentmail.to)</option>
                <option value="custom">Custom Mailbox</option>
              </select>
            </div>

            {/* Default Campaign Length */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Target className="w-4 h-4 inline mr-2" />
                Default Campaign Length (days)
              </label>
              <select
                value={settings.defaultCampaignLength}
                onChange={(e) => updateSetting('defaultCampaignLength', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="10">10 days (Quick nurture)</option>
                <option value="30">30 days (Standard campaign)</option>
                <option value="60">60 days (Long-term nurture)</option>
                <option value="90">90 days (Enterprise cycle)</option>
              </select>
            </div>
          </div>

          {/* Automation Settings */}
          <div className="space-y-4">
            {/* Auto Resume on Reply */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">Auto-Resume on Reply</div>
                <div className="text-xs text-gray-500">Automatically respond to inbound emails using GPT-5.2</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoResumeOnReply}
                  onChange={(e) => updateSetting('autoResumeOnReply', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Enable Personalization */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">AI Personalization</div>
                <div className="text-xs text-gray-500">Use GPT-5.2 to personalize messaging based on lead context</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enablePersonalization}
                  onChange={(e) => updateSetting('enablePersonalization', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* A/B Testing */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">A/B Testing</div>
                <div className="text-xs text-gray-500">Test different subject lines and messaging approaches</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableABTesting}
                  onChange={(e) => updateSetting('enableABTesting', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Advanced Settings
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Max Concurrent Campaigns */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Concurrent Campaigns
                </label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={settings.maxConcurrentCampaigns}
                  onChange={(e) => updateSetting('maxConcurrentCampaigns', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Follow-up Delay */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follow-up Delay (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={settings.followUpDelayDays}
                  onChange={(e) => updateSetting('followUpDelayDays', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Quiet Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quiet Hours Start
                </label>
                <input
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) => updateSetting('quietHoursStart', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quiet Hours End
                </label>
                <input
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) => updateSetting('quietHoursEnd', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <ModernButton
              variant="primary"
              onClick={saveSDRAutopilotSettings}
              loading={saving}
              className="flex items-center space-x-2"
            >
              <Bot className="w-4 h-4" />
              <span>Save SDR Autopilot Settings</span>
            </ModernButton>
          </div>
        </>
      )}
    </div>
  );
};