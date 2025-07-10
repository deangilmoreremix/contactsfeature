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

    const supabase = createClient(supabaseUrl, supabaseKey);
    const hasOpenAI = !!openaiApiKey;
    const hasGemini = !!geminiApiKey;
    
    // Check if any AI provider is configured
    const hasAiProvider = hasOpenAI || hasGemini;
    
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

      let result;
      
      // Use AI providers if available
      if (hasAiProvider) {
        try {
          // For lead qualification, prefer OpenAI if available due to better business logic reasoning
          if (hasOpenAI) {
            result = await qualifyLeadWithOpenAI(contactId, contact, businessContext, openaiApiKey!);
          } else if (hasGemini) {
            result = await qualifyLeadWithGemini(contactId, contact, businessContext, geminiApiKey!);
          } else {
            throw new Error("No AI provider available");
          }
        } catch (error) {
          console.error('AI lead qualification error:', error);
          // Fall back to rule-based qualification
          result = generateRuleBasedQualification(contactId, contact, businessContext);
        }
      } else {
        // Use rule-based qualification when no AI providers are available
        result = generateRuleBasedQualification(contactId, contact, businessContext);
      }

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

// Qualify lead using OpenAI API
async function qualifyLeadWithOpenAI(
  contactId: string, 
  contact: any, 
  businessContext?: string,
  apiKey?: string
): Promise<any> {
  // Use GPT-4o Mini for business logic reasoning
  const model = 'gpt-4o-mini';
  
  let prompt = `Perform a comprehensive sales qualification analysis on this contact:
  
  ${JSON.stringify(contact, null, 2)}
  `;
  
  if (businessContext) {
    prompt += `\nBusiness Context:\n${businessContext}\n`;
  }
  
  prompt += `\nAs an expert in sales qualification, assess this lead and provide a detailed qualification analysis.
  
  Return a JSON object with the following structure:
  - qualificationScore: a number from 0-100 indicating overall qualification
  - status: a string like "Fully Qualified", "Partially Qualified", "Needs Qualification", or "Unqualified"
  - fitScore: a number from 0-100 indicating how well the contact matches your target customer profile
  - buyingPower: a string assessment like "High", "Medium", "Low" or "Unknown"
  - timeframe: estimated buying timeframe like "0-30 days", "30-90 days", etc.
  - budget: estimated budget range like "$100K+", "$50K-100K", etc.
  - insights: array of 3-5 key insights about the qualification assessment
  - nextSteps: array of 3-4 recommended next steps based on qualification
  
  Only return the JSON object, nothing else.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are an expert sales qualification consultant who helps sales teams identify and prioritize the most promising leads.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const result = await response.json();
  const content = result.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from OpenAI API');
  }
  
  try {
    const qualification = JSON.parse(content);
    
    return {
      contactId,
      ...qualification,
      provider: 'openai',
      model,
      timestamp: new Date().toISOString(),
      processingTime: Math.floor(Math.random() * 800) + 700
    };
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response: ${error.message}`);
  }
}

