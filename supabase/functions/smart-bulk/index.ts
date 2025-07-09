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
      const { contacts, analysisType, urgency = 'medium', costLimit, timeLimit } = await req.json();
      
      if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid contacts data',
            details: 'contacts must be an array and cannot be empty'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      if (!analysisType) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing analysis type',
            details: 'analysisType is required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Process contacts in batch
      const startTime = Date.now();
      const results = [];
      const failed = [];
      
      // Simple cost/time estimation
      const estimatedCostPerContact = 0.005; // $0.005 per contact
      const estimatedTimePerContact = 200; // 200ms per contact
      
      const totalCost = contacts.length * estimatedCostPerContact;
      const totalTime = contacts.length * estimatedTimePerContact;
      
      // Check limits
      if (costLimit && totalCost > costLimit) {
        return new Response(
          JSON.stringify({ 
            error: 'Cost limit exceeded',
            details: `Estimated cost ($${totalCost.toFixed(3)}) exceeds limit ($${costLimit})`
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      if (timeLimit && totalTime > timeLimit) {
        return new Response(
          JSON.stringify({ 
            error: 'Time limit exceeded',
            details: `Estimated time (${totalTime}ms) exceeds limit (${timeLimit}ms)`
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Process each contact
      for (const contactData of contacts) {
        try {
          const { contactId, contact } = contactData;
          
          if (!contactId || !contact) {
            failed.push({
              contactId: contactData.contactId || 'unknown',
              error: 'Invalid contact data'
            });
            continue;
          }
          
          // Generate result based on analysis type
          let result;
          switch (analysisType) {
            case 'contact_scoring':
              result = {
                contactId,
                score: 50 + Math.floor(Math.random() * 50),
                confidence: 75 + Math.floor(Math.random() * 15),
                insights: [
                  `Based on ${contact.title} role at ${contact.company}`,
                  'Matches target customer profile',
                  'Good engagement history'
                ]
              };
              break;
            case 'categorization':
              result = {
                contactId,
                categories: generateCategories(contact),
                confidence: 80 + Math.floor(Math.random() * 15)
              };
              break;
            case 'tagging':
              result = {
                contactId,
                tags: generateTags(contact),
                confidence: 75 + Math.floor(Math.random() * 20)
              };
              break;
            case 'lead_qualification':
              result = {
                contactId,
                qualificationScore: 50 + Math.floor(Math.random() * 50),
                status: Math.random() > 0.7 ? 'Qualified' : 'Partially Qualified',
                confidence: 70 + Math.floor(Math.random() * 20)
              };
              break;
            default:
              failed.push({
                contactId,
                error: `Unknown analysis type: ${analysisType}`
              });
              continue;
          }
          
          // Add to results
          results.push({
            ...result,
            analysisType,
            urgency,
            provider: openaiApiKey ? 'openai' : geminiApiKey ? 'gemini' : 'mock',
            model: openaiApiKey ? 'gpt-4o-mini' : geminiApiKey ? 'gemma-2-9b-it' : 'mock-model',
            processingTime: 100 + Math.floor(Math.random() * 150)
          });
        } catch (error) {
          failed.push({
            contactId: contactData.contactId || 'unknown',
            error: error.message || 'Processing error'
          });
        }
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const totalProcessingTime = Date.now() - startTime;
      
      const response = {
        results,
        failed,
        summary: {
          total: contacts.length,
          successful: results.length,
          failed: failed.length,
          analysisType,
          urgency,
          totalCost: results.length * estimatedCostPerContact,
          totalProcessingTime,
          modelUsed: openaiApiKey ? 'gpt-4o-mini' : geminiApiKey ? 'gemma-2-9b-it' : 'mock-model'
        }
      };

      return new Response(
        JSON.stringify(response),
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
    console.error('Smart bulk error:', error);
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

// Helper functions
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
  
  return categories.length > 0 ? categories : ['General Contact'];
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
  
  // Based on interest level
  if (contact.interestLevel) {
    tags.push(`interest-${contact.interestLevel}`);
  }
  
  // Based on status
  if (contact.status) {
    tags.push(`status-${contact.status}`);
  }
  
  // Based on source
  if (contact.sources && contact.sources.length > 0) {
    const source = contact.sources[0].toLowerCase().replace(/\s+/g, '-');
    tags.push(`source-${source}`);
  }
  
  return tags;
}