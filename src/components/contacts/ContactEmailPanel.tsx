import React, { useState, useCallback } from 'react';
import { useCommunicationAI } from '../../contexts/AIContext';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { useToast } from '../ui/Toast';
import { ResearchThinkingAnimation, useResearchThinking } from '../ui/ResearchThinkingAnimation';
import { CitationBadge } from '../ui/CitationBadge';
import { ResearchStatusOverlay, useResearchStatus } from '../ui/ResearchStatusOverlay';
import { Contact } from '../../types';
import { AIEmailGenerator } from '../email/AIEmailGenerator';
import { EmailAnalyzer } from '../email/EmailAnalyzer';
import { EmailTemplateSelector } from '../email/EmailTemplateSelector';
import { SocialMessageGenerator } from '../email/SocialMessageGenerator';
import { EmailScheduler } from '../email/EmailScheduler';
import { EmailAnalytics } from '../email/EmailAnalytics';
import { webSearchService } from '../../services/webSearchService';
import { gpt5ToolsService } from '../../services/gpt5ToolsService';
import { ERROR_MESSAGES, LOADING_MESSAGES } from '../../utils/constants';
import { isValidEmail, safeClipboardWrite } from '../../utils/validation';
import { useResearchOperations } from '../../hooks/useResearchOperations';
import {
  Mail,
  MessageSquare,
  FileText,
  BarChart3,
  ArrowRight,
  ExternalLink,
  Send,
  Copy,
  Save,
  Trash2,
  Brain,
  Sparkles,
  Mail as MailIcon,
  Smartphone,
  Calendar
} from 'lucide-react';

interface ContactEmailPanelProps {
  contact: Contact;
}

type ActiveTab = 'compose' | 'templates' | 'analyzer' | 'social' | 'scheduler' | 'analytics';

