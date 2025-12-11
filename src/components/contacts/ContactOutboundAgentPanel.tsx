import React, { useState, useEffect } from 'react';
import { ModernButton } from '../ui/ModernButton';
import { SmartTooltip } from '../ui/SmartTooltip';
import { OUTBOUND_PERSONAS, getPersonaById, OutboundPersonaId } from '../../agents/personas';
import { Contact } from '../../types/contact';
import { SDRPersonaSelector } from './SDRPersonaSelector';
import {
  Bot,
  Settings,
  Play,
  Pause,
  MessageSquare,
  Clock,
  Zap,
  Save,
  RefreshCw,
  Info,
  ChevronDown,
  Check
} from 'lucide-react';

interface ContactOutboundAgentPanelProps {
  contact: Contact;
  onSettingsChange?: (settings: ContactAgentSettings) => void;
}

interface ContactAgentSettings {
  personaId: string;
  isEnabled: boolean;
  followupMode: 'manual' | 'reply-only' | '2-step' | '5-step';
  customNotes: string;
}

const followupModeOptions = [
  { value: 'manual', label: 'Manual', description: 'No automated responses' },
  { value: 'reply-only', label: 'Reply Only', description: 'Respond to direct replies only' },
  { value: '2-step', label: '2-Step Sequence', description: 'Initial response + 1 follow-up' },
  { value: '5-step', label: '5-Step Sequence', description: 'Multi-touch nurture sequence' }
];

export const ContactOutboundAgentPanel: React.FC<ContactOutboundAgentPanelProps> = ({
  contact,
  onSettingsChange
}) => {
  const [settings, setSettings] = useState<ContactAgentSettings>({
    personaId: 'cold_saas_founder',
    isEnabled: false,
    followupMode: 'manual',
    customNotes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [showPersonaDropdown, setShowPersonaDropdown] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  // Load existing settings (would come from API)
  useEffect(() => {
    // Mock loading existing settings
    const loadSettings = async () => {
      // In real implementation, fetch from API
      // const existingSettings = await getContactAgentSettings(contact.id);
      // setSettings(existingSettings);
    };
    loadSettings();
  }, [contact.id]);

  const handleSettingChange = (key: keyof ContactAgentSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // In real implementation, save to API
      // await upsertContactAgentSettings(contact.id, settings);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      setLastActivity(`Settings updated - ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      console.error('Failed to save agent settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPersona = getPersonaById(settings.personaId as OutboundPersonaId);
  const currentMode = followupModeOptions.find(m => m.value === settings.followupMode);

  return (
    <div className="space-y-6">
      {/* SDR Personas Section */}
      <div className="mb-8">
        <SDRPersonaSelector
          contact={contact}
          categoryFilter={[
            'cold_saas_founder',
            'b2b_saas_sdr',
            'high_ticket_coach',
            'agency_retainer_builder',
            'local_biz_offer',
            'd2c_brand_sales'
          ]}
          title="Sales & Outreach SDRs"
          description="AI-powered SDR personas for direct sales and business development outreach"
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Bot className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Email Agent</h3>
            <p className="text-sm text-gray-600">
              Automate email conversations with {contact.firstName || contact.name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {settings.isEnabled ? (
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Active</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span>Inactive</span>
            </div>
          )}
          
          <ModernButton
            variant="outline"
            size="sm"
            onClick={() => handleSettingChange('isEnabled', !settings.isEnabled)}
            className="flex items-center space-x-2"
          >
            {settings.isEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{settings.isEnabled ? 'Pause' : 'Activate'}</span>
          </ModernButton>
        </div>
      </div>

      {/* Agent Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Persona Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            AI Persona
          </label>
          <div className="relative">
            <button
              onClick={() => setShowPersonaDropdown(!showPersonaDropdown)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{selectedPersona?.label.split(' ')[0]}</span>
                <div>
                  <div className="font-medium text-gray-900">{selectedPersona?.label}</div>
                  <div className="text-sm text-gray-500">{selectedPersona?.description}</div>
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </button>

            {showPersonaDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
                {OUTBOUND_PERSONAS.map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => {
                      handleSettingChange('personaId', persona.id);
                      setShowPersonaDropdown(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 ${
                      settings.personaId === persona.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <span className="text-lg">{persona.label.split(' ')[0]}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{persona.label}</div>
                      <div className="text-sm text-gray-500">{persona.description}</div>
                    </div>
                    {settings.personaId === persona.id && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Follow-up Mode */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Automation Mode
          </label>
          <div className="relative">
            <button
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div>
                <div className="font-medium text-gray-900">{currentMode?.label}</div>
                <div className="text-sm text-gray-500">{currentMode?.description}</div>
              </div>
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </button>

            {showModeDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-10">
                {followupModeOptions.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => {
                      handleSettingChange('followupMode', mode.value);
                      setShowModeDropdown(false);
                    }}
                    className={`w-full flex items-start space-x-3 px-4 py-3 text-left hover:bg-gray-50 ${
                      settings.followupMode === mode.value ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{mode.label}</div>
                      <div className="text-sm text-gray-500">{mode.description}</div>
                    </div>
                    {settings.followupMode === mode.value && (
                      <Check className="w-5 h-5 text-blue-600 mt-1" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Notes */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Custom Instructions
        </label>
        <textarea
          value={settings.customNotes}
          onChange={(e) => handleSettingChange('customNotes', e.target.value)}
          placeholder="Add specific instructions for this contact (e.g., 'Focus on their API integration needs' or 'They prefer casual communication')"
          rows={3}
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-500">
          These instructions will be included in the AI agent's system prompt for personalized responses.
        </p>
      </div>

      {/* Agent Preview */}
      {selectedPersona && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Agent Preview</h4>
              <p className="text-sm text-blue-800 mt-1">
                When {contact.firstName || contact.name} receives an email, the {selectedPersona.name} will respond using {currentMode?.label.toLowerCase()} automation.
              </p>
              <div className="mt-2 text-xs text-blue-700">
                <strong>Tone:</strong> {selectedPersona.defaultTone}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log */}
      {lastActivity && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Last Activity: {lastActivity}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <SmartTooltip featureId="agent_settings_info">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4" />
              <span>Changes take effect immediately</span>
            </div>
          </SmartTooltip>
        </div>

        <div className="flex items-center space-x-3">
          <ModernButton
            variant="outline"
            size="sm"
            onClick={() => setSettings({
              personaId: 'cold_saas_founder',
              isEnabled: false,
              followupMode: 'manual',
              customNotes: ''
            })}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset</span>
          </ModernButton>

          <ModernButton
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{isLoading ? 'Saving...' : 'Save Settings'}</span>
          </ModernButton>
        </div>
      </div>
    </div>
  );
};
