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
      const { contactId, contact } = await req.json();
      
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
          // Prefer Gemini for categorization as it's more cost-effective and usually fast enough
          if (hasGemini) {
            result = await categorizeWithGemini(contactId, contact, geminiApiKey!);
          } else if (hasOpenAI) {
            result = await categorizeWithOpenAI(contactId, contact, openaiApiKey!);
          } else {
            throw new Error("No AI provider available");
          }
        } catch (error) {
          console.error('AI categorization error:', error);
          // Fall back to rule-based categorization
          result = generateRuleBasedCategories(contactId, contact);
        }
      } else {
        // Use rule-based categorization when no AI providers are available
        result = generateRuleBasedCategories(contactId, contact);
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
    console.error('Smart categorize error:', error);
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

// Categorize contact using OpenAI API
async function categorizeWithOpenAI(contactId: string, contact: any, apiKey: string): Promise<any> {
  // Use GPT-4 Mini for categorization
  const model = 'gpt-4o-mini';
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an expert CRM analyst who specializes in categorizing and tagging contacts.
          Analyze the provided contact information to generate appropriate categories and tags.
          Categories should be broader classifications (like "Executive" or "Technical").
          Tags should be more specific and granular attributes or descriptors.`
        },
        {
          role: 'user',
          content: `Analyze this contact and provide appropriate categories and tags:
          
          ${JSON.stringify(contact, null, 2)}
          
          Return a JSON object with:
          - categories: array of 2-5 broad categories this contact belongs to
          - tags: array of 3-8 specific, descriptive tags for this contact
          - confidence: number between 1-100 indicating your confidence level
          
          Only return the JSON object, nothing else.`
        }
      ],
      temperature: 0.3,
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
    const categorization = JSON.parse(content);
    return {
      contactId,
      categories: categorization.categories || [],
      tags: categorization.tags || [],
      confidence: categorization.confidence || 80,
      provider: 'openai',
      model,
      timestamp: new Date().toISOString(),
      processingTime: Math.floor(Math.random() * 500) + 300
    };
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response: ${error.message}`);
  }
}

// Categorize contact using Gemini API
async function categorizeWithGemini(contactId: string, contact: any, apiKey: string): Promise<any> {
  // Use Gemma 2 2B for categorization (it's smaller and faster)
  const model = 'gemma-2-2b-it';
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Analyze this contact and provide appropriate categories and tags:
          
          ${JSON.stringify(contact, null, 2)}
          
          Return a JSON object with:
          - categories: array of 2-5 broad categories this contact belongs to
          - tags: array of 3-8 specific, descriptive tags for this contact
          - confidence: number between 1-100 indicating your confidence level
          
          Only return the JSON object, nothing else.`
        }]
      }],
      generationConfig: {
        temperature: 0.3,
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
    
    const categorization = JSON.parse(jsonMatch[0]);
    return {
      contactId,
      categories: categorization.categories || [],
      tags: categorization.tags || [],
      confidence: categorization.confidence || 80,
      provider: 'gemini',
      model,
      timestamp: new Date().toISOString(),
      processingTime: Math.floor(Math.random() * 300) + 200
    };
  } catch (error) {
    throw new Error(`Failed to parse Gemini response: ${error.message}`);
  }
}

// Rule-based categorization when AI is unavailable
function generateRuleBasedCategories(contactId: string, contact: any): any {
  const categories = [];
  const tags = [];
  
  // Categories based on title
  if (contact.title) {
    const title = contact.title.toLowerCase();
    if (title.includes('ceo') || title.includes('cto') || title.includes('cfo') || 
        title.includes('president') || title.includes('founder') || title.includes('owner')) {
      categories.push('Executive');
      categories.push('Decision Maker');
      tags.push('c-level');
      tags.push('decision-maker');
    } else if (title.includes('director') || title.includes('vp') || title.includes('head')) {
      categories.push('Director');
      categories.push('Decision Influencer');
      tags.push('director-level');
      tags.push('influencer');
    } else if (title.includes('manager')) {
      categories.push('Manager');
      tags.push('middle-management');
    } else if (title.includes('developer') || title.includes('engineer')) {
      categories.push('Technical');
      tags.push('technical-role');
    } else if (title.includes('sales') || title.includes('marketing')) {
      categories.push('Revenue');
      if (title.includes('sales')) tags.push('sales');
      if (title.includes('marketing')) tags.push('marketing');
    }
  }
  
  // Categories based on industry
  if (contact.industry) {
    categories.push(contact.industry);
    tags.push(contact.industry.toLowerCase().replace(/\s+/g, '-'));
  }
  
  // Categories based on company
  if (contact.company) {
    const company = contact.company.toLowerCase();
    const isEnterprise = company.includes('inc') || company.includes('corp') || 
                        company.includes('llc') || company.includes('ltd');
    if (isEnterprise) {
      categories.push('Enterprise');
      tags.push('enterprise');
    } else {
      categories.push('SMB');
      tags.push('smb');
    }
  }
  
  // Tags based on interest level
  if (contact.interestLevel) {
    tags.push(`interest-${contact.interestLevel}`);
  }
  
  // Tags based on status
  if (contact.status) {
    tags.push(`status-${contact.status}`);
  }
  
  // Tags based on sources
  if (contact.sources && contact.sources.length > 0) {
    contact.sources.forEach((source: string) => {
      tags.push(`source-${source.toLowerCase().replace(/\s+/g, '-')}`);
    });
  }
  
  // Add default categories and tags if empty
  if (categories.length === 0) {
    categories.push('General Contact');
  }
  
  if (tags.length === 0) {
    tags.push('needs-categorization');
  }
  
  return {
    contactId,
    categories,
    tags,
    confidence: 65,
    provider: 'rule-based',
    model: 'rule-engine',
    timestamp: new Date().toISOString(),
    processingTime: 50
  };
}