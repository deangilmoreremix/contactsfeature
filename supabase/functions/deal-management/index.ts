import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface Deal {
  id?: string;
  title: string;
  description?: string;
  value: number;
  currency?: string;
  stage_id: string;
  probability?: number;
  expected_close_date?: string;
  actual_close_date?: string;
  contact_id?: string;
  assigned_to?: string;
  created_by?: string;
  status?: string;
  deal_type?: string;
  lead_source?: string;
  competitors?: string[];
  tags?: string[];
  custom_fields?: Record<string, any>;
  attachments?: any[];
  created_at?: string;
  updated_at?: string;
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

  const url = new URL(req.url);
  const path = url.pathname.split('/').filter(Boolean);
  const endpoint = path.slice(3); // Remove 'functions', 'v1', and 'deal-management'

  try {
    // GET /deals - List deals with filters
    if (req.method === 'GET' && endpoint.length === 0) {
      const params = Object.fromEntries(url.searchParams.entries());
      const { 
        search, 
        stage, 
        status, 
        assigned_to,
        limit = '50', 
        offset = '0', 
        sortBy = 'updated_at', 
        sortOrder = 'desc' 
      } = params;

      let query = supabase.from('deals').select('*');
      
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }
      
      if (stage && stage !== 'all') {
        query = query.eq('stage_id', stage);
      }
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (assigned_to && assigned_to !== 'all') {
        query = query.eq('assigned_to', assigned_to);
      }

      // Count total
      const { count } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true });
      
      // Apply pagination
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      const { data: deals, error } = await query;
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({
          deals: deals || [],
          total: count || 0,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: count ? parseInt(offset) + deals.length < count : false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // GET /deals/:id - Get single deal
    if (req.method === 'GET' && endpoint.length === 1) {
      const dealId = endpoint[0];

      const { data: deal, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ 
              error: 'Deal not found',
              details: `No deal found with ID: ${dealId}`
            }),
            {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        throw error;
      }
      
      return new Response(
        JSON.stringify(deal),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // POST /deals - Create deal
    if (req.method === 'POST' && endpoint.length === 0) {
      const dealData: Deal = await req.json();
      
      // Set timestamps
      dealData.created_at = new Date().toISOString();
      dealData.updated_at = new Date().toISOString();
      
      // Set default values
      dealData.currency = dealData.currency || 'USD';
      dealData.status = dealData.status || 'open';
      dealData.probability = dealData.probability || 0;
      
      const { data, error } = await supabase
        .from('deals')
        .insert([dealData])
        .select()
        .single();
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify(data),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // PATCH /deals/:id - Update deal
    if (req.method === 'PATCH' && endpoint.length === 1) {
      const dealId = endpoint[0];
      const updates: Partial<Deal> = await req.json();
      
      // Set updated timestamp
      updates.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', dealId)
        .select()
        .single();
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify(data),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // DELETE /deals/:id - Delete deal
    if (req.method === 'DELETE' && endpoint.length === 1) {
      const dealId = endpoint[0];

      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId);
      
      if (error) throw error;
      
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
        details: `Endpoint not found: ${req.method} ${url.pathname}`
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('Unhandled error in deal-management function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred'
      }),
      {
        status: error.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});