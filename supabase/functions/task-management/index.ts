import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface Task {
  id?: string;
  title: string;
  description?: string;
  due_date?: string;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  related_to_type?: 'deal' | 'contact';
  related_to_id?: string;
  related_to_name?: string;
  assigned_to?: string;
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
    // GET /tasks - List tasks with filters
    if (req.method === 'GET' && endpoint.length === 0) {
      const params = Object.fromEntries(url.searchParams.entries());
      const { 
        assigned_to,
        completed,
        priority,
        related_to_type,
        related_to_id,
        due_soon,
        limit = '50', 
        offset = '0',
        sortBy = 'due_date',
        sortOrder = 'asc'
      } = params;

      let query = supabase.from('tasks').select('*');
      
      if (assigned_to) {
        query = query.eq('assigned_to', assigned_to);
      }
      
      if (completed !== undefined) {
        query = query.eq('completed', completed === 'true');
      }
      
      if (priority && priority !== 'all') {
        query = query.eq('priority', priority);
      }

      if (related_to_type) {
        query = query.eq('related_to_type', related_to_type);
      }

      if (related_to_id) {
        query = query.eq('related_to_id', related_to_id);
      }

      if (due_soon === 'true') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        query = query.lte('due_date', tomorrow.toISOString());
      }

      // Count total
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true });
      
      // Apply pagination
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      const { data: tasks, error } = await query;
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({
          tasks: tasks || [],
          total: count || 0,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: count ? parseInt(offset) + tasks.length < count : false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // POST /tasks - Create task
    if (req.method === 'POST' && endpoint.length === 0) {
      const taskData: Task = await req.json();
      
      // Set timestamps
      taskData.created_at = new Date().toISOString();
      taskData.updated_at = new Date().toISOString();
      
      // Set default values
      taskData.completed = taskData.completed || false;
      taskData.priority = taskData.priority || 'medium';
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
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
    
    // PATCH /tasks/:id - Update task
    if (req.method === 'PATCH' && endpoint.length === 1) {
      const taskId = endpoint[0];
      const updates: Partial<Task> = await req.json();
      
      // Set updated timestamp
      updates.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
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

    // DELETE /tasks/:id - Delete task
    if (req.method === 'DELETE' && endpoint.length === 1) {
      const taskId = endpoint[0];

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
      
      return new Response(
        null,
        {
          status: 204,
          headers: corsHeaders,
        }
      );
    }

    // GET /tasks/stats - Get task statistics
    if (req.method === 'GET' && endpoint.length === 1 && endpoint[0] === 'stats') {
      const params = Object.fromEntries(url.searchParams.entries());
      const { assigned_to } = params;

      let query = supabase.from('tasks').select('completed, priority, due_date, created_at');

      if (assigned_to) {
        query = query.eq('assigned_to', assigned_to);
      }

      const { data: tasks, error } = await query;
      
      if (error) throw error;

      // Calculate statistics
      const now = new Date();
      const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.completed).length,
        pending: tasks.filter(t => !t.completed).length,
        overdue: tasks.filter(t => !t.completed && t.due_date && new Date(t.due_date) < now).length,
        dueToday: tasks.filter(t => {
          if (!t.due_date) return false;
          const dueDate = new Date(t.due_date);
          return dueDate.toDateString() === now.toDateString();
        }).length,
        byPriority: {
          high: tasks.filter(t => t.priority === 'high').length,
          medium: tasks.filter(t => t.priority === 'medium').length,
          low: tasks.filter(t => t.priority === 'low').length
        }
      };

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
    console.error('Unhandled error in task-management function:', error);
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