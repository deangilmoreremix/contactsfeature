import React, { useState, useRef, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Contact } from '../../types/contact';
import { useOpenAI } from '../../services/openaiService';
import { geminiService } from '../../services/geminiService';
import { logger } from '../../services/logger.service';
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
  ChevronRight,
  Wand2,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  RefreshCw,
  Link,
  ArrowUpRight,
  Zap,
  ExternalLink,
  BarChart3,
  TrendingUp
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
  sentiment?: 'positive' | 'neutral' | 'negative';
}

interface CommunicationHubProps {
  contact: Contact;
}

interface AIGeneratedContent {
  subject?: string;
  body: string;
  type: 'email' | 'meeting' | 'proposal';
  model?: string;
  confidence?: number;
}

interface AISmartSuggestion {
  text: string;
  reason: string;
  model: string;
  confidence: number;
}

interface AISubjectSuggestion {
  text: string;
  engagementScore: number;
  model: string;
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

const sentimentColors = {
  positive: 'bg-green-100 text-green-800',
  neutral: 'bg-gray-100 text-gray-800',
  negative: 'bg-red-100 text-red-800'
};

// Sample communication data with sentiment
const sampleCommunications: CommunicationRecord[] = [
  {
    id: '1',
    type: 'email',
    direction: 'outbound',
    subject: 'Enterprise Solution Demo Follow-up',
    content: 'Thank you for attending our demo yesterday. I wanted to follow up on the questions you raised about integration capabilities...',
    timestamp: '2024-01-25T14:30:00Z',
    status: 'read',
    attachments: ['Integration Guide.pdf', 'Pricing Sheet.xlsx'],
    sentiment: 'positive'
  },
  {
    id: '2',
    type: 'call',
    direction: 'outbound',
    content: '15-minute discovery call to understand current pain points and business requirements',
    timestamp: '2024-01-22T11:00:00Z',
    status: 'delivered',
    participants: ['Jane Doe', 'Sales Rep'],
    sentiment: 'neutral'
  },
  {
    id: '3',
    type: 'email',
    direction: 'inbound',
    subject: 'Re: Enterprise Solution Demo Follow-up',
    content: 'Thanks for the detailed information. We\'re particularly interested in the API integration features. Could we schedule a technical deep-dive?',
    timestamp: '2024-01-25T16:45:00Z',
    status: 'delivered',
    sentiment: 'positive'
  },
  {
    id: '4',
    type: 'sms',
    direction: 'outbound',
    content: 'Hi Jane, just wanted to confirm our call tomorrow at 2 PM. Looking forward to discussing your requirements!',
    timestamp: '2024-01-24T10:15:00Z',
    status: 'read',
    sentiment: 'positive'
  },
  {
    id: '5',
    type: 'social',
    direction: 'outbound',
    content: 'Connected on LinkedIn and shared relevant industry insights',
    timestamp: '2024-01-20T09:30:00Z',
    status: 'delivered',
    platform: 'LinkedIn',
    sentiment: 'neutral'
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
  const [communications, setCommunications] = useState<CommunicationRecord[]>(sampleCommunications);
  
  // Compose state
  const [subject, setSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // AI Writing assistant state
  const [showAIContent, setShowAIContent] = useState<AIGeneratedContent | null>(null);
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  
  // Smart features state
  const [subjectSuggestions, setSubjectSuggestions] = useState<AISubjectSuggestion[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<AISmartSuggestion[]>([]);
  const [selectedModel, setSelectedModel] = useState<'auto' | 'openai' | 'gemini'>('auto');
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [smartFeatures, setSmartFeatures] = useState({
    realTimeSuggestions: true,
    sentimentAnalysis: true,
    subjectOptimization: true,
    contentEnhancement: true
  });
  
  // Analytics
  const [analysisResults, setAnalysisResults] = useState<any>({
    clarity: 75,
    tone: 'Professional',
    readingTime: '45 seconds',
    engagement: 82,
    topPhrases: ['integration capabilities', 'technical deep-dive', 'API']
  });
  
  const emailRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const suggestionsTimeoutRef = useRef<number | null>(null);

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

  // Filter communications by type
  const filteredCommunications = selectedType === 'all' 
    ? communications 
    : communications.filter(comm => comm.type === selectedType);

  // Smart model selection based on task characteristics
  const selectOptimalModel = (task: {
    type: 'email' | 'sms' | 'meeting' | 'proposal',
    priority: 'high' | 'medium' | 'low',
    length: 'short' | 'medium' | 'long',
    complexity: 'simple' | 'moderate' | 'complex'
  }): { provider: 'openai' | 'gemini', model: string } => {
    if (selectedModel !== 'auto') {
      return {
        provider: selectedModel,
        model: selectedModel === 'openai' ? 'gpt-4o-mini' : 'gemma-2-9b-it'
      };
    }
    
    // Default to cost-effective model
    let provider: 'openai' | 'gemini' = 'gemini';
    let model = 'gemini-1.5-flash';

    // For complex, high-priority, or longer content
    if (
      task.complexity === 'complex' || 
      task.priority === 'high' || 
      task.length === 'long'
    ) {
      provider = 'openai';
      model = 'gpt-4o-mini';
    }
    
    // For very simple, short content use Gemma
    if (
      task.complexity === 'simple' && 
      task.length === 'short'
    ) {
      provider = 'gemini';
      model = 'gemma-2-9b-it';
    }

    return { provider, model };
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays === 1) return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Generate subject line suggestions based on content
  const generateSubjectSuggestions = async () => {
    if (!messageContent || messageContent.length < 20) return;
    
    setIsSuggesting(true);
    
    try {
      // In a real implementation, this would call the OpenAI/Gemini APIs
      // Here we'll simulate the API call with a timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const suggestions: AISubjectSuggestion[] = [
        { 
          text: `Follow-up: Next steps for ${contact.company}`,
          engagementScore: 85,
          model: 'gemma-2-9b-it'
        },
        { 
          text: `${contact.company} - Integration proposal for your review`,
          engagementScore: 92,
          model: 'gpt-4o-mini'
        },
        { 
          text: `Quick question about your ${contact.industry || 'business'} requirements`,
          engagementScore: 78,
          model: 'gemma-2-2b-it'
        }
      ];
      
      setSubjectSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to generate subject suggestions:', error);
    } finally {
      setIsSuggesting(false);
    }
  };

  // Generate smart suggestions for content based on current text
  const generateSmartSuggestions = async (text: string) => {
    if (!text || text.length < 50 || !smartFeatures.realTimeSuggestions) return;
    
    if (suggestionsTimeoutRef.current) {
      window.clearTimeout(suggestionsTimeoutRef.current);
    }
    
    suggestionsTimeoutRef.current = window.setTimeout(async () => {
      setIsSuggesting(true);
      
      try {
        // Select model based on content complexity
        const { provider, model } = selectOptimalModel({
          type: 'email',
          priority: 'medium',
          length: text.length > 500 ? 'long' : text.length > 200 ? 'medium' : 'short',
          complexity: 'moderate'
        });
        
        // In a real implementation, this would call the appropriate AI API
        // Here we'll simulate with a timeout and predetermined suggestions
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const suggestions: AISmartSuggestion[] = [
          {
            text: "I'd be happy to schedule a technical deep-dive with our integration specialists to explore how our API can meet your specific requirements.",
            reason: "Addresses their interest in API capabilities mentioned in prior communications",
            model: model,
            confidence: 87
          },
          {
            text: "Based on your industry needs, I've attached our comprehensive integration guide which covers the specific points you mentioned during our demo.",
            reason: "References prior demo and provides relevant documentation",
            model: model,
            confidence: 85
          },
          {
            text: "Would next Tuesday at 2pm work for a 30-minute call with our technical team to discuss these integration points in more detail?",
            reason: "Offers specific meeting time aligned with their preferred schedule (Tue-Thu 2-4 PM)",
            model: model,
            confidence: 92
          }
        ];
        
        setSmartSuggestions(suggestions);
        setShowSmartSuggestions(true);
      } catch (error) {
        console.error('Failed to generate smart suggestions:', error);
      } finally {
        setIsSuggesting(false);
      }
    }, 1000);
  };

  // Generate follow-up email using optimal model based on context
  const generateFollowupEmail = async () => {
    setGeneratingType('follow-up');
    setIsGenerating(true);
    
    try {
      // Select optimal model based on task complexity and contact value
      const { provider, model } = selectOptimalModel({
        type: 'email',
        priority: contact.aiScore && contact.aiScore > 80 ? 'high' : 'medium',
        length: 'medium',
        complexity: 'moderate'
      });
      
      logger.info(`Generating follow-up email using ${provider}/${model}`);
      
      let result;
      if (provider === 'openai') {
        // Use OpenAI for high-value contacts or complex messages
        result = await openai.generateEmailTemplate(contact, 'follow-up discussion');
      } else {
        // Use Gemini/Gemma for standard cases
        const geminiContent = await geminiService.generatePersonalizedMessage(contact, 'email');
        result = {
          subject: `Follow-up: Next steps for ${contact.company}`,
          body: geminiContent
        };
      }
      
      setShowAIContent({
        subject: result.subject,
        body: result.body,
        type: 'email',
        model: `${provider}/${model}`,
        confidence: 85
      });
    } catch (error) {
      console.error('Failed to generate follow-up email:', error);
      // Fallback content
      setShowAIContent({
        subject: `Follow-up - ${contact.company}`,
        body: `Hi ${contact.firstName || contact.name.split(' ')[0]},\n\nI hope you're doing well. I wanted to follow up on our recent conversation and see if you had any additional questions.\n\nLooking forward to hearing from you.\n\nBest regards,`,
        type: 'email',
        model: 'fallback',
        confidence: 60
      });
    } finally {
      setIsGenerating(false);
      setGeneratingType(null);
    }
  };
  
  // Generate meeting invite using optimal model
  const generateMeetingInvite = async () => {
    setGeneratingType('meeting');
    setIsGenerating(true);
    
    try {
      // For meeting invites, Gemma models tend to be more efficient
      const { provider, model } = selectOptimalModel({
        type: 'meeting',
        priority: 'medium',
        length: 'short',
        complexity: 'simple'
      });
      
      logger.info(`Generating meeting invite using ${provider}/${model}`);
      
      // Use Gemini to generate a meeting invite
      const result = await geminiService.generatePersonalizedMessage(contact, 'email');
      
      setShowAIContent({
        subject: `Meeting Request - ${contact.company}`,
        body: result,
        type: 'meeting',
        model: `${provider}/${model}`,
        confidence: 82
      });
    } catch (error) {
      console.error('Failed to generate meeting invite:', error);
      // Fallback content
      setShowAIContent({
        subject: `Meeting Request - ${contact.company}`,
        body: `Hi ${contact.firstName || contact.name.split(' ')[0]},\n\nI'd like to schedule a meeting to discuss how we can help with your requirements.\n\nWould you be available for a 30-minute call next week? I'm flexible on Tuesday or Thursday afternoon.\n\nBest regards,`,
        type: 'meeting',
        model: 'fallback',
        confidence: 60
      });
    } finally {
      setIsGenerating(false);
      setGeneratingType(null);
    }
  };
  
  // Generate proposal email using both OpenAI and Gemini for comprehensive content
  const generateProposalEmail = async () => {
    setGeneratingType('proposal');
    setIsGenerating(true);
    
    try {
      // For proposals, use OpenAI's capabilities
      const { provider, model } = selectOptimalModel({
        type: 'proposal',
        priority: 'high',
        length: 'long',
        complexity: 'complex'
      });
      
      logger.info(`Generating proposal email using ${provider}/${model}`);
      
      let result;
      
      // Combine OpenAI and Gemini for a comprehensive proposal
      if (provider === 'openai') {
        // For high complexity content, use OpenAI
        const template = await openai.generateEmailTemplate(contact, 'product proposal');
        result = template;
      } else {
        // Otherwise use Gemini
        const message = await geminiService.generatePersonalizedMessage(contact, 'cold-outreach');
        result = {
          subject: `Proposal for ${contact.company}`,
          body: message
        };
      }
      
      setShowAIContent({
        subject: result.subject,
        body: result.body,
        type: 'proposal',
        model: `${provider}/${model}`,
        confidence: 88
      });
    } catch (error) {
      console.error('Failed to generate proposal email:', error);
      // Fallback content
      setShowAIContent({
        subject: `Proposal for ${contact.company}`,
        body: `Dear ${contact.firstName || contact.name.split(' ')[0]},\n\nBased on our understanding of your needs, I'm pleased to share a customized proposal for ${contact.company}.\n\nOur solution addresses the key challenges you mentioned, particularly in the areas of ${contact.industry || 'your industry'}.\n\nI'd be happy to walk you through the details at your convenience.\n\nBest regards,`,
        type: 'proposal',
        model: 'fallback',
        confidence: 60
      });
    } finally {
      setIsGenerating(false);
      setGeneratingType(null);
    }
  };

  // Set up real-time suggestions when content changes
  useEffect(() => {
    if (messageContent) {
      generateSmartSuggestions(messageContent);
    }
  }, [messageContent]);
  
  // Generate subject suggestions when message content is substantial
  useEffect(() => {
    if (messageContent.length > 100 && !subject && smartFeatures.subjectOptimization) {
      generateSubjectSuggestions();
    }
  }, [messageContent, subject]);

  // Action handlers
  const handleNewMessage = () => {
    setIsComposing(true);
    setActiveTab('compose');
    setComposeType('email');
    setSubject('');
    setMessageContent('');
    setSubjectSuggestions([]);
    setSmartSuggestions([]);
  };
  
  // Send email action
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
      status: 'sent',
      sentiment: 'neutral'
    };
    
    // Update communications state
    setCommunications([newCommunication, ...communications]);
    
    // Reset compose state
    setIsComposing(false);
    setSubject('');
    setMessageContent('');
    setActiveTab('timeline');
    setSubjectSuggestions([]);
    setSmartSuggestions([]);
    
    // Show success notification (you'd typically use a toast library here)
    alert('Email sent successfully');
  };
  
  // Start phone call
  const handleStartCall = () => {
    // In a real implementation, this would integrate with your call API
    window.open(`tel:${contact.phone}`, '_blank');
  };
  
  // Send SMS action
  const handleSendSMS = () => {
    setIsComposing(true);
    setActiveTab('compose');
    setComposeType('sms');
    setSubject('');
    setMessageContent('');
  };
  
  // Schedule meeting
  const handleScheduleMeeting = () => {
    // Automatically generate meeting invite
    generateMeetingInvite();
  };
  
  // Apply AI generated content to compose form
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
  
  // Copy AI content to clipboard
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
  
  // Handle quick action button clicks
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
  
  // Handle AI writing assistant button clicks
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
  
  // Apply smart suggestion to message content
  const handleApplySuggestion = (suggestion: AISmartSuggestion) => {
    setMessageContent(messageContent + '\n\n' + suggestion.text);
    setShowSmartSuggestions(false);
  };
  
  // Apply subject suggestion
  const handleApplySubject = (subject: string) => {
    setSubject(subject);
    setSubjectSuggestions([]);
    if (subjectRef.current) {
      subjectRef.current.focus();
    }
  };
  
  // Analyze communication sentiment and get key points
  const analyzeCommunicationSentiment = (text: string): { sentiment: 'positive' | 'neutral' | 'negative', keyPoints: string[] } => {
    // This would normally call an AI API, but we'll simulate it here
    const lowerText = text.toLowerCase();
    const positiveWords = ['thank', 'interest', 'great', 'good', 'appreciate', 'excited', 'looking forward'];
    const negativeWords = ['issue', 'problem', 'concern', 'delay', 'sorry', 'unfortunately', 'unable'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveScore += 1;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeScore += 1;
    });
    
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (positiveScore > negativeScore) sentiment = 'positive';
    else if (negativeScore > positiveScore) sentiment = 'negative';
    
    // Extract key phrases (simplified)
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0);
    const keyPoints = sentences.slice(0, 2).map(s => s.trim());
    
