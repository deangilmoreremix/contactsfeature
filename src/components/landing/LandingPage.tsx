import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { DarkModeToggle } from '../ui/DarkModeToggle';
import { UserPlus, CheckCheck } from 'lucide-react';
import { 
  CheckCircle, Star, Award, Trophy, Lightbulb, Heart, User } from 'lucide-react';
import { InteractiveContactScorer } from './InteractiveContactScorer';
import { InteractiveEmailComposer } from './InteractiveEmailComposer';
import { InteractiveFilterDemo } from './InteractiveFilterDemo';
import { 
  Brain, 
  Sparkles, 
  Mail, 
  MessageSquare, 
  Zap, 
  Settings, 
  Users, 
  Database, 
  BarChart3,
  TrendingUp,
  Target,
  Clock,
  DollarSign,
  ArrowRight,
  Play,
  Pause,
  Monitor,
  Smartphone,
  Globe,
  Shield,
  RefreshCw,
  FileText,
  Phone,
  Calendar,
  Layers,
  Activity,
  PieChart,
  LineChart,
  Filter,
  Search,
  Upload,
  Download,
  Eye,
  Star
} from 'lucide-react';

interface LandingPageProps {
  onClose: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onClose }) => {
  const [activeDemo, setActiveDemo] = useState<'scorer' | 'email' | 'filter'>('scorer');
  const [playingGif, setPlayingGif] = useState<string | null>(null);

  const keyFeatures = [
    {
      icon: Brain,
      title: 'AI-Powered Insights',
      description: 'Leverage advanced AI for contact scoring, enrichment, and predictive analytics',
      color: 'bg-purple-500'
    },
    {
      icon: Mail,
      title: 'Smart Communication',
      description: 'Generate personalized emails and social messages, analyze communication effectiveness',
      color: 'bg-blue-500'
    },
    {
      icon: Zap,
      title: 'Automated Workflows',
      description: 'Streamline sales processes with intelligent automation rules and suggestions',
      color: 'bg-yellow-500'
    },
    {
      icon: Users,
      title: 'Contact Management',
      description: 'Efficiently manage contacts with robust CRUD operations, import/export, and search',
      color: 'bg-green-500'
    }
  ];

  const aiCapabilities = [
    {
      title: 'AI Contact Scoring',
      description: 'Automatically score contacts from 0-100 based on engagement potential, industry fit, and decision-making authority',
      features: ['Confidence levels', 'Detailed reasoning', 'Real-time updates', 'Bulk processing']
    },
    {
      title: 'Contact Enrichment',
      description: 'Enhance contact profiles with AI-powered data discovery from email, name, or LinkedIn profiles',
      features: ['Social profiles discovery', 'Job title prediction', 'Company information', 'Location data']
    },
    {
      title: 'Email Generation & Analysis',
      description: 'Create compelling emails and analyze their effectiveness before sending',
      features: ['Purpose-driven templates', 'Tone adjustment', 'Quality scoring', 'Response likelihood']
    },
    {
      title: 'Predictive Analytics',
      description: 'Forecast conversion probability, response times, deal sizes, and identify risks',
      features: ['Conversion forecasting', 'Trend analysis', 'Risk assessment', 'Timeline predictions']
    }
  ];

  const communicationFeatures = [
    {
      title: 'Unified Timeline',
      description: 'Track all communication types in one place',
      icon: Clock
    },
    {
      title: 'AI Communication Strategy',
      description: 'Get optimal timing and channel recommendations',
      icon: Target
    },
    {
      title: 'Email Templates',
      description: 'Pre-built and customizable email templates',
      icon: FileText
    },
    {
      title: 'Quick Compose',
      description: 'Rapidly generate emails and social messages',
      icon: Zap
    }
  ];

  const dashboardFeatures = [
    {
      title: 'KPI Tracking',
      description: 'Monitor active deals, pipeline value, and conversion rates',
      icon: BarChart3
    },
    {
      title: 'Interactive Charts',
      description: 'Visualize pipeline stages, trends, and performance metrics',
      icon: PieChart
    },
    {
      title: 'Task Management',
      description: 'Track daily tasks and sales funnel progression',
      icon: CheckCircle
    },
    {
      title: 'Real-time Updates',
      description: 'Live updates on deal status and recent activities',
      icon: Activity
    }
  ];

  const techStack = [
    { name: 'React', description: 'Modern UI framework' },
    { name: 'TypeScript', description: 'Type-safe development' },
    { name: 'Vite', description: 'Fast build tool' },
    { name: 'Tailwind CSS', description: 'Utility-first styling' },
    { name: 'Supabase', description: 'Backend & database' },
    { name: 'OpenAI', description: 'AI capabilities' },
    { name: 'Google Gemini', description: 'AI alternatives' },
    { name: 'Anthropic', description: 'Claude integration' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Smart CRM</span>
            </div>
            <div className="flex items-center space-x-4">
              <DarkModeToggle size="sm" />
              <ModernButton variant="outline" onClick={onClose} className="flex items-center space-x-2">
                <ArrowRight className="w-4 h-4" />
                <span>Back to App</span>
              </ModernButton>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Unlock Sales Potential with{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI-Powered CRM
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Your Smart CRM Dashboard: Intelligent Contact Management, Automated Workflows, and Predictive Insights.
            Transform your sales process with cutting-edge AI technology.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-12">
            <ModernButton 
              variant="primary" 
              size="lg"
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Sparkles className="w-5 h-5" />
              <span>Explore Features</span>
            </ModernButton>
            <ModernButton variant="outline" size="lg" className="flex items-center space-x-2">
              <Play className="w-5 h-5" />
              <span>View Interactive Demos</span>
            </ModernButton>
          </div>
          
          {/* Hero Visual */}
          <div className="relative">
            <GlassCard className="p-8 max-w-4xl mx-auto">
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Dashboard Preview</p>
                  <p className="text-sm text-gray-500">Screenshots/GIFs of actual app interface will be placed here</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Tired of CRM Challenges?</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-gray-700">Manual data entry eating up valuable time?</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-gray-700">Struggling with lead qualification and prioritization?</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-gray-700">Missing key insights about your prospects?</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-gray-700">Inconsistent communication and follow-ups?</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-blue-600 mb-4">Automate, Analyze, and Accelerate</h3>
              <p className="text-lg text-gray-700 mb-6">
                Our Smart CRM Dashboard transforms your sales cycle with AI-powered automation, 
                intelligent insights, and predictive analytics that help you close more deals faster.
              </p>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-700 font-medium">Reduce manual work by 80%</span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-700 font-medium">Increase conversion rates by 40%</span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-700 font-medium">Save 2+ hours daily</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Overview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Core Capabilities</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover the powerful features that make Smart CRM the ultimate sales productivity platform
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {keyFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <GlassCard key={index} className="p-6 text-center hover:scale-105 transition-transform">
                  <div className={`${feature.color} p-4 rounded-xl w-fit mx-auto mb-4`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Management Deep Dive */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
              <Users className="w-8 h-8 mr-3 text-blue-600" />
              Advanced Contact Management
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience next-generation contact management with AI-powered insights, bulk operations, and intelligent automation
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* AI-Enhanced Contact Cards */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">AI-Enhanced Contact Cards</h3>
                <button
                  onClick={() => setPlayingGif(playingGif === 'contact-cards' ? null : 'contact-cards')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {playingGif === 'contact-cards' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <Users className="w-12 h-12 text-purple-500 mx-auto mb-2" />
                  <p className="text-purple-700 font-medium">AI Contact Cards Demo</p>
                  <p className="text-sm text-purple-600">GIF showing real-time AI scoring and insights on contact cards</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Real-time AI scoring with confidence levels</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Visual interest level indicators and engagement dots</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">AI-generated insights and recommendations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">One-click AI analysis button</span>
                </div>
              </div>
            </GlassCard>

            {/* Bulk AI Operations */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Bulk AI Operations</h3>
                <button
                  onClick={() => setPlayingGif(playingGif === 'bulk-ai' ? null : 'bulk-ai')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {playingGif === 'bulk-ai' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-green-100 to-teal-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <Brain className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-green-700 font-medium">Bulk AI Analysis Demo</p>
                  <p className="text-sm text-green-600">GIF showing bulk contact analysis with progress tracking</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Analyze all contacts without AI scores automatically</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Select specific contacts for targeted analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Real-time progress tracking with success/failure counts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Smart model selection (OpenAI vs Gemini) for optimal cost/performance</span>
                </div>
              </div>
            </GlassCard>

            {/* Advanced Search & Filtering */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Advanced Search & Filtering</h3>
                <button
                  onClick={() => setPlayingGif(playingGif === 'search-filter' ? null : 'search-filter')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {playingGif === 'search-filter' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <Search className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                  <p className="text-blue-700 font-medium">Smart Search Demo</p>
                  <p className="text-sm text-blue-600">GIF showing fuzzy search and advanced filtering in action</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Fuzzy search across names, companies, titles, and emails</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Multi-criteria filtering (interest, status, industry)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Instant results with real-time filtering</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Smart sorting by name, company, AI score, or update date</span>
                </div>
              </div>
            </GlassCard>

            {/* Contact Import/Export System */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Contact Import/Export System</h3>
                <button
                  onClick={() => setPlayingGif(playingGif === 'import-export' ? null : 'import-export')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {playingGif === 'import-export' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-orange-500 mx-auto mb-2" />
                  <p className="text-orange-700 font-medium">Import/Export Demo</p>
                  <p className="text-sm text-orange-600">GIF showing complete CSV import workflow with validation</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Drag & drop CSV upload with format validation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Real-time preview and error detection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Export selected or all contacts to CSV/JSON</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Smart field mapping and data sanitization</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Contact AI Intelligence Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
              <Brain className="w-8 h-8 mr-3 text-purple-600" />
              AI Intelligence Engine for Contacts
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Advanced AI features specifically designed to unlock insights from your contact data
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Enrichment */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">AI Contact Enrichment</h3>
                <button
                  onClick={() => setPlayingGif(playingGif === 'enrichment' ? null : 'enrichment')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {playingGif === 'enrichment' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <Sparkles className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <p className="text-emerald-700 font-medium">Contact Enrichment</p>
                  <p className="text-sm text-emerald-600">AI finding social profiles and missing data</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Enrich by email, name, or LinkedIn URL</li>
                <li>• Auto-discover social profiles</li>
                <li>• Find missing job titles and company info</li>
                <li>• Multiple AI provider support</li>
              </ul>
            </GlassCard>

            {/* Predictive Analytics */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Predictive Analytics</h3>
                <button
                  onClick={() => setPlayingGif(playingGif === 'predictive' ? null : 'predictive')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {playingGif === 'predictive' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-violet-100 to-purple-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-violet-500 mx-auto mb-2" />
                  <p className="text-violet-700 font-medium">Predictive Analytics</p>
                  <p className="text-sm text-violet-600">AI predicting conversion probability and trends</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Conversion probability forecasting</li>
                <li>• Response time predictions</li>
                <li>• Deal size estimations</li>
                <li>• Risk assessments</li>
              </ul>
            </GlassCard>

            {/* Smart Recommendations */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Smart Recommendations</h3>
                <button
                  onClick={() => setPlayingGif(playingGif === 'recommendations' ? null : 'recommendations')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {playingGif === 'recommendations' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-amber-100 to-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <Target className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                  <p className="text-amber-700 font-medium">AI Recommendations</p>
                  <p className="text-sm text-amber-600">Intelligent action suggestions and timing</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Optimal contact timing suggestions</li>
                <li>• Communication channel recommendations</li>
                <li>• Next-best-action guidance</li>
                <li>• Priority-based task automation</li>
              </ul>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Contact Workflow Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Complete Contact Workflow</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From first contact to closed deal - manage the entire customer lifecycle
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Detail View */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Comprehensive Contact Profiles</h3>
                <button
                  onClick={() => setPlayingGif(playingGif === 'contact-detail' ? null : 'contact-detail')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {playingGif === 'contact-detail' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-cyan-100 to-blue-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <User className="w-12 h-12 text-cyan-500 mx-auto mb-2" />
                  <p className="text-cyan-700 font-medium">Contact Detail View</p>
                  <p className="text-sm text-cyan-600">Complete contact profile with AI insights</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">360° contact view with all data points</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">AI insights panel with smart recommendations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Communication timeline and history</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Customer journey visualization</span>
                </div>
              </div>
            </GlassCard>

            {/* Contact Analytics */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Contact Analytics & Insights</h3>
                <button
                  onClick={() => setPlayingGif(playingGif === 'contact-analytics' ? null : 'contact-analytics')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {playingGif === 'contact-analytics' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-rose-100 to-pink-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-rose-500 mx-auto mb-2" />
                  <p className="text-rose-700 font-medium">Contact Analytics</p>
                  <p className="text-sm text-rose-600">Deep performance analytics for each contact</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Engagement tracking and trend analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Response time patterns and optimization</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Channel performance analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Pipeline progression visualization</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Interactive Demos Section */}
      <section id="interactive-demos" className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Try It Yourself</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the power of Smart CRM with these interactive demonstrations
            </p>
          </div>

          {/* Enhanced Demo Selector */}
          <div className="flex justify-center mb-8">
            <div className="flex rounded-lg border border-gray-300 overflow-hidden bg-white shadow-lg">
              <button
                onClick={() => setActiveDemo('scorer')}
                className={`px-6 py-3 text-sm font-medium transition-colors flex items-center space-x-2 ${
                  activeDemo === 'scorer'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Brain className="w-4 h-4" />
                <span>AI Contact Scorer</span>
              </button>
              <button
                onClick={() => setActiveDemo('email')}
                className={`px-6 py-3 text-sm font-medium border-l border-gray-300 transition-colors flex items-center space-x-2 ${
                  activeDemo === 'email'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Email Composer</span>
              </button>
              <button
                onClick={() => setActiveDemo('filter')}
                className={`px-6 py-3 text-sm font-medium border-l border-gray-300 transition-colors flex items-center space-x-2 ${
                  activeDemo === 'filter'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Smart Filter</span>
              </button>
            </div>
          </div>

          {/* Interactive Demo Component */}
          <div className="max-w-4xl mx-auto">
            {activeDemo === 'scorer' && <InteractiveContactScorer />}
            {activeDemo === 'email' && <InteractiveEmailComposer />}
            {activeDemo === 'filter' && <InteractiveFilterDemo />}
          </div>
        </div>
      </section>

      {/* Contact Management Workflow GIFs */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Contact Management in Action</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See every aspect of contact management come to life with these detailed demonstrations
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Creation & AI Auto-Fill */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">AI Auto-Fill Contact Creation</h3>
                <button
                  onClick={() => setPlayingGif(playingGif === 'contact-creation' ? null : 'contact-creation')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {playingGif === 'contact-creation' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <UserPlus className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-green-700 font-medium">AI Contact Creation</p>
                  <p className="text-sm text-green-600">Watch AI auto-fill contact data from minimal input</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                See how entering just an email or LinkedIn URL triggers AI to automatically fill in job title, company info, social profiles, and more
              </p>
            </GlassCard>

            {/* Contact Selection & Bulk Actions */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Selection & Bulk Operations</h3>
                <button
                  onClick={() => setPlayingGif(playingGif === 'bulk-operations' ? null : 'bulk-operations')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {playingGif === 'bulk-operations' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <CheckCheck className="w-12 h-12 text-purple-500 mx-auto mb-2" />
                  <p className="text-purple-700 font-medium">Bulk Operations</p>
                  <p className="text-sm text-purple-600">Multi-select contacts for batch processing</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                Experience powerful bulk operations including AI analysis, export, tagging, and other actions across multiple selected contacts
              </p>
            </GlassCard>

            {/* Advanced Filtering Demo */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Dynamic Search & Filtering</h3>
                <button
                  onClick={() => setPlayingGif(playingGif === 'advanced-filtering' ? null : 'advanced-filtering')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {playingGif === 'advanced-filtering' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-sky-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <Filter className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                  <p className="text-blue-700 font-medium">Advanced Filtering</p>
                  <p className="text-sm text-blue-600">Real-time search with multiple filter combinations</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                Watch as users apply multiple filters simultaneously, search across all fields, and see instant results with fuzzy matching
              </p>
            </GlassCard>

            {/* Contact Analytics Dashboard */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Contact Performance Analytics</h3>
                <button
                  onClick={() => setPlayingGif(playingGif === 'contact-performance' ? null : 'contact-performance')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {playingGif === 'contact-performance' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <LineChart className="w-12 h-12 text-orange-500 mx-auto mb-2" />
                  <p className="text-orange-700 font-medium">Performance Analytics</p>
                  <p className="text-sm text-orange-600">Detailed contact engagement and conversion metrics</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                Explore detailed analytics showing engagement trends, response patterns, channel performance, and conversion probabilities for each contact
              </p>
            </GlassCard>
          </div>
        </div>
      </section>
      {/* AI Capabilities Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
              <Brain className="w-8 h-8 mr-3 text-purple-600" />
              AI-Powered Intelligence
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Harness the power of OpenAI, Google Gemini, and Anthropic models for unparalleled CRM insights
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {aiCapabilities.map((capability, index) => (
              <GlassCard key={index} className="p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{capability.title}</h3>
                <p className="text-gray-600 mb-6">{capability.description}</p>
                <div className="grid grid-cols-2 gap-3">
                  {capability.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Demos with GIFs */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">See It In Action</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Watch how Smart CRM features work in real-time
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* GIF Demo Cards */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">AI Contact Scoring</h3>
                <button
                  onClick={() => setPlayingGif(playingGif === 'scoring' ? null : 'scoring')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {playingGif === 'scoring' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <Brain className="w-12 h-12 text-purple-500 mx-auto mb-2" />
                  <p className="text-purple-700 font-medium">AI Scoring Demo</p>
                  <p className="text-sm text-purple-600">GIF showing contact being scored with AI insights</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                Watch as AI analyzes a contact's profile and generates an intelligent score with detailed reasoning
              </p>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Email Generation</h3>
                <button
                  onClick={() => setPlayingGif(playingGif === 'email' ? null : 'email')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {playingGif === 'email' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-green-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <Mail className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                  <p className="text-blue-700 font-medium">Email Composer Demo</p>
                  <p className="text-sm text-blue-600">GIF showing AI generating personalized emails</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                See how AI creates personalized, compelling emails based on contact information and your objectives
              </p>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Contact Import Flow</h3>
                <button
                  onClick={() => setPlayingGif(playingGif === 'import' ? null : 'import')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {playingGif === 'import' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-green-100 to-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-green-700 font-medium">Import Demo</p>
                  <p className="text-sm text-green-600">GIF showing CSV import and validation process</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                Experience the seamless process of importing contacts via CSV with validation and preview
              </p>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Dashboard Overview</h3>
                <button
                  onClick={() => setPlayingGif(playingGif === 'dashboard' ? null : 'dashboard')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {playingGif === 'dashboard' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-yellow-100 to-red-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
                  <p className="text-yellow-700 font-medium">Dashboard Demo</p>
                  <p className="text-sm text-yellow-600">GIF touring the main dashboard and KPIs</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                Navigate through the comprehensive dashboard with real-time KPIs and interactive charts
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Communication Hub Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 mr-3 text-blue-600" />
              Communication Hub
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Streamline all your customer communications in one intelligent platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {communicationFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <GlassCard key={index} className="p-6 text-center hover:shadow-xl transition-shadow">
                  <div className="bg-blue-100 p-3 rounded-lg w-fit mx-auto mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* Dashboard & Analytics Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 mr-3 text-green-600" />
              Dashboard & Analytics
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get comprehensive insights into your sales performance with real-time analytics
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dashboardFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <GlassCard key={index} className="p-6 text-center hover:shadow-xl transition-shadow">
                  <div className="bg-green-100 p-3 rounded-lg w-fit mx-auto mb-4">
                    <Icon className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Built with Modern Technology</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powered by the latest technologies for performance, reliability, and scalability
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {techStack.map((tech, index) => (
              <div key={index} className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{tech.name.charAt(0)}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{tech.name}</h3>
                <p className="text-sm text-gray-600">{tech.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Experience Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Exceptional User Experience</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Designed for productivity with modern interface and seamless integrations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-gray-800 p-4 rounded-xl mb-4 mx-auto w-fit">
                <Monitor className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Dark Mode</h3>
              <p className="text-gray-600 text-sm">Sleek dark mode for comfortable extended use</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-500 p-4 rounded-xl mb-4 mx-auto w-fit">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Responsive Design</h3>
              <p className="text-gray-600 text-sm">Perfect experience on desktop, tablet, and mobile</p>
            </div>

            <div className="text-center">
              <div className="bg-green-500 p-4 rounded-xl mb-4 mx-auto w-fit">
                <Database className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Supabase Backend</h3>
              <p className="text-gray-600 text-sm">Robust, scalable backend with real-time capabilities</p>
            </div>

            <div className="text-center">
              <div className="bg-purple-500 p-4 rounded-xl mb-4 mx-auto w-fit">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Multi-AI Support</h3>
              <p className="text-gray-600 text-sm">Flexible AI provider options for optimal performance</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Transform Your Sales Process?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join the future of CRM with AI-powered insights, automated workflows, and intelligent communication tools.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <ModernButton 
              variant="glass" 
              size="lg"
              onClick={onClose}
              className="flex items-center space-x-2"
            >
              <Eye className="w-5 h-5" />
              <span>Explore All Features</span>
            </ModernButton>
            <ModernButton 
              variant="outline" 
              size="lg"
              className="flex items-center space-x-2 border-white/30 text-white hover:bg-white/10"
              onClick={() => {
                document.querySelector('#interactive-demos')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Play className="w-5 h-5" />
              <span>Try Interactive Demos</span>
            </ModernButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <span className="text-xl font-bold">Smart CRM Dashboard</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                Revolutionizing sales processes with AI-powered insights, automated workflows, and intelligent communication tools.
              </p>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-400">Built with ❤️ using modern technology</span>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Features</h3>
              <ul className="space-y-2 text-gray-400">
                <li>AI Contact Scoring</li>
                <li>Email Generation</li>
                <li>Predictive Analytics</li>
                <li>Automated Workflows</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Technology</h3>
              <ul className="space-y-2 text-gray-400">
                <li>React & TypeScript</li>
                <li>Supabase Backend</li>
                <li>OpenAI Integration</li>
                <li>Modern UI/UX</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 mt-8 text-center">
            <p className="text-gray-400">
              © 2024 Smart CRM Dashboard. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};