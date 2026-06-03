import React, { useState, useEffect } from 'react';
import { Contact } from '../../types/contact';
import { ColdEmailSDRAgent } from '../sdr/ColdEmailSDRAgent';
import { FollowUpSDRAgent } from '../sdr/FollowUpSDRAgent';
import { ObjectionHandlerSDRAgent } from '../sdr/ObjectionHandlerSDRAgent';
import { ReactivationSDRAgent } from '../sdr/ReactivationSDRAgent';
import { WinBackSDRAgent } from '../sdr/WinBackSDRAgent';
import { DiscoverySDRAgent } from '../sdr/DiscoverySDRAgent';
import { ModernButton } from '../ui/ModernButton';
import { AgentButton } from '../ai-sales-intelligence/AgentButton';
import { OUTBOUND_PERSONAS, getPersonaById, OutboundPersonaId } from '../../agents/personas';
import { supabase } from '../../lib/supabase';
import {
  startSdrAutopilot,
  pauseSdrAutopilot,
  resumeSdrAutopilot,
  stopSdrAutopilot,
  getAutopilotLogs,
} from '../../agents/sdr/runSdrAutopilot';
import {
  Target, Mail, MessageSquare, AlertTriangle, RotateCcw, Trophy, Search,
  Bot, Play, Pause, Square, Clock, Save, RefreshCw, Info, ChevronDown, Check,
  Phone, TrendingUp, Users, Calendar, Rocket, BarChart3, Zap, Brain, MessageCircle
} from 'lucide-react';

