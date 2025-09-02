```tsx
import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { DarkModeToggle } from '../ui/DarkModeToggle';
import { InteractiveEmailComposer } from './InteractiveEmailComposer';
import { InteractiveContactScorer } from './InteractiveContactScorer';
import { InteractiveFilterDemo } from './InteractiveFilterDemo';
import { InteractiveSmartSearch } from './InteractiveSmartSearch';
import { InteractiveLiveDealAnalysis } from './InteractiveLiveDealAnalysis';
import { InteractiveObjectionHandler } from './InteractiveObjectionHandler';
import { InteractiveInstantAIResponse } from './InteractiveInstantAIResponse';
import { 
  X,
  ArrowRight,
  Sparkles,
  Brain,
  Mail,
  Users,
  Search,
  BarChart3,
  Zap,
  MessageSquare,
  Upload,
  Download,
  Target,
  Shield,
  Globe,
  Settings,
  Phone,
  Calendar,
  Layers,
  Activity,
  PieChart,
  TrendingUp,
  CheckCircle,
  Award,
  Eye,
  Heart,
  Star,
  DollarSign
} from 'lucide-react';

interface LandingPageProps {
  onClose: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onClose }) => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  const features = [
    {
      id: 'ai-scoring',
      title: 'AI-Powered Contact Scoring',
      description: 'Intelligent contact scoring using advanced AI models from OpenAI and Google Gemini. Automatically prioritize your hottest leads.',
      image: 'https://images.pexels.com/photos/735911/pexels-photo-735911.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Brain,
      color: 'from-purple-500 to-blue-500',
      interactive: true
    },
    {
      id: 'email-composer',
      title: 'AI Email Composer',
      description: 'Generate personalized emails with AI. Multiple tone options, purpose-driven content, and real-time quality analysis.',
      image: 'https://images.pexels.com/photos/5325757/pexels-photo-5325757.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Mail,
      color: 'from-green-500 to-blue-500',
      interactive: true
    },
    {
      id: 'smart-filtering',
      title: 'Smart Filtering & Search',
      description: 'Advanced search with fuzzy matching, intelligent filters, and bulk operations. Find exactly what you need instantly.',
      image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Search,
      color: 'from-blue-500 to-green-500',
      interactive: true
    },
    {
      id: 'smart-search',
      title: 'AI Smart Search',
      description: 'Find contacts, companies, and documents with natural language queries and AI-powered relevance.',
      image: 'https://images.pexels.com/photos/3861970/pexels-photo-3861970.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Search,
      color: 'from-teal-500 to-cyan-500',
      interactive: true
    },
    {
      id: 'live-deal-analysis',
      title: 'Live Deal Analysis',
      description: 'Get real-time AI insights on deal health, risks, and next best actions to close deals faster.',
      image: 'https://images.pexels.com/photos/3861968/pexels-photo-3861968.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: DollarSign,
      color: 'from-orange-500 to-yellow-500',
      interactive: true
    },
    {
      id: 'objection-handler',
      title: 'AI Objection Handler',
      description: 'Instantly generate AI-powered responses to common sales objections, tailored to your context.',
      image: 'https://images.pexels.com/photos/3861966/pexels-photo-3861966.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: MessageSquare,
      color: 'from-red-500 to-pink-500',
      interactive: true
    },
    {
      id: 'instant-ai-response',
      title: 'Instant AI Response',
      description: 'Get immediate, context-aware AI-generated replies for any message or query.',
      image: 'https://images.pexels.com/photos/3861967/pexels-photo-3861967.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Zap,
      color: 'from-indigo-500 to-purple-500',
      interactive: true
    },
    {
      id: 'contact-management',
      title: 'Comprehensive Contact Management',
      description: 'Complete contact lifecycle management with AI-enhanced profiles, social integration, and custom fields.',
      image: 'https://images.pexels.com/photos/3760067/pexels-photo-3760067.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Users,
      color: 'from-indigo-500 to-purple-500'
    },
    {
      id: 'ai-insights',
      title: 'Advanced AI Insights & Analytics',
      description: 'Deep analytics powered by multiple AI models. Predictive insights, trend analysis, and risk assessment.',
      image: 'https://images.pexels.com/photos/3861972/pexels-photo-3861972.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: BarChart3,
      color: 'from-orange-500 to-red-500'
    },
    {
      id: 'automation',
      title: 'Intelligent Automation',
      description: 'Smart workflow automation with AI suggestions. Automate follow-ups, scoring, and lead nurturing.',
      image: 'https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Zap,
      color: 'from-yellow-500 to-orange-500'
    },
    {
      id: 'communication-hub',
      title: 'Unified Communication Hub',
      description: 'Centralized communication across email, phone, SMS, and social media. Track all interactions in one place.',
      image: 'https://images.pexels.com/photos/3760066/pexels-photo-3760066.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: MessageSquare,
      color: 'from-pink-500 to-purple-500'
    },
    {
      id: 'ai-enrichment',
      title: 'AI Contact Enrichment',
      description: 'Automatically enrich contact profiles with AI. Find emails, phone numbers, social profiles, and company data.',
      image: 'https://images.pexels.com/photos/3861964/pexels-photo-3861964.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Sparkles,
      color: 'from-teal-500 to-blue-500'
    },
    {
      id: 'import-export',
      title: 'Smart Import & Export',
      description: 'Intelligent CSV import with validation, duplicate detection, and AI-powered data enhancement.',
      image: 'https://images.pexels.com/photos/3861963/pexels-photo-3861963.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Upload,
      color: 'from-green-500 to-teal-500'
    },
    {
      id: 'multi-model-ai',
      title: 'Multi-Model AI Integration',
      description: 'Smart routing between OpenAI GPT-4, Google Gemini, and Gemma models for optimal performance and cost.',
      image: 'https://images.pexels.com/photos/3861957/pexels-photo-3861957.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Layers,
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'predictive-analytics',
      title: 'Predictive Analytics',
      description: 'AI-powered predictions for conversion probability, response times, and deal sizes. Stay ahead of the game.',
      image: 'https://images.pexels.com/photos/3861971/pexels-photo-3861971.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: TrendingUp,
      color: 'from-blue-500 to-indigo-500'
    },
    {
      id: 'social-messaging',
      title: 'AI Social Messaging',
      description: 'Generate personalized messages for LinkedIn, Twitter, SMS, and WhatsApp with platform-specific optimization.',
      image: 'https://images.pexels.com/photos/3861965/pexels-photo-3861965.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Globe,
      color: 'from-cyan-500 to-blue-500'
    }
  ];

  const renderInteractiveDemo = (featureId: string) => {
    switch (featureId) {
      case 'ai-scoring':
        return <InteractiveContactScorer />;
      case 'email-composer':
        return <InteractiveEmailComposer />;
      case 'smart-filtering':
        return <InteractiveFilterDemo />;
      case 'smart-search':
        return <InteractiveSmartSearch />;
      case 'live-deal-analysis':
        return <InteractiveLiveDealAnalysis />;
      case 'objection-handler':
        return <InteractiveObjectionHandler />;
      case 'instant-ai-response':
        return <InteractiveInstantAIResponse />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Smart CRM Dashboard</h1>
                <p className="text-gray-600">AI-Powered Customer Relationship Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <DarkModeToggle size="sm" />
              <ModernButton
                variant="primary"
                onClick={onClose}
                className="flex items-center space-x-2"
              >
                <span>Try the App</span>
                <ArrowRight className="w-4 h-4" />
              </ModernButton>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            The Future of
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> AI-Powered </span>
            CRM
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Experience the next generation of customer relationship management with advanced AI integration, 
            intelligent automation, and predictive analytics that transform how you manage your sales pipeline.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <ModernButton
              variant="primary"
              size="lg"
              onClick={onClose}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600"
            >
              <Sparkles className="w-5 h-5" />
              <span>Explore All Features</span>
            </ModernButton>
            <ModernButton
              variant="outline"
              size="lg"
              className="flex items-center space-x-2"
            >
              <Eye className="w-5 h-5" />
              <span>Watch Demo</span>
            </ModernButton>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-4">Complete Feature Suite</h3>
          <p className="text-lg text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Discover every powerful feature that makes Smart CRM the ultimate solution for modern sales teams.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <GlassCard 
                  key={feature.id} 
                  className="p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                  onClick={() => setActiveFeature(activeFeature === feature.id ? null : feature.id)}
                >
                  {/* Feature Image */}
                  <div className="relative mb-6 overflow-hidden rounded-lg">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-20 group-hover:opacity-30 transition-opacity duration-300`}></div>
                    <div className={`absolute top-4 left-4 p-3 bg-gradient-to-br ${feature.color} rounded-xl shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    {feature.interactive && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-800 flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-yellow-500" />
                        <span>Interactive</span>
                      </div>
                    )}
                  </div>

                  {/* Feature Content */}
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                      {feature.title}
                    </h4>
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {feature.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <ModernButton
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-2"
                      >
                        <span>Learn More</span>
                        <ArrowRight className="w-4 h-4" />
                      </ModernButton>
                      
                      {feature.interactive && (
                        <span className="text-xs text-blue-600 font-medium">Try it below!</span>
                      )}
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* Interactive Demos Section */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Interactive Feature Demos
            <Sparkles className="inline-block w-8 h-8 ml-3 text-yellow-500" />
          </h3>
          <p className="text-lg text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Experience our key features firsthand with these interactive demonstrations.
          </p>

          <div className="space-y-12">
            {/* AI Contact Scoring Demo */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900">AI Contact Scoring Demo</h4>
              </div>
              <InteractiveContactScorer />
            </div>

            {/* AI Email Composer Demo */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900">AI Email Composer Demo</h4>
              </div>
              <InteractiveEmailComposer />
            </div>

            {/* Smart Filtering Demo */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-green-500 rounded-xl">
                  <Search className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900">Smart Filtering & Search Demo</h4>
              </div>
              <InteractiveFilterDemo />
            </div>

            {/* AI Smart Search Demo */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl">
                  <Search className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900">AI Smart Search Demo</h4>
              </div>
              <InteractiveSmartSearch />
            </div>

            {/* Live Deal Analysis Demo */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900">Live Deal Analysis Demo</h4>
              </div>
              <InteractiveLiveDealAnalysis />
            </div>

            {/* AI Objection Handler Demo */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900">AI Objection Handler Demo</h4>
              </div>
              <InteractiveObjectionHandler />
            </div>

            {/* Instant AI Response Demo */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900">Instant AI Response Demo</h4>
              </div>
              <InteractiveInstantAIResponse />
            </div>
          </div>
        </div>

        {/* AI Models Section */}
        <div className="mb-16">
          <GlassCard className="p-8">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                Powered by Advanced AI Models
              </h3>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Smart CRM integrates with the latest AI models for optimal performance, accuracy, and cost efficiency.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* OpenAI */}
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-green-200">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">OpenAI GPT-4</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Advanced reasoning and analysis for complex tasks like relationship mapping and detailed insights.
                </p>
                <div className="flex justify-center space-x-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs">GPT-4o</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">GPT-4o Mini</span>
                </div>
              </div>

              {/* Google Gemini */}
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Google Gemini</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Lightning-fast processing for real-time scoring, categorization, and bulk operations.
                </p>
                <div className="flex justify-center space-x-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">Gemini 2.0 Flash</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs">Gemini 1.5 Pro</span>
                </div>
              </div>

              {/* Gemma Models */}
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Gemma Models</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Cost-effective AI for high-volume tasks like tagging, categorization, and simple analysis.
                </p>
                <div className="flex justify-center space-x-2">
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs">Gemma 2-27B</span>
                  <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded-md text-xs">Gemma 2-9B</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Key Benefits Section */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">Why Choose Smart CRM?</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Brain,
                title: 'AI-First Approach',
                description: 'Every feature is enhanced with cutting-edge AI for maximum efficiency.',
                color: 'from-purple-500 to-blue-500'
              },
              {
                icon: Target,
                title: 'Smart Automation',
                description: 'Intelligent workflows that learn and adapt to your sales process.',
                color: 'from-green-500 to-teal-500'
              },
              {
                icon: BarChart3,
                title: 'Predictive Analytics',
                description: 'Stay ahead with AI-powered predictions and trend analysis.',
                color: 'from-orange-500 to-red-500'
              },
              {
                icon: Shield,
                title: 'Enterprise Ready',
                description: 'Scalable, secure, and built for teams of all sizes.',
                color: 'from-blue-500 to-indigo-500'
              }
            ].map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <GlassCard key={index} className="p-6 text-center hover:shadow-xl transition-all duration-300">
                  <div className={\`w-12 h-12 bg-gradient-to-r ${benefit.color} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                  <div className={`w-12 h-12 bg-gradient-to-r ${benefit.color} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h4>
                  <p className="text-gray-600 text-sm">{benefit.description}</p>
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <GlassCard className="p-12 bg-gradient-to-r from-blue-50 to-purple-50">
            <h3 className="text-4xl font-bold text-gray-900 mb-6">
              Ready to Transform Your Sales Process?
            </h3>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of sales teams already using Smart CRM to close more deals, 
              save time, and make data-driven decisions.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <ModernButton
                variant="primary"
                size="lg"
                onClick={onClose}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <Sparkles className="w-5 h-5" />
                <span>Start Using Smart CRM</span>
              </ModernButton>
              <ModernButton
                variant="outline"
                size="lg"
                className="flex items-center space-x-2"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Contact Sales</span>
              </ModernButton>
            </div>
            
            <div className="mt-8 flex items-center justify-center space-x-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Free 14-day trial</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Setup in minutes</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
```