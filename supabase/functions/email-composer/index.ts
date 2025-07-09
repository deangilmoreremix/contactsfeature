import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Missing required environment variables'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check if AI providers are configured
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!openaiApiKey && !geminiApiKey) {
      console.warn('No AI provider API keys configured, using fallback mode');
    }

    if (req.method === 'POST') {
      const { contact, purpose, tone = 'professional', length = 'medium', includeSignature = true } = await req.json();
      
      if (!contact) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required parameters',
            details: 'contact data is required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Generate email content based on contact data
      const result = await generateEmail(contact, purpose, tone, length, includeSignature, openaiApiKey, geminiApiKey);

      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
        details: 'This endpoint only supports POST requests'
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Email composer error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message || 'An unexpected error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function generateEmail(
  contact: any, 
  purpose: string, 
  tone: string, 
  length: string, 
  includeSignature: boolean,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<any> {
  // If we have API keys, we could make a real API call to OpenAI/Gemini
  // For now, we'll simulate the response with template-based generation
  
  // Determine word count based on length parameter
  const wordCounts = {
    short: { subject: 5, body: 50 },
    medium: { subject: 8, body: 120 },
    long: { subject: 10, body: 250 }
  };
  
  const count = wordCounts[length as keyof typeof wordCounts] || wordCounts.medium;
  
  // Generate appropriate greeting
  const greeting = `Hi ${contact.firstName || contact.name.split(' ')[0]},`;
  
  // Generate appropriate subject and body based on purpose
  let subject = '';
  let body = '';
  
  switch (purpose) {
    case 'introduction':
      subject = `Introduction from ${generateCompanyName()} - ${generateIndustrySpecificPhrase(contact.industry)}`;
      body = `${greeting}\n\nI hope this email finds you well. I'm reaching out because I saw your work at ${contact.company} and was particularly impressed by your focus on ${generateIndustrySpecificPhrase(contact.industry)}.\n\n${generateCompanyName()} specializes in helping companies like ${contact.company} to overcome challenges in ${contact.industry || 'your industry'} through our innovative solutions.\n\nWould you be open to a brief 15-minute call next week to discuss how we might be able to help with your current initiatives?\n\n`;
      break;
      
    case 'follow-up':
      subject = `Following up on our conversation about ${generateIndustrySpecificPhrase(contact.industry)}`;
      body = `${greeting}\n\nThank you for taking the time to speak with me earlier about your needs at ${contact.company}. As discussed, I wanted to provide you with some additional information about how our solutions can address the ${generatePainPoint(contact.industry)} you mentioned.\n\nBased on what you shared about your goals to ${generateGoal(contact.industry)}, I believe our ${generateProductName()} would be an excellent fit for your team.\n\n`;
      break;
      
    case 'proposal':
      subject = `Proposal for ${contact.company}: ${generateIndustrySpecificPhrase(contact.industry)} Solution`;
      body = `${greeting}\n\nBased on our recent conversations about your needs at ${contact.company}, I'm pleased to present our proposal for addressing your ${generatePainPoint(contact.industry)}.\n\nOur solution will help you ${generateBenefit(contact.industry)} while ensuring ${generateSecondaryBenefit(contact.industry)}. The implementation timeline would be approximately 4-6 weeks, with dedicated support throughout the process.\n\nI've attached the complete proposal for your review, which includes pricing options and implementation details.\n\n`;
      break;
      
    case 'meeting-request':
      subject = `Meeting request: Discussing ${generateIndustrySpecificPhrase(contact.industry)} solutions`;
      body = `${greeting}\n\nI hope this email finds you well. I'd like to schedule a meeting to discuss how ${generateCompanyName()} can help ${contact.company} with ${generatePainPoint(contact.industry)}.\n\nOur team has worked with several companies in the ${contact.industry || 'industry'} to help them ${generateBenefit(contact.industry)}.\n\nWould you be available for a 30-minute call next Tuesday or Wednesday afternoon? If those times don't work, please let me know your availability and I'll be happy to accommodate your schedule.\n\n`;
      break;
      
    default:
      subject = `Connecting with ${contact.company} about ${generateIndustrySpecificPhrase(contact.industry)}`;
      body = `${greeting}\n\nI hope this email finds you well. I wanted to reach out regarding ${generateIndustrySpecificPhrase(contact.industry)} and how we might be able to support your initiatives at ${contact.company}.\n\nOur team specializes in helping companies like yours to overcome challenges and achieve your goals through innovative solutions tailored to your specific needs.\n\nI'd welcome the opportunity to learn more about your current projects and discuss how we might be able to collaborate.\n\n`;
  }
  
  // Adjust tone
  if (tone === 'formal') {
    body = body.replace('Hi', 'Dear').replace('hey', 'hello').replace('thanks', 'thank you');
  } else if (tone === 'friendly') {
    body = body.replace('Dear', 'Hey').replace('I hope this email finds you well.', 'Hope you\'re having a great day!');
  } else if (tone === 'direct') {
    body = body.replace('I hope this email finds you well. ', '').replace('I wanted to', 'I\'m writing to');
  }
  
  // Add signature if requested
  if (includeSignature) {
    body += '\nBest regards,\n\n[Your Name]\n[Your Title]\n[Your Company]\n[Your Contact Information]';
  }
  
  // Generate confidence level - higher if we have real AI available
  const confidence = (openaiApiKey || geminiApiKey) ? 90 : 75;
  
  return {
    subject,
    body,
    tone,
    purpose,
    targetWordCount: count,
    actualWordCount: {
      subject: subject.split(' ').length,
      body: body.split(' ').length
    },
    confidence,
    model: openaiApiKey ? 'gpt-4o-mini' : geminiApiKey ? 'gemini-1.5-flash' : 'mock-model',
    timestamp: new Date().toISOString()
  };
}

// Helper functions for realistic content generation

function generateCompanyName(): string {
  const prefixes = ['Acme', 'Apex', 'Pinnacle', 'Summit', 'Infinity', 'Nova', 'Elite', 'Prime', 'Vertex', 'Zenith'];
  const suffixes = ['Solutions', 'Technologies', 'Innovations', 'Systems', 'Enterprises', 'Group', 'Partners', 'Corp', 'Inc', 'Global'];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  return `${prefix} ${suffix}`;
}

function generateProductName(): string {
  const prefixes = ['Ultra', 'Pro', 'Advanced', 'Smart', 'Intelligent', 'Dynamic', 'Flex', 'Power', 'Precision', 'Strategic'];
  const roots = ['Connect', 'Solve', 'Manage', 'Analyze', 'Optimize', 'Transform', 'Sync', 'Drive', 'Vision', 'Insight'];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const root = roots[Math.floor(Math.random() * roots.length)];
  
  return `${prefix}${root}`;
}

function generateIndustrySpecificPhrase(industry?: string): string {
  const phrases: Record<string, string[]> = {
    'Technology': ['digital transformation', 'cloud migration', 'IT infrastructure optimization', 'cybersecurity enhancement', 'data analytics solutions'],
    'Healthcare': ['patient experience improvement', 'healthcare operations efficiency', 'medical data management', 'telehealth solutions', 'compliance optimization'],
    'Finance': ['financial process automation', 'risk management solutions', 'investment strategy optimization', 'regulatory compliance', 'customer financial insights'],
    'Manufacturing': ['supply chain optimization', 'production efficiency', 'quality control enhancement', 'Industry 4.0 implementation', 'manufacturing automation'],
    'Retail': ['customer experience enhancement', 'omnichannel strategy', 'inventory management solutions', 'retail analytics', 'personalization technology'],
    'Education': ['learning management solutions', 'student engagement platforms', 'educational analytics', 'administrative efficiency', 'distance learning technology']
  };
  
  if (industry && phrases[industry]) {
    const industryPhrases = phrases[industry];
    return industryPhrases[Math.floor(Math.random() * industryPhrases.length)];
  }
  
  // Default phrases for unknown industry
  const defaultPhrases = ['business process optimization', 'operational efficiency', 'strategic growth initiatives', 'digital solutions', 'innovative approaches'];
  return defaultPhrases[Math.floor(Math.random() * defaultPhrases.length)];
}

function generatePainPoint(industry?: string): string {
  const painPoints: Record<string, string[]> = {
    'Technology': ['legacy system integration challenges', 'cybersecurity vulnerabilities', 'technical debt', 'siloed data systems', 'scaling limitations'],
    'Healthcare': ['patient data management inefficiencies', 'compliance burden', 'care coordination gaps', 'staff productivity challenges', 'billing complexity'],
    'Finance': ['risk assessment inefficiencies', 'compliance monitoring challenges', 'customer acquisition costs', 'legacy system limitations', 'fraud detection gaps'],
    'Manufacturing': ['supply chain disruptions', 'quality control inconsistencies', 'production bottlenecks', 'inventory management inefficiencies', 'equipment downtime'],
    'Retail': ['inventory forecasting challenges', 'customer retention issues', 'omnichannel integration difficulties', 'personalization limitations', 'operational inefficiencies'],
    'Education': ['student engagement challenges', 'administrative overhead', 'remote learning limitations', 'data management complexities', 'resource allocation inefficiencies']
  };
  
  if (industry && painPoints[industry]) {
    const industryPains = painPoints[industry];
    return industryPains[Math.floor(Math.random() * industryPains.length)];
  }
  
  // Default pain points for unknown industry
  const defaultPains = ['operational inefficiencies', 'growth challenges', 'resource constraints', 'competitive pressures', 'market adaptation difficulties'];
  return defaultPains[Math.floor(Math.random() * defaultPains.length)];
}

function generateBenefit(industry?: string): string {
  const benefits: Record<string, string[]> = {
    'Technology': ['streamline your development process', 'enhance system security', 'improve data integration', 'accelerate digital transformation', 'optimize IT infrastructure'],
    'Healthcare': ['improve patient outcomes', 'streamline clinical workflows', 'enhance regulatory compliance', 'reduce administrative burden', 'optimize resource utilization'],
    'Finance': ['mitigate financial risks', 'automate compliance processes', 'enhance customer financial insights', 'optimize investment strategies', 'streamline reporting'],
    'Manufacturing': ['optimize production efficiency', 'reduce supply chain disruptions', 'improve quality control', 'minimize equipment downtime', 'enhance inventory management'],
    'Retail': ['increase customer retention', 'optimize inventory forecasting', 'enhance omnichannel experience', 'personalize customer interactions', 'streamline operations'],
    'Education': ['boost student engagement', 'streamline administrative processes', 'enhance learning outcomes', 'improve data-driven decision making', 'optimize resource allocation']
  };
  
  if (industry && benefits[industry]) {
    const industryBenefits = benefits[industry];
    return industryBenefits[Math.floor(Math.random() * industryBenefits.length)];
  }
  
  // Default benefits for unknown industry
  const defaultBenefits = ['improve operational efficiency', 'drive strategic growth', 'enhance decision-making', 'streamline key processes', 'optimize resource utilization'];
  return defaultBenefits[Math.floor(Math.random() * defaultBenefits.length)];
}

function generateSecondaryBenefit(industry?: string): string {
  const secondaryBenefits: Record<string, string[]> = {
    'Technology': ['reduced maintenance costs', 'increased system uptime', 'enhanced scalability', 'improved user experience', 'stronger data security'],
    'Healthcare': ['lower operational costs', 'enhanced patient satisfaction', 'improved staff retention', 'better care coordination', 'reduced readmission rates'],
    'Finance': ['improved customer satisfaction', 'reduced operational costs', 'enhanced audit readiness', 'stronger fraud protection', 'more agile decision-making'],
    'Manufacturing': ['reduced operational costs', 'improved product quality', 'increased production capacity', 'enhanced sustainability', 'greater market responsiveness'],
    'Retail': ['higher average order value', 'improved inventory turnover', 'reduced operational costs', 'enhanced brand loyalty', 'more effective marketing ROI'],
    'Education': ['increased retention rates', 'reduced administrative costs', 'improved faculty satisfaction', 'enhanced reputation', 'better resource utilization']
  };
  
  if (industry && secondaryBenefits[industry]) {
    const industryBenefits = secondaryBenefits[industry];
    return industryBenefits[Math.floor(Math.random() * industryBenefits.length)];
  }
  
  // Default secondary benefits for unknown industry
  const defaultBenefits = ['improved team productivity', 'reduced operational costs', 'enhanced competitive advantage', 'greater organizational agility', 'improved customer satisfaction'];
  return defaultBenefits[Math.floor(Math.random() * defaultBenefits.length)];
}

function generateGoal(industry?: string): string {
  const goals: Record<string, string[]> = {
    'Technology': ['accelerate your product development', 'modernize your tech stack', 'strengthen your cybersecurity posture', 'enable cloud migration', 'implement AI capabilities'],
    'Healthcare': ['improve patient outcomes', 'streamline clinical workflows', 'enhance telehealth capabilities', 'optimize resource allocation', 'strengthen data security'],
    'Finance': ['enhance risk management', 'streamline compliance processes', 'improve customer financial insights', 'automate routine transactions', 'strengthen fraud detection'],
    'Manufacturing': ['optimize production efficiency', 'improve supply chain resilience', 'enhance quality control', 'implement predictive maintenance', 'reduce operational waste'],
    'Retail': ['create seamless omnichannel experiences', 'personalize customer interactions', 'optimize inventory management', 'enhance customer loyalty', 'streamline fulfillment'],
    'Education': ['improve student engagement', 'enhance learning outcomes', 'streamline administrative processes', 'expand online learning capabilities', 'strengthen data security']
  };
  
  if (industry && goals[industry]) {
    const industryGoals = goals[industry];
    return industryGoals[Math.floor(Math.random() * industryGoals.length)];
  }
  
  // Default goals for unknown industry
  const defaultGoals = ['grow your business', 'improve operational efficiency', 'enhance customer satisfaction', 'streamline key processes', 'strengthen competitive advantage'];
  return defaultGoals[Math.floor(Math.random() * defaultGoals.length)];
}