interface ContactSDRPanelProps {
  contact: Contact;
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

export const ContactSDRPanel: React.FC<ContactSDRPanelProps> = ({ contact }) => {
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
    setSettings(prev => ({ ...prev, [key]: value }));
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

  const coreSDRAgents = [
    { id: 'cold-email', component: ColdEmailSDRAgent, icon: Mail, title: 'Cold Email SDR', description: 'Send personalized cold emails to initiate contact' },
    { id: 'follow-up', component: FollowUpSDRAgent, icon: MessageSquare, title: 'Follow-Up SDR', description: 'Automated follow-up sequences for nurturing leads' },
    { id: 'objection-handler', component: ObjectionHandlerSDRAgent, icon: AlertTriangle, title: 'Objection Handler SDR', description: 'Handle common sales objections intelligently' },
    { id: 'reactivation', component: ReactivationSDRAgent, icon: RotateCcw, title: 'Re-Activation SDR', description: 'Re-engage dormant or inactive contacts' },
    { id: 'win-back', component: WinBackSDRAgent, icon: Trophy, title: 'Win-Back SDR', description: 'Recover lost deals and churned customers' },
    { id: 'discovery', component: DiscoverySDRAgent, icon: Search, title: 'Discovery SDR', description: 'Research and qualify prospects with AI intelligence' }
  ];

  const enhancedAgents = [
    { id: 'social-selling', name: 'Social Selling', description: 'LinkedIn and social media engagement', icon: MessageCircle, functionName: 'social-selling-agent' },
    { id: 'email-personalization', name: 'Email Personalization', description: 'Dynamic email content optimization', icon: Mail, functionName: 'email-personalization-agent' },
    { id: 'revenue-intelligence', name: 'Revenue Intelligence', description: 'Deal forecasting and pipeline analytics', icon: BarChart3, functionName: 'revenue-intelligence-agent' },
    { id: 'competitive-intel', name: 'Competitive Intel', description: 'Competitor monitoring and analysis', icon: Zap, functionName: 'competitive-intelligence-agent' },
    { id: 'content-creation', name: 'Content Creation', description: 'AI-powered content generation', icon: Brain, functionName: 'content-creation-agent' },
    { id: 'negotiation-coach', name: 'Negotiation Coach', description: 'Real-time negotiation assistance', icon: Target, functionName: 'negotiation-coach-agent' },
    { id: 'meeting-scheduler', name: 'Meeting Scheduler', description: 'Smart meeting coordination', icon: Calendar, functionName: 'video-call-scheduler' },
    { id: 'lead-scoring', name: 'Lead Scoring', description: 'Intent data and lead prioritization', icon: TrendingUp, functionName: 'ai-enrichment' },
    { id: 'call-intelligence', name: 'Call Intelligence', description: 'Conversation analysis and insights', icon: Phone, functionName: 'cold-call-sdr' },
    { id: 'deal-analysis', name: 'Deal Analysis', description: 'Deal health and risk assessment', icon: TrendingUp, functionName: 'deal-analysis-agent' },
    { id: 'proposal-generator', name: 'Proposal Generator', description: 'Create winning proposals', icon: Rocket, functionName: 'proposal-generator' },
    { id: 'email-deliverability', name: 'Email Deliverability', description: 'Optimize email inbox placement', icon: Mail, functionName: 'email-deliverability-agent' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Target className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SDR Agents</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            AI-powered Sales Development Representatives for {contact.firstName || contact.name}
          </p>
        </div>
      </div>

      {/* Core SDR Agents Section */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Mail className="w-4 h-4 mr-2" />
          Core SDR Agents
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coreSDRAgents.map((agent) => {
            const AgentComponent = agent.component;
            const Icon = agent.icon;
            return (
              <div key={agent.id} className="bg-white border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-3 mb-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 dark:text-white text-sm">{agent.title}</h5>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{agent.description}</p>
                  </div>
                </div>
                <AgentComponent contact={contact} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Enhanced Intelligence Agents Section */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Brain className="w-4 h-4 mr-2" />
          Intelligence &amp; Automation Agents
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {enhancedAgents.map((agent) => {
            const Icon = agent.icon;
            return (
              <div key={agent.id} className="bg-white border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-2 mb-2">
                  <Icon className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-gray-900 dark:text-white text-sm">{agent.name}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{agent.description}</p>
                <AgentButton
                  agentId={agent.id}
                  functionName={agent.functionName}
                  contactId={contact.id}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                >
                  Run
                </AgentButton>
              </div>
            );
          })}
        </div>
      </div>

      {/* Autopilot Section */}
      <div className="bg-white border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Bot className="w-5 h-6 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Autopilot</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
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
              <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 text-gray-600 dark:text-gray-400 rounded-full text-sm">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                <span>Inactive</span>
              </div>
            )}
          </div>
        </div>

        {actionError && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <div className="flex items-center space-x-2 p-3 bg-gray-50 border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
          {!isAutopilotRunning && !isAutopilotPaused && (
            <ModernButton variant="primary" size="sm" onClick={handleStartAutopilot} disabled={isLoading} className="flex items-center space-x-2">
              <Play className="w-4 h-4" /><span>Start Autopilot</span>
            </ModernButton>
          )}
          {isAutopilotRunning && (
            <>
              <ModernButton variant="outline" size="sm" onClick={handlePauseAutopilot} disabled={isLoading} className="flex items-center space-x-2">
                <Pause className="w-4 h-4" /><span>Pause</span>
              </ModernButton>
              <ModernButton variant="outline" size="sm" onClick={handleStopAutopilot} disabled={isLoading} className="flex items-center space-x-2 text-red-600 border-red-300 hover:bg-red-50">
                <Square className="w-4 h-4" /><span>Stop</span>
              </ModernButton>
            </>
          )}
          {isAutopilotPaused && (
            <>
              <ModernButton variant="primary" size="sm" onClick={handleResumeAutopilot} disabled={isLoading} className="flex items-center space-x-2">
                <Play className="w-4 h-4" /><span>Resume</span>
              </ModernButton>
              <ModernButton variant="outline" size="sm" onClick={handleStopAutopilot} disabled={isLoading} className="flex items-center space-x-2 text-red-600 border-red-300 hover:bg-red-50">
                <Square className="w-4 h-4" /><span>Stop</span>
              </ModernButton>
            </>
          )}
          <ModernButton variant="outline" size="sm" onClick={handleLoadLogs} disabled={isLoading} className="flex items-center space-x-2 ml-auto">
            <Clock className="w-4 h-4" /><span>View Logs</span>
          </ModernButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">AI Persona</label>
            <div className="relative">
              <button onClick={() => setShowPersonaDropdown(!showPersonaDropdown)} className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <span className="font-medium text-gray-900 dark:text-white">{selectedPersona?.label}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showPersonaDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                  {OUTBOUND_PERSONAS.slice(0, 10).map((persona) => (
                    <button key={persona.id} onClick={() => { handleSettingChange('personaId', persona.id); setShowPersonaDropdown(false); }} className={`w-full flex items-center px-3 py-2 text-left hover:bg-gray-50 text-sm ${settings.personaId === persona.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                      <span className="font-medium text-gray-900 dark:text-white">{persona.label}</span>
                      {settings.personaId === persona.id && <Check className="w-4 h-4 text-blue-600 ml-auto" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Automation Mode</label>
            <div className="relative">
              <button onClick={() => setShowModeDropdown(!showModeDropdown)} className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <span className="font-medium text-gray-900 dark:text-white">{currentMode?.label}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showModeDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10">
                  {followupModeOptions.map((mode) => (
                    <button key={mode.value} onClick={() => { handleSettingChange('followupMode', mode.value); setShowModeDropdown(false); }} className={`w-full flex items-start px-3 py-2 text-left hover:bg-gray-50 text-sm ${settings.followupMode === mode.value ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                      <span className="font-medium text-gray-900 dark:text-white">{mode.label}</span>
                      {settings.followupMode === mode.value && <Check className="w-4 h-4 text-blue-600 ml-auto" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Sequence Length</label>
            <input type="number" min={1} max={10} value={settings.sequenceLength} onChange={(e) => handleSettingChange('sequenceLength', parseInt(e.target.value) || 5)} className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Max Emails / Day</label>
            <input type="number" min={1} max={10} value={settings.maxEmailsPerDay} onChange={(e) => handleSettingChange('maxEmailsPerDay', parseInt(e.target.value) || 3)} className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Business Hours</label>
            <button onClick={() => handleSettingChange('respectBusinessHours', !settings.respectBusinessHours)} className={`w-full px-2 py-1.5 border rounded-lg text-xs font-medium transition-colors ${settings.respectBusinessHours ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-600 dark:text-gray-400'}`}>
              {settings.respectBusinessHours ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Custom Instructions</label>
          <textarea value={settings.customNotes} onChange={(e) => handleSettingChange('customNotes', e.target.value)} placeholder="Add specific instructions..." rows={2} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {selectedPersona && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5" />
              <p className="text-sm text-blue-800">
                The {selectedPersona.name} will email {contact.firstName || contact.name} using a {settings.sequenceLength}-step sequence.
              </p>
            </div>
          </div>
        )}

        {showLogs && logs.length > 0 && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-white">Activity Log</span>
              <button onClick={() => setShowLogs(false)} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-300">Close</button>
            </div>
            <div className="max-h-32 overflow-y-auto divide-y divide-gray-100">
              {logs.map((log) => (
                <div key={log.id} className="px-3 py-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.level === 'error' ? 'bg-red-500' : log.level === 'warn' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                    <span className="text-gray-800">{log.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {lastActivity && (
          <div className="bg-gray-50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Last Activity: {lastActivity}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end pt-3 border-t border-gray-200 dark:border-gray-700 space-x-2">
          <ModernButton variant="outline" size="sm" onClick={() => setSettings({ personaId: 'cold_saas_founder', isEnabled: false, autopilotEnabled: false, followupMode: 'manual', customNotes: '', sequenceLength: 5, maxEmailsPerDay: 3, respectBusinessHours: true })} className="flex items-center space-x-1">
            <RefreshCw className="w-3 h-3" /><span>Reset</span>
          </ModernButton>
          <ModernButton variant="primary" size="sm" onClick={handleSave} disabled={isLoading} className="flex items-center space-x-1">
            <Save className="w-3 h-3" /><span>{isLoading ? 'Saving...' : 'Save Settings'}</span>
          </ModernButton>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Target className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">About SDR Agents</h4>
            <p className="text-sm text-blue-800 mt-1">
              These AI-powered Sales Development Representatives automate various stages of your sales process.
              Each agent is specialized for different scenarios and can work independently or in coordination.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};