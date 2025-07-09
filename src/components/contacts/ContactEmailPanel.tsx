import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Contact } from '../../types/contact';
import { AIEmailGenerator } from '../email/AIEmailGenerator';
import { EmailAnalyzer } from '../email/EmailAnalyzer';
import { EmailTemplateSelector } from '../email/EmailTemplateSelector';
import { SocialMessageGenerator } from '../email/SocialMessageGenerator';
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
  Trash2
} from 'lucide-react';

interface ContactEmailPanelProps {
  contact: Contact;
}

type ActiveTab = 'compose' | 'templates' | 'analyzer' | 'social';

export const ContactEmailPanel: React.FC<ContactEmailPanelProps> = ({ contact }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('compose');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

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

  const handleSendEmail = () => {
    // In a real implementation, this would send the email via API
    console.log('Sending email:', { subject: emailSubject, body: emailBody });
    alert('Email would be sent in a real implementation');
    setEmailSubject('');
    setEmailBody('');
    setIsDrafting(false);
  };

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
    { id: 'social', label: 'Social Messages', icon: MessageSquare }
  ];

  return (
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
              onClick={() => {
                navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`)
                  .then(() => alert('Email copied to clipboard'))
                  .catch(() => alert('Failed to copy to clipboard'));
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
              className="flex items-center space-x-1 bg-green-600 hover:bg-green-700"
            >
              <Send className="w-4 h-4" />
              <span>Send Email</span>
            </ModernButton>
          </div>
        )}
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
              href={`https://mail.google.com/mail/u/0/?view=cm&fs=1&to=${contact.email}&su=`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <img 
                src="https://workspace.google.com/static/img/products/gmail.svg"
                alt="Gmail"
                className="w-5 h-5 mr-2"
              />
              <span className="text-sm">Gmail</span>
            </a>
            
            <a
              href={`https://outlook.office.com/mail/deeplink/compose?to=${contact.email}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <img 
                src="https://img.icons8.com/color/48/000000/ms-outlook.png"
                alt="Outlook"
                className="w-5 h-5 mr-2"
              />
              <span className="text-sm">Outlook</span>
            </a>
            
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center justify-center p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Mail className="w-5 h-5 mr-2 text-blue-500" />
              <span className="text-sm">Mail App</span>
            </a>
            
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigator.clipboard.writeText(contact.email)
                  .then(() => alert('Email copied to clipboard'))
                  .catch(() => alert('Failed to copy to clipboard'));
              }}
              className="flex items-center justify-center p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Copy className="w-5 h-5 mr-2 text-gray-600" />
              <span className="text-sm">Copy Email</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};