import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Contact } from '../../types/contact';
import { 
  Zap, 
  Play, 
  Pause, 
  Calendar, 
  Mail, 
  Phone, 
  MessageSquare, 
  Clock, 
  Target, 
  AlertCircle,
  CheckCircle,
  Settings,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  Filter,
  ArrowRight,
  Bell,
  RefreshCw
} from 'lucide-react';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  actions: AutomationAction[];
  isActive: boolean;
  lastTriggered?: string;
  triggerCount: number;
  successRate: number;
}

interface AutomationAction {
  type: 'email' | 'sms' | 'call' | 'task' | 'wait' | 'tag';
  description: string;
  delay?: string;
  template?: string;
}

interface AutomationPanelProps {
  contact: Contact;
}

const actionIcons = {
  email: Mail,
  sms: MessageSquare,
  call: Phone,
  task: CheckCircle,
  wait: Clock,
  tag: Target
};

const actionColors = {
  email: 'bg-blue-500',
  sms: 'bg-green-500',
  call: 'bg-purple-500',
  task: 'bg-orange-500',
  wait: 'bg-gray-500',
  tag: 'bg-pink-500'
};

// Sample automation rules
const sampleAutomations: AutomationRule[] = [
  {
    id: '1',
    name: 'New Lead Welcome Sequence',
    description: 'Automated welcome series for new leads with educational content',
    trigger: 'Contact created with status "lead"',
    isActive: true,
    lastTriggered: '2024-01-20T10:30:00Z',
    triggerCount: 15,
    successRate: 78,
    actions: [
      { type: 'email', description: 'Send welcome email', template: 'Welcome Template' },
      { type: 'wait', description: 'Wait 2 days', delay: '2 days' },
      { type: 'email', description: 'Send educational content', template: 'Education Template' },
      { type: 'wait', description: 'Wait 3 days', delay: '3 days' },
      { type: 'task', description: 'Schedule follow-up call' }
    ]
  },
  {
    id: '2',
    name: 'High-Value Prospect Nurturing',
    description: 'Intensive follow-up sequence for high-value prospects',
    trigger: 'AI score > 80 and interest level = "hot"',
    isActive: true,
    lastTriggered: '2024-01-25T14:15:00Z',
    triggerCount: 8,
    successRate: 92,
    actions: [
      { type: 'task', description: 'Schedule immediate call' },
      { type: 'email', description: 'Send personalized proposal', template: 'Proposal Template' },
      { type: 'wait', description: 'Wait 1 day', delay: '1 day' },
      { type: 'call', description: 'Follow-up call reminder' },
      { type: 'tag', description: 'Add "Priority" tag' }
    ]
  },
  {
    id: '3',
    name: 'Engagement Recovery',
    description: 'Re-engage contacts who haven\'t responded in 14 days',
    trigger: 'No response in 14 days',
    isActive: false,
    lastTriggered: '2024-01-18T09:00:00Z',
    triggerCount: 12,
    successRate: 45,
    actions: [
      { type: 'email', description: 'Send re-engagement email', template: 'Re-engagement Template' },
      { type: 'wait', description: 'Wait 5 days', delay: '5 days' },
      { type: 'sms', description: 'Send follow-up SMS' },
      { type: 'wait', description: 'Wait 7 days', delay: '7 days' },
      { type: 'tag', description: 'Add "Unresponsive" tag' }
    ]
  }
];

const automationTemplates = [
  {
    name: 'Lead Nurturing',
    description: 'Standard lead nurturing sequence',
    triggers: ['New lead', 'Form submission', 'Demo request']
  },
  {
    name: 'Customer Onboarding',
    description: 'Post-sale onboarding automation',
    triggers: ['Deal closed', 'Contract signed']
  },
  {
    name: 'Renewal Reminder',
    description: 'Contract renewal reminder sequence',
    triggers: ['Contract expiring soon', '60 days before renewal']
  }
];

