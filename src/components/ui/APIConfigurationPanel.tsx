import React, { useState, useEffect } from 'react';
import { ModernButton } from './ModernButton';
import { emailService } from '../../services/emailService';
import { smsService } from '../../services/smsService';
import {
  Settings,
  Mail,
  MessageSquare,
  TestTube,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';

interface APIConfigurationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProviderType = 'email' | 'sms';

interface APIConfig {
  email: {
    provider: 'sendgrid' | 'mailgun' | 'smtp';
    sendgridApiKey: string;
    mailgunApiKey: string;
    mailgunDomain: string;
    smtpHost: string;
    smtpPort: string;
    smtpUser: string;
    smtpPass: string;
    fromEmail: string;
    testEmail: string;
  };
  sms: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    testNumber: string;
  };
}

export const APIConfigurationPanel: React.FC<APIConfigurationPanelProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<ProviderType>('email');
  const [config, setConfig] = useState<APIConfig>({
    email: {
      provider: 'sendgrid',
      sendgridApiKey: '',
      mailgunApiKey: '',
      mailgunDomain: '',
      smtpHost: '',
      smtpPort: '587',
      smtpUser: '',
      smtpPass: '',
      fromEmail: '',
      testEmail: ''
    },
    sms: {
      accountSid: '',
      authToken: '',
      phoneNumber: '',
      testNumber: ''
    }
  });

  const [showPasswords, setShowPasswords] = useState({
    sendgridApiKey: false,
    mailgunApiKey: false,
    smtpPass: false,
    authToken: false
  });

  const [testing, setTesting] = useState({
    email: false,
    sms: false
  });

  const [testResults, setTestResults] = useState<{
    email?: { success: boolean; error?: string } | null;
    sms?: { success: boolean; error?: string } | null;
  }>({});

  // Load saved configuration on mount
  useEffect(() => {
    if (isOpen) {
      loadConfiguration();
    }
  }, [isOpen]);

  const loadConfiguration = () => {
    try {
      const saved = localStorage.getItem('api_configuration');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Failed to load API configuration:', error);
    }
  };

  const saveConfiguration = () => {
    try {
      localStorage.setItem('api_configuration', JSON.stringify(config));
      // Apply configuration to services
      emailService.setProvider(config.email.provider);
      emailService.setConfig({
        sendgridApiKey: config.email.sendgridApiKey,
        mailgunApiKey: config.email.mailgunApiKey,
        mailgunDomain: config.email.mailgunDomain,
        smtpHost: config.email.smtpHost,
        smtpPort: config.email.smtpPort,
        smtpUser: config.email.smtpUser,
        smtpPass: config.email.smtpPass,
        fromEmail: config.email.fromEmail,
        testEmail: config.email.testEmail
      });

      smsService.setConfig({
        accountSid: config.sms.accountSid,
        authToken: config.sms.authToken,
        phoneNumber: config.sms.phoneNumber,
        testNumber: config.sms.testNumber
      });

      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Failed to save configuration:', error);
      alert('Failed to save configuration');
    }
  };

  const testEmailConnection = async () => {
    setTesting(prev => ({ ...prev, email: true }));
    setTestResults(prev => ({ ...prev, email: null }));

    try {
      const result = await emailService.testConnection();
      setTestResults(prev => ({ ...prev, email: result }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        email: { success: false, error: error instanceof Error ? error.message : 'Test failed' }
      }));
    } finally {
      setTesting(prev => ({ ...prev, email: false }));
    }
  };

  const testSMSConnection = async () => {
    setTesting(prev => ({ ...prev, sms: true }));
    setTestResults(prev => ({ ...prev, sms: null }));

    try {
      const result = await smsService.testConnection();
      setTestResults(prev => ({ ...prev, sms: result }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        sms: { success: false, error: error instanceof Error ? error.message : 'Test failed' }
      }));
    } finally {
      setTesting(prev => ({ ...prev, sms: false }));
    }
  };

  const updateConfig = (type: ProviderType, field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field as keyof typeof prev]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                API Configuration
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure email and SMS service integrations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <AlertCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 flex items-center justify-center space-x-2 py-4 px-6 font-medium transition-colors ${
              activeTab === 'email'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email Services</span>
          </button>
          <button
            onClick={() => setActiveTab('sms')}
            className={`flex-1 flex items-center justify-center space-x-2 py-4 px-6 font-medium transition-colors ${
              activeTab === 'sms'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>SMS Services</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'email' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Provider Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Provider
                  </label>
                  <select
                    value={config.email.provider}
                    onChange={(e) => updateConfig('email', 'provider', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="sendgrid">SendGrid</option>
                    <option value="mailgun">Mailgun</option>
                    <option value="smtp">SMTP</option>
                  </select>
                </div>

                {/* From Email */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    From Email Address
                  </label>
                  <input
                    type="email"
                    value={config.email.fromEmail}
                    onChange={(e) => updateConfig('email', 'fromEmail', e.target.value)}
                    placeholder="noreply@yourcompany.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Provider-specific fields */}
              {config.email.provider === 'sendgrid' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">SendGrid Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.sendgridApiKey ? 'text' : 'password'}
                          value={config.email.sendgridApiKey}
                          onChange={(e) => updateConfig('email', 'sendgridApiKey', e.target.value)}
                          placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="w-full pr-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('sendgridApiKey')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPasswords.sendgridApiKey ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {config.email.provider === 'mailgun' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Mailgun Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.mailgunApiKey ? 'text' : 'password'}
                          value={config.email.mailgunApiKey}
                          onChange={(e) => updateConfig('email', 'mailgunApiKey', e.target.value)}
                          placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="w-full pr-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('mailgunApiKey')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPasswords.mailgunApiKey ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Domain
                      </label>
                      <input
                        type="text"
                        value={config.email.mailgunDomain}
                        onChange={(e) => updateConfig('email', 'mailgunDomain', e.target.value)}
                        placeholder="yourdomain.com"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {config.email.provider === 'smtp' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">SMTP Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        SMTP Host
                      </label>
                      <input
                        type="text"
                        value={config.email.smtpHost}
                        onChange={(e) => updateConfig('email', 'smtpHost', e.target.value)}
                        placeholder="smtp.gmail.com"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        SMTP Port
                      </label>
                      <input
                        type="text"
                        value={config.email.smtpPort}
                        onChange={(e) => updateConfig('email', 'smtpPort', e.target.value)}
                        placeholder="587"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Username
                      </label>
                      <input
                        type="text"
                        value={config.email.smtpUser}
                        onChange={(e) => updateConfig('email', 'smtpUser', e.target.value)}
                        placeholder="your-email@gmail.com"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.smtpPass ? 'text' : 'password'}
                          value={config.email.smtpPass}
                          onChange={(e) => updateConfig('email', 'smtpPass', e.target.value)}
                          placeholder="your-app-password"
                          className="w-full pr-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('smtpPass')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPasswords.smtpPass ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Email */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Test Email Address
                </label>
                <input
                  type="email"
                  value={config.email.testEmail}
                  onChange={(e) => updateConfig('email', 'testEmail', e.target.value)}
                  placeholder="test@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Test Connection */}
              <div className="flex items-center space-x-4">
                <ModernButton
                  variant="outline"
                  onClick={testEmailConnection}
                  disabled={testing.email}
                  className="flex items-center space-x-2"
                >
                  {testing.email ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  <span>Test Connection</span>
                </ModernButton>

                {testResults.email && (
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                    testResults.email.success
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {testResults.email.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm">
                      {testResults.email.success ? 'Connection successful!' : testResults.email.error}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sms' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Twilio Account SID */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Twilio Account SID
                  </label>
                  <input
                    type="text"
                    value={config.sms.accountSid}
                    onChange={(e) => updateConfig('sms', 'accountSid', e.target.value)}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Twilio Auth Token */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Twilio Auth Token
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.authToken ? 'text' : 'password'}
                      value={config.sms.authToken}
                      onChange={(e) => updateConfig('sms', 'authToken', e.target.value)}
                      placeholder="your_auth_token_here"
                      className="w-full pr-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('authToken')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.authToken ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Twilio Phone Number */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Twilio Phone Number
                  </label>
                  <input
                    type="tel"
                    value={config.sms.phoneNumber}
                    onChange={(e) => updateConfig('sms', 'phoneNumber', e.target.value)}
                    placeholder="+15551234567"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Test Phone Number */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Test Phone Number
                  </label>
                  <input
                    type="tel"
                    value={config.sms.testNumber}
                    onChange={(e) => updateConfig('sms', 'testNumber', e.target.value)}
                    placeholder="+15551234567"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Test Connection */}
              <div className="flex items-center space-x-4">
                <ModernButton
                  variant="outline"
                  onClick={testSMSConnection}
                  disabled={testing.sms}
                  className="flex items-center space-x-2"
                >
                  {testing.sms ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  <span>Test Connection</span>
                </ModernButton>

                {testResults.sms && (
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                    testResults.sms.success
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {testResults.sms.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm">
                      {testResults.sms.success ? 'Connection successful!' : testResults.sms.error}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <ModernButton
            variant="outline"
            onClick={onClose}
            className="px-4 py-2"
          >
            Cancel
          </ModernButton>

          <ModernButton
            variant="primary"
            onClick={saveConfiguration}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Save Configuration
          </ModernButton>
        </div>
      </div>
    </div>
  );
};