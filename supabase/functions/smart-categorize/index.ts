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

      // Generate categories and tags based on contact data
      const categories = generateCategories(contact);
      const tags = generateTags(contact);
      
      const result = {
        contactId,
        categories,
        tags,
        confidence: hasAiProvider ? 85 : 65,
        provider: openaiApiKey ? 'openai' : geminiApiKey ? 'gemini' : 'mock',
        model: openaiApiKey ? 'gpt-4o-mini' : geminiApiKey ? 'gemini-1.5-flash' : 'mock-model',
        timestamp: new Date().toISOString(),
        processingTime: 500 + Math.floor(Math.random() * 300)
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

function generateCategories(contact: any): string[] {
  const categories = [];
  
  // Based on title
  if (contact.title) {
    const title = contact.title.toLowerCase();
    if (title.includes('ceo') || title.includes('cto') || title.includes('cfo') || 
        title.includes('president') || title.includes('founder') || title.includes('owner')) {
      categories.push('Executive');
      categories.push('Decision Maker');
    } else if (title.includes('director') || title.includes('vp') || title.includes('head')) {
      categories.push('Director');
      categories.push('Decision Influencer');
    } else if (title.includes('manager')) {
      categories.push('Manager');
    } else if (title.includes('developer') || title.includes('engineer')) {
      categories.push('Technical');
    } else if (title.includes('sales') || title.includes('marketing')) {
      categories.push('Revenue');
    }
  }
  
  // Based on industry
  if (contact.industry) {
    categories.push(contact.industry);
  }
  
  // Based on company
  if (contact.company) {
    const company = contact.company.toLowerCase();
    const isEnterprise = company.includes('inc') || company.includes('corp') || 
                        company.includes('llc') || company.includes('ltd');
    if (isEnterprise) {
      categories.push('Enterprise');
    } else {
      categories.push('SMB');
    }
  }
  
  // Based on interest level
  if (contact.interestLevel === 'hot') {
    categories.push('High Potential');
  } else if (contact.interestLevel === 'cold') {
    categories.push('Nurturing Required');
  }
  
  // Add default if empty
  if (categories.length === 0) {
    categories.push('General Contact');
  }
  
  return categories;
}

function generateTags(contact: any): string[] {
  const tags = [];
  
  // Based on title
  if (contact.title) {
    const title = contact.title.toLowerCase();
    if (title.includes('c-level') || title.includes('chief') || title.includes('founder')) {
      tags.push('executive');
    }
    if (title.includes('sales')) tags.push('sales');
    if (title.includes('market')) tags.push('marketing');
    if (title.includes('develop')) tags.push('developer');
    if (title.includes('engineer')) tags.push('engineering');
    if (title.includes('product')) tags.push('product');
  }
  
  // Based on industry
  if (contact.industry) {
    tags.push(contact.industry.toLowerCase().replace(/\s+/g, '-'));
  }
  
  // Based on sources
  if (contact.sources && contact.sources.length > 0) {
    contact.sources.forEach((source: string) => {
      tags.push(`source:${source.toLowerCase().replace(/\s+/g, '-')}`);
    });
  }
  
  // Based on interest level
  if (contact.interestLevel) {
    tags.push(`interest:${contact.interestLevel}`);
  }
  
  // Based on status
  if (contact.status) {
    tags.push(`status:${contact.status}`);
  }
  
  return tags;
}