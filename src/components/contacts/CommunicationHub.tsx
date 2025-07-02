import React, { useState, useRef } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Contact } from '../../types/contact';
import { useOpenAI } from '../../services/openaiService';
import { geminiService } from '../../services/geminiService';
import { 
  Mail, 
  Phone, 
  MessageSquare, 
  Video, 
  Calendar, 
  Send, 
  Paperclip, 
  Smile, 
  MoreHorizontal,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Search,
  Download,
  Settings,
  Linkedin,
  Twitter,
  Facebook,
  Smartphone,
  Copy,
  X,
  Loader2,
  Brain,
  CheckSquare,
  Edit2,
  ChevronRight
} from 'lucide-react';

interface CommunicationRecord {
  id: string;
  type: 'email' | 'call' | 'sms' | 'video' | 'social' | 'meeting';
  direction: 'inbound' | 'outbound';
  subject?: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'replied' | 'failed';
  participants?: string[];
  attachments?: string[];
  platform?: string;
}

interface CommunicationHubProps {
  contact: Contact;
}

interface AIGeneratedContent {
  subject?: string;
  body: string;
  type: 'email' | 'meeting' | 'proposal';
}

const communicationIcons = {
  email: Mail,
  call: Phone,
  sms: MessageSquare,
  video: Video,
  social: MessageSquare,
  meeting: Calendar
};

const statusColors = {
  sent: 'text-blue-600 bg-blue-50',
  delivered: 'text-green-600 bg-green-50',
  read: 'text-purple-600 bg-purple-50',
  replied: 'text-indigo-600 bg-indigo-50',
  failed: 'text-red-600 bg-red-50'
};

// Sample communication data
const sampleCommunications: CommunicationRecord[] = [
  {
    id: '1',
    type: 'email',
    direction: 'outbound',
    subject: 'Enterprise Solution Demo Follow-up',
    content: 'Thank you for attending our demo yesterday. I wanted to follow up on the questions you raised about integration capabilities...',
    timestamp: '2024-01-25T14:30:00Z',
    status: 'read',
    attachments: ['Integration Guide.pdf', 'Pricing Sheet.xlsx']
  },
  {
    id: '2',
    type: 'call',
    direction: 'outbound',
    content: '15-minute discovery call to understand current pain points and business requirements',
    timestamp: '2024-01-22T11:00:00Z',
    status: 'delivered',
    participants: ['Jane Doe', 'Sales Rep']
  },
  {
    id: '3',
    type: 'email',
    direction: 'inbound',
    subject: 'Re: Enterprise Solution Demo Follow-up',
    content: 'Thanks for the detailed information. We\'re particularly interested in the API integration features. Could we schedule a technical deep-dive?',
    timestamp: '2024-01-25T16:45:00Z',
    status: 'delivered'
  },
  {
    id: '4',
    type: 'sms',
    direction: 'outbound',
    content: 'Hi Jane, just wanted to confirm our call tomorrow at 2 PM. Looking forward to discussing your requirements!',
    timestamp: '2024-01-24T10:15:00Z',
    status: 'read'
  },
  {
    id: '5',
    type: 'social',
    direction: 'outbound',
    content: 'Connected on LinkedIn and shared relevant industry insights',
    timestamp: '2024-01-20T09:30:00Z',
    status: 'delivered',
    platform: 'LinkedIn'
  }
];

