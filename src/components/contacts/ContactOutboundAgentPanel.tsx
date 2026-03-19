import React, { useState, useEffect } from 'react';
import { ModernButton } from '../ui/ModernButton';
import { SmartTooltip } from '../ui/SmartTooltip';
import { OUTBOUND_PERSONAS, getPersonaById, OutboundPersonaId } from '../../agents/personas';
import { Contact } from '../../types/contact';
import { supabase } from '../../lib/supabase';
import {
  startSdrAutopilot,
  pauseSdrAutopilot,
  resumeSdrAutopilot,
  stopSdrAutopilot,
  getAutopilotLogs,
} from '../../agents/sdr/runSdrAutopilot';
import {
  Bot,
  Play,
  Pause,
  Square,
  Clock,
  Save,
  RefreshCw,
  Info,
  ChevronDown,
  Check,
  Activity,
  AlertCircle,
} from 'lucide-react';

interface ContactOutboundAgentPanelProps {
  contact: Contact;
  onSettingsChange?: (settings: ContactAgentSettings) => void;
}

interface ContactAgentSettings {
  personaId: string;
  isEnabled: boolean;
  autopilotEnabled: boolean;
  followupMode: 'manual' | 'reply-only' | '2-step' | '5-step';
  customNotes: string;
  sequenceLength: number;
  maxEmailsPerDay: number;
  respectBusinessHours: boolean;
}

interface AutopilotLog {
  id: string;
  message: string;
  level: string;
  created_at: string;
}

const followupModeOptions = [
  { value: 'manual', label: 'Manual', description: 'No automated responses' },
  { value: 'reply-only', label: 'Reply Only', description: 'Respond to direct replies only' },
  { value: '2-step', label: '2-Step Sequence', description: 'Initial response + 1 follow-up' },
  { value: '5-step', label: '5-Step Sequence', description: 'Multi-touch nurture sequence' },
];

