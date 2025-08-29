export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  aiFeature?: boolean;
  icon?: string;
  quickActions?: Array<{
    type: 'message' | 'link' | 'action';
    label: string;
    message?: string;
    href?: string;
    action?: () => void;
  }>;
}

export interface Tour {
  id: string;
  name: string;
  description: string;
  category: 'onboarding' | 'ai-features' | 'advanced' | 'updates';
  steps: TourStep[];
  autoStart?: boolean;
  prerequisites?: string[];
}

export const tours: Tour[] = [
  {
    id: 'onboarding',
    name: 'Welcome to Smart CRM',
    description: 'Learn the basics of your AI-powered CRM',
    category: 'onboarding',
    autoStart: true,
    steps: [
      {
        id: 'welcome',
        targetSelector: 'body',
        title: 'Welcome to Smart CRM! 🎉',
        description: 'This quick tour will show you around and highlight our powerful AI features that make managing contacts effortless.',
        position: 'center',
        icon: 'Sparkles'
      },
      {
        id: 'contacts-hub',
        targetSelector: '[data-tour-id="contacts-hub"]',
        title: 'Your Contacts Hub',
        description: 'This is where you manage all your customer relationships. Add, organize, and get AI insights on your contacts.',
        position: 'bottom',
        icon: 'Users',
        quickActions: [
          { type: 'message', label: 'Learn More', message: 'Tell me more about contact management' }
        ]
      },
      {
        id: 'ai-score-button',
        targetSelector: '[data-tour-id="ai-score-all"]',
        title: 'AI-Powered Lead Scoring ⭐',
        description: 'Our AI automatically scores your leads using advanced models from OpenAI and Google Gemini. Higher scores mean better prospects!',
        position: 'left',
        aiFeature: true,
        icon: 'Brain',
        quickActions: [
          { type: 'message', label: 'How AI Scoring Works', message: 'Explain how AI lead scoring works in detail' }
        ]
      },
      {
        id: 'smart-search',
        targetSelector: '[data-tour-id="search-input"]',
        title: 'Smart Search & Filtering',
        description: 'Find contacts instantly with fuzzy search and intelligent filters. Search by name, company, title, or even AI score!',
        position: 'bottom',
        icon: 'Search'
      },
      {
        id: 'new-contact-button',
        targetSelector: '[data-tour-id="new-contact"]',
        title: 'Add Contacts with AI Auto-Fill',
        description: 'When adding new contacts, our AI can research and auto-fill information from just an email or name. Save tons of time!',
        position: 'left',
        aiFeature: true,
        icon: 'UserPlus'
      },
      {
        id: 'import-button',
        targetSelector: '[data-tour-id="import-contacts"]',
        title: 'Smart Import',
        description: 'Import CSV files with intelligent validation and duplicate detection. AI enhances your data quality automatically.',
        position: 'left',
        icon: 'Upload'
      }
    ]
  },
  {
    id: 'ai-features-deep-dive',
    name: 'AI Features Deep Dive',
    description: 'Explore all the AI-powered capabilities',
    category: 'ai-features',
    steps: [
      {
        id: 'ai-overview',
        targetSelector: 'body',
        title: 'AI Features Overview 🤖',
        description: 'Smart CRM uses multiple AI models (OpenAI GPT-4, Google Gemini, and Gemma) to enhance every aspect of your workflow.',
        position: 'center',
        aiFeature: true,
        icon: 'Brain'
      },
      {
        id: 'contact-scoring',
        targetSelector: '[data-tour-id="contact-card"]',
        title: 'AI Contact Scoring',
        description: 'Each contact gets an AI score (0-100) based on engagement potential, fit, and conversion probability. Click the brain icon to score!',
        position: 'top',
        aiFeature: true,
        icon: 'Target'
      },
      {
        id: 'ai-insights',
        targetSelector: '[data-tour-id="ai-insights"]',
        title: 'AI Insights & Recommendations',
        description: 'Get actionable recommendations like optimal contact times, conversation strategies, and next best actions.',
        position: 'left',
        aiFeature: true,
        icon: 'Lightbulb'
      },
      {
        id: 'email-composer',
        targetSelector: '[data-tour-id="email-tools"]',
        title: 'AI Email Composer',
        description: 'Generate personalized emails with different tones and purposes. AI analyzes quality and suggests improvements.',
        position: 'top',
        aiFeature: true,
        icon: 'Mail'
      },
      {
        id: 'automation',
        targetSelector: '[data-tour-id="automation"]',
        title: 'Smart Automation',
        description: 'AI suggests automation rules based on your workflow patterns, helping you save time and maintain consistency.',
        position: 'right',
        aiFeature: true,
        icon: 'Zap'
      }
    ]
  }
];

export const tooltipConfig = {
  aiScore: 'AI score from 0-100 indicating lead conversion potential. Higher scores = better prospects.',
  interestLevel: 'Visual indicator of prospect interest: Hot (red), Medium (yellow), Low (blue), Cold (gray).',
  sources: 'Where this lead came from (LinkedIn, Website, Referral, etc.).',
  aiInsights: 'AI-generated recommendations and predictions for this contact.',
  confidenceLevel: 'How confident the AI is in its analysis (higher = more reliable).',
  bulkActions: 'Select multiple contacts to perform actions like scoring, exporting, or tagging.',
  smartFilters: 'Filter contacts by AI score, interest level, industry, or custom criteria.',
  autoEnrichment: 'AI researches and fills missing contact information automatically.',
  emailAnalysis: 'AI analyzes email quality, tone, and suggests improvements for better response rates.',
  predictionEngine: 'AI predicts optimal contact times, conversion probability, and deal outcomes.',
  modelSelection: 'Smart CRM automatically selects the best AI model (OpenAI, Gemini, or Gemma) for each task.'
};