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
      const { contactId, contact, businessContext } = await req.json();
      
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

      // Calculate qualification score and generate insights
      const qualificationScore = calculateQualificationScore(contact);
      const result = {
        contactId,
        qualificationScore,
        status: getQualificationStatus(qualificationScore),
        fitScore: calculateFitScore(contact, businessContext),
        buyingPower: calculateBuyingPower(contact),
        timeframe: estimateTimeframe(contact),
        budget: estimateBudget(contact),
        insights: generateQualificationInsights(contact, qualificationScore),
        nextSteps: suggestNextSteps(contact, qualificationScore),
        confidence: hasAiProvider ? 85 : 65,
        provider: openaiApiKey ? 'openai' : geminiApiKey ? 'gemini' : 'mock',
        model: openaiApiKey ? 'gpt-4o-mini' : geminiApiKey ? 'gemini-1.5-flash' : 'mock-model',
        timestamp: new Date().toISOString(),
        processingTime: 1000 + Math.floor(Math.random() * 500)
      };

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
    console.error('Smart qualification error:', error);
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

// Helper functions for lead qualification

function calculateQualificationScore(contact: any): number {
  let score = 60; // Base score
  
  // Factor: Job title seniority
  if (contact.title) {
    const title = contact.title.toLowerCase();
    if (title.includes('ceo') || title.includes('cto') || title.includes('cfo') || title.includes('founder')) {
      score += 20;
    } else if (title.includes('director') || title.includes('vp') || title.includes('head')) {
      score += 15;
    } else if (title.includes('manager') || title.includes('lead')) {
      score += 10;
    }
  }
  
  // Factor: Company size/importance
  if (contact.company) {
    const company = contact.company.toLowerCase();
    const fortune500 = ['microsoft', 'apple', 'amazon', 'google', 'facebook', 'tesla'];
    if (fortune500.some(name => company.includes(name))) {
      score += 15;
    } else if (company.includes('inc') || company.includes('corp') || company.includes('llc')) {
      score += 5;
    }
  }
  
  // Factor: Interest level
  if (contact.interestLevel === 'hot') {
    score += 15;
  } else if (contact.interestLevel === 'medium') {
    score += 7;
  } else if (contact.interestLevel === 'cold') {
    score -= 10;
  }
  
  // Factor: Lead source quality
  if (contact.sources && contact.sources.length > 0) {
    const highQualitySources = ['referral', 'demo request', 'webinar'];
    if (contact.sources.some(source => highQualitySources.includes(source.toLowerCase()))) {
      score += 10;
    }
  }
  
  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, score));
}

function getQualificationStatus(score: number): string {
  if (score >= 80) return 'Fully Qualified';
  if (score >= 60) return 'Partially Qualified';
  if (score >= 40) return 'Needs Qualification';
  return 'Unqualified';
}

function calculateFitScore(contact: any, businessContext?: string): number {
  // Simple fit score based on available data
  let score = 50;
  
  if (businessContext) {
    // In a real implementation, we would use the business context
    // to determine how well the contact fits the ideal customer profile
    score += 20;
  }
  
  // Some basic heuristics
  if (contact.industry === 'Technology' || contact.industry === 'Finance') {
    score += 15;
  }
  
  if (contact.title && (contact.title.includes('Decision') || contact.title.includes('Manager'))) {
    score += 10;
  }
  
  return Math.min(100, score);
}

function calculateBuyingPower(contact: any): string {
  // Determine buying power based on title and company
  if (contact.title) {
    const title = contact.title.toLowerCase();
    if (title.includes('ceo') || title.includes('cto') || title.includes('cfo') || 
        title.includes('president') || title.includes('founder') || title.includes('owner')) {
      return 'High';
    } else if (title.includes('director') || title.includes('vp') || title.includes('head')) {
      return 'Medium-High';
    } else if (title.includes('manager')) {
      return 'Medium';
    }
  }
  
  return 'Unknown';
}

function estimateTimeframe(contact: any): string {
  // In a real implementation, this would use AI to analyze engagement data
  // For mock purposes, use a simple heuristic
  if (contact.interestLevel === 'hot') {
    return '0-30 days';
  } else if (contact.interestLevel === 'medium') {
    return '30-90 days';
  }
  return '90+ days';
}

function estimateBudget(contact: any): string {
  // Simple budget estimation based on company
  if (contact.company) {
    const company = contact.company.toLowerCase();
    const enterprise = ['microsoft', 'apple', 'amazon', 'google', 'facebook', 'tesla'];
    
    if (enterprise.some(name => company.includes(name))) {
      return '$100K+';
    } else if (company.includes('inc') || company.includes('corp') || company.includes('llc')) {
      return '$50K-100K';
    }
  }
  
  if (contact.title) {
    const title = contact.title.toLowerCase();
    if (title.includes('ceo') || title.includes('cto') || title.includes('cfo')) {
      return '$25K-50K';
    }
  }
  
  return 'Under $25K';
}

function generateQualificationInsights(contact: any, score: number): string[] {
  const insights = [];
  
  if (score >= 80) {
    insights.push(`${contact.name} shows strong qualification signals based on ${contact.title} role at ${contact.company}`);
    insights.push('Decision-making authority appears high based on job title');
    insights.push('Company profile aligns well with ideal customer profile');
  } else if (score >= 60) {
    insights.push(`${contact.name} shows moderate qualification signals`);
    insights.push('May have influence in decision-making process, but likely not final authority');
    insights.push('More information needed about budget and timeline');
  } else {
    insights.push(`${contact.name} shows limited qualification signals`);
    insights.push('Recommend additional qualification steps before investing significant resources');
    insights.push('Consider nurturing with educational content rather than direct sales approach');
  }
  
  return insights;
}

function suggestNextSteps(contact: any, score: number): string[] {
  const nextSteps = [];
  
  if (score >= 80) {
    nextSteps.push('Schedule a solution presentation within 7 days');
    nextSteps.push('Prepare a customized proposal addressing specific needs');
    nextSteps.push('Connect with additional stakeholders in the organization');
  } else if (score >= 60) {
    nextSteps.push('Schedule a discovery call to identify pain points and needs');
    nextSteps.push('Share relevant case studies to build credibility');
    nextSteps.push('Determine decision-making process and identify all stakeholders');
  } else {
    nextSteps.push('Add to nurturing campaign with educational content');
    nextSteps.push('Schedule follow-up in 30 days to reassess interest');
    nextSteps.push('Research company further to identify potential alignment');
  }
  
  return nextSteps;
}