import React, { useState, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { ResearchThinkingAnimation, useResearchThinking } from '../ui/ResearchThinkingAnimation';
import { CitationBadge } from '../ui/CitationBadge';
import { ResearchStatusOverlay, useResearchStatus } from '../ui/ResearchStatusOverlay';
import { communicationConfigService, SMTPConfig, TwilioConfig, MailtoConfig } from '../../services/communicationConfigService';
import {
  Mail,
  MessageSquare,
  Settings,
  Plus,
  Edit,
  Trash2,
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Download,
  Upload,
  Zap,
  Shield,
  Clock,
  BarChart3
} from 'lucide-react';

interface CommunicationSettingsProps {
  onSave?: () => void;
}

export const CommunicationSettings: React.FC<CommunicationSettingsProps> = ({ onSave }) => {
  const [activeTab, setActiveTab] = useState<'smtp' | 'twilio' | 'mailto'>('smtp');
  const [smtpConfigs, setSmtpConfigs] = useState<SMTPConfig[]>([]);
  const [twilioConfigs, setTwilioConfigs] = useState<TwilioConfig[]>([]);
  const [mailtoConfigs, setMailtoConfigs] = useState<MailtoConfig[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [testResults, setTestResults] = useState<Map<string, any>>(new Map());
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());

  const researchThinking = useResearchThinking();
  const researchStatus = useResearchStatus();

  // Form states
  const [smtpForm, setSmtpForm] = useState({
    name: '',
    host: '',
    port: 587,
    secure: false,
    auth: { user: '', pass: '' },
    fromEmail: '',
    fromName: '',
    isActive: false,
    testMode: false,
    dailyLimit: 1000,
    rateLimit: 60
  });

  const [twilioForm, setTwilioForm] = useState({
    name: '',
    accountSid: '',
    authToken: '',
    phoneNumbers: [''],
    isActive: false,
    testMode: false,
    dailyLimit: 1000,
    rateLimit: 30,
    webhookUrl: ''
  });

  const [mailtoForm, setMailtoForm] = useState({
    name: '',
    defaultSubject: '',
    defaultBody: '',
    includeContactInfo: true,
    openInNewTab: true,
    isActive: false
  });

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = () => {
    setSmtpConfigs(communicationConfigService.getConfigsByType('smtp'));
    setTwilioConfigs(communicationConfigService.getConfigsByType('twilio'));
    setMailtoConfigs(communicationConfigService.getConfigsByType('mailto'));
  };

  const handleAddSMTP = () => {
    try {
      const config = communicationConfigService.addSMTPConfig(smtpForm);
      setSmtpConfigs(prev => [...prev, config]);
      setShowAddModal(false);
      resetSMTPForm();
      onSave?.();
    } catch (error) {
      console.error('Failed to add SMTP config:', error);
    }
  };

  const handleAddTwilio = () => {
    try {
      const config = communicationConfigService.addTwilioConfig({
        ...twilioForm,
        phoneNumbers: twilioForm.phoneNumbers.filter(num => num.trim())
      });
      setTwilioConfigs(prev => [...prev, config]);
      setShowAddModal(false);
      resetTwilioForm();
      onSave?.();
    } catch (error) {
      console.error('Failed to add Twilio config:', error);
    }
  };

  const handleAddMailto = () => {
    try {
      const config = communicationConfigService.addMailtoConfig(mailtoForm);
      setMailtoConfigs(prev => [...prev, config]);
      setShowAddModal(false);
      resetMailtoForm();
      onSave?.();
    } catch (error) {
      console.error('Failed to add Mailto config:', error);
    }
  };

  const resetSMTPForm = () => {
    setSmtpForm({
      name: '',
      host: '',
      port: 587,
      secure: false,
      auth: { user: '', pass: '' },
      fromEmail: '',
      fromName: '',
      isActive: false,
      testMode: false,
      dailyLimit: 1000,
      rateLimit: 60
    });
  };

  const resetTwilioForm = () => {
    setTwilioForm({
      name: '',
      accountSid: '',
      authToken: '',
      phoneNumbers: [''],
      isActive: false,
      testMode: false,
      dailyLimit: 1000,
      rateLimit: 30,
      webhookUrl: ''
    });
  };

  const resetMailtoForm = () => {
    setMailtoForm({
      name: '',
      defaultSubject: '',
      defaultBody: '',
      includeContactInfo: true,
      openInNewTab: true,
      isActive: false
    });
  };

  const handleTestSMTP = async (configId: string) => {
    researchThinking.startResearch('Testing SMTP configuration...');
    try {
      const result = await communicationConfigService.testSMTPConfig(configId);
      setTestResults(prev => new Map(prev.set(`smtp_${configId}`, result)));
      researchThinking.complete(result.success ? '✅ SMTP test successful!' : '❌ SMTP test failed');
    } catch (error) {
      researchThinking.complete('❌ SMTP test error');
    }
  };

  const handleTestTwilio = async (configId: string) => {
    researchThinking.startResearch('Testing Twilio configuration...');
    try {
      const result = await communicationConfigService.testTwilioConfig(configId);
      setTestResults(prev => new Map(prev.set(`twilio_${configId}`, result)));
      researchThinking.complete(result.success ? '✅ Twilio test successful!' : '❌ Twilio test failed');
    } catch (error) {
      researchThinking.complete('❌ Twilio test error');
    }
  };

  const handleTestMailto = async (configId: string) => {
    researchThinking.startResearch('Testing Mailto configuration...');
    try {
      const result = await communicationConfigService.testMailtoConfig(configId);
      setTestResults(prev => new Map(prev.set(`mailto_${configId}`, result)));
      researchThinking.complete(result.success ? '✅ Mailto test successful!' : '❌ Mailto test failed');
    } catch (error) {
      researchThinking.complete('❌ Mailto test error');
    }
  };

  const handleToggleActive = (type: string, id: string, isActive: boolean) => {
    communicationConfigService.updateConfig(type as any, id, { isActive: !isActive });
    loadConfigurations();
    onSave?.();
  };

  const handleDeleteConfig = (type: string, id: string) => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      communicationConfigService.deleteConfig(type as any, id);
      loadConfigurations();
      onSave?.();
    }
  };

  const togglePasswordVisibility = (configId: string) => {
    setShowPasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(configId)) {
        newSet.delete(configId);
      } else {
        newSet.add(configId);
      }
      return newSet;
    });
  };

  const tabs = [
    { id: 'smtp', label: 'SMTP Settings', icon: Mail },
    { id: 'twilio', label: 'Twilio SMS', icon: MessageSquare },
    { id: 'mailto', label: 'Mailto Links', icon: Settings }
  ];

  return (
    <>
      {/* Research Status Overlay */}
      <ResearchStatusOverlay
        status={researchStatus.status}
        onClose={() => researchStatus.reset()}
        position="top"
        size="md"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 flex items-center">
              <Settings className="w-6 h-6 mr-3 text-blue-500" />
              Communication Settings
            </h3>
            <p className="text-gray-600">Configure SMTP, Twilio, and email settings for your communication channels</p>
          </div>

          <div className="flex items-center space-x-3">
            <ModernButton
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Configuration</span>
            </ModernButton>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* SMTP Tab */}
        {activeTab === 'smtp' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">SMTP Configurations</h4>
              <div className="text-sm text-gray-600">
                {smtpConfigs.filter(c => c.isActive).length} of {smtpConfigs.length} active
              </div>
            </div>

            {smtpConfigs.map((config) => (
              <GlassCard key={config.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h5 className="text-lg font-semibold text-gray-900">{config.name}</h5>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        config.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {config.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {config.testMode && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-md">
                          Test Mode
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Host:</span> {config.host}:{config.port}
                      </div>
                      <div>
                        <span className="font-medium">From:</span> {config.fromName} <{config.fromEmail}>
                      </div>
                      <div>
                        <span className="font-medium">Security:</span> {config.secure ? 'SSL/TLS' : 'None'}
                      </div>
                      <div>
                        <span className="font-medium">Limits:</span> {config.dailyLimit}/day, {config.rateLimit}/min
                      </div>
                    </div>

                    {/* Test Results */}
                    {testResults.has(`smtp_${config.id}`) && (
                      <div className={`p-3 rounded-lg mb-3 ${
                        testResults.get(`smtp_${config.id}`).success
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <div className="flex items-center space-x-2">
                          {testResults.get(`smtp_${config.id}`).success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {testResults.get(`smtp_${config.id}`).success ? 'Test Successful' : 'Test Failed'}
                            </p>
                            <p className="text-xs text-gray-600">
                              Response time: {testResults.get(`smtp_${config.id}`).responseTime}ms
                            </p>
                            {testResults.get(`smtp_${config.id}`).errorMessage && (
                              <p className="text-xs text-red-600 mt-1">
                                {testResults.get(`smtp_${config.id}`).errorMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestSMTP(config.id)}
                      className="flex items-center space-x-1"
                    >
                      <TestTube className="w-3 h-3" />
                      <span>Test</span>
                    </ModernButton>

                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive('smtp', config.id, config.isActive)}
                      className={`flex items-center space-x-1 ${
                        config.isActive ? 'text-green-600' : 'text-gray-600'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>{config.isActive ? 'Deactivate' : 'Activate'}</span>
                    </ModernButton>

                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteConfig('smtp', config.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </ModernButton>
                  </div>
                </div>

                {/* Credentials (masked) */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Username:</span> {config.auth.user}
                    </div>
                    <button
                      onClick={() => togglePasswordVisibility(`smtp_${config.id}`)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {showPasswords.has(`smtp_${config.id}`) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="text-sm mt-1">
                    <span className="font-medium text-gray-700">Password:</span>{' '}
                    {showPasswords.has(`smtp_${config.id}`)
                      ? config.auth.pass
                      : '••••••••••••••••'
                    }
                  </div>
                </div>
              </GlassCard>
            ))}

            {smtpConfigs.length === 0 && (
              <GlassCard className="p-8">
                <div className="text-center">
                  <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No SMTP configurations found</p>
                  <ModernButton
                    variant="primary"
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center space-x-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add SMTP Configuration</span>
                  </ModernButton>
                </div>
              </GlassCard>
            )}
          </div>
        )}

        {/* Twilio Tab */}
        {activeTab === 'twilio' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">Twilio SMS Configurations</h4>
              <div className="text-sm text-gray-600">
                {twilioConfigs.filter(c => c.isActive).length} of {twilioConfigs.length} active
              </div>
            </div>

            {twilioConfigs.map((config) => (
              <GlassCard key={config.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h5 className="text-lg font-semibold text-gray-900">{config.name}</h5>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        config.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {config.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {config.testMode && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-md">
                          Test Mode
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Phone Numbers:</span> {config.phoneNumbers.length}
                      </div>
                      <div>
                        <span className="font-medium">Limits:</span> {config.dailyLimit}/day, {config.rateLimit}/min
                      </div>
                      <div>
                        <span className="font-medium">Account SID:</span> {config.accountSid.substring(0, 8)}...
                      </div>
                      <div>
                        <span className="font-medium">Webhook:</span> {config.webhookUrl ? 'Configured' : 'None'}
                      </div>
                    </div>

                    {/* Phone Numbers */}
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Phone Numbers:</p>
                      <div className="flex flex-wrap gap-2">
                        {config.phoneNumbers.map((number, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                            {number}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Test Results */}
                    {testResults.has(`twilio_${config.id}`) && (
                      <div className={`p-3 rounded-lg ${
                        testResults.get(`twilio_${config.id}`).success
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <div className="flex items-center space-x-2">
                          {testResults.get(`twilio_${config.id}`).success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {testResults.get(`twilio_${config.id}`).success ? 'Test Successful' : 'Test Failed'}
                            </p>
                            <p className="text-xs text-gray-600">
                              Response time: {testResults.get(`twilio_${config.id}`).responseTime}ms
                            </p>
                            {testResults.get(`twilio_${config.id}`).errorMessage && (
                              <p className="text-xs text-red-600 mt-1">
                                {testResults.get(`twilio_${config.id}`).errorMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestTwilio(config.id)}
                      className="flex items-center space-x-1"
                    >
                      <TestTube className="w-3 h-3" />
                      <span>Test</span>
                    </ModernButton>

                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive('twilio', config.id, config.isActive)}
                      className={`flex items-center space-x-1 ${
                        config.isActive ? 'text-green-600' : 'text-gray-600'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>{config.isActive ? 'Deactivate' : 'Activate'}</span>
                    </ModernButton>

                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteConfig('twilio', config.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </ModernButton>
                  </div>
                </div>
              </GlassCard>
            ))}

            {twilioConfigs.length === 0 && (
              <GlassCard className="p-8">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No Twilio configurations found</p>
                  <ModernButton
                    variant="primary"
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center space-x-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Twilio Configuration</span>
                  </ModernButton>
                </div>
              </GlassCard>
            )}
          </div>
        )}

        {/* Mailto Tab */}
        {activeTab === 'mailto' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">Mailto Link Configurations</h4>
              <div className="text-sm text-gray-600">
                {mailtoConfigs.filter(c => c.isActive).length} of {mailtoConfigs.length} active
              </div>
            </div>

            {mailtoConfigs.map((config) => (
              <GlassCard key={config.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h5 className="text-lg font-semibold text-gray-900">{config.name}</h5>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        config.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {config.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Opens in new tab:</span> {config.openInNewTab ? 'Yes' : 'No'}
                      </div>
                      <div>
                        <span className="font-medium">Includes contact info:</span> {config.includeContactInfo ? 'Yes' : 'No'}
                      </div>
                    </div>

                    {/* Default content */}
                    {(config.defaultSubject || config.defaultBody) && (
                      <div className="bg-gray-50 p-3 rounded-lg mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Default Content:</p>
                        {config.defaultSubject && (
                          <p className="text-sm"><span className="font-medium">Subject:</span> {config.defaultSubject}</p>
                        )}
                        {config.defaultBody && (
                          <p className="text-sm"><span className="font-medium">Body:</span> {config.defaultBody}</p>
                        )}
                      </div>
                    )}

                    {/* Test Results */}
                    {testResults.has(`mailto_${config.id}`) && (
                      <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <div>
                            <p className="text-sm font-medium">Test Successful</p>
                            <p className="text-xs text-gray-600">
                              Response time: {testResults.get(`mailto_${config.id}`).responseTime}ms
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestMailto(config.id)}
                      className="flex items-center space-x-1"
                    >
                      <TestTube className="w-3 h-3" />
                      <span>Test</span>
                    </ModernButton>

                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive('mailto', config.id, config.isActive)}
                      className={`flex items-center space-x-1 ${
                        config.isActive ? 'text-green-600' : 'text-gray-600'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>{config.isActive ? 'Deactivate' : 'Activate'}</span>
                    </ModernButton>

                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteConfig('mailto', config.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </ModernButton>
                  </div>
                </div>
              </GlassCard>
            ))}

            {mailtoConfigs.length === 0 && (
              <GlassCard className="p-8">
                <div className="text-center">
                  <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No Mailto configurations found</p>
                  <ModernButton
                    variant="primary"
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center space-x-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Mailto Configuration</span>
                  </ModernButton>
                </div>
              </GlassCard>
            )}
          </div>
        )}

        {/* Add Configuration Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Add {activeTab.toUpperCase()} Configuration
                    </h3>
                    <p className="text-sm text-gray-600">Configure your communication settings</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {activeTab === 'smtp' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Configuration Name *</label>
                        <input
                          type="text"
                          value={smtpForm.name}
                          onChange={(e) => setSmtpForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Gmail SMTP"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Host *</label>
                        <input
                          type="text"
                          value={smtpForm.host}
                          onChange={(e) => setSmtpForm(prev => ({ ...prev, host: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="smtp.gmail.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Port *</label>
                        <input
                          type="number"
                          value={smtpForm.port}
                          onChange={(e) => setSmtpForm(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-8">
                        <input
                          type="checkbox"
                          id="secure"
                          checked={smtpForm.secure}
                          onChange={(e) => setSmtpForm(prev => ({ ...prev, secure: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="secure" className="text-sm text-gray-700">Use SSL/TLS</label>
                      </div>
                      <div className="flex items-center space-x-2 pt-8">
                        <input
                          type="checkbox"
                          id="testMode"
                          checked={smtpForm.testMode}
                          onChange={(e) => setSmtpForm(prev => ({ ...prev, testMode: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="testMode" className="text-sm text-gray-700">Test Mode</label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                        <input
                          type="text"
                          value={smtpForm.auth.user}
                          onChange={(e) => setSmtpForm(prev => ({
                            ...prev,
                            auth: { ...prev.auth, user: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="your-email@gmail.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                        <input
                          type="password"
                          value={smtpForm.auth.pass}
                          onChange={(e) => setSmtpForm(prev => ({
                            ...prev,
                            auth: { ...prev.auth, pass: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="App password or SMTP password"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">From Email *</label>
                        <input
                          type="email"
                          value={smtpForm.fromEmail}
                          onChange={(e) => setSmtpForm(prev => ({ ...prev, fromEmail: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="noreply@yourcompany.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">From Name *</label>
                        <input
                          type="text"
                          value={smtpForm.fromName}
                          onChange={(e) => setSmtpForm(prev => ({ ...prev, fromName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Your Company"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Daily Limit</label>
                        <input
                          type="number"
                          value={smtpForm.dailyLimit}
                          onChange={(e) => setSmtpForm(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Rate Limit (per minute)</label>
                        <input
                          type="number"
                          value={smtpForm.rateLimit}
                          onChange={(e) => setSmtpForm(prev => ({ ...prev, rateLimit: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="smtpActive"
                        checked={smtpForm.isActive}
                        onChange={(e) => setSmtpForm(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="smtpActive" className="text-sm text-gray-700">Set as active configuration</label>
                    </div>
                  </div>
                )}

                {activeTab === 'twilio' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Configuration Name *</label>
                      <input
                        type="text"
                        value={twilioForm.name}
                        onChange={(e) => setTwilioForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Production SMS"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Account SID *</label>
                        <input
                          type="text"
                          value={twilioForm.accountSid}
                          onChange={(e) => setTwilioForm(prev => ({ ...prev, accountSid: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Auth Token *</label>
                        <input
                          type="password"
                          value={twilioForm.authToken}
                          onChange={(e) => setTwilioForm(prev => ({ ...prev, authToken: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Your Twilio auth token"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Numbers *</label>
                      <div className="space-y-2">
                        {twilioForm.phoneNumbers.map((number, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="tel"
                              value={number}
                              onChange={(e) => {
                                const newNumbers = [...twilioForm.phoneNumbers];
                                newNumbers[index] = e.target.value;
                                setTwilioForm(prev => ({ ...prev, phoneNumbers: newNumbers }));
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="+1234567890"
                            />
                            {twilioForm.phoneNumbers.length > 1 && (
                              <button
                                onClick={() => {
                                  const newNumbers = twilioForm.phoneNumbers.filter((_, i) => i !== index);
                                  setTwilioForm(prev => ({ ...prev, phoneNumbers: newNumbers }));
                                }}
                                className="p-2 text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <ModernButton
                          variant="outline"
                          size="sm"
                          onClick={() => setTwilioForm(prev => ({
                            ...prev,
                            phoneNumbers: [...prev.phoneNumbers, '']
                          }))}
                          className="flex items-center space-x-2"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Phone Number</span>
                        </ModernButton>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL (Optional)</label>
                      <input
                        type="url"
                        value={twilioForm.webhookUrl}
                        onChange={(e) => setTwilioForm(prev => ({ ...prev, webhookUrl: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://your-app.com/webhooks/twilio"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Daily Limit</label>
                        <input
                          type="number"
                          value={twilioForm.dailyLimit}
                          onChange={(e) => setTwilioForm(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Rate Limit (per minute)</label>
                        <input
                          type="number"
                          value={twilioForm.rateLimit}
                          onChange={(e) => setTwilioForm(prev => ({ ...prev, rateLimit: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="twilioTestMode"
                          checked={twilioForm.testMode}
                          onChange={(e) => setTwilioForm(prev => ({ ...prev, testMode: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="twilioTestMode" className="text-sm text-gray-700">Test Mode</label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="twilioActive"
                          checked={twilioForm.isActive}
                          onChange={(e) => setTwilioForm(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="twilioActive" className="text-sm text-gray-700">Set as active configuration</label>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'mailto' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Configuration Name *</label>
                      <input
                        type="text"
                        value={mailtoForm.name}
                        onChange={(e) => setMailtoForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Default Mailto"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Default Subject (Optional)</label>
                      <input
                        type="text"
                        value={mailtoForm.defaultSubject}
                        onChange={(e) => setMailtoForm(prev => ({ ...prev, defaultSubject: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Contact from website"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Default Body (Optional)</label>
                      <textarea
                        value={mailtoForm.defaultBody}
                        onChange={(e) => setMailtoForm(prev => ({ ...prev, defaultBody: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={4}
                        placeholder="Hi there,%0A%0AI'd like to get in touch about..."
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="includeContactInfo"
                          checked={mailtoForm.includeContactInfo}
                          onChange={(e) => setMailtoForm(prev => ({ ...prev, includeContactInfo: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="includeContactInfo" className="text-sm text-gray-700">Include contact information in body</label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="openInNewTab"
                          checked={mailtoForm.openInNewTab}
                          onChange={(e) => setMailtoForm(prev => ({ ...prev, openInNewTab: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="openInNewTab" className="text-sm text-gray-700">Open in new tab</label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="mailtoActive"
                          checked={mailtoForm.isActive}
                          onChange={(e) => setMailtoForm(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="mailtoActive" className="text-sm text-gray-700">Set as active configuration</label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                <ModernButton
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </