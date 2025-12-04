import React, { useState } from 'react';
import clsx from 'clsx';
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
import { InteractiveContactDemo } from './InteractiveContactDemo';
import { FeatureImageGallery } from './FeatureImageGallery';
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
  DollarSign,
  Book,
  User
} from 'lucide-react';

interface LandingPageProps {
  onClose: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onClose }) => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  const features = [
    {
      id: 'ai-contact-scoring',
      title: 'AI Contact Scoring',
      description: 'Advanced AI-powered contact scoring with visual indicators, interest level tracking, and predictive lead qualification using OpenAI and Google Gemini.',
      image: 'https://images.pexels.com/photos/735911/pexels-photo-735911.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Brain,
      color: 'from-purple-500 to-blue-500',
      interactive: true
    },
    {
      id: 'contact-detail-view',
      title: 'Comprehensive Contact Detail View',
      description: 'Complete contact management with 8 specialized tabs: Overview, Journey Timeline, Analytics, Communication Hub, Automation, Sales Intelligence, AI Insights, and Email.',
      image: 'https://images.pexels.com/photos/3760067/pexels-photo-3760067.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: User,
      color: 'from-blue-500 to-indigo-500',
      interactive: true
    },
    {
      id: 'ai-enrichment',
      title: 'AI Contact Enrichment',
      description: 'Automatically enrich contact profiles with AI web research. Find emails, phone numbers, social profiles, and company data using advanced search algorithms.',
      image: 'https://images.pexels.com/photos/3861964/pexels-photo-3861964.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Sparkles,
      color: 'from-teal-500 to-blue-500',
      interactive: true
    },
    {
      id: 'ai-insights-analytics',
      title: 'AI Insights & Analytics',
      description: 'Deep contact analytics with AI-powered insights, predictive behavior analysis, engagement tracking, and conversion probability forecasting.',
      image: 'https://images.pexels.com/photos/3861972/pexels-photo-3861972.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: BarChart3,
      color: 'from-orange-500 to-red-500',
      interactive: true
    },
    {
      id: 'communication-hub',
      title: 'Unified Communication Hub',
      description: 'Centralized communication management across email, phone, SMS, and social media with AI-powered interaction tracking and response suggestions.',
      image: 'https://images.pexels.com/photos/3760066/pexels-photo-3760066.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: MessageSquare,
      color: 'from-pink-500 to-purple-500',
      interactive: true
    },
    {
      id: 'ai-automation',
      title: 'AI Automation Workflows',
      description: 'Intelligent automation with AI-suggested workflows, automated follow-ups, smart lead nurturing, and personalized communication sequences.',
      image: 'https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Zap,
      color: 'from-yellow-500 to-orange-500',
      interactive: true
    },
    {
      id: 'sales-intelligence-tools',
      title: 'AI Sales Intelligence Tools',
      description: 'Advanced sales intelligence with adaptive playbooks, communication optimization, deal health analysis, and AI-generated discovery questions.',
      image: 'https://images.pexels.com/photos/3184430/pexels-photo-3184430.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Target,
      color: 'from-emerald-500 to-teal-500',
      interactive: true
    },
    {
      id: 'contact-journey-timeline',
      title: 'Contact Journey Timeline',
      description: 'Visual timeline of all contact interactions, AI-powered pattern recognition, engagement analysis, and predictive next-step recommendations.',
      image: 'https://images.pexels.com/photos/3861968/pexels-photo-3861968.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: TrendingUp,
      color: 'from-indigo-500 to-purple-500',
      interactive: true
    },
    {
      id: 'customizable-ai-toolbar',
      title: 'Customizable AI Toolbar',
      description: 'Personalized AI tool selection with quick-access buttons for scoring, enrichment, insights, email generation, and communication optimization.',
      image: 'https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Settings,
      color: 'from-violet-500 to-purple-500',
      interactive: true
    },
    {
      id: 'social-integration',
      title: 'Advanced Social Integration',
      description: 'Complete social media integration with LinkedIn, Twitter, Facebook, Instagram, and WhatsApp with AI-powered content optimization.',
      image: 'https://images.pexels.com/photos/3861965/pexels-photo-3861965.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Globe,
      color: 'from-cyan-500 to-blue-500',
      interactive: true
    },
    {
      id: 'ai-email-generation',
      title: 'AI Email Generation',
      description: 'Context-aware email generation with multiple tones, personalization, and real-time quality analysis and optimization.',
      image: 'https://images.pexels.com/photos/5325757/pexels-photo-5325757.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Mail,
      color: 'from-green-500 to-blue-500',
      interactive: true
    },
    {
      id: 'smart-search-filtering',
      title: 'Smart Search & Filtering',
      description: 'Advanced search with fuzzy matching, AI-powered relevance ranking, intelligent filters, bulk operations, and natural language queries.',
      image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      icon: Search,
      color: 'from-blue-500 to-green-500',
      interactive: true
    }
  ];

  const renderInteractiveDemo = (featureId: string) => {
    switch (featureId) {
      case 'ai-contact-scoring':
        return <InteractiveContactScorer />;
      case 'ai-email-generation':
        return <InteractiveEmailComposer />;
      case 'smart-search-filtering':
        return <InteractiveFilterDemo />;
      case 'ai-insights-analytics':
        return <InteractiveSmartSearch />;
      case 'contact-journey-timeline':
        return <InteractiveLiveDealAnalysis />;
      case 'communication-hub':
        return <InteractiveObjectionHandler />;
      case 'ai-automation':
        return <InteractiveInstantAIResponse />;
      case 'contact-detail-view':
        return <InteractiveContactDemo />;
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
                <h1 className="text-2xl font-bold text-gray-900">AI-Powered Contacts Management</h1>
                <p className="text-gray-600">Intelligent Contact Management & Sales Intelligence</p>
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
            The Complete
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> AI Contact Management </span>
            Platform
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Experience the most comprehensive AI-powered contact management solution with intelligent scoring,
            automated enrichment, predictive analytics, unified communication, and advanced sales intelligence tools.
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

        {/* Animated Feature Image Gallery */}
        <div className="mb-24">
          <FeatureImageGallery />
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-4">Complete AI Contact Management Suite</h3>
          <p className="text-lg text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Discover every powerful feature that makes our platform the ultimate AI-powered solution for intelligent contact management and sales teams.
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
                    <div className={clsx(
                      "absolute inset-0 bg-gradient-to-br opacity-20 group-hover:opacity-30 transition-opacity duration-300",
                      feature.color
                    )}></div>
                    <div className={clsx(
                      "absolute top-4 left-4 p-3 bg-gradient-to-br rounded-xl shadow-lg",
                      feature.color
                    )}>
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

            {/* AI Contact Intelligence Demo */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                  <User className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900">AI Contact Intelligence Demo</h4>
              </div>
              <InteractiveContactDemo />
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
                Our Contact Management Platform integrates with the latest AI models from OpenAI, Google, and more for optimal performance, accuracy, and cost efficiency across all contact features.
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
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">Why Choose AI Contact Management?</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: 'AI-Powered Contact Intelligence',
                description: 'Advanced AI scoring, enrichment, and insights that automatically qualify and prioritize your contacts.',
                color: 'from-purple-500 to-blue-500'
              },
              {
                icon: User,
                title: 'Complete Contact Lifecycle Management',
                description: 'Comprehensive contact management from initial capture to conversion with detailed journey tracking.',
                color: 'from-blue-500 to-indigo-500'
              },
              {
                icon: BarChart3,
                title: 'Predictive Contact Analytics',
                description: 'AI-powered analytics that predict engagement, conversion probability, and optimal contact timing.',
                color: 'from-orange-500 to-red-500'
              },
              {
                icon: Sparkles,
                title: 'Automated Contact Enrichment',
                description: 'Automatically enrich contact profiles with web research, social data, and company intelligence.',
                color: 'from-teal-500 to-blue-500'
              },
              {
                icon: MessageSquare,
                title: 'Unified Communication Hub',
                description: 'Centralized communication across all channels with AI-powered response suggestions and tracking.',
                color: 'from-pink-500 to-purple-500'
              },
              {
                icon: Target,
                title: 'Intelligent Lead Qualification',
                description: 'Smart lead scoring and qualification that adapts to your sales process and improves over time.',
                color: 'from-emerald-500 to-teal-500'
              }
            ].map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <GlassCard key={index} className="p-6 text-center hover:shadow-xl transition-all duration-300">
                  <div className={clsx("w-12 h-12 bg-gradient-to-r rounded-xl flex items-center justify-center mx-auto mb-4", benefit.color)}>
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
              Ready to Transform Your Contact Management?
            </h3>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of sales and marketing teams already using our AI Contact Management Platform to qualify leads faster,
              enrich contact data automatically, and make intelligent decisions across the entire customer journey.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <ModernButton
                variant="primary"
                size="lg"
                onClick={onClose}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <Sparkles className="w-5 h-5" />
                <span>Start Using Contact Management Platform</span>
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