export const CommunicationHub: React.FC<CommunicationHubProps> = ({ contact }) => {
  // Hooks for AI services
  const openai = useOpenAI();
  
  // UI state
  const [activeTab, setActiveTab] = useState('timeline');
  const [selectedType, setSelectedType] = useState('all');
  const [isComposing, setIsComposing] = useState(false);
  const [composeType, setComposeType] = useState<'email' | 'sms' | 'call'>('email');
  const [communications] = useState<CommunicationRecord[]>(sampleCommunications);
  
  // Compose state
  const [subject, setSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // AI Writing assistant state
  const [showAIContent, setShowAIContent] = useState<AIGeneratedContent | null>(null);
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  
  const emailRef = useRef<HTMLTextAreaElement>(null);

  const tabs = [
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'compose', label: 'Compose', icon: Send },
    { id: 'templates', label: 'Templates', icon: Mail },
    { id: 'analytics', label: 'Analytics', icon: MoreHorizontal }
  ];

  const communicationTypes = [
    { value: 'all', label: 'All Communications' },
    { value: 'email', label: 'Emails' },
    { value: 'call', label: 'Calls' },
    { value: 'sms', label: 'SMS' },
    { value: 'video', label: 'Video Calls' },
    { value: 'social', label: 'Social Media' }
  ];

  const filteredCommunications = selectedType === 'all' 
    ? communications 
    : communications.filter(comm => comm.type === selectedType);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays === 1) return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // AI content generation functions
  const generateFollowupEmail = async () => {
    setGeneratingType('follow-up');
    setIsGenerating(true);
    
    try {
      // Use OpenAI to generate a personalized follow-up email
      const result = await openai.generateEmailTemplate(contact, 'follow-up discussion');
      
      setShowAIContent({
        subject: result.subject,
        body: result.body,
        type: 'email'
      });
    } catch (error) {
      console.error('Failed to generate follow-up email:', error);
      // Fallback content
      setShowAIContent({
        subject: `Follow-up - ${contact.company}`,
        body: `Hi ${contact.firstName || contact.name.split(' ')[0]},\n\nI hope you're doing well. I wanted to follow up on our recent conversation and see if you had any additional questions.\n\nLooking forward to hearing from you.\n\nBest regards,`,
        type: 'email'
      });
    } finally {
      setIsGenerating(false);
      setGeneratingType(null);
    }
  };
  
  const generateMeetingInvite = async () => {
    setGeneratingType('meeting');
    setIsGenerating(true);
    
    try {
      // Use Gemini to generate a meeting invite
      const result = await geminiService.generatePersonalizedMessage(contact, 'email');
      
      setShowAIContent({
        subject: `Meeting Request - ${contact.company}`,
        body: result,
        type: 'meeting'
      });
    } catch (error) {
      console.error('Failed to generate meeting invite:', error);
      // Fallback content
      setShowAIContent({
        subject: `Meeting Request - ${contact.company}`,
        body: `Hi ${contact.firstName || contact.name.split(' ')[0]},\n\nI'd like to schedule a meeting to discuss how we can help with your requirements.\n\nWould you be available for a 30-minute call next week? I'm flexible on Tuesday or Thursday afternoon.\n\nBest regards,`,
        type: 'meeting'
      });
    } finally {
      setIsGenerating(false);
      setGeneratingType(null);
    }
  };
  
  const generateProposalEmail = async () => {
    setGeneratingType('proposal');
    setIsGenerating(true);
    
    try {
      // Combine OpenAI and Gemini for a comprehensive proposal
      const [template, message] = await Promise.all([
        openai.generateEmailTemplate(contact, 'product proposal'),
        geminiService.generatePersonalizedMessage(contact, 'cold-outreach')
      ]);
      
      // Create a combination of both results
      setShowAIContent({
        subject: template.subject,
        body: template.body + "\n\n" + message.split('\n\n').slice(1).join('\n\n'), // Combine bodies, removing duplicate greeting
        type: 'proposal'
      });
    } catch (error) {
      console.error('Failed to generate proposal email:', error);
      // Fallback content
      setShowAIContent({
        subject: `Proposal for ${contact.company}`,
        body: `Dear ${contact.firstName || contact.name.split(' ')[0]},\n\nBased on our understanding of your needs, I'm pleased to share a customized proposal for ${contact.company}.\n\nOur solution addresses the key challenges you mentioned, particularly in the areas of ${contact.industry || 'your industry'}.\n\nI'd be happy to walk you through the details at your convenience.\n\nBest regards,`,
        type: 'proposal'
      });
    } finally {
      setIsGenerating(false);
      setGeneratingType(null);
    }
  };

  // Action handlers
  const handleNewMessage = () => {
    setIsComposing(true);
    setActiveTab('compose');
    setComposeType('email');
    setSubject('');
    setMessageContent('');
  };
  
  const handleSendEmail = () => {
    if (!subject.trim() || !messageContent.trim()) {
      alert('Please enter a subject and message');
      return;
    }
    
    // Here you would typically send the email via an API
    console.log('Sending email:', { 
      to: contact.email, 
      subject, 
      content: messageContent 
    });
    
    // Mock successful send
    const newCommunication: CommunicationRecord = {
      id: Date.now().toString(),
      type: 'email',
      direction: 'outbound',
      subject: subject,
      content: messageContent,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };
    
    // In a real implementation, you would update the communications state
    // setCommunciations([newCommunication, ...communications]);
    
    // Reset compose state
    setIsComposing(false);
    setSubject('');
    setMessageContent('');
    setActiveTab('timeline');
    
    // Show success notification (you'd typically use a toast library here)
    alert('Email sent successfully');
  };
  
  const handleStartCall = () => {
    // In a real implementation, this would integrate with your call API
    window.open(`tel:${contact.phone}`, '_blank');
  };
  
  const handleSendSMS = () => {
    setIsComposing(true);
    setActiveTab('compose');
    setComposeType('sms');
    setSubject('');
    setMessageContent('');
  };
  
  const handleScheduleMeeting = () => {
    // Automatically generate meeting invite
    generateMeetingInvite();
  };
  
  const handleApplyAIContent = () => {
    if (!showAIContent) return;
    
    setSubject(showAIContent.subject || '');
    setMessageContent(showAIContent.body);
    setIsComposing(true);
    setActiveTab('compose');
    setComposeType('email');
    setShowAIContent(null);
    
    // Focus on the textarea after applying content
    setTimeout(() => {
      if (emailRef.current) {
        emailRef.current.focus();
      }
    }, 100);
  };
  
  const handleCopyAIContent = () => {
    if (!showAIContent) return;
    
    const textToCopy = `${showAIContent.subject ? showAIContent.subject + '\n\n' : ''}${showAIContent.body}`;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        // Show success notification (you'd typically use a toast library here)
        alert('Content copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy content:', err);
      });
  };
  
  const handleQuickActionClick = (action: string) => {
    switch (action) {
      case 'email':
        handleNewMessage();
        break;
      case 'call':
        handleStartCall();
        break;
      case 'sms':
        handleSendSMS();
        break;
      case 'video':
        alert(`Starting video call with ${contact.name}...`);
        break;
      case 'meeting':
        handleScheduleMeeting();
        break;
      default:
        break;
    }
  };
  
  const handleAIWritingAssistant = (type: string) => {
    switch (type) {
      case 'follow-up':
        generateFollowupEmail();
        break;
      case 'meeting':
        generateMeetingInvite();
        break;
      case 'proposal':
        generateProposalEmail();
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Communication Hub</h3>
          <p className="text-gray-600">Unified communication center for {contact.name}</p>
        </div>
        <div className="flex items-center space-x-3">
          <ModernButton variant="outline" size="sm" className="flex items-center space-x-2">
            <Search className="w-4 h-4" />
            <span>Search</span>
          </ModernButton>
          <ModernButton variant="outline" size="sm" className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </ModernButton>
          <ModernButton variant="primary" size="sm" onClick={handleNewMessage} className="flex items-center space-x-2">
            <Send className="w-4 h-4" />
            <span>New Message</span>
          </ModernButton>
        </div>
      </div>

      {/* Communication Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {communicationTypes.slice(1).map((type, index) => {
          const count = communications.filter(c => c.type === type.value).length;
          const colors = ['bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-purple-100 text-purple-600', 'bg-orange-100 text-orange-600', 'bg-pink-100 text-pink-600'];
          
          return (
            <GlassCard key={type.value} className="p-4">
              <div className="text-center">
                <div className={`w-8 h-8 rounded-lg ${colors[index]} flex items-center justify-center mx-auto mb-2`}>
                  <span className="text-sm font-bold">{count}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{type.label}</p>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Communication Timeline */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6">
            {/* Tabs */}
            <div className="flex items-center space-x-6 mb-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-2 border-b-2 font-medium ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            
            {activeTab === 'timeline' && (
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-semibold text-gray-900">Communication Timeline</h4>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {communicationTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            )}
            
            {activeTab === 'timeline' && (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredCommunications.map((comm) => {
                  const Icon = communicationIcons[comm.type];
                  const statusColor = statusColors[comm.status];
                  
                  return (
                    <div key={comm.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className={`p-2 rounded-lg ${
                        comm.direction === 'outbound' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            {comm.subject && (
                              <h5 className="font-semibold text-gray-900 text-sm">{comm.subject}</h5>
                            )}
                            <p className="text-gray-700 text-sm line-clamp-2">{comm.content}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColor}`}>
                            {comm.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-500">{formatTimestamp(comm.timestamp)}</p>
                          <div className="flex items-center space-x-2">
                            {comm.attachments && comm.attachments.length > 0 && (
                              <span className="text-xs text-gray-500 flex items-center">
                                <Paperclip className="w-3 h-3 mr-1" />
                                {comm.attachments.length}
                              </span>
                            )}
                            {comm.platform && (
                              <span className="text-xs text-gray-500">{comm.platform}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {activeTab === 'compose' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {composeType === 'email' ? 'Compose Email' : 
                     composeType === 'sms' ? 'Compose SMS' : 
                     'Compose Message'}
                  </h4>
                  <div className="flex space-x-2">
                    <select
                      value={composeType}
                      onChange={(e) => setComposeType(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                    </select>
                    <ModernButton 
                      variant="outline"
                      onClick={() => {
                        setIsComposing(false);
                        setActiveTab('timeline');
                      }}
                      size="sm"
                    >
                      <X className="w-4 h-4" />
                    </ModernButton>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="font-medium text-gray-700">To:</div>
                    <div className="px-3 py-2 bg-gray-100 rounded-lg flex items-center space-x-2">
                      <span>{contact.email}</span>
                    </div>
                  </div>
                  
                  {composeType === 'email' && (
                    <div>
                      <input
                        type="text"
                        placeholder="Subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  
                  <div>
                    <textarea
                      ref={emailRef}
                      placeholder={`Write your ${composeType} here...`}
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    ></textarea>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Brain className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Smile className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ModernButton variant="outline" size="sm">Save Draft</ModernButton>
                      <ModernButton 
                        variant="primary" 
                        size="sm"
                        onClick={composeType === 'email' ? handleSendEmail : handleSendSMS}
                        className="flex items-center space-x-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>Send</span>
                      </ModernButton>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'templates' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Email Templates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: 'Introduction Email', description: 'Introduce yourself and your company' },
                    { title: 'Follow-up Email', description: 'Follow up after a meeting or call' },
                    { title: 'Meeting Request', description: 'Request a meeting or call' },
                    { title: 'Proposal Follow-up', description: 'Follow up on a sent proposal' },
                    { title: 'Thank You', description: 'Express gratitude after a meeting' },
                    { title: 'Re-engagement', description: 'Re-engage after a period of no contact' }
                  ].map((template, index) => (
                    <div 
                      key={index}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                      onClick={() => {
                        setSubject(`${template.title} - ${contact.company}`);
                        setMessageContent(`Hi ${contact.firstName || contact.name.split(' ')[0]},\n\n[Template: ${template.description}]\n\nBest regards,\n[Your Name]`);
                        setIsComposing(true);
                        setActiveTab('compose');
                        setComposeType('email');
                      }}
                    >
                      <h5 className="font-medium text-gray-900">{template.title}</h5>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === 'analytics' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Communication Analytics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email engagement stats */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h5 className="font-medium text-blue-900 mb-2">Email Engagement</h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-700">Open Rate</span>
                        <span className="text-sm font-medium text-blue-900">80%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-700">Response Rate</span>
                        <span className="text-sm font-medium text-blue-900">65%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-700">Avg. Response Time</span>
                        <span className="text-sm font-medium text-blue-900">4.2 hours</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Call stats */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                    <h5 className="font-medium text-green-900 mb-2">Call Metrics</h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-700">Total Calls</span>
                        <span className="text-sm font-medium text-green-900">12</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-700">Avg. Duration</span>
                        <span className="text-sm font-medium text-green-900">18.5 min</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-700">Call Acceptance</span>
                        <span className="text-sm font-medium text-green-900">85%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 mt-4">
                  <h5 className="font-medium text-purple-900 mb-2">AI Insights</h5>
                  <p className="text-sm text-purple-700">
                    Contact prefers email communication with a 24-hour response window.
                    Best contact times are Tuesday-Thursday, 2-4 PM local time.
                    Content that includes case studies shows 40% higher engagement.
                  </p>
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Quick Actions & Tools */}
        <div className="space-y-6">
          {/* Quick Compose */}
          <GlassCard className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h4>
            <div className="space-y-3">
              <ModernButton 
                variant="primary" 
                className="w-full flex items-center justify-center space-x-2"
                onClick={() => handleQuickActionClick('email')}
              >
                <Mail className="w-4 h-4" />
                <span>Send Email</span>
              </ModernButton>
              <ModernButton 
                variant="outline" 
                className="w-full flex items-center justify-center space-x-2"
                onClick={() => handleQuickActionClick('call')}
                disabled={!contact.phone}
              >
                <Phone className="w-4 h-4" />
                <span>Start Call</span>
              </ModernButton>
              <ModernButton 
                variant="outline" 
                className="w-full flex items-center justify-center space-x-2"
                onClick={() => handleQuickActionClick('sms')}
                disabled={!contact.phone}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send SMS</span>
              </ModernButton>
              <ModernButton 
                variant="outline" 
                className="w-full flex items-center justify-center space-x-2"
                onClick={() => handleQuickActionClick('video')}
              >
                <Video className="w-4 h-4" />
                <span>Video Call</span>
              </ModernButton>
              <ModernButton 
                variant="outline" 
                className="w-full flex items-center justify-center space-x-2"
                onClick={() => handleQuickActionClick('meeting')}
              >
                <Calendar className="w-4 h-4" />
                <span>Schedule Meeting</span>
              </ModernButton>
            </div>
          </GlassCard>

          {/* AI Writing Assistant */}
          <GlassCard className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">AI Writing Assistant</h4>
            <div className="space-y-3">
              <button 
                className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-between"
                onClick={() => handleAIWritingAssistant('follow-up')}
                disabled={generatingType === 'follow-up'}
              >
                <div>
                  <p className="font-medium text-blue-900 text-sm">Follow-up Email</p>
                  <p className="text-blue-700 text-xs">AI-generated follow-up based on last interaction</p>
                </div>
                {generatingType === 'follow-up' ? (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-blue-500" />
                )}
              </button>
              <button 
                className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center justify-between"
                onClick={() => handleAIWritingAssistant('meeting')}
                disabled={generatingType === 'meeting'}
              >
                <div>
                  <p className="font-medium text-green-900 text-sm">Meeting Invite</p>
                  <p className="text-green-700 text-xs">Smart scheduling with optimal time suggestions</p>
                </div>
                {generatingType === 'meeting' ? (
                  <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-green-500" />
                )}
              </button>
              <button 
                className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center justify-between"
                onClick={() => handleAIWritingAssistant('proposal')}
                disabled={generatingType === 'proposal'}
              >
                <div>
                  <p className="font-medium text-purple-900 text-sm">Proposal Email</p>
                  <p className="text-purple-700 text-xs">Personalized proposal based on contact profile</p>
                </div>
                {generatingType === 'proposal' ? (
                  <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-purple-500" />
                )}
              </button>
            </div>
          </GlassCard>

          {/* Communication Preferences */}
          <GlassCard className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Preferred Channel</span>
                <span className="text-sm font-medium text-gray-900">Email</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Best Time</span>
                <span className="text-sm font-medium text-gray-900">Tue-Thu 2-4 PM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Response Rate</span>
                <span className="text-sm font-medium text-green-600">85%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Avg Response Time</span>
                <span className="text-sm font-medium text-gray-900">4.2 hours</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
      
      {/* AI Generated Content Modal */}
      {showAIContent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                <Brain className="w-5 h-5 mr-2 text-purple-600" />
                AI Generated {
                  showAIContent.type === 'email' ? 'Follow-up Email' : 
                  showAIContent.type === 'meeting' ? 'Meeting Invite' : 
                  'Proposal Email'
                }
              </h4>
              <button 
                onClick={() => setShowAIContent(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {showAIContent.subject && (
              <div className="mb-4">
                <div className="font-medium text-gray-700 mb-1">Subject:</div>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {showAIContent.subject}
                </div>
              </div>
            )}
            
            <div className="mb-6">
              <div className="font-medium text-gray-700 mb-1">Message:</div>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 whitespace-pre-line">
                {showAIContent.body}
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3">
              <ModernButton
                variant="outline"
                onClick={handleCopyAIContent}
                className="flex items-center space-x-2"
              >
                <Copy className="w-4 h-4" />
                <span>Copy to Clipboard</span>
              </ModernButton>
              
              <ModernButton
                variant="primary"
                onClick={handleApplyAIContent}
                className="flex items-center space-x-2"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Use This Message</span>
              </ModernButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};