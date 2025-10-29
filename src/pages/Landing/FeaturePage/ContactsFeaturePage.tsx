import React from 'react';
import {
  Users,
  Brain,
  Zap,
  Target,
  Mail,
  Phone,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Clock,
  Settings,
  Sparkles,
  Globe,
  Database,
  Activity,
  CheckCircle,
  ArrowRight,
  Star,
  Shield,
  Rocket,
  Layers,
  Workflow,
  Bot,
  Search,
  FileText,
  Calendar,
  PieChart,
  Lightbulb,
  Heart,
  Award,
  BookOpen,
  Code,
  Cpu,
  Network,
  Zap as Lightning
} from 'lucide-react';

const ContactsFeaturePage: React.FC = () => {
  const features = [
    {
      icon: Zap,
      title: "Advanced Automation System",
      description: "Intelligent workflow automation with AI-powered suggestions and drag-and-drop customization",
      highlights: [
        "Inline editing for automation steps with visual feedback",
        "AI-powered automation suggestions based on contact data",
        "8 comprehensive automation templates (Lead Nurturing, Customer Onboarding, etc.)",
        "Fully editable templates with create/edit modal",
        "Drag-and-drop action reordering and management",
        "Real-time analytics integration for performance tracking"
      ],
      color: "from-blue-500 to-purple-600"
    },
    {
      icon: Target,
      title: "AI Sales Intelligence Tools",
      description: "4 specialized AI tools for sales qualification and engagement optimization",
      highlights: [
        "Adaptive Playbook Generator - AI-created sales strategies",
        "Communication Optimizer - Timing and content suggestions",
        "Discovery Questions Generator - Intelligent prospecting questions",
        "Deal Health Panel - Real-time risk assessment and recommendations",
        "AI Settings Panel - Advanced configuration and preferences"
      ],
      color: "from-green-500 to-teal-600"
    },
    {
      icon: Users,
      title: "Enhanced Contact Detail View",
      description: "8 specialized tabs providing comprehensive contact intelligence and management",
      highlights: [
        "Overview, Journey, Analytics, Communication, Automation, Sales Intelligence, AI Insights, Email tabs",
        "AI Research Integration with real-time web search",
        "Contact Journey Timeline with interaction history",
        "AI Insights Panel with predictive recommendations",
        "Communication Hub across email, phone, SMS, and social platforms",
        "Contact Analytics with engagement pattern analysis"
      ],
      color: "from-purple-500 to-pink-600"
    },
    {
      icon: Mail,
      title: "Communication & Content Tools",
      description: "AI-powered communication tools for personalized and effective outreach",
      highlights: [
        "AI Email Composer with context-aware personalization",
        "Smart Social Messaging for platform-specific content",
        "Objection Handler with 50+ common sales responses",
        "Subject Line Generator with open rate optimization",
        "Meeting Summary Generator with actionable insights",
        "Communication Optimizer for timing and content suggestions"
      ],
      color: "from-orange-500 to-red-600"
    },
    {
      icon: TrendingUp,
      title: "Sales Intelligence & Forecasting",
      description: "Advanced analytics and predictive tools for sales optimization",
      highlights: [
        "AI Sales Forecasting with confidence intervals",
        "Communication Optimization for better customer interactions",
        "Deal Health Analysis with risk scoring and recommendations",
        "Adaptive Playbook Generation based on contact profiles",
        "Discovery Questions Generator for effective prospecting",
        "Live Deal Analysis with real-time assessment"
      ],
      color: "from-indigo-500 to-blue-600"
    },
    {
      icon: Brain,
      title: "AI-Powered Contact Intelligence",
      description: "Multi-model AI analysis for comprehensive lead qualification and enrichment",
      highlights: [
        "Multi-Model Scoring using OpenAI GPT-4 and Google Gemini",
        "Web Research Integration with LinkedIn and company data",
        "Smart Categorization based on industry and engagement patterns",
        "Relationship Mapping with AI-powered network analysis",
        "Bulk Analysis processing hundreds of contacts simultaneously",
        "Contact Enrichment from public sources and web research"
      ],
      color: "from-cyan-500 to-blue-600"
    },
    {
      icon: Database,
      title: "Contact Management Features",
      description: "Advanced contact database with AI scoring and interactive enhancements",
      highlights: [
        "AI Score Display with color-coded visual indicators",
        "Interest Level Tracking (Hot/Medium/Low/Cold) with animations",
        "Source Tracking with visual source badges",
        "AI Insights Section with real-time recommendations",
        "Customizable AI Toolbar with quick access tools",
        "Quick Actions (Email, Call, View) with streamlined workflows"
      ],
      color: "from-emerald-500 to-green-600"
    },
    {
      icon: Network,
      title: "Technical Architecture",
      description: "Advanced AI orchestration system with intelligent routing and performance monitoring",
      highlights: [
        "AI Orchestrator System with 15+ specialized functions",
        "Smart AI Routing based on task requirements and cost optimization",
        "Function Calling Registry for automated task execution",
        "Request Queue Management with priority-based processing",
        "Performance Monitoring with real-time metrics tracking",
        "Cost Optimization with dynamic model selection"
      ],
      color: "from-gray-500 to-slate-600"
    }
  ];

  const stats = [
    { label: "AI Tools Available", value: "20+", icon: Bot },
    { label: "Automation Templates", value: "8", icon: Workflow },
    { label: "Contact Detail Tabs", value: "8", icon: Layers },
    { label: "Success Rate", value: "92%", icon: Award },
    { label: "Time Saved", value: "4.2h/week", icon: Clock },
    { label: "AI Models", value: "3", icon: Cpu }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm">
                <Users className="w-12 h-12" />
              </div>
            </div>
          </section>
        </div>
      );
    };
    
    export default ContactsFeaturePage;
            </div>
          </section>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Enhanced Contacts
              <span className="block text-2xl md:text-3xl font-normal text-blue-200 mt-2">
                AI-Powered Contact Management
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-4xl mx-auto leading-relaxed">
              Transform your contact management with AI-driven insights, intelligent automation,
              and comprehensive sales intelligence tools. Process hundreds of contacts with
              multi-model AI analysis and automated workflows.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300">
                Try Enhanced Contacts
              </button>
              <button className="px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-300">
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center"
              >
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <stat.icon className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Contact Intelligence
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Every feature designed to give you complete visibility and control over your contact relationships
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className={`p-6 bg-gradient-to-r ${feature.color} text-white`}>
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/20 rounded-lg">
                      <feature.icon className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{feature.title}</h3>
                      <p className="text-white/90">{feature.description}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <ul className="space-y-3">
                    {feature.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div>
            <h2 className="text-4xl font-bold mb-6">
              Ready to Transform Your Contact Management?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of sales professionals using AI-powered contact intelligence
              to close more deals and build stronger relationships.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300">
                Start Free Trial
              </button>
              <button className="px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-300">
                Schedule Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ContactsFeaturePage;