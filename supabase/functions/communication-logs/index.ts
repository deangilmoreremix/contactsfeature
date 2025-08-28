import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface CommunicationLog {
  id?: string;
  customer_id: string;
  type: 'email' | 'sms' | 'call' | 'meeting' | 'note' | 'task';
  direction: 'inbound' | 'outbound';
  subject?: string;
  content?: string;
  contact_id?: string;
  deal_id?: string;
  created_by?: string;
  from_address?: string;
  to_addresses?: string[];
  cc_addresses?: string[];
  bcc_addresses?: string[];
  duration_seconds?: number;
  call_outcome?: string;
  recording_url?: string;
  status?: 'completed' | 'scheduled' | 'failed' | 'cancelled';
  scheduled_at?: string;
  completed_at?: string;
  attachments?: any[];
  metadata?: Record<string, any>;
  created_at?: string;
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
  const path = url.pathname.split('/').filter(Boolean);
  const endpoint = path.slice(3);

  try {
    // GET /communications - List communications with filters
    if (req.method === 'GET' && endpoint.length === 0) {
      const params = Object.fromEntries(url.searchParams.entries());
      const { 
        contact_id,
        deal_id,
        type,
        direction,
        limit = '50', 
        offset = '0',
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = params;

      let query = supabase.from('communications').select('*');
      
      if (contact_id) {
        query = query.eq('contact_id', contact_id);
      }
      
      if (deal_id) {
        query = query.eq('deal_id', deal_id);
      }
      
      if (type && type !== 'all') {
        query = query.eq('type', type);
      }

      if (direction && direction !== 'all') {
        query = query.eq('direction', direction);
      }

      // Count total
      const { count } = await supabase
        .from('communications')
        .select('*', { count: 'exact', head: true });
      
      // Apply pagination
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      const { data: communications, error } = await query;
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({
          communications: communications || [],
          total: count || 0,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: count ? parseInt(offset) + communications.length < count : false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // POST /communications - Log new communication
    if (req.method === 'POST' && endpoint.length === 0) {
      const commData: CommunicationLog = await req.json();
      
      // Set timestamp
      commData.created_at = new Date().toISOString();
      
      // Set default values
      commData.status = commData.status || 'completed';
      commData.direction = commData.direction || 'outbound';
      
      const { data, error } = await supabase
        .from('communications')
        .insert([commData])
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

    // GET /communications/stats - Get communication statistics
    if (req.method === 'GET' && endpoint.length === 1 && endpoint[0] === 'stats') {
      const params = Object.fromEntries(url.searchParams.entries());
      const { contact_id, deal_id, days = '30' } = params;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      let query = supabase
        .from('communications')
        .select('type, direction, status, created_at')
        .gte('created_at', startDate.toISOString());

      if (contact_id) {
        query = query.eq('contact_id', contact_id);
      }
      
      if (deal_id) {
        query = query.eq('deal_id', deal_id);
      }

      const { data: communications, error } = await query;
      
      if (error) throw error;

      // Calculate statistics
      const stats = {
        total: communications.length,
        byType: {} as Record<string, number>,
        byDirection: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        thisWeek: 0,
        thisMonth: 0
      };

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      communications.forEach(comm => {
        // By type
        stats.byType[comm.type] = (stats.byType[comm.type] || 0) + 1;
        
        // By direction
        stats.byDirection[comm.direction] = (stats.byDirection[comm.direction] || 0) + 1;
        
        // By status
        stats.byStatus[comm.status] = (stats.byStatus[comm.status] || 0) + 1;
        
        // Time-based counts
        const commDate = new Date(comm.created_at);
        if (commDate >= weekAgo) stats.thisWeek++;
        if (commDate >= monthAgo) stats.thisMonth++;
      });

      return new Response(
        JSON.stringify(stats),
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
    console.error('Unhandled error in communication-logs function:', error);
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