export const AutomationPanel: React.FC<AutomationPanelProps> = ({ contact }) => {
  const [activeTab, setActiveTab] = useState('active');
  const [automations, setAutomations] = useState<AutomationRule[]>(sampleAutomations);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const tabs = [
    { id: 'active', label: 'Active Rules', icon: Play },
    { id: 'templates', label: 'Templates', icon: Settings },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  const toggleAutomation = (id: string) => {
    setAutomations(prev => prev.map(auto => 
      auto.id === id ? { ...auto, isActive: !auto.isActive } : auto
    ));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (isActive: boolean, successRate: number) => {
    if (!isActive) return 'text-gray-500 bg-gray-100';
    if (successRate >= 80) return 'text-green-600 bg-green-100';
    if (successRate >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 flex items-center">
            <Zap className="w-7 h-7 mr-3 text-yellow-500" />
            Automation Center
          </h3>
          <p className="text-gray-600">Intelligent automation rules for {contact.name}</p>
        </div>
        <div className="flex items-center space-x-3">
          <ModernButton variant="outline" size="sm" className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </ModernButton>
          <ModernButton 
            variant="primary" 
            size="sm" 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Rule</span>
          </ModernButton>
        </div>
      </div>

      {/* Automation Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{automations.filter(a => a.isActive).length}</p>
              <p className="text-sm text-gray-600">Active Rules</p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(automations.reduce((sum, a) => sum + a.successRate, 0) / automations.length)}%
              </p>
              <p className="text-sm text-gray-600">Avg Success Rate</p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <RefreshCw className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {automations.reduce((sum, a) => sum + a.triggerCount, 0)}
              </p>
              <p className="text-sm text-gray-600">Total Triggers</p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">2.4h</p>
              <p className="text-sm text-gray-600">Time Saved</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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

      {/* Tab Content */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {automations.map((automation) => (
            <GlassCard key={automation.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{automation.name}</h4>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      getStatusColor(automation.isActive, automation.successRate)
                    }`}>
                      {automation.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {automation.successRate}% success rate
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{automation.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Trigger: {automation.trigger}</span>
                    {automation.lastTriggered && (
                      <span>Last triggered: {formatDate(automation.lastTriggered)}</span>
                    )}
                    <span>{automation.triggerCount} total triggers</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleAutomation(automation.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      automation.isActive 
                        ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {automation.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Action Flow */}
              <div className="border-t border-gray-200 pt-4">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">Action Flow:</h5>
                <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                  {automation.actions.map((action, index) => {
                    const Icon = actionIcons[action.type];
                    const color = actionColors[action.type];
                    
                    return (
                      <React.Fragment key={index}>
                        <div className="flex flex-col items-center space-y-1 min-w-0 flex-shrink-0">
                          <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-xs text-gray-600 text-center max-w-20 truncate" title={action.description}>
                            {action.description}
                          </span>
                          {action.delay && (
                            <span className="text-xs text-gray-400">{action.delay}</span>
                          )}
                        </div>
                        {index < automation.actions.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {automationTemplates.map((template, index) => (
            <GlassCard key={index} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-lg font-semibold text-gray-900">{template.name}</h4>
                <ModernButton variant="outline" size="sm">
                  Use Template
                </ModernButton>
              </div>
              <p className="text-gray-600 mb-4">{template.description}</p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Common Triggers:</p>
                <div className="space-y-1">
                  {template.triggers.map((trigger, idx) => (
                    <span key={idx} className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md mr-2">
                      {trigger}
                    </span>
                  ))}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Automation Performance</h4>
            <div className="space-y-4">
              {automations.map((automation) => (
                <div key={automation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h5 className="font-medium text-gray-900">{automation.name}</h5>
                    <p className="text-sm text-gray-600">{automation.triggerCount} triggers</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{automation.successRate}%</p>
                      <p className="text-xs text-gray-500">Success Rate</p>
                    </div>
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                        style={{ width: `${automation.successRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};