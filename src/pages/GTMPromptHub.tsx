import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Star,
  Copy,
  Check,
  RefreshCw,
  Settings,
  BookOpen,
  Zap,
  Filter,
  Grid,
  List,
  Plus,
  X,
  Save,
  Edit3,
  Trash2,
  ChevronDown,
  Lightbulb,
  MessageSquare,
  Mail,
  Phone,
  FileText,
  Users,
  TrendingUp,
  Target,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ModernButton } from '../components/ui/ModernButton';
import { GlassCard } from '../components/ui/GlassCard';

interface GTMPrompt {
  id: string;
  name: string;
  description?: string;
  category: string;
  role: string;
  tags?: string[];
  prompt?: string;
}

interface Category {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'outreach', label: 'Outreach', icon: '📧', description: 'Cold emails, follow-ups, social selling' },
  { id: 'discovery', label: 'Discovery', icon: '🔍', description: 'Research, qualification, meeting scheduling' },
  { id: 'negotiation', label: 'Negotiation', icon: '🤝', description: 'Objection handling, closing, concessions' },
  { id: 'proposal', label: 'Proposal', icon: '📄', description: 'Deals, proposals, pricing' },
  { id: 'expansion', label: 'Expansion', icon: '📈', description: 'Win-back, reactivation, upselling' },
  { id: 'intelligence', label: 'Intelligence', icon: '🧠', description: 'Competitive, revenue, content analysis' },
];

const FEATURED_PROMPTS = [
  { id: 'fp-1', name: 'Cold Email Framework', category: 'outreach', description: 'Proven cold email structure that converts' },
  { id: 'fp-2', name: 'Discovery Questions', category: 'discovery', description: '5 questions to uncover needs' },
  { id: 'fp-3', name: 'Objection Handling', category: 'negotiation', description: 'Handle pushback professionally' },
  { id: 'fp-4', name: 'Follow-Up Sequence', category: 'outreach', description: '3-step nurture sequence' },
  { id: 'fp-5', name: 'Meeting Close', category: 'negotiation', description: 'Close with confidence' },
];

