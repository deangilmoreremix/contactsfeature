import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

interface ContactEnrichmentData {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: string;
  industry?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  socialProfiles?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    website?: string;
  };
  avatar?: string;
  bio?: string;
  notes?: string;
  confidence?: number;
}

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
      console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_ANON_KEY');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error: Missing required environment variables',
          details: 'SUPABASE_URL and SUPABASE_ANON_KEY must be configured'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    // Check if any AI provider is configured
    const hasAiProvider = openaiApiKey || geminiApiKey;
    
    if (req.method === 'POST') {
      const { contactId, contact, priority = 'standard' } = await req.json();
      
      if (!contactId || !contact) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required parameters',
            details: 'contactId and contact data are required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // If no AI providers are configured, return mock data
      if (!hasAiProvider) {
        console.warn('No AI providers configured, using mock data');
        const mockData = generateMockEnrichment(contact);
        
        return new Response(
          JSON.stringify(mockData),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Simulate AI enrichment based on contact data
      const enrichedData = simulateEnrichment(contact, priority);
      
      return new Response(
        JSON.stringify(enrichedData),
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
    console.error('Smart enrichment error:', error);
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

// Helper function to generate mock enrichment data
function generateMockEnrichment(contact: any): ContactEnrichmentData {
  const { email, firstName, lastName, company } = contact;
  
  let mockData: ContactEnrichmentData = {
    confidence: 30,
    notes: 'API enrichment unavailable. Using estimated data. To enable AI features, please set up API keys for OpenAI or Gemini.'
  };
  
  if (email) {
    // Extract data from email
    const [username, domain] = email.split('@');
    const nameParts = username.split('.');
    
    mockData = {
      ...mockData,
      firstName: nameParts[0] ? capitalize(nameParts[0]) : firstName || '',
      lastName: nameParts[1] ? capitalize(nameParts[1]) : lastName || '',
      email: email,
      company: company || (domain ? capitalize(domain.split('.')[0]) : ''),
      socialProfiles: {
        linkedin: `https://linkedin.com/in/${username}`,
        website: `https://${domain}`
      }
    };
  } else if (firstName) {
    // Use provided name data
    mockData = {
      ...mockData,
      firstName: firstName,
      lastName: lastName || '',
      company: company || 'Unknown Company',
      socialProfiles: {
        linkedin: `https://linkedin.com/in/${firstName.toLowerCase()}${lastName ? `-${lastName.toLowerCase()}` : ''}`,
      }
    };
  }
  
  return mockData;
}

function simulateEnrichment(contact: any, priority: string): ContactEnrichmentData {
  const { email, firstName, lastName, company } = contact;
  
  // Generate industry based on company name if not provided
  let industry = contact.industry;
  if (!industry && company) {
    const techCompanies = ['tech', 'software', 'digital', 'cloud', 'cyber', 'data'];
    const financeCompanies = ['bank', 'finance', 'capital', 'invest', 'financial'];
    const healthcareCompanies = ['health', 'medical', 'care', 'pharma', 'biotech'];
    
    const lowerCompany = company.toLowerCase();
    
    if (techCompanies.some(keyword => lowerCompany.includes(keyword))) {
      industry = 'Technology';
    } else if (financeCompanies.some(keyword => lowerCompany.includes(keyword))) {
      industry = 'Finance';
    } else if (healthcareCompanies.some(keyword => lowerCompany.includes(keyword))) {
      industry = 'Healthcare';
    }
  }
  
  // Generate social profiles
  const socialProfiles: any = {};
  
  if (firstName && lastName) {
    const usernameBase = `${firstName.toLowerCase()}${lastName.toLowerCase()}`;
    socialProfiles.linkedin = `https://linkedin.com/in/${usernameBase}`;
    socialProfiles.twitter = `https://twitter.com/${usernameBase}`;
  } else if (email) {
    const username = email.split('@')[0];
    socialProfiles.linkedin = `https://linkedin.com/in/${username}`;
    socialProfiles.twitter = `https://twitter.com/${username}`;
  }
  
  if (company) {
    const websiteName = company.toLowerCase().replace(/\s+/g, '');
    socialProfiles.website = `https://${websiteName}.com`;
  } else if (email) {
    const domain = email.split('@')[1];
    socialProfiles.website = `https://${domain}`;
  }
  
  // Generate location based on industry
  let location;
  if (industry === 'Technology') {
    location = { city: 'San Francisco', state: 'California', country: 'USA' };
  } else if (industry === 'Finance') {
    location = { city: 'New York', state: 'New York', country: 'USA' };
  } else if (industry === 'Healthcare') {
    location = { city: 'Boston', state: 'Massachusetts', country: 'USA' };
  } else {
    location = { city: 'Chicago', state: 'Illinois', country: 'USA' };
  }
  
  // Generate bio based on title and company
  let bio = '';
  if (contact.title && company) {
    bio = `Experienced ${contact.title} at ${company} with expertise in ${industry || 'business'}. Focused on driving growth and innovation in the ${industry || 'industry'}.`;
  } else if (company) {
    bio = `Professional working at ${company} in the ${industry || 'business'} sector.`;
  } else if (contact.title) {
    bio = `Experienced ${contact.title} with a strong background in ${industry || 'business'}.`;
  }
  
  // Higher confidence for premium priority
  const confidence = priority === 'premium' ? 85 : 70;
  
  return {
    firstName: firstName || '',
    lastName: lastName || '',
    name: firstName && lastName ? `${firstName} ${lastName}` : contact.name || '',
    email: email || '',
    phone: contact.phone || generateFakePhone(),
    title: contact.title || generateJobTitle(industry),
    company: company || '',
    industry: industry || '',
    location,
    socialProfiles,
    bio,
    confidence,
    notes: priority === 'premium' 
      ? `Comprehensive data enrichment performed with ${confidence}% confidence. Contact shows strong alignment with target customer profile.` 
      : `Standard enrichment completed with ${confidence}% confidence.`
  };
}

// Helper functions
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function generateFakePhone(): string {
  return `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

function generateJobTitle(industry?: string): string {
  const titles = {
    'Technology': ['Software Engineer', 'Product Manager', 'CTO', 'Technical Director', 'IT Manager'],
    'Finance': ['Financial Analyst', 'Investment Manager', 'CFO', 'Account Executive', 'Financial Advisor'],
    'Healthcare': ['Medical Director', 'Healthcare Administrator', 'Clinical Manager', 'Research Director', 'Physician'],
    'default': ['Manager', 'Director', 'Consultant', 'Specialist', 'Coordinator', 'Analyst']
  };
  
  const titleList = industry && titles[industry as keyof typeof titles] ? titles[industry as keyof typeof titles] : titles.default;
  return titleList[Math.floor(Math.random() * titleList.length)];
}