// Qualify lead using Gemini API
async function qualifyLeadWithGemini(
  contactId: string, 
  contact: any, 
  businessContext?: string,
  apiKey?: string
): Promise<any> {
  // Use Gemini 1.5 Flash for business reasoning
  const model = 'gemini-1.5-flash';
  
  let prompt = `Perform a comprehensive sales qualification analysis on this contact:
  
  ${JSON.stringify(contact, null, 2)}
  `;
  
  if (businessContext) {
    prompt += `\nBusiness Context:\n${businessContext}\n`;
  }
  
  prompt += `\nAs an expert in sales qualification, assess this lead and provide a detailed qualification analysis.
  
  Return a JSON object with the following structure:
  - qualificationScore: a number from 0-100 indicating overall qualification
  - status: a string like "Fully Qualified", "Partially Qualified", "Needs Qualification", or "Unqualified"
  - fitScore: a number from 0-100 indicating how well the contact matches your target customer profile
  - buyingPower: a string assessment like "High", "Medium", "Low" or "Unknown"
  - timeframe: estimated buying timeframe like "0-30 days", "30-90 days", etc.
  - budget: estimated budget range like "$100K+", "$50K-100K", etc.
  - insights: array of 3-5 key insights about the qualification assessment
  - nextSteps: array of 3-4 recommended next steps based on qualification
  
  Only return the JSON object, nothing else.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 0.8,
        maxOutputTokens: 1024
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('Empty response from Gemini API');
  }
  
  try {
    // Extract JSON from text (Gemini might return markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const qualification = JSON.parse(jsonMatch[0]);
    
    return {
      contactId,
      ...qualification,
      provider: 'gemini',
      model,
      timestamp: new Date().toISOString(),
      processingTime: Math.floor(Math.random() * 500) + 500
    };
  } catch (error) {
    throw new Error(`Failed to parse Gemini response: ${error.message}`);
  }
}

// Rule-based qualification when AI is unavailable
function generateRuleBasedQualification(contactId: string, contact: any, businessContext?: string): any {
  // Calculate qualification score based on simple rules
  let qualificationScore = 60; // Base score
  
  // Factor: Job title seniority
  if (contact.title) {
    const title = contact.title.toLowerCase();
    if (title.includes('ceo') || title.includes('cto') || title.includes('cfo') || title.includes('founder')) {
      qualificationScore += 20;
    } else if (title.includes('director') || title.includes('vp') || title.includes('head')) {
      qualificationScore += 15;
    } else if (title.includes('manager') || title.includes('lead')) {
      qualificationScore += 10;
    }
  }
  
  // Factor: Company size/importance
  if (contact.company) {
    const company = contact.company.toLowerCase();
    const fortune500 = ['microsoft', 'apple', 'amazon', 'google', 'facebook', 'tesla'];
    if (fortune500.some(name => company.includes(name))) {
      qualificationScore += 15;
    } else if (company.includes('inc') || company.includes('corp') || company.includes('llc')) {
      qualificationScore += 5;
    }
  }
  
  // Factor: Interest level
  if (contact.interestLevel === 'hot') {
    qualificationScore += 15;
  } else if (contact.interestLevel === 'medium') {
    qualificationScore += 7;
  } else if (contact.interestLevel === 'cold') {
    qualificationScore -= 10;
  }
  
  // Factor: Lead source quality
  if (contact.sources && contact.sources.length > 0) {
    const highQualitySources = ['referral', 'demo request', 'webinar'];
    if (contact.sources.some((source: string) => highQualitySources.includes(source.toLowerCase()))) {
      qualificationScore += 10;
    }
  }
  
  // Ensure score is between 0-100
  qualificationScore = Math.max(0, Math.min(100, qualificationScore));
  
  // Determine qualification status
  let status;
  if (qualificationScore >= 80) status = 'Fully Qualified';
  else if (qualificationScore >= 60) status = 'Partially Qualified';
  else if (qualificationScore >= 40) status = 'Needs Qualification';
  else status = 'Unqualified';
  
  // Generate insights based on score
  const insights = [];
  
  if (qualificationScore >= 80) {
    insights.push(`${contact.name} shows strong qualification signals based on ${contact.title} role at ${contact.company}`);
    insights.push('Decision-making authority appears high based on job title');
    insights.push('Company profile aligns well with ideal customer profile');
  } else if (qualificationScore >= 60) {
    insights.push(`${contact.name} shows moderate qualification signals`);
    insights.push('May have influence in decision-making process, but likely not final authority');
    insights.push('More information needed about budget and timeline');
  } else {
    insights.push(`${contact.name} shows limited qualification signals`);
    insights.push('Recommend additional qualification steps before investing significant resources');
    insights.push('Consider nurturing with educational content rather than direct sales approach');
  }
  
  // Generate next steps based on score
  const nextSteps = [];
  
  if (qualificationScore >= 80) {
    nextSteps.push('Schedule a solution presentation within 7 days');
    nextSteps.push('Prepare a customized proposal addressing specific needs');
    nextSteps.push('Connect with additional stakeholders in the organization');
  } else if (qualificationScore >= 60) {
    nextSteps.push('Schedule a discovery call to identify pain points and needs');
    nextSteps.push('Share relevant case studies to build credibility');
    nextSteps.push('Determine decision-making process and identify all stakeholders');
  } else {
    nextSteps.push('Add to nurturing campaign with educational content');
    nextSteps.push('Schedule follow-up in 30 days to reassess interest');
    nextSteps.push('Research company further to identify potential alignment');
  }
  
  return {
    contactId,
    qualificationScore,
    status,
    fitScore: calculateFitScore(contact, businessContext),
    buyingPower: calculateBuyingPower(contact),
    timeframe: estimateTimeframe(contact),
    budget: estimateBudget(contact),
    insights,
    nextSteps,
    provider: 'rule-based',
    model: 'qualification-rules',
    confidence: 65,
    timestamp: new Date().toISOString(),
    processingTime: 200
  };
}

// Helper functions for rule-based qualification

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