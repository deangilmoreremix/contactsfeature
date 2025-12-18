export interface Playbook {
  id: string;
  name: string;
  category: string;
  niche: string;
  growthPotential: string;
  strategy: string;
  revenueFocus: string;
  targetCustomer: string;
  phases: PlaybookPhase[];
  contactCadence: ContactCadence[];
  platformIntegration: PlatformIntegration[];
  successMetrics: SuccessMetric[];
  personalizationInputs: PersonalizationInput[];
  aiPrompt: string;
}

export interface PlaybookPhase {
  name: string;
  duration: string;
  objectives: string[];
  contactMethods: string[];
  platformActions: string[];
}

export interface ContactCadence {
  method: string;
  frequency: string;
  purpose: string;
  timing: string;
}

export interface PlatformIntegration {
  feature: string;
  usage: string;
  benefit: string;
}

export interface SuccessMetric {
  metric: string;
  target: string;
  timeframe: string;
}

export interface PersonalizationInput {
  field: string;
  type: string;
  required: boolean;
  description: string;
}

export const RECURRING_REVENUE_PLAYBOOKS: Playbook[] = [
  {
    id: 'marketing-agency-retainer',
    name: 'Local Marketing Agency Retainer Conversion',
    category: 'Digital Services',
    niche: 'Local marketing agencies and digital consultants',
    growthPotential: '$50K-$500K+ annual recurring revenue per client',
    strategy: 'Project-to-retainer conversion with value-based pricing',
    revenueFocus: 'Monthly retainers, performance bonuses, account expansion',
    targetCustomer: 'Local business owners frustrated with inconsistent marketing results',
    phases: [
      {
        name: 'Lead Qualification & Initial Contact',
        duration: 'Days 1-7',
        objectives: [
          'Identify marketing pain points and budget',
          'Establish credibility through case studies',
          'Schedule discovery call'
        ],
        contactMethods: ['Email', 'LinkedIn', 'Phone'],
        platformActions: [
          'Run SDR Persona campaign',
          'Generate discovery questions',
          'Set up email sequence'
        ]
      },
      {
        name: 'Discovery & Value Demonstration',
        duration: 'Days 8-21',
        objectives: [
          'Conduct comprehensive marketing audit',
          'Present ROI-focused value proposition',
          'Address specific pain points'
        ],
        contactMethods: ['Phone/Video Call', 'Email', 'LinkedIn'],
        platformActions: [
          'Use Communication Optimizer',
          'Generate competitive analysis',
          'Set up nurturing automation'
        ]
      },
      {
        name: 'Proposal & Objection Handling',
        duration: 'Days 22-35',
        objectives: [
          'Deliver customized retainer proposal',
          'Handle pricing and commitment objections',
          'Secure stakeholder buy-in'
        ],
        contactMethods: ['Presentation', 'Email', 'Phone'],
        platformActions: [
          'Run Objection Handler SDR',
          'Create deal health assessment',
          'Map stakeholder journey'
        ]
      },
      {
        name: 'Onboarding & Expansion',
        duration: 'Days 36-60',
        objectives: [
          'Successful service transition',
          'Demonstrate immediate value',
          'Plan account expansion opportunities'
        ],
        contactMethods: ['Workshop', 'Weekly Calls', 'Email'],
        platformActions: [
          'Set up client success automation',
          'Monitor engagement metrics',
          'Plan expansion campaigns'
        ]
      }
    ],
    contactCadence: [
      { method: 'Email', frequency: '3x/week initial, 2x/week ongoing', purpose: 'Nurturing and information sharing', timing: 'Business days' },
      { method: 'Phone', frequency: '2-3x/week during active phases', purpose: 'Relationship building and objection handling', timing: 'Business hours' },
      { method: 'LinkedIn', frequency: '3-5x/week', purpose: 'Social proof and thought leadership', timing: 'Weekdays' },
      { method: 'In-person/Video', frequency: '1x/phase', purpose: 'High-value presentations and relationship building', timing: 'Scheduled appointments' }
    ],
    platformIntegration: [
      {
        feature: 'SDR Modal',
        usage: 'Campaign selection and automated outreach',
        benefit: 'Personalized messaging at scale'
      },
      {
        feature: 'Contact Details',
        usage: 'Journey mapping and stakeholder analysis',
        benefit: 'Complete customer understanding'
      },
      {
        feature: 'AI Tools',
        usage: 'Content optimization and objection handling',
        benefit: 'Higher conversion rates'
      },
      {
        feature: 'Automation',
        usage: 'Nurturing sequences and follow-ups',
        benefit: 'Consistent engagement without manual effort'
      }
    ],
    successMetrics: [
      { metric: 'Lead to Client Conversion', target: '25-35%', timeframe: '60 days' },
      { metric: 'Average Contract Value', target: '$6,000/month', timeframe: 'Per client' },
      { metric: 'Client Lifetime Value', target: '$150,000+', timeframe: '24 months' },
      { metric: 'Retention Rate', target: '85%+', timeframe: 'Annual' },
      { metric: 'Expansion Revenue', target: '20-30%', timeframe: 'Annual per client' }
    ],
    personalizationInputs: [
      { field: 'industry', type: 'select', required: true, description: 'Primary business industry' },
      { field: 'companySize', type: 'number', required: true, description: 'Number of employees' },
      { field: 'currentMarketingSpend', type: 'currency', required: true, description: 'Annual marketing budget' },
      { field: 'primaryPainPoints', type: 'textarea', required: true, description: 'Main marketing challenges' },
      { field: 'businessGoals', type: 'multiselect', required: true, description: 'Marketing objectives' },
      { field: 'decisionMakerTitle', type: 'text', required: true, description: 'Key decision maker role' },
      { field: 'timeline', type: 'select', required: false, description: 'Implementation timeline preference' },
      { field: 'budgetRange', type: 'range', required: false, description: 'Monthly retainer budget range' }
    ],
    aiPrompt: `Generate a comprehensive marketing agency retainer conversion strategy for [COMPANY_NAME], a [INDUSTRY] business with [CURRENT_MARKETING_SPEND] annual marketing budget and [PRIMARY_PAIN_POINTS].

Create a 60-day acquisition playbook that includes:
1. Personalized SDR messaging using their specific marketing challenges
2. Step-by-step contact cadence with multiple channels
3. ROI-focused value propositions based on their industry benchmarks
4. Objection handling for common agency concerns
5. Onboarding process that ensures immediate value delivery
6. Expansion roadmap for growing their retainer value over time

Personalization data:
- Industry: [INDUSTRY]
- Company size: [COMPANY_SIZE] employees
- Current marketing spend: [CURRENT_MARKETING_SPEND]
- Primary goals: [BUSINESS_GOALS]
- Decision maker: [DECISION_MAKER_TITLE]
- Timeline preference: [TIMELINE]
- Budget range: [BUDGET_RANGE]`
  },
  {
    id: 'it-managed-services',
    name: 'IT Managed Services Provider Growth',
    category: 'Technology Services',
    niche: 'Local IT consulting and managed service providers',
    growthPotential: '$5K-$50K monthly recurring revenue per client',
    strategy: 'Break-fix to managed services transition with SLA-based pricing',
    revenueFocus: 'Monthly managed service agreements, monitoring fees, support contracts',
    targetCustomer: 'Small-medium businesses with growing IT complexity',
    phases: [
      {
        name: 'Problem Identification & Trust Building',
        duration: 'Days 1-14',
        objectives: [
          'Conduct comprehensive IT assessment',
          'Identify critical pain points and risks',
          'Build credibility through expertise demonstration'
        ],
        contactMethods: ['Email', 'Phone', 'Assessment Delivery'],
        platformActions: [
          'Run IT Assessment SDR campaign',
          'Generate discovery questions',
          'Create automated follow-up sequences'
        ]
      },
      {
        name: 'Solution Presentation & Trial',
        duration: 'Days 15-35',
        objectives: [
          'Present managed services value proposition',
          'Implement proof-of-concept trial',
          'Demonstrate SLA guarantees and risk mitigation'
        ],
        contactMethods: ['Demo Presentation', 'Daily Trial Check-ins', 'Weekly Reports'],
        platformActions: [
          'Use Communication Optimizer for proposals',
          'Set up trial monitoring automation',
          'Generate performance-based pricing'
        ]
      },
      {
        name: 'Transition & Optimization',
        duration: 'Days 36-60',
        objectives: [
          'Complete service transition',
          'Establish ongoing monitoring and support',
          'Begin account expansion planning'
        ],
        contactMethods: ['Onboarding Workshop', 'Weekly Reviews', 'Monthly Reports'],
        platformActions: [
          'Configure managed services automation',
          'Set up performance dashboards',
          'Plan expansion opportunities'
        ]
      }
    ],
    contactCadence: [
      { method: 'Email', frequency: '4-5x/week', purpose: 'Information delivery and nurturing', timing: 'Business days' },
      { method: 'Phone', frequency: '2-3x/week during active phases', purpose: 'Technical discussions and relationship building', timing: 'Business hours' },
      { method: 'Assessment/Reports', frequency: '1x/week during trial', purpose: 'Value demonstration and progress tracking', timing: 'End of business week' },
      { method: 'Workshops/Training', frequency: '1x/month', purpose: 'Knowledge transfer and adoption', timing: 'Scheduled sessions' }
    ],
    platformIntegration: [
      {
        feature: 'SDR Modal',
        usage: 'Technical SDR campaigns and follow-up sequences',
        benefit: 'Qualified leads and consistent nurturing'
      },
      {
        feature: 'Contact Details',
        usage: 'Technical requirement tracking and stakeholder mapping',
        benefit: 'Complete IT ecosystem understanding'
      },
      {
        feature: 'AI Tools',
        usage: 'Technical proposal optimization and objection handling',
        benefit: 'Higher technical sale conversions'
      },
      {
        feature: 'Automation',
        usage: 'Monitoring alerts and service level reporting',
        benefit: 'Proactive client management'
      }
    ],
    successMetrics: [
      { metric: 'Assessment to Trial Conversion', target: '40-50%', timeframe: '30 days' },
      { metric: 'Trial to Contract Conversion', target: '70-80%', timeframe: '60 days' },
      { metric: 'Average Monthly Revenue', target: '$3,500/client', timeframe: 'Per client' },
      { metric: 'Client Churn Rate', target: '<5%', timeframe: 'Annual' },
      { metric: 'Net Promoter Score', target: '>8.5/10', timeframe: 'Ongoing' }
    ],
    personalizationInputs: [
      { field: 'companySize', type: 'number', required: true, description: 'Number of employees' },
      { field: 'currentITSetup', type: 'textarea', required: true, description: 'Current IT infrastructure and challenges' },
      { field: 'breakFixFrequency', type: 'select', required: true, description: 'How often they need break-fix support' },
      { field: 'criticalSystems', type: 'multiselect', required: true, description: 'Business-critical systems and applications' },
      { field: 'budgetRange', type: 'range', required: true, description: 'Monthly IT budget range' },
      { field: 'decisionMaker', type: 'text', required: true, description: 'Primary IT decision maker' },
      { field: 'timeline', type: 'select', required: false, description: 'Implementation timeline preference' },
      { field: 'regulatoryRequirements', type: 'multiselect', required: false, description: 'Industry compliance needs' }
    ],
    aiPrompt: `Generate a comprehensive IT managed services growth strategy for [COMPANY_NAME], a [COMPANY_SIZE] employee company with current IT setup: [CURRENT_IT_SETUP].

Create a 60-day conversion playbook that includes:
1. Technical SDR campaigns targeting their specific IT pain points
2. Break-fix to managed services transition methodology
3. SLA-based pricing models with risk mitigation
4. Trial implementation and monitoring setup
5. Account expansion roadmap for additional services

Personalization data:
- Company size: [COMPANY_SIZE] employees
- Current IT challenges: [CURRENT_IT_SETUP]
- Break-fix frequency: [BREAK_FIX_FREQUENCY]
- Critical systems: [CRITICAL_SYSTEMS]
- Budget range: [BUDGET_RANGE]
- Decision maker: [DECISION_MAKER]
- Timeline: [TIMELINE]
- Regulatory needs: [REGULATORY_REQUIREMENTS]`
  }
  // Add remaining 18 playbooks here with similar detailed structure
];

export const getPlaybookById = (id: string): Playbook | undefined => {
  return RECURRING_REVENUE_PLAYBOOKS.find(playbook => playbook.id === id);
};

export const getPlaybooksByCategory = (category: string): Playbook[] => {
  return RECURRING_REVENUE_PLAYBOOKS.filter(playbook => playbook.category === category);
};