import React, { useState, useEffect } from 'react';
import { ModernButton } from '../ui/ModernButton';
import {
  X,
  Mail,
  Bot,
  Plus,
  Settings,
  BarChart3,
  Zap,
  Users,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface EmailAgentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  type: string;
  status: 'active' | 'inactive';
  stats: {
    emails_today: number;
    response_rate: number;
    contacts_added: number;
  };
}

interface AgentTemplate {
  name: string;
  description: string;
  tools: string[];
  icon: any;
}

export const EmailAgentsModal: React.FC<EmailAgentsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'agents' | 'create' | 'templates' | 'analytics'>('agents');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [newAgentData, setNewAgentData] = useState({
    name: '',
    type: 'sales',
    tools: [] as string[]
  });

  const tabs = [
    { id: 'agents', label: 'Active Agents', icon: Bot },
    { id: 'create', label: 'Create Agent', icon: Plus },
    { id: 'templates', label: 'Templates', icon: Zap },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  // Mock data for demonstration
  useEffect(() => {
    if (isOpen) {
      setAgents([
        {
          id: '1',
          name: 'Sales Assistant',
          email: 'sales@smartcrm.agentmail.to',
          type: 'sales',
          status: 'active',
          stats: {
            emails_today: 12,
            response_rate: 68,
            contacts_added: 3
          }
        },
        {
          id: '2',
          name: 'Lead Qualifier',
          email: 'qualify@smartcrm.agentmail.to',
          type: 'qualification',
          status: 'active',
          stats: {
            emails_today: 8,
            response_rate: 75,
            contacts_added: 5
          }
        }
      ]);
    }
  }, [isOpen]);

  const handleCreateAgent = async () => {
    setIsCreatingAgent(true);
    // Simulate API call
    setTimeout(() => {
      const newAgent: Agent = {
        id: Date.now().toString(),
        name: newAgentData.name,
        email: `${newAgentData.name.toLowerCase().replace(/\s+/g, '')}@smartcrm.agentmail.to`,
        type: newAgentData.type,
        status: 'active',
        stats: {
          emails_today: 0,
          response_rate: 0,
          contacts_added: 0
        }
      };
      setAgents(prev => [...prev, newAgent]);
      setNewAgentData({ name: '', type: 'sales', tools: [] });
      setIsCreatingAgent(false);
      setActiveTab('agents');
    }, 2000);
  };

  const templates: AgentTemplate[] = [
    {
      name: 'Lead Qualification Agent',
      description: 'Automatically qualifies inbound leads using discovery questions',
      tools: ['Discovery Questions', 'Contact Research'],
      icon: Users
    },
    {
      name: 'Sales Follow-up Agent',
      description: 'Sends personalized follow-ups based on engagement patterns',
      tools: ['Adaptive Playbooks', 'Communication Optimizer'],
      icon: MessageSquare
    },
    {
      name: 'Customer Success Agent',
      description: 'Proactive customer check-ins and support',
      tools: ['Communication Optimizer', 'Contact Research'],
      icon: TrendingUp
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Bot className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI Email Agents</h2>
              <p className="text-gray-600">Manage autonomous email agents powered by SmartCRM AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Active Agents Tab */}
            {activeTab === 'agents' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Active Email Agents</h3>
                  <span className="text-sm text-gray-500">{agents.length} agents running</span>
                </div>

                <div className="grid gap-4">
                  {agents.map((agent) => (
                    <div key={agent.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Bot className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{agent.name}</h4>
                            <p className="text-sm text-gray-500">{agent.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            agent.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {agent.status}
                          </span>
                          <button className="p-1 text-gray-400 hover:text-gray-600">
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Emails Today</span>
                          <p className="font-medium">{agent.stats.emails_today}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Response Rate</span>
                          <p className="font-medium">{agent.stats.response_rate}%</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Contacts Added</span>
                          <p className="font-medium">{agent.stats.contacts_added}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create Agent Tab */}
            {activeTab === 'create' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Email Agent</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Agent Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Sales Assistant"
                        value={newAgentData.name}
                        onChange={(e) => setNewAgentData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Agent Type</label>
                      <select
                        value={newAgentData.type}
                        onChange={(e) => setNewAgentData(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="sales">Sales & Lead Generation</option>
                        <option value="support">Customer Support</option>
                        <option value="discovery">Discovery Questions</option>
                        <option value="followup">Follow-up Specialist</option>
                        <option value="custom">Custom Agent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">SmartCRM AI Tools</label>
                      <div className="space-y-2">
                        {[
                          { id: 'adaptive-playbook', label: 'Adaptive Playbooks', desc: 'Dynamic sales strategies' },
                          { id: 'discovery-questions', label: 'Discovery Questions', desc: 'Qualification questions' },
                          { id: 'communication-optimizer', label: 'Communication Optimizer', desc: 'Tone and style optimization' },
                          { id: 'contact-research', label: 'Contact Research', desc: 'AI-powered enrichment' }
                        ].map((tool) => (
                          <label key={tool.id} className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={newAgentData.tools.includes(tool.id)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setNewAgentData(prev => ({
                                  ...prev,
                                  tools: checked
                                    ? [...prev.tools, tool.id]
                                    : prev.tools.filter(t => t !== tool.id)
                                }));
                              }}
                              className="rounded border-gray-300"
                            />
                            <div>
                              <span className="text-sm font-medium">{tool.label}</span>
                              <p className="text-xs text-gray-500">{tool.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <ModernButton variant="outline" onClick={() => setActiveTab('agents')}>
                    Cancel
                  </ModernButton>
                  <ModernButton
                    variant="primary"
                    onClick={handleCreateAgent}
                    disabled={isCreatingAgent || !newAgentData.name}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                  >
                    {isCreatingAgent ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>{isCreatingAgent ? 'Creating...' : 'Create Agent'}</span>
                  </ModernButton>
                </div>
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Templates</h3>
                  <p className="text-gray-600 mb-6">Choose from pre-configured agent templates to get started quickly.</p>
                </div>

                <div className="grid gap-4">
                  {templates.map((template) => (
                    <div key={template.name} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <template.icon className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{template.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.tools.map((tool) => (
                                <span key={tool} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                  {tool}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <ModernButton
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewAgentData({
                              name: template.name,
                              type: 'sales',
                              tools: template.tools.map(t => t.toLowerCase().replace(/\s+/g, '-'))
                            });
                            setActiveTab('create');
                          }}
                        >
                          Use Template
                        </ModernButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Performance Analytics</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-600">Total Emails</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-2">1,247</p>
                    <p className="text-sm text-green-600">+12% from last week</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-600">Response Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-2">68%</p>
                    <p className="text-sm text-green-600">+5% from last week</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-gray-600">Contacts Added</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-2">89</p>
                    <p className="text-sm text-green-600">+23% from last week</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-medium text-gray-600">Conversion Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-2">24%</p>
                    <p className="text-sm text-green-600">+8% from last week</p>
                  </div>
                </div>

                {/* Agent-specific performance */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Agent Performance</h4>
                  <div className="space-y-3">
                    {agents.map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-3">
                          <Bot className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium">{agent.name}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm">
                          <span>{agent.stats.emails_today} emails</span>
                          <span>{agent.stats.response_rate}% response</span>
                          <span className="text-green-600">{agent.stats.contacts_added} contacts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
