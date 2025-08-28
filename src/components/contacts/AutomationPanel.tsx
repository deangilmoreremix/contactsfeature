import React, { useState } from 'react';
import { useAutomationEngine } from '../../hooks/useAdvancedAI';
import { useContactStore } from '../../store/contactStore';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Contact } from '../../types';
import { aiAutomationEngine } from '../../services/ai-automation-engine.service';
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
  RefreshCw,
  Sparkles,
  Brain,
  Award,
  MessageCircle,
  Wand2,
  Send,
  Lightbulb,
  TrendingUp,
  DollarSign,
  Eye,
  X
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
  const [showNLModal, setShowNLModal] = useState(false);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [generatedRule, setGeneratedRule] = useState<any>(null);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState<string | null>(null);
  const [advancedAnalysis, setAdvancedAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  
  // Connect to Advanced Automation Engine
  const {
    generateSuggestions,
    optimizeRule,
    suggestions,
    rules,
    isOptimizing
  } = useAutomationEngine();
  
  const { contacts } = useContactStore();

  const tabs = [
    { id: 'active', label: 'Active Rules', icon: Play },
    { id: 'suggestions', label: 'AI Suggestions', icon: Brain },
    { id: 'create', label: 'Natural Language', icon: MessageCircle },
    { id: 'templates', label: 'Templates', icon: Settings },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  const handleNaturalLanguageSubmit = async () => {
    if (!naturalLanguageInput.trim()) return;
    
    setIsTranslating(true);
    try {
      const rule = await aiAutomationEngine.translateNaturalLanguageToRule({
        description: naturalLanguageInput,
        contactContext: contact,
        urgency: 'medium'
      });
      
      setGeneratedRule(rule);
      logger.info('Natural language rule generated successfully', { ruleId: rule.id });
    } catch (error) {
      console.error('Failed to translate natural language to rule:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAdvancedAnalysis = async (ruleId: string) => {
    setIsAnalyzing(true);
    setShowAdvancedAnalysis(ruleId);
    
    try {
      const rule = automations.find(r => r.id === ruleId);
      if (rule) {
        const analysis = await aiAutomationEngine.generateAdvancedRuleAnalysis(rule, contacts);
        setAdvancedAnalysis(analysis);
      }
    } catch (error) {
      console.error('Advanced analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyGeneratedRule = () => {
    if (generatedRule) {
      setAutomations(prev => [...prev, generatedRule]);
      setGeneratedRule(null);
      setNaturalLanguageInput('');
      setShowNLModal(false);
      setActiveTab('active');
    }
  };

  const toggleAutomation = (id: string) => {
    setAutomations(prev => prev.map(auto => 
      auto.id === id ? { ...auto, isActive: !auto.isActive } : auto
    ));
  };

  const handleGenerateSuggestions = async () => {
    try {
      await generateSuggestions([contact]); // Pass single contact for context
    } catch (error) {
      console.error('Failed to generate automation suggestions:', error);
    }
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
            variant="outline" 
            size="sm" 
            onClick={handleGenerateSuggestions}
            loading={isOptimizing}
            className="flex items-center space-x-2 bg-purple-50 text-purple-700 border-purple-200"
          >
            <Brain className="w-4 h-4" />
            <span>{isOptimizing ? 'Analyzing...' : 'AI Suggestions'}</span>
            <Sparkles className="w-3 h-3 text-yellow-500" />
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
            <div className="p-2 bg-orange-100 rounded-lg">
              <Award className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {suggestions.length}
              </p>
              <p className="text-sm text-gray-600">AI Suggestions</p>
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

      {/* Natural Language Rule Creation Tab */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          <GlassCard className="p-6 bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 border-purple-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Wand2 className="w-5 h-5 mr-2 text-purple-600" />
              Create Automation with Natural Language
              <Sparkles className="w-4 h-4 ml-2 text-yellow-500" />
            </h4>
            <p className="text-gray-600 mb-6">
              Describe your automation in plain English, and GPT-5 will create the complete rule structure for you.
            </p>
            
            {/* Natural Language Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe your automation rule:
                </label>
                <textarea
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  disabled={isTranslating}
                  placeholder="Example: When a hot lead hasn't responded in 3 days, send them a personalized follow-up email and create a high-priority task for me to call them within 24 hours."
                  className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-24"
                  rows={4}
                />
              </div>
              
              {/* Example Suggestions */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Try these examples:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    "When someone downloads our whitepaper, wait 2 hours then send a follow-up email and tag them as 'nurture'",
                    "If a contact has an AI score above 85, immediately create a task to call them and send them our premium proposal",
                    "When a prospect hasn't been contacted in 14 days, send a re-engagement email and reduce their priority",
                    "If someone attends a demo but doesn't respond within 5 days, create a task for the account manager and send pricing info"
                  ].map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setNaturalLanguageInput(example)}
                      className="text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-sm"
                    >
                      <div className="flex items-start">
                        <Lightbulb className="w-4 h-4 text-purple-500 mt-0.5 mr-2 flex-shrink-0" />
                        <span className="text-gray-700">{example}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <ModernButton
                variant="primary"
                onClick={handleNaturalLanguageSubmit}
                loading={isTranslating}
                disabled={!naturalLanguageInput.trim()}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600"
              >
                {isTranslating ? (
                  <>
                    <Brain className="w-4 h-4 animate-pulse" />
                    <span>GPT-5 is creating your rule...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate Automation Rule</span>
                    <Sparkles className="w-3 h-3 text-yellow-300" />
                  </>
                )}
              </ModernButton>
            </div>
          </GlassCard>
          
          {/* Generated Rule Preview */}
          {generatedRule && (
            <GlassCard className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                  Generated Automation Rule
                </h4>
                <div className="flex space-x-2">
                  <ModernButton
                    variant="outline"
                    size="sm"
                    onClick={() => setGeneratedRule(null)}
                  >
                    Discard
                  </ModernButton>
                  <ModernButton
                    variant="primary"
                    size="sm"
                    onClick={handleApplyGeneratedRule}
                    className="flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Rule</span>
                  </ModernButton>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Rule Name:</h5>
                  <p className="text-gray-700">{generatedRule.name}</p>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Description:</h5>
                  <p className="text-gray-700">{generatedRule.description}</p>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Trigger:</h5>
                  <p className="text-gray-700 capitalize">{generatedRule.trigger.type.replace('_', ' ')}</p>
                </div>
                
                {generatedRule.conditions.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Conditions:</h5>
                    <div className="space-y-1">
                      {generatedRule.conditions.map((condition: any, index: number) => (
                        <p key={index} className="text-sm text-gray-600">
                          • {condition.field} {condition.operator.replace('_', ' ')} "{condition.value}"
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                
                {generatedRule.actions.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Actions:</h5>
                    <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                      {generatedRule.actions.map((action: any, index: number) => {
                        const Icon = actionIcons[action.type as keyof typeof actionIcons];
                        const color = actionColors[action.type as keyof typeof actionColors];
                        
                        return (
                          <React.Fragment key={index}>
                            <div className="flex flex-col items-center space-y-1 min-w-0 flex-shrink-0">
                              <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
                                <Icon className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-xs text-gray-600 text-center max-w-20 truncate">
                                {action.type}
                              </span>
                            </div>
                            {index < generatedRule.actions.length - 1 && (
                              <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          {suggestions.length === 0 ? (
            <GlassCard className="p-8">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No AI suggestions available</p>
                  <ModernButton
                    variant="primary"
                    onClick={handleGenerateSuggestions}
                    loading={isOptimizing}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate AI Suggestions</span>
                  </ModernButton>
                </div>
              </div>
            </GlassCard>
          ) : (
            suggestions.map((suggestion) => (
              <GlassCard key={suggestion.id} className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${
                    suggestion.type === 'new_rule' ? 'bg-green-500' :
                    suggestion.type === 'optimize_existing' ? 'bg-blue-500' :
                    suggestion.type === 'merge_rules' ? 'bg-purple-500' :
                    'bg-orange-500'
                  }`}>
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{suggestion.title}</h4>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="text-sm text-gray-500 capitalize">{suggestion.type.replace('_', ' ')}</span>
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                            suggestion.priority === 'high' ? 'bg-red-100 text-red-800' :
                            suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {suggestion.priority.toUpperCase()} PRIORITY
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-purple-600">{suggestion.confidence}%</div>
                        <p className="text-xs text-gray-500">Confidence</p>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-4">{suggestion.description}</p>
                    
                    <div className="bg-white p-3 rounded-lg mb-4">
                      <h5 className="font-medium text-gray-900 mb-2">Expected Impact:</h5>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Efficiency:</span>
                          <span className="font-medium text-green-600 ml-1">+{suggestion.estimatedImpact.efficiency}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Coverage:</span>
                          <span className="font-medium text-blue-600 ml-1">{suggestion.estimatedImpact.coverage} contacts</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Time Saved:</span>
                          <span className="font-medium text-purple-600 ml-1">{suggestion.estimatedImpact.timesSaved}h/week</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <h5 className="font-medium text-blue-900 mb-2">AI Reasoning:</h5>
                      <ul className="space-y-1">
                        {suggestion.reasoning.map((reason, idx) => (
                          <li key={idx} className="text-sm text-blue-800 flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>Created: {new Date(suggestion.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <ModernButton
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Review</span>
                        </ModernButton>
                        <ModernButton
                          variant="primary"
                          size="sm"
                          className="flex items-center space-x-1 bg-gradient-to-r from-purple-600 to-blue-600"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Implement</span>
                        </ModernButton>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
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
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
              Automation Performance Analytics
            </h4>
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
                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => optimizeRule(automation.id, [])}
                      loading={isOptimizing}
                      className="flex items-center space-x-1"
                    >
                      <Brain className="w-3 h-3" />
                      <span>Optimize</span>
                    </ModernButton>
                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleAdvancedAnalysis(automation.id)}
                      loading={isAnalyzing && showAdvancedAnalysis === automation.id}
                      className="flex items-center space-x-1 bg-purple-50 text-purple-700 border-purple-200"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>GPT-5 Analysis</span>
                    </ModernButton>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
      
      {/* Advanced Analysis Modal */}
      {showAdvancedAnalysis && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-purple-600" />
                  GPT-5 Advanced Rule Analysis
                  <Sparkles className="w-4 h-4 ml-2 text-yellow-500" />
                </h3>
                <button 
                  onClick={() => {
                    setShowAdvancedAnalysis(null);
                    setAdvancedAnalysis(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-130px)]">
              {isAnalyzing ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Brain className="w-12 h-12 text-purple-500 mx-auto mb-4 animate-pulse" />
                    <p className="text-gray-600">GPT-5 is performing deep analysis...</p>
                    <p className="text-sm text-gray-500 mt-2">Analyzing performance patterns and strategic opportunities</p>
                  </div>
                </div>
              ) : advancedAnalysis ? (
                <div className="space-y-6">
                  {/* Impact Prediction */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
                      Impact Prediction
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{advancedAnalysis.impactPrediction?.affectedContacts || 0}</div>
                        <div className="text-sm text-blue-800">Affected Contacts</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{advancedAnalysis.impactPrediction?.timesSaved || 0}h</div>
                        <div className="text-sm text-green-800">Hours Saved/Week</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          ${(advancedAnalysis.impactPrediction?.revenueImpact || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-purple-800">Revenue Impact</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Optimization Recommendations */}
                  {advancedAnalysis.optimizationRecommendations && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Target className="w-5 h-5 mr-2 text-orange-500" />
                        GPT-5 Optimization Recommendations
                      </h4>
                      <div className="space-y-3">
                        {advancedAnalysis.optimizationRecommendations.map((rec: any, index: number) => (
                          <div key={index} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-orange-900">{rec.area}</h5>
                              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                {rec.confidence}% confidence
                              </span>
                            </div>
                            <p className="text-sm text-orange-800 mb-2">{rec.suggestion}</p>
                            <p className="text-xs text-orange-700">Expected: {rec.expectedImprovement}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Strategic Insights */}
                  {advancedAnalysis.strategicInsights && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                        Strategic Insights
                      </h4>
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <ul className="space-y-2">
                          {advancedAnalysis.strategicInsights.map((insight: string, index: number) => (
                            <li key={index} className="flex items-start text-sm text-yellow-800">
                              <span className="text-yellow-600 mr-2">•</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {/* Competitive Advantage */}
                  {advancedAnalysis.competitiveAdvantage && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Award className="w-5 h-5 mr-2 text-green-500" />
                        Competitive Advantage
                      </h4>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="text-green-800">{advancedAnalysis.competitiveAdvantage}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Select "GPT-5 Analysis" on any rule to see advanced insights</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};