export const ContactOutboundAgentPanel: React.FC<ContactOutboundAgentPanelProps> = ({
  contact,
  onSettingsChange,
}) => {
  const [settings, setSettings] = useState<ContactAgentSettings>({
    personaId: 'cold_saas_founder',
    isEnabled: false,
    autopilotEnabled: false,
    followupMode: 'manual',
    customNotes: '',
    sequenceLength: 5,
    maxEmailsPerDay: 3,
    respectBusinessHours: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [autopilotStatus, setAutopilotStatus] = useState<string | null>(null);
  const [logs, setLogs] = useState<AutopilotLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [showPersonaDropdown, setShowPersonaDropdown] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from('contact_agent_settings')
        .select('*')
        .eq('contact_id', contact.id)
        .maybeSingle();
      if (data) {
        setSettings({
          personaId: data.persona_id || data.agent_key || 'cold_saas_founder',
          isEnabled: data.is_enabled ?? false,
          autopilotEnabled: data.autopilot_enabled ?? false,
          followupMode: data.followup_mode || 'manual',
          customNotes: data.notes || data.custom_instructions || '',
          sequenceLength: data.sequence_length || 5,
          maxEmailsPerDay: data.max_emails_per_day || 3,
          respectBusinessHours: data.respect_business_hours ?? true,
        });
      }

      const { data: stateData } = await supabase
        .from('autopilot_state')
        .select('status')
        .eq('lead_id', contact.id)
        .eq('agent_type', 'sdr_autopilot')
        .maybeSingle();
      if (stateData) {
        setAutopilotStatus(stateData.status);
      }
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
    setActionError(null);
    try {
      const { error } = await supabase
        .from('contact_agent_settings')
        .upsert({
          contact_id: contact.id,
          persona_id: settings.personaId,
          is_enabled: settings.isEnabled,
          autopilot_enabled: settings.autopilotEnabled,
          followup_mode: settings.followupMode,
          notes: settings.customNotes,
          sequence_length: settings.sequenceLength,
          max_emails_per_day: settings.maxEmailsPerDay,
          respect_business_hours: settings.respectBusinessHours,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'contact_id' });
      if (error) throw error;
      setLastActivity(`Settings saved - ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      console.error('Failed to save agent settings:', error);
      setActionError('Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartAutopilot = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      await handleSave();
      const result = await startSdrAutopilot({
        contactId: contact.id,
        personaId: settings.personaId,
        sequenceLength: settings.sequenceLength,
      });
      if (!result.success) throw new Error(result.error || 'Failed to start autopilot');
      setAutopilotStatus('active');
      setSettings(prev => ({ ...prev, autopilotEnabled: true, isEnabled: true }));
      setLastActivity(`Autopilot started - ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to start autopilot');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseAutopilot = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const result = await pauseSdrAutopilot(contact.id);
      if (!result.success) throw new Error(result.error || 'Failed to pause');
      setAutopilotStatus('paused');
      setLastActivity(`Autopilot paused - ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to pause');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeAutopilot = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const result = await resumeSdrAutopilot(contact.id);
      if (!result.success) throw new Error(result.error || 'Failed to resume');
      setAutopilotStatus('active');
      setLastActivity(`Autopilot resumed - ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to resume');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopAutopilot = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const result = await stopSdrAutopilot(contact.id);
      if (!result.success) throw new Error(result.error || 'Failed to stop');
      setAutopilotStatus('stopped');
      setSettings(prev => ({ ...prev, autopilotEnabled: false }));
      setLastActivity(`Autopilot stopped - ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to stop');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadLogs = async () => {
    const result = await getAutopilotLogs(contact.id);
    setLogs(result.logs as AutopilotLog[]);
    setShowLogs(true);
  };

  const selectedPersona = getPersonaById(settings.personaId as OutboundPersonaId);
  const currentMode = followupModeOptions.find(m => m.value === settings.followupMode);
  const isAutopilotRunning = autopilotStatus === 'active';
  const isAutopilotPaused = autopilotStatus === 'paused';

  return (
    <div className="space-y-6">
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
          {isAutopilotRunning && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Running</span>
            </div>
          )}
          {isAutopilotPaused && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span>Paused</span>
            </div>
          )}
          {!isAutopilotRunning && !isAutopilotPaused && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
              <span>Inactive</span>
            </div>
          )}
        </div>
      </div>

      {actionError && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="flex items-center space-x-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        {!isAutopilotRunning && !isAutopilotPaused && (
          <ModernButton
            variant="primary"
            size="sm"
            onClick={handleStartAutopilot}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <Play className="w-4 h-4" />
            <span>Start Autopilot</span>
          </ModernButton>
        )}
        {isAutopilotRunning && (
          <>
            <ModernButton
              variant="outline"
              size="sm"
              onClick={handlePauseAutopilot}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </ModernButton>
            <ModernButton
              variant="outline"
              size="sm"
              onClick={handleStopAutopilot}
              disabled={isLoading}
              className="flex items-center space-x-2 text-red-600 border-red-300 hover:bg-red-50"
            >
              <Square className="w-4 h-4" />
              <span>Stop</span>
            </ModernButton>
          </>
        )}
        {isAutopilotPaused && (
          <>
            <ModernButton
              variant="primary"
              size="sm"
              onClick={handleResumeAutopilot}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Resume</span>
            </ModernButton>
            <ModernButton
              variant="outline"
              size="sm"
              onClick={handleStopAutopilot}
              disabled={isLoading}
              className="flex items-center space-x-2 text-red-600 border-red-300 hover:bg-red-50"
            >
              <Square className="w-4 h-4" />
              <span>Stop</span>
            </ModernButton>
          </>
        )}
        <ModernButton
          variant="outline"
          size="sm"
          onClick={handleLoadLogs}
          disabled={isLoading}
          className="flex items-center space-x-2 ml-auto"
        >
          <Activity className="w-4 h-4" />
          <span>View Logs</span>
        </ModernButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">AI Persona</label>
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

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Automation Mode</label>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Sequence Length</label>
          <input
            type="number"
            min={1}
            max={10}
            value={settings.sequenceLength}
            onChange={(e) => handleSettingChange('sequenceLength', parseInt(e.target.value) || 5)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Max Emails / Day</label>
          <input
            type="number"
            min={1}
            max={10}
            value={settings.maxEmailsPerDay}
            onChange={(e) => handleSettingChange('maxEmailsPerDay', parseInt(e.target.value) || 3)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Business Hours</label>
          <button
            onClick={() => handleSettingChange('respectBusinessHours', !settings.respectBusinessHours)}
            className={`w-full px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
              settings.respectBusinessHours
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-600'
            }`}
          >
            {settings.respectBusinessHours ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Custom Instructions</label>
        <textarea
          value={settings.customNotes}
          onChange={(e) => handleSettingChange('customNotes', e.target.value)}
          placeholder="Add specific instructions for this contact (e.g., 'Focus on their API integration needs')"
          rows={3}
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {selectedPersona && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Agent Preview</h4>
              <p className="text-sm text-blue-800 mt-1">
                The {selectedPersona.name} will autonomously email {contact.firstName || contact.name} using a {settings.sequenceLength}-step sequence with up to {settings.maxEmailsPerDay} emails per day.
              </p>
              <div className="mt-2 text-xs text-blue-700">
                <strong>Tone:</strong> {selectedPersona.defaultTone}
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogs && logs.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">Activity Log</h4>
            <button onClick={() => setShowLogs(false)} className="text-xs text-gray-500 hover:text-gray-700">
              Close
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-2 text-sm">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    log.level === 'error' ? 'bg-red-500' : log.level === 'warn' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <span className="text-gray-800">{log.message}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1 pl-4">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showLogs && logs.length === 0 && (
        <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
          No activity logs found for this contact.
        </div>
      )}

      {lastActivity && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Last Activity: {lastActivity}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <SmartTooltip featureId="agent_settings_info">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Info className="w-4 h-4" />
            <span>Changes take effect immediately</span>
          </div>
        </SmartTooltip>

        <div className="flex items-center space-x-3">
          <ModernButton
            variant="outline"
            size="sm"
            onClick={() => setSettings({
              personaId: 'cold_saas_founder',
              isEnabled: false,
              autopilotEnabled: false,
              followupMode: 'manual',
              customNotes: '',
              sequenceLength: 5,
              maxEmailsPerDay: 3,
              respectBusinessHours: true,
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
