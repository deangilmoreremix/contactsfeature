import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  subject: string;
  body: string;
  variables: string[];
  category: string;
  isDefault?: boolean;
  created_at?: string;
  updated_at?: string;
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
    const url = new URL(req.url);
    const path = url.pathname.split('/');
    const endpoint = path[path.length - 1];

    // GET /email-templates - List all templates
    if (req.method === 'GET' && endpoint === 'email-templates') {
      const category = url.searchParams.get('category');
      
      // Normally we would query the database
      // Since we don't have a real DB connection, return mock templates
      const templates = getMockTemplates();
      
      // Filter by category if provided
      const filteredTemplates = category 
        ? templates.filter(t => t.category === category) 
        : templates;

      return new Response(
        JSON.stringify({
          templates: filteredTemplates,
          count: filteredTemplates.length
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // GET /email-templates/:id - Get single template
    if (req.method === 'GET' && path.length > 4) {
      const templateId = path[path.length - 1];
      
      // Normally we would query the database
      const templates = getMockTemplates();
      const template = templates.find(t => t.id === templateId);
      
      if (!template) {
        return new Response(
          JSON.stringify({ 
            error: 'Not found',
            details: `Template with ID ${templateId} not found`
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify(template),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // POST /email-templates - Create template
    if (req.method === 'POST' && endpoint === 'email-templates') {
      const templateData = await req.json();
      
      if (!templateData.name || !templateData.subject || !templateData.body) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields',
            details: 'name, subject, and body are required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // In a real implementation, we would save to the database
      // For mock purposes, we'll just return the template with an ID
      const newTemplate: EmailTemplate = {
        id: `template-${Date.now()}`,
        name: templateData.name,
        description: templateData.description || '',
        subject: templateData.subject,
        body: templateData.body,
        variables: templateData.variables || [],
        category: templateData.category || 'General',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return new Response(
        JSON.stringify(newTemplate),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // PUT /email-templates/:id - Update template
    if (req.method === 'PUT' && path.length > 4) {
      const templateId = path[path.length - 1];
      const templateData = await req.json();
      
      if (!templateData.name || !templateData.subject || !templateData.body) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields',
            details: 'name, subject, and body are required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // In a real implementation, we would update in the database
      // For mock purposes, we'll just return the updated template
      const updatedTemplate: EmailTemplate = {
        id: templateId,
        name: templateData.name,
        description: templateData.description || '',
        subject: templateData.subject,
        body: templateData.body,
        variables: templateData.variables || [],
        category: templateData.category || 'General',
        updated_at: new Date().toISOString()
      };

      return new Response(
        JSON.stringify(updatedTemplate),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // DELETE /email-templates/:id - Delete template
    if (req.method === 'DELETE' && path.length > 4) {
      const templateId = path[path.length - 1];
      
      // In a real implementation, we would delete from the database
      // For mock purposes, just return success

      return new Response(
        null,
        {
          status: 204,
          headers: corsHeaders,
        }
      );
    }

    // Endpoint not found
    return new Response(
      JSON.stringify({
        error: 'Not found',
        details: 'Endpoint not found'
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Email templates error:', error);
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

function getMockTemplates(): EmailTemplate[] {
  return [
    {
      id: "template-1",
      name: "Introduction Email",
      description: "First outreach to a new prospect",
      subject: "Introduction from {{company_name}}",
      body: "Hi {{first_name}},\n\nI hope this email finds you well. I'm reaching out because I believe our solutions at {{company_name}} could help address the challenges you might be facing at {{client_company}}.\n\nWould you be open to a brief call to discuss how we might be able to help?\n\nBest regards,\n{{sender_name}}\n{{sender_title}}\n{{company_name}}",
      variables: ["first_name", "company_name", "client_company", "sender_name", "sender_title"],
      category: "Prospecting",
      isDefault: true,
      created_at: "2023-01-15T00:00:00Z",
      updated_at: "2023-01-15T00:00:00Z"
    },
    {
      id: "template-2",
      name: "Follow-up After Meeting",
      description: "Send after initial sales call or meeting",
      subject: "Thank you for your time, {{first_name}}",
      body: "Hi {{first_name}},\n\nThank you for taking the time to meet with me today. I really enjoyed learning more about {{client_company}} and your role there.\n\nAs promised, I'm sending over the additional information about our {{product_name}} that we discussed. I've also included a case study that I think you'll find relevant.\n\nPlease let me know if you have any questions. I'm looking forward to our next conversation.\n\nBest regards,\n{{sender_name}}\n{{sender_title}}\n{{company_name}}",
      variables: ["first_name", "client_company", "product_name", "sender_name", "sender_title", "company_name"],
      category: "Follow-up",
      isDefault: true,
      created_at: "2023-01-15T00:00:00Z",
      updated_at: "2023-01-15T00:00:00Z"
    },
    {
      id: "template-3",
      name: "Proposal Email",
      description: "Email to accompany a formal proposal",
      subject: "{{client_company}} - Proposal for {{solution_type}}",
      body: "Dear {{first_name}},\n\nThank you for the opportunity to present this proposal for {{client_company}}.\n\nBased on our discussions, I've attached a comprehensive proposal that addresses your needs regarding {{pain_point}}. Our solution will help you {{benefit_1}} while ensuring {{benefit_2}}.\n\nThe proposal includes detailed pricing information, implementation timeline, and expected outcomes. I'd be happy to schedule a call to walk through the details and answer any questions you might have.\n\nI look forward to your feedback.\n\nBest regards,\n{{sender_name}}\n{{sender_title}}\n{{company_name}}\n{{sender_phone}}",
      variables: ["first_name", "client_company", "solution_type", "pain_point", "benefit_1", "benefit_2", "sender_name", "sender_title", "company_name", "sender_phone"],
      category: "Proposal",
      isDefault: true,
      created_at: "2023-01-15T00:00:00Z",
      updated_at: "2023-01-15T00:00:00Z"
    },
    {
      id: "template-4",
      name: "Re-engagement Email",
      description: "Reach out to dormant prospects",
      subject: "Checking in - {{client_company}}",
      body: "Hi {{first_name}},\n\nIt's been a while since we last connected, and I wanted to reach out to see how things are going at {{client_company}}.\n\nSince we last spoke, we've launched several new features that I believe would address the {{pain_point}} you mentioned previously. I'd love to share how these updates might benefit your team.\n\nWould you be open to a quick catch-up call in the next couple of weeks?\n\nBest regards,\n{{sender_name}}\n{{sender_title}}\n{{company_name}}",
      variables: ["first_name", "client_company", "pain_point", "sender_name", "sender_title", "company_name"],
      category: "Re-engagement",
      isDefault: true,
      created_at: "2023-01-15T00:00:00Z",
      updated_at: "2023-01-15T00:00:00Z"
    },
    {
      id: "template-5",
      name: "Meeting Request",
      description: "Request a meeting or call",
      subject: "Meeting request: {{topic}}",
      body: "Hi {{first_name}},\n\nI hope this email finds you well. I'd like to schedule a meeting to discuss {{topic}} and how {{company_name}} can help {{client_company}} with {{pain_point}}.\n\nWould you be available for a {{meeting_duration}}-minute call on {{proposed_date_1}} or {{proposed_date_2}}? If those times don't work, please let me know your availability and I'll be happy to accommodate your schedule.\n\nLooking forward to speaking with you.\n\nBest regards,\n{{sender_name}}\n{{sender_title}}\n{{company_name}}\n{{sender_phone}}",
      variables: ["first_name", "topic", "company_name", "client_company", "pain_point", "meeting_duration", "proposed_date_1", "proposed_date_2", "sender_name", "sender_title", "sender_phone"],
      category: "Meeting",
      isDefault: true,
      created_at: "2023-01-15T00:00:00Z",
      updated_at: "2023-01-15T00:00:00Z"
    }
  ];
}