import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface Contact {
  id?: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone?: string;
  title: string;
  company: string;
  industry?: string;
  avatarSrc?: string;
  sources?: string[];
  interestLevel?: 'hot' | 'medium' | 'low' | 'cold';
  status?: 'active' | 'pending' | 'inactive' | 'lead' | 'prospect' | 'customer' | 'churned';
  notes?: string;
  aiScore?: number;
  tags?: string[];
  socialProfiles?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

// UUID validation helper function
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
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
  // Remove 'functions', 'v1', and 'contacts' from the path
  const endpoint = path.slice(3);

  try {
    // GET /contacts - List contacts with filters
    if (req.method === 'GET' && endpoint.length === 0) {
      const params = Object.fromEntries(url.searchParams.entries());
      const { 
        search, 
        interestLevel, 
        status, 
        limit = '50', 
        offset = '0', 
        sortBy = 'name', 
        sortOrder = 'asc' 
      } = params;

      let query = supabase.from('contacts').select('*');
      
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
      }
      
      if (interestLevel && interestLevel !== 'all') {
        query = query.eq('interestLevel', interestLevel);
      }
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      // Count total
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });
      
      // Apply pagination
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      const { data: contacts, error } = await query;
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({
          contacts: contacts || [],
          total: count || 0,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: count ? parseInt(offset) + contacts.length < count : false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // GET /contacts/:id - Get single contact
    if (req.method === 'GET' && endpoint.length === 1) {
      const contactId = endpoint[0];
      
      // Note: UUID validation removed to support sample data with numeric IDs
      // If your database requires UUIDs, ensure sample data uses valid UUIDs
      
      const { data: contact, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ 
              error: 'Contact not found',
              details: `No contact found with ID: ${contactId}`
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
        JSON.stringify(contact),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // POST /contacts - Create contact
    if (req.method === 'POST' && endpoint.length === 0) {
      const contactData: Contact = await req.json();
      
      // Set timestamps
      contactData.createdAt = new Date().toISOString();
      contactData.updatedAt = new Date().toISOString();
      
      // Set default values
      contactData.interestLevel = contactData.interestLevel || 'medium';
      contactData.status = contactData.status || 'lead';
      contactData.sources = contactData.sources || ['Manual Entry'];
      contactData.avatarSrc = contactData.avatarSrc || 
        'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2';
      
      const { data, error } = await supabase
        .from('contacts')
        .insert([contactData])
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
    
    // PATCH /contacts/:id - Update contact
    if (req.method === 'PATCH' && endpoint.length === 1) {
      const contactId = endpoint[0];
      
      // Note: UUID validation removed to support sample data with numeric IDs
      // If your database requires UUIDs, ensure sample data uses valid UUIDs
      
      const updates: Partial<Contact> = await req.json();
      
      // Set updated timestamp
      updates.updatedAt = new Date().toISOString();
      
      // First get the current contact to ensure it exists
      const { data: existingContact, error: getError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();
        
      if (getError) {
        if (getError.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ 
              error: 'Contact not found',
              details: `No contact found with ID: ${contactId}`
            }),
            {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        throw getError;
      }
      
      // Apply updates
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', contactId)
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
    
    // DELETE /contacts/:id - Delete contact
    if (req.method === 'DELETE' && endpoint.length === 1) {
      const contactId = endpoint[0];
      
      // Note: UUID validation removed to support sample data with numeric IDs
      // If your database requires UUIDs, ensure sample data uses valid UUIDs
      
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);
      
      if (error) throw error;
      
      return new Response(
        null,
        {
          status: 204,
          headers: corsHeaders,
        }
      );
    }
    
    // POST /contacts/batch - Batch create contacts
    if (req.method === 'POST' && endpoint.length === 1 && endpoint[0] === 'batch') {
      const { contacts } = await req.json();
      
      // Prepare contacts with timestamps
      const now = new Date().toISOString();
      const contactsToInsert = contacts.map((contact: Contact) => ({
        ...contact,
        createdAt: now,
        updatedAt: now
      }));
      
      const { data, error } = await supabase
        .from('contacts')
        .insert(contactsToInsert)
        .select();
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify(data),
        {
          status: 201,
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
    console.error('Unhandled error in contacts function:', error);
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