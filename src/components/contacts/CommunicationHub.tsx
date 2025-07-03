import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Contact } from '../../types/contact';
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
}

interface CommunicationHubProps {
  contact: Contact;
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
  const [activeTab, setActiveTab] = useState('timeline');
  const [selectedType, setSelectedType] = useState('all');
  const [isComposing, setIsComposing] = useState(false);
  const [composeType, setComposeType] = useState<'email' | 'sms' | 'call'>('email');
  const [communications] = useState<CommunicationRecord[]>(sampleCommunications);

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
          <ModernButton variant="primary" size="sm" onClick={() => setIsComposing(true)} className="flex items-center space-x-2">
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
          </GlassCard>
        </div>

        {/* Quick Actions & Tools */}
        <div className="space-y-6">
          {/* Quick Compose */}
          <GlassCard className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h4>
            <div className="space-y-3">
              <ModernButton variant="primary" className="w-full flex items-center justify-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>Send Email</span>
              </ModernButton>
              <ModernButton variant="outline" className="w-full flex items-center justify-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>Start Call</span>
              </ModernButton>
              <ModernButton variant="outline" className="w-full flex items-center justify-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>Send SMS</span>
              </ModernButton>
              <ModernButton variant="outline" className="w-full flex items-center justify-center space-x-2">
                <Video className="w-4 h-4" />
                <span>Video Call</span>
              </ModernButton>
              <ModernButton variant="outline" className="w-full flex items-center justify-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Schedule Meeting</span>
              </ModernButton>
            </div>
          </GlassCard>

          {/* AI Writing Assistant */}
          <GlassCard className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">AI Writing Assistant</h4>
            <div className="space-y-3">
              <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <p className="font-medium text-blue-900 text-sm">Follow-up Email</p>
                <p className="text-blue-700 text-xs">AI-generated follow-up based on last interaction</p>
              </button>
              <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                <p className="font-medium text-green-900 text-sm">Meeting Invite</p>
                <p className="text-green-700 text-xs">Smart scheduling with optimal time suggestions</p>
              </button>
              <button className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <p className="font-medium text-purple-900 text-sm">Proposal Email</p>
                <p className="text-purple-700 text-xs">Personalized proposal based on contact profile</p>
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
    </div>
  );
};