export const ContactEmailPanel: React.FC<ContactEmailPanelProps> = React.memo(({ contact }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('compose');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreparingEmail, setIsPreparingEmail] = useState(false);

  // Toast notifications
  const { showToast } = useToast();

  // Connect to Communication AI
  const { generateEmail, analyzeEmail, isProcessing } = useCommunicationAI();

  // Research operations hook
  const { performResearch, isResearching } = useResearchOperations();

  // Research state management
  const researchThinking = useResearchThinking();
  const researchStatus = useResearchStatus();
  const [researchSources, setResearchSources] = useState<any[]>([]);

  const handleSelectTemplate = (subject: string, body: string) => {
    setEmailSubject(subject);
    setEmailBody(body);
    setIsDrafting(true);
    setActiveTab('compose');
  };

  const handleSaveEmail = (subject: string, body: string) => {
    setEmailSubject(subject);
    setEmailBody(body);
    setIsDrafting(true);
  };

  const handleQuickGenerate = useCallback(async (purpose: 'introduction' | 'follow-up' | 'proposal') => {
    setError(null);
    researchThinking.startResearch(`🔍 Researching ${contact.company} for ${purpose} email...`);

    try {
      researchThinking.moveToAnalyzing('🌐 Analyzing company news and context...');

      // Perform web search for contextual email content
      const searchQuery = `${contact.company} ${contact.firstName} ${contact.lastName} recent news company updates ${purpose} communication preferences`;
      const systemPrompt = `You are a communication strategist. Research this contact's company and provide insights for effective ${purpose} communication. Focus on recent news, company culture, leadership changes, and optimal communication strategies for ${purpose} emails.`;
      const userPrompt = `Research ${contact.firstName} ${contact.lastName} at ${contact.company} for ${purpose} email. Find recent company news, leadership information, communication preferences, and optimal timing for ${purpose} contact.`;

      const searchResults = await performResearch(searchQuery, systemPrompt, userPrompt, {
        includeSources: true,
        searchContextSize: 'high'
      });

      researchThinking.moveToSynthesizing('📧 Generating personalized email content...');

      // Convert search results to citations
      const sources = searchResults.sources.map((source: any) => ({
        url: source.url,
        title: source.title,
        domain: source.domain,
        type: 'company' as const,
        confidence: 85,
        timestamp: new Date(),
        snippet: searchResults.content.substring(0, 200) + '...'
      }));

      setResearchSources(sources);

      const emailData = await generateEmail(contact, purpose, {
        tone: 'professional',
        urgency: 'medium',
        webResearch: searchResults.content,
        companyContext: searchResults.sources
      });

      if (emailData) {
        setEmailSubject(emailData.subject);
        setEmailBody(emailData.body);
        setIsDrafting(true);
        setActiveTab('compose');
      }

      researchThinking.complete('✅ Research-powered email generated!');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.AI_ANALYSIS_FAILED;
      console.error('Quick email generation failed:', error);
      setError(errorMessage);
      researchThinking.complete('❌ Email generation failed');
    }
  }, [contact, performResearch, generateEmail, researchThinking]);
  const handleSendEmail = useCallback(async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter both subject and body for the email'
      });
      return;
    }

    if (!contact.email || !isValidEmail(contact.email)) {
      showToast({
        type: 'error',
        title: 'Invalid Email',
        message: ERROR_MESSAGES.NO_EMAIL_ADDRESS
      });
      return;
    }

    setError(null);
    setIsPreparingEmail(true);

    try {
      // Use GPT-5 tools to prepare email for Gmail
      const result = await gpt5ToolsService.prepareEmail({
        to: contact.email,
        subject: emailSubject,
        body: emailBody
      });

      if (result.success && result.gmailUrl) {
        // Open Gmail compose window
        window.open(result.gmailUrl, '_blank');
        showToast({
          type: 'success',
          title: 'Email Prepared',
          message: 'Gmail compose window opened with your enhanced email draft!'
        });

        // Clear the draft
        setEmailSubject('');
        setEmailBody('');
        setIsDrafting(false);
      } else {
        showToast({
          type: 'error',
          title: 'Preparation Failed',
          message: result.message || 'Failed to prepare email'
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.EMAIL_SEND_FAILED;
      console.error('Failed to prepare email:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    } finally {
      setIsPreparingEmail(false);
    }
  }, [emailSubject, emailBody, contact.email, showToast]);

  const handleDiscardDraft = () => {
    if (confirm('Are you sure you want to discard this draft?')) {
      setEmailSubject('');
      setEmailBody('');
      setIsDrafting(false);
    }
  };

  const tabs = [
    { id: 'compose', label: 'Compose', icon: Mail },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'analyzer', label: 'Analyzer', icon: BarChart3 },
    { id: 'social', label: 'Social Messages', icon: MessageSquare },
    { id: 'scheduler', label: 'Schedule', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  return (
    <ErrorBoundary>
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
            <Mail className="w-6 h-6 mr-3 text-blue-500" />
            Email Tools
          </h3>
          <p className="text-gray-600">Advanced AI-powered email tools for {contact.name}</p>
        </div>
        
        {/* Quick AI Actions */}
        <div className="flex items-center space-x-2">
          <ModernButton
            variant="outline"
            size="sm"
            onClick={() => handleQuickGenerate('introduction')}
            loading={isProcessing}
            className="flex items-center space-x-1 bg-blue-50 text-blue-700"
          >
            <Brain className="w-4 h-4" />
            <span>AI Intro</span>
          </ModernButton>
          
          <ModernButton
            variant="outline"
            size="sm"
            onClick={() => handleQuickGenerate('follow-up')}
            loading={isProcessing}
            className="flex items-center space-x-1 bg-green-50 text-green-700"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Follow-up</span>
          </ModernButton>

        {isDrafting && (
          <div className="flex items-center space-x-3">
            <ModernButton
              variant="outline"
              size="sm"
              onClick={handleDiscardDraft}
              className="flex items-center space-x-1 text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Discard</span>
            </ModernButton>
            
            <ModernButton
              variant="outline"
              size="sm"
              onClick={async () => {
                const success = await safeClipboardWrite(`Subject: ${emailSubject}\n\n${emailBody}`);
                if (success) {
                  showToast({
                    type: 'success',
                    title: 'Copied',
                    message: 'Email draft copied to clipboard'
                  });
                } else {
                  showToast({
                    type: 'error',
                    title: 'Copy Failed',
                    message: ERROR_MESSAGES.CLIPBOARD_NOT_SUPPORTED
                  });
                }
              }}
              className="flex items-center space-x-1"
            >
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </ModernButton>
            
            <ModernButton
              variant="primary"
              size="sm"
              onClick={handleSendEmail}
              loading={isPreparingEmail}
              className="flex items-center space-x-1 bg-green-600 hover:bg-green-700"
            >
              <Send className="w-4 h-4" />
              <span>{isPreparingEmail ? 'Preparing...' : 'Open Gmail'}</span>
            </ModernButton>
          </div>
        )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex-1 flex items-center justify-center space-x-1 py-3 px-4 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              aria-label={`Switch to ${tab.label} tab`}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Draft Preview */}
      {isDrafting && (
        <GlassCard className="p-6 bg-gradient-to-r from-blue-50 to-green-50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Current Draft</h4>
            <ModernButton
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('analyzer')}
              className="flex items-center space-x-1"
            >
              <BarChart3 className="w-3 h-3" />
              <span>Analyze Draft</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </ModernButton>
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Subject:</p>
              <p className="text-gray-900">{emailSubject}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Preview:</p>
              <p className="text-gray-700 line-clamp-3 whitespace-pre-line">
                {emailBody.substring(0, 150)}
                {emailBody.length > 150 && '...'}
              </p>
            </div>
          </div>
        </GlassCard>
      )}
      
      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'compose' && (
          <AIEmailGenerator 
            contact={contact} 
            onSave={handleSaveEmail} 
          />
        )}
        
        {activeTab === 'templates' && (
          <EmailTemplateSelector 
            contact={contact} 
            onSelectTemplate={handleSelectTemplate} 
          />
        )}
        
        {activeTab === 'analyzer' && (
          <EmailAnalyzer 
            contact={contact}
            defaultSubject={emailSubject}
            defaultBody={emailBody} 
          />
        )}
        
        {activeTab === 'social' && (
          <SocialMessageGenerator
            contact={contact}
          />
        )}

        {activeTab === 'scheduler' && (
          <EmailScheduler
            contact={contact}
            emailSubject={emailSubject}
            emailBody={emailBody}
            onSchedule={(scheduleData) => {
              console.log('Email scheduled:', scheduleData);
              showToast({
                type: 'success',
                title: 'Email Scheduled',
                message: `Email scheduled for ${scheduleData.scheduledDate.toLocaleString()}`
              });
            }}
            onSendNow={handleSendEmail}
          />
        )}

        {activeTab === 'analytics' && (
          <EmailAnalytics
            contact={contact}
            timeRange="30d"
            onExport={(data) => {
              console.log('Exporting analytics data:', data);
              showToast({
                type: 'success',
                title: 'Analytics Exported',
                message: 'Email analytics data has been exported successfully'
              });
            }}
          />
        )}
      </div>
      
      {/* External Email Tools Shortcuts */}
      {contact.email && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <ExternalLink className="w-4 h-4 mr-1 text-blue-500" />
            External Email Tools
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <a
              href={`https://mail.google.com/mail/u/0/?view=cm&fs=1&to=${encodeURIComponent(contact.email)}&su=`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Open Gmail compose"
            >
              <MailIcon className="w-5 h-5 mr-2 text-red-500" />
              <span className="text-sm">Gmail</span>
            </a>
            
            <a
              href={`https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(contact.email)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Open Outlook compose"
            >
              <MailIcon className="w-5 h-5 mr-2 text-blue-600" />
              <span className="text-sm">Outlook</span>
            </a>
            
            <button
              onClick={() => {
                if (!contact.email || !isValidEmail(contact.email)) {
                  showToast({
                    type: 'error',
                    title: 'Invalid Email',
                    message: 'No valid email address available for this contact'
                  });
                  return;
                }
                window.open(`mailto:${contact.email}`, '_blank');
              }}
              className="flex items-center justify-center p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Open default mail application"
            >
              <Mail className="w-5 h-5 mr-2 text-blue-500" />
              <span className="text-sm">Mail App</span>
            </button>
            
            <button
              onClick={async () => {
                const success = await safeClipboardWrite(contact.email);
                if (success) {
                  showToast({
                    type: 'success',
                    title: 'Copied',
                    message: 'Email address copied to clipboard'
                  });
                } else {
                  showToast({
                    type: 'error',
                    title: 'Copy Failed',
                    message: ERROR_MESSAGES.CLIPBOARD_NOT_SUPPORTED
                  });
                }
              }}
              className="flex items-center justify-center p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Copy email address"
            >
              <Copy className="w-5 h-5 mr-2 text-gray-600" />
              <span className="text-sm">Copy Email</span>
            </button>
          </div>
        </div>
      )}

      {/* Inline error display for specific operations */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
});

ContactEmailPanel.displayName = 'ContactEmailPanel';