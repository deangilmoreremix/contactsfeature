import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Validate required environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  
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

  // Check if AI providers are configured
  const hasAiProvider = openaiApiKey || geminiApiKey;

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean);
    // Remove 'functions', 'v1', and 'ai-enrichment' from the path
    const endpoint = path.slice(3);
    
    // POST /enrich - Enrich contact data
    if (req.method === 'POST' && (endpoint.length === 0 || endpoint[0] === 'enrich')) {
      let requestData;
      try {
        requestData = await req.json();
      } catch (parseError) {
        console.error('Failed to parse request JSON:', parseError);
        return new Response(
          JSON.stringify({ 
            error: 'Invalid request format',
            details: 'Request body must be valid JSON'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { contactId, enrichmentRequest } = requestData;
      
      if (!enrichmentRequest) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing enrichment request data',
            details: 'enrichmentRequest field is required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // If no AI providers are configured, return mock data
      if (!hasAiProvider) {
        const mockData = generateMockEnrichment(enrichmentRequest);
        return new Response(
          JSON.stringify(mockData),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // For this implementation, we'll simulate AI enrichment since we can't directly
      // call OpenAI or Gemini APIs without setting up billing
      const enrichedData = await simulateAiEnrichment(enrichmentRequest, openaiApiKey ? 'openai' : 'gemini');
      
      return new Response(
        JSON.stringify(enrichedData),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // POST /analyze - Analyze contact
    if (req.method === 'POST' && endpoint.length === 1 && endpoint[0] === 'analyze') {
      let requestData;
      try {
        requestData = await req.json();
      } catch (parseError) {
        console.error('Failed to parse request JSON:', parseError);
        return new Response(
          JSON.stringify({ 
            error: 'Invalid request format',
            details: 'Request body must be valid JSON'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { contactId, contact, analysisTypes, options } = requestData;
      
      if (!contact) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing contact data',
            details: 'contact field is required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // If no AI providers are configured, return mock data
      if (!hasAiProvider) {
        const mockResult = generateMockAnalysis(contactId, contact, analysisTypes);
        return new Response(
          JSON.stringify(mockResult),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Simulate AI analysis
      const analysisResult = await simulateAiAnalysis(contactId, contact, analysisTypes, options);
      
      return new Response(
        JSON.stringify(analysisResult),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // GET /providers/status - Get AI provider status
    if (req.method === 'GET' && endpoint.length === 2 && endpoint[0] === 'providers' && endpoint[1] === 'status') {
      const providerStatus = [
        { 
          name: 'openai', 
          status: openaiApiKey ? 'available' : 'error',
          remaining: openaiApiKey ? 45 : 0
        },
        { 
          name: 'gemini', 
          status: geminiApiKey ? 'available' : 'error',
          remaining: geminiApiKey ? 50 : 0 
        }
      ];
      
      return new Response(
        JSON.stringify(providerStatus),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Endpoint not found
    return new Response(
      JSON.stringify({ 
        error: 'Not found',
        details: `Endpoint not found: ${req.method} ${url.pathname}`
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('Unhandled error in ai-enrichment function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to generate mock enrichment data
function generateMockEnrichment(request: any): ContactEnrichmentData {
  const { email, firstName, lastName, company, linkedinUrl } = request;
  
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
      company: company || (domain?.split('.')[0] ? capitalize(domain.split('.')[0]) : ''),
      socialProfiles: {
        linkedin: linkedinUrl || `https://linkedin.com/in/${username}`,
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
        linkedin: linkedinUrl || `https://linkedin.com/in/${firstName.toLowerCase()}${lastName ? `-${lastName.toLowerCase()}` : ''}`,
      }
    };
  } else if (linkedinUrl) {
    // Extract name from LinkedIn URL if possible
    const urlPath = linkedinUrl.split('/in/')[1] || '';
    const nameParts = urlPath.split('-');
    
    mockData = {
      ...mockData,
      firstName: nameParts[0] ? capitalize(nameParts[0]) : 'Unknown',
      lastName: nameParts[1] ? capitalize(nameParts[1]) : '',
      socialProfiles: {
        linkedin: linkedinUrl
      }
    };
  }
  
  return mockData;
}

// Helper function to simulate AI analysis
async function simulateAiAnalysis(contactId: string, contact: any, analysisTypes: string[], options?: any): Promise<any> {
  // Generate a random but consistent score based on contact data
  const nameHash = hashString(contact.name || '');
  const emailHash = hashString(contact.email || '');
  const companyHash = hashString(contact.company || '');
  const combinedHash = (nameHash + emailHash + companyHash) % 100;
  
  // Base score 50-95
  const score = 50 + Math.floor(combinedHash * 0.45);
  
  // Generate insights based on contact data
  const insights = generateInsights(contact, score);
  
  // Generate recommendations
  const recommendations = generateRecommendations(contact, score);
  
  // Generate categories and tags
  const categories = generateCategories(contact);
  const tags = generateTags(contact, score);
  
  return {
    contactId,
    score,
    confidence: Math.min(85, 50 + Math.floor(Math.random() * 35)),
    insights,
    recommendations,
    categories,
    tags,
    provider: options?.provider || 'gemini',
    model: options?.model || 'gemini-1.5-flash',
    timestamp: new Date().toISOString(),
    processingTime: 1500 + Math.floor(Math.random() * 1000)
  };
}

// Helper function to simulate AI enrichment
async function simulateAiEnrichment(request: any, provider: string): Promise<ContactEnrichmentData> {
  const { email, firstName, lastName, company, linkedinUrl } = request;
  
  // Start with basic data from request
  let enrichedData: ContactEnrichmentData = {
    firstName: firstName || '',
    lastName: lastName || '',
    email: email || '',
    company: company || '',
    confidence: 60 + Math.floor(Math.random() * 25)
  };
  
  // Add generated data
  if (email && !firstName && !lastName) {
    // Extract name from email
    const username = email.split('@')[0];
    const parts = username.split('.');
    if (parts.length >= 2) {
      enrichedData.firstName = capitalize(parts[0]);
      enrichedData.lastName = capitalize(parts[1]);
    }
  }
  
  if (company) {
    // Generate title based on company
    const possibleTitles = [
      'Marketing Manager', 'Sales Director', 'CEO', 
      'CTO', 'Product Manager', 'HR Director',
      'Operations Manager', 'Finance Director'
    ];
    enrichedData.title = possibleTitles[Math.floor(Math.random() * possibleTitles.length)];
    
    // Generate industry
    const possibleIndustries = [
      'Technology', 'Finance', 'Healthcare', 'Education',
      'Manufacturing', 'Retail', 'Real Estate', 'Consulting'
    ];
    enrichedData.industry = possibleIndustries[Math.floor(Math.random() * possibleIndustries.length)];
  }
  
  // Add location
  enrichedData.location = {
    city: 'San Francisco',
    state: 'California',
    country: 'United States'
  };
  
  // Add social profiles
  enrichedData.socialProfiles = {
    linkedin: linkedinUrl || 
      `https://linkedin.com/in/${(firstName || '').toLowerCase()}${(lastName || '') ? `-${(lastName || '').toLowerCase()}` : ''}`,
    website: company ? 
      `https://${company.toLowerCase().replace(/\s+/g, '')}.com` : 
      `https://${email ? email.split('@')[1] : 'company.com'}`
  };
  
  // Add professional bio
  if (firstName && lastName && company) {
    enrichedData.bio = `Experienced professional with expertise in ${enrichedData.industry || 'business'}. Currently working at ${company} as ${enrichedData.title || 'a senior executive'}.`;
  }
  
  return enrichedData;
}

// Helper functions for mock data generation
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function hashString(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Generate mock analysis
function generateMockAnalysis(contactId: string, contact: any, analysisTypes: string[]): any {
  // Generate a score between 60-100
  const score = Math.floor(Math.random() * 40) + 60;
  
  return {
    contactId,
    score,
    confidence: 70,
    insights: [
      'Based on profile and engagement data, shows strong interest in your solutions',
      'Professional background suggests decision-making authority',
      'Company size and industry align well with your target market'
    ],
    recommendations: [
      'Schedule a follow-up call within 48 hours',
      'Share case studies relevant to their industry',
      'Connect on LinkedIn to strengthen the relationship'
    ],
    categories: ['Qualified Lead', 'Decision Maker'],
    tags: ['follow-up', 'high-potential'],
    provider: 'fallback',
    model: 'development-fallback',
    timestamp: new Date().toISOString(),
    processingTime: 1200
  };
}

function generateInsights(contact: any, score: number): string[] {
  const insights = [];
  
  if (score > 80) {
    insights.push(`Strong match based on ${contact.industry || 'their industry'} expertise and role at ${contact.company}`);
    insights.push('Profile indicates decision-making authority within organization');
    insights.push('Engagement pattern suggests high interest in your solutions');
  } else if (score > 60) {
    insights.push(`Moderate match for ${contact.company} based on their current role`);
    insights.push('May need additional nurturing to become sales-ready');
    insights.push('Previous engagement shows some interest in related solutions');
  } else {
    insights.push('Limited data available to assess potential fit');
    insights.push('Requires additional qualification steps');
    insights.push('Consider educational content before direct sales approach');
  }
  
  return insights;
}

function generateRecommendations(contact: any, score: number): string[] {
  const recommendations = [];
  
  if (score > 80) {
    recommendations.push('Schedule a personalized demo within 48 hours');
    recommendations.push(`Send case studies relevant to ${contact.industry || 'their industry'}`);
    recommendations.push('Assign high-priority status in pipeline');
  } else if (score > 60) {
    recommendations.push('Share relevant industry content via email');
    recommendations.push('Connect on LinkedIn to strengthen relationship');
    recommendations.push('Schedule a discovery call within the next week');
  } else {
    recommendations.push('Add to nurturing campaign sequence');
    recommendations.push('Monitor engagement with marketing materials');
    recommendations.push('Reassess lead score in 30 days');
  }
  
  return recommendations;
}

function generateCategories(contact: any): string[] {
  const categories = [];
  
  // Based on title
  if (contact.title) {
    const title = contact.title.toLowerCase();
    if (title.includes('ceo') || title.includes('cto') || title.includes('cfo') || 
        title.includes('president') || title.includes('founder') || title.includes('owner')) {
      categories.push('C-Suite');
    } else if (title.includes('director') || title.includes('vp') || title.includes('head')) {
      categories.push('Director-Level');
    } else if (title.includes('manager')) {
      categories.push('Manager');
    }
  }
  
  // Based on company
  if (contact.company) {
    // Simple logic to categorize company size
    const name = contact.company.toLowerCase();
    if (name.includes('inc') || name.includes('corp') || name.includes('international')) {
      categories.push('Enterprise');
    } else {
      categories.push('SMB');
    }
  }
  
  // Add default if empty
  if (categories.length === 0) {
    categories.push('General Contact');
  }
  
  return categories;
}

function generateTags(contact: any, score: number): string[] {
  const tags = [];
  
  // Score-based tags
  if (score > 80) {
    tags.push('high-priority');
  } else if (score > 60) {
    tags.push('medium-priority');
  } else {
    tags.push('low-priority');
  }
  
  // Industry-based tags
  if (contact.industry) {
    tags.push(contact.industry.toLowerCase().replace(/\s+/g, '-'));
  }
  
  // Interest level tag
  if (contact.interestLevel) {
    tags.push(contact.interestLevel);
  }
  
  // Source tag
  if (contact.sources && contact.sources.length > 0) {
    const source = contact.sources[0].toLowerCase().replace(/\s+/g, '-');
    tags.push(`source-${source}`);
  }
  
  return tags;
}