export default function GTMPromptHub() {
  const [activeTab, setActiveTab] = useState<'browse' | 'generate' | 'custom'>('browse');
  const [prompts, setPrompts] = useState<GTMPrompt[]>([]);
  const [customPrompts, setCustomPrompts] = useState<GTMPrompt[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [selectedPrompt, setSelectedPrompt] = useState<GTMPrompt | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [showNewPromptModal, setShowNewPromptModal] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ name: '', description: '', prompt: '', category: 'outreach' });

  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [customInput, setCustomInput] = useState('');

  useEffect(() => {
    loadPrompts();
    loadCustomPrompts();
    loadContacts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gtm-prompt-library', {
        body: { action: 'list', category: selectedCategory === 'all' ? undefined : selectedCategory, limit: 50 }
      });
      if (data?.prompts) {
        setPrompts(data.prompts);
      }
    } catch (err) {
      console.error('Failed to load prompts:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomPrompts = async () => {
    try {
      const { data } = await supabase
        .from('custom_prompts')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setCustomPrompts(data);
    } catch (err) {
      console.error('Failed to load custom prompts:', err);
    }
  };

  const loadContacts = async () => {
    const { data } = await supabase
      .from('contacts')
      .select('id, firstname, lastname, email, company, title')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setContacts(data);
  };

  const generateContent = async () => {
    if (!selectedPrompt?.prompt) return;
    
    setGenerating(true);
    setGeneratedContent('');
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-with-prompt', {
        body: {
          prompt: selectedPrompt.prompt,
          contactId: selectedContact?.id,
          customInput: customInput,
          outputFormat: 'text'
        }
      });
      
      if (data?.content) {
        setGeneratedContent(data.content);
      }
    } catch (err) {
      console.error('Generation failed:', err);
      setGeneratedContent('Failed to generate content. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const saveCustomPrompt = async () => {
    if (!newPrompt.name || !newPrompt.prompt) return;
    
    try {
      const { error } = await supabase
        .from('custom_prompts')
        .insert({
          name: newPrompt.name,
          description: newPrompt.description,
          prompt: newPrompt.prompt,
          category: newPrompt.category,
        });
      
      if (!error) {
        setShowNewPromptModal(false);
        setNewPrompt({ name: '', description: '', prompt: '', category: 'outreach' });
        loadCustomPrompts();
      }
    } catch (err) {
      console.error('Failed to save prompt:', err);
    }
  };

  const deleteCustomPrompt = async (id: string) => {
    try {
      await supabase.from('custom_prompts').delete().eq('id', id);
      loadCustomPrompts();
    } catch (err) {
      console.error('Failed to delete prompt:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredPrompts = prompts.filter(p => 
    selectedCategory === 'all' || p.category === selectedCategory
  ).filter(p =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const allPrompts = [...FEATURED_PROMPTS, ...customPrompts, ...filteredPrompts];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">GTM Prompt Hub</h1>
              <p className="text-gray-600">Browse prompts and generate AI-powered content</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'browse'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            Browse Prompts
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'generate'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Zap className="w-4 h-4 inline mr-2" />
            Generate Content
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'custom'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Edit3 className="w-4 h-4 inline mr-2" />
            My Prompts
          </button>
        </div>

        {/* Browse Tab */}
        {activeTab === 'browse' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Categories</option>
                  {DEFAULT_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-purple-100 text-purple-600' : 'bg-white text-gray-500'}`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-purple-100 text-purple-600' : 'bg-white text-gray-500'}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Featured Prompts */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Star className="w-5 h-5 text-yellow-500 mr-2" />
                Featured Prompts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {FEATURED_PROMPTS.map(prompt => (
                  <div
                    key={prompt.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedPrompt({ ...prompt, prompt: '' });
                      setActiveTab('generate');
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{prompt.name}</h3>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        {prompt.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{prompt.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* All Prompts */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                All Prompts
              </h2>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
                  <p className="text-gray-500 mt-2">Loading prompts...</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPrompts.map(prompt => (
                    <div
                      key={prompt.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedPrompt(prompt);
                        setActiveTab('generate');
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{prompt.name}</h3>
                        {prompt.tags?.length > 0 && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {prompt.tags[0]}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{prompt.description || prompt.prompt?.slice(0, 100)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPrompts.map(prompt => (
                    <div
                      key={prompt.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
                      onClick={() => {
                        setSelectedPrompt(prompt);
                        setActiveTab('generate');
                      }}
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">{prompt.name}</h3>
                        <p className="text-sm text-gray-600">{prompt.description || prompt.prompt?.slice(0, 80)}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Panel */}
            <div className="space-y-4">
              <GlassCard className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Select Prompt</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                  {allPrompts.map(prompt => (
                    <button
                      key={prompt.id}
                      onClick={() => setSelectedPrompt(prompt)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedPrompt?.id === prompt.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{prompt.name}</div>
                      <div className="text-xs text-gray-500">{prompt.category}</div>
                    </button>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Context</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact (optional)</label>
                    <select
                      value={selectedContact?.id || ''}
                      onChange={(e) => setSelectedContact(contacts.find(c => c.id === e.target.value) || null)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">No contact selected</option>
                      {contacts.map(contact => (
                        <option key={contact.id} value={contact.id}>
                          {contact.firstname} {contact.lastname} - {contact.company}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional Context</label>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Add any specific context or requirements..."
                      rows={4}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </GlassCard>

              <ModernButton
                onClick={generateContent}
                disabled={generating || !selectedPrompt}
                className="w-full"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Generate Content
                  </>
                )}
              </ModernButton>
            </div>

            {/* Output Panel */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Generated Content</h3>
                {generatedContent && (
                  <ModernButton
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedContent)}
                  >
                    {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </ModernButton>
                )}
              </div>
              {generatedContent ? (
                <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                    {generatedContent}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a prompt and click Generate to create content</p>
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* Custom Prompts Tab */}
        {activeTab === 'custom' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">My Custom Prompts</h2>
              <ModernButton onClick={() => setShowNewPromptModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Prompt
              </ModernButton>
            </div>

            {customPrompts.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No custom prompts yet</h3>
                <p className="text-gray-500 mb-4">Create your own prompts to use in content generation</p>
                <ModernButton onClick={() => setShowNewPromptModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Prompt
                </ModernButton>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customPrompts.map(prompt => (
                  <div key={prompt.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{prompt.name}</h3>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setSelectedPrompt(prompt);
                            setActiveTab('generate');
                          }}
                          className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                        >
                          <Zap className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteCustomPrompt(prompt.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{prompt.description}</p>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {prompt.category}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* New Prompt Modal */}
        {showNewPromptModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create Custom Prompt</h3>
                <button onClick={() => setShowNewPromptModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newPrompt.name}
                    onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                    placeholder="My Custom Prompt"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={newPrompt.description}
                    onChange={(e) => setNewPrompt({ ...newPrompt, description: e.target.value })}
                    placeholder="What does this prompt do?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newPrompt.category}
                    onChange={(e) => setNewPrompt({ ...newPrompt, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {DEFAULT_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
                  <textarea
                    value={newPrompt.prompt}
                    onChange={(e) => setNewPrompt({ ...newPrompt, prompt: e.target.value })}
                    placeholder="Write your prompt here..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <ModernButton variant="outline" onClick={() => setShowNewPromptModal(false)}>
                    Cancel
                  </ModernButton>
                  <ModernButton onClick={saveCustomPrompt} disabled={!newPrompt.name || !newPrompt.prompt}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Prompt
                  </ModernButton>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