    return { sentiment, keyPoints };
  };
  
  // Enhanced UI render with smart compose features
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 flex items-center">
            Communication Hub
            <Sparkles className="w-4 h-4 ml-2 text-yellow-500" />
          </h3>
          <p className="text-gray-600">AI-powered communication center for {contact.name}</p>
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
            
            {/* Timeline Tab Content */}
            {activeTab === 'timeline' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                    Communication Timeline
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                      AI-Enhanced
                    </span>
                  </h4>
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
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredCommunications.map((comm) => {
                    const Icon = communicationIcons[comm.type];
                    const statusColor = statusColors[comm.status];
                    
                    // Analyze sentiment if not already present
                    const { sentiment, keyPoints } = comm.sentiment 
                      ? { sentiment: comm.sentiment, keyPoints: [] }
                      : analyzeCommunicationSentiment(comm.content);
                    
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
                            <div className="flex items-center space-x-2">
                              {sentiment && (
                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${sentimentColors[sentiment]}`}>
                                  {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                                </span>
                              )}
                              <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColor}`}>
                                {comm.status}
                              </span>
                            </div>
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
              </>
            )}
            
            {/* Compose Tab Content */}
            {activeTab === 'compose' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                    {composeType === 'email' ? 'Compose Email' : 
                     composeType === 'sms' ? 'Compose SMS' : 
                     'Compose Message'}
                    <div className="ml-2 flex items-center px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                      <Brain className="w-3 h-3 mr-1" />
                      <span>AI-Powered</span>
                    </div>
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
                
                {/* Model Selection */}
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-1">
                    <Brain className="w-3 h-3 text-blue-600" />
                    <span className="text-xs text-blue-800">AI Model:</span>
                  </div>
                  <div className="flex rounded-lg border border-blue-300 overflow-hidden">
                    <button
                      onClick={() => setSelectedModel('auto')}
                      className={`px-3 py-1 text-xs font-medium transition-colors ${
                        selectedModel === 'auto'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-blue-700'
                      }`}
                    >
                      Auto
                    </button>
                    <button
                      onClick={() => setSelectedModel('openai')}
                      className={`px-3 py-1 text-xs font-medium border-l border-blue-300 ${
                        selectedModel === 'openai'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-blue-700'
                      }`}
                    >
                      OpenAI
                    </button>
                    <button
                      onClick={() => setSelectedModel('gemini')}
                      className={`px-3 py-1 text-xs font-medium border-l border-blue-300 ${
                        selectedModel === 'gemini'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-blue-700'
                      }`}
                    >
                      Gemini
                    </button>
                  </div>
                </div>
                
                {/* Compose Form */}
                <div className="space-y-4">
                  {/* Recipient */}
                  <div className="flex items-center space-x-2">
                    <div className="font-medium text-gray-700">To:</div>
                    <div className="px-3 py-2 bg-gray-100 rounded-lg flex items-center space-x-2">
                      <span>{contact.email}</span>
                    </div>
                  </div>
                  
                  {/* Subject with AI suggestions */}
                  {composeType === 'email' && (
                    <div>
                      <div className="relative">
                        <input
                          ref={subjectRef}
                          type="text"
                          placeholder="Subject"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {!subject && messageContent.length > 50 && (
                          <button
                            onClick={generateSubjectSuggestions}
                            disabled={isSuggesting}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                            title="Generate subject suggestions"
                          >
                            {isSuggesting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Wand2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                      
                      {/* Subject Suggestions */}
                      {subjectSuggestions.length > 0 && !subject && (
                        <div className="mt-2 space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-blue-800">
                              <Sparkles className="w-3 h-3 inline mr-1" />
                              AI Subject Suggestions
                            </span>
                          </div>
                          <div className="space-y-2">
                            {subjectSuggestions.map((suggestion, index) => (
                              <div 
                                key={index}
                                onClick={() => handleApplySubject(suggestion.text)}
                                className="p-2 bg-white hover:bg-blue-100 rounded border border-blue-200 cursor-pointer flex items-center justify-between transition-colors"
                              >
                                <div className="flex-1">
                                  <p className="text-sm text-gray-900">{suggestion.text}</p>
                                  <div className="flex items-center mt-1">
                                    <span className="text-xs text-gray-500">{suggestion.model}</span>
                                    <div className="ml-2 px-1 bg-green-100 text-green-800 rounded text-xs flex items-center">
                                      <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                                      {suggestion.engagementScore}%
                                    </div>
                                  </div>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-blue-500" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Message Content with AI suggestions */}
                  <div className="relative">
                    <textarea
                      ref={emailRef}
                      placeholder={`Write your ${composeType} here...`}
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    ></textarea>
                    
                    {/* Magic Wand for AI Enhancement */}
                    {messageContent.length > 10 && (
                      <div className="absolute right-3 bottom-3 flex space-x-2">
                        <button 
                          className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
                          title="Enhance with AI"
                          onClick={() => setShowSmartSuggestions(true)}
                        >
                          <Wand2 className="w-4 h-4" />
                        </button>
                        {smartFeatures.realTimeSuggestions ? (
                          <button 
                            className="p-2 bg-green-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
                            title="AI Suggestions Enabled"
                            onClick={() => setSmartFeatures({...smartFeatures, realTimeSuggestions: false})}
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            className="p-2 bg-gray-300 text-gray-600 rounded-lg shadow-md hover:shadow-lg transition-all"
                            title="AI Suggestions Disabled"
                            onClick={() => setSmartFeatures({...smartFeatures, realTimeSuggestions: true})}
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Smart Suggestions Panel */}
                  {showSmartSuggestions && smartSuggestions.length > 0 && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-purple-200 relative">
                      <button 
                        onClick={() => setShowSmartSuggestions(false)}
                        className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      
                      <div className="flex items-center space-x-2 mb-3">
                        <Brain className="w-4 h-4 text-purple-600" />
                        <h5 className="text-sm font-semibold text-gray-900">AI-Powered Suggestions</h5>
                      </div>
                      
                      <div className="space-y-3">
                        {smartSuggestions.map((suggestion, index) => (
                          <div 
                            key={index} 
                            className="p-3 bg-white hover:bg-purple-50 rounded-lg border border-gray-200 cursor-pointer transition-all"
                            onClick={() => handleApplySuggestion(suggestion)}
                          >
                            <p className="text-sm text-gray-900">{suggestion.text}</p>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center space-x-3">
                                <span className="text-xs text-purple-600">{suggestion.model}</span>
                                <div className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs">
                                  {suggestion.confidence}% confidence
                                </div>
                              </div>
                              <div className="flex space-x-1">
                                <button className="p-1 text-gray-400 hover:text-gray-600">
                                  <ThumbsUp className="w-3 h-3" />
                                </button>
                                <button className="p-1 text-gray-400 hover:text-gray-600">
                                  <ThumbsDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{suggestion.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Message Analysis */}
                  {messageContent.length > 50 && smartFeatures.contentEnhancement && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-xs font-semibold text-gray-900 flex items-center">
                          <BarChart3 className="w-3 h-3 mr-1 text-blue-500" />
                          Message Analysis
                        </h5>
                        <span className="text-xs text-gray-500">{messageContent.length} characters</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-600">Clarity:</span>
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{width: `${analysisResults.clarity}%`}}></div>
                          </div>
                          <span className="text-gray-700">{analysisResults.clarity}%</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-600">Tone:</span>
                          <span className="text-gray-700">{analysisResults.tone}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-600">Reading time:</span>
                          <span className="text-gray-700">{analysisResults.readingTime}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-600">Engagement:</span>
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{width: `${analysisResults.engagement}%`}}></div>
                          </div>
                          <span className="text-gray-700">{analysisResults.engagement}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        onClick={() => setShowSmartSuggestions(true)}
                      >
                        <Brain className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Smile className="w-4 h-4" />
                      </button>
                      <div className="relative group">
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <Link className="w-4 h-4" />
                        </button>
                      </div>
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
            
            {/* Templates Tab Content */}
            {activeTab === 'templates' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  Email Templates
                  <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">AI-Enhanced</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { 
                      title: 'Introduction Email', 
                      description: 'AI-generated personalized introduction',
                      model: 'gemma-2-9b-it',
                      confidence: 85
                    },
                    { 
                      title: 'Follow-up Email', 
                      description: 'Smart follow-up based on previous interactions',
                      model: 'gpt-4o-mini',
                      confidence: 92
                    },
                    { 
                      title: 'Meeting Request', 
                      description: 'Meeting invitation with optimal time suggestions',
                      model: 'gemma-2-2b-it',
                      confidence: 78
                    },
                    { 
                      title: 'Proposal Follow-up', 
                      description: 'Follow up on a sent proposal with next steps',
                      model: 'gpt-4o-mini',
                      confidence: 88
                    },
                    { 
                      title: 'Thank You', 
                      description: 'Personalized appreciation message',
                      model: 'gemini-1.5-flash',
                      confidence: 82
                    },
                    { 
                      title: 'Re-engagement', 
                      description: 'Re-engage after period of no contact',
                      model: 'gpt-4o-mini',
                      confidence: 90
                    }
                  ].map((template, index) => (
                    <div 
                      key={index}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all relative"
                      onClick={() => {
                        if (template.title === 'Follow-up Email') {
                          generateFollowupEmail();
                        } else if (template.title === 'Meeting Request') {
                          generateMeetingInvite();
                        } else if (template.title === 'Proposal Follow-up') {
                          generateProposalEmail();
                        } else {
                          handleAIWritingAssistant('follow-up');
                        }
                      }}
                    >
                      <div className="absolute top-2 right-2 flex items-center px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                        <Brain className="w-2.5 h-2.5 mr-0.5" />
                        <span>{template.confidence}%</span>
                      </div>
                      <div className="mt-1">
                        <h5 className="font-medium text-gray-900">{template.title}</h5>
                        <p className="text-sm text-gray-600">{template.description}</p>
                        <div className="text-xs text-gray-500 mt-2">{template.model}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Analytics Tab Content */}
            {activeTab === 'analytics' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  Communication Analytics
                  <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">AI-Powered</span>
                </h4>
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
                
                {/* AI Insights */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-purple-900 flex items-center">
                      <Brain className="w-4 h-4 mr-2 text-purple-600" />
                      AI Communication Insights
                    </h5>
                    <button className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-100 rounded transition-colors">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded-lg border border-purple-100">
                      <p className="text-sm text-gray-800">
                        <span className="font-medium text-purple-700">Best Contact Strategy: </span> 
                        Email is the preferred channel with a 65% response rate. Tuesday-Thursday between 2-4 PM shows optimal engagement.
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-purple-100">
                      <p className="text-sm text-gray-800">
                        <span className="font-medium text-purple-700">Content Analysis: </span>
                        Messages focused on API integration features receive higher engagement. Technical content with visual elements perform 40% better.
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-purple-100">
                      <p className="text-sm text-gray-800">
                        <span className="font-medium text-purple-700">Next Best Action: </span>
                        Schedule a technical deep-dive meeting with implementation specialists to address integration questions.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-500 flex items-center">
                    <Brain className="w-3 h-3 mr-1 text-purple-500" />
                    Generated using GPT-4o-mini
                  </div>
                </div>
                
                {/* Sentiment Analysis */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mt-4">
                  <h5 className="font-medium text-gray-900 mb-3">Communication Sentiment Analysis</h5>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" style={{width: '75%'}}></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">75%</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Recent communications show a positive sentiment trend. Contact shows high engagement with technical content and integration discussions.
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
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              Quick Actions
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">AI-Enhanced</span>
            </h4>
            <div className="space-y-3">
              <ModernButton 
                variant="primary" 
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                onClick={() => handleQuickActionClick('email')}
              >
                <Mail className="w-4 h-4" />
                <span>Smart Email</span>
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
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              AI Writing Assistant
              <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-blue-100 to-purple-100 text-purple-800 text-xs rounded-full flex items-center">
                <Sparkles className="w-3 h-3 mr-1" />
                <span>OpenAI & Gemini</span>
              </span>
            </h4>
            <div className="space-y-3">
              <button 
                className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-between"
                onClick={() => handleAIWritingAssistant('follow-up')}
                disabled={generatingType === 'follow-up'}
              >
                <div>
                  <div className="flex items-center">
                    <p className="font-medium text-blue-900 text-sm">Follow-up Email</p>
                    <div className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center">
                      <Brain className="w-2.5 h-2.5 mr-0.5" />
                      <span>GPT-4o-mini</span>
                    </div>
                  </div>
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
                  <div className="flex items-center">
                    <p className="font-medium text-green-900 text-sm">Meeting Invite</p>
                    <div className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-800 rounded-full text-xs flex items-center">
                      <Brain className="w-2.5 h-2.5 mr-0.5" />
                      <span>Gemma-2-9b</span>
                    </div>
                  </div>
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
                  <div className="flex items-center">
                    <p className="font-medium text-purple-900 text-sm">Proposal Email</p>
                    <div className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs flex items-center">
                      <Brain className="w-2.5 h-2.5 mr-0.5" />
                      <span>Hybrid</span>
                    </div>
                  </div>
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
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">AI Insights</h4>
              <button className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-100 rounded transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Preferred Channel</span>
                <span className="text-sm font-medium text-gray-900 flex items-center">
                  Email
                  <div className="ml-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                </span>
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
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Content Preference</span>
                <span className="text-sm font-medium text-gray-900">Technical</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Sentiment Trend</span>
                <span className="text-sm font-medium text-green-600">Positive</span>
              </div>
            </div>
          </GlassCard>
          
          {/* Social Profiles */}
          <GlassCard className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Social Channels</h4>
            <div className="space-y-3">
              {contact.socialProfiles?.linkedin && (
                <a 
                  href={contact.socialProfiles.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-[#0077b5]/10 rounded-lg hover:bg-[#0077b5]/20 transition-colors"
                >
                  <div className="flex items-center">
                    <Linkedin className="w-4 h-4 text-[#0077b5] mr-3" />
                    <span className="text-sm text-gray-800">LinkedIn Profile</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
              )}
              
              {contact.socialProfiles?.twitter && (
                <a 
                  href={contact.socialProfiles.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-[#1da1f2]/10 rounded-lg hover:bg-[#1da1f2]/20 transition-colors"
                >
                  <div className="flex items-center">
                    <Twitter className="w-4 h-4 text-[#1da1f2] mr-3" />
                    <span className="text-sm text-gray-800">Twitter Profile</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
              )}
              
              {contact.phone && (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 text-green-600 mr-3" />
                    <span className="text-sm text-gray-800">{contact.phone}</span>
                  </div>
                  <Link className="w-4 h-4 text-gray-400" />
                </div>
              )}
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-blue-600 mr-3" />
                  <span className="text-sm text-gray-800">{contact.email}</span>
                </div>
                <Link className="w-4 h-4 text-gray-400" />
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
            
            {/* AI Model Info */}
            {showAIContent.model && (
              <div className="mb-4 p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center">
                  <Brain className="w-4 h-4 text-purple-600 mr-2" />
                  <span className="text-sm text-purple-800">Generated by {showAIContent.model}</span>
                </div>
                {showAIContent.confidence && (
                  <div className="flex items-center">
                    <span className="text-sm text-green-700">{showAIContent.confidence}% confidence</span>
                    <div className="ml-2 w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-yellow-500 to-green-500" 
                        style={{width: `${showAIContent.confidence}%`}}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
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
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                  <ThumbsDown className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center space-x-3">
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
        </div>
      )}
    </div>
  );
};