import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface UserManagementRequest {
  action: 'list' | 'delete' | 'delete_multiple';
  userId?: string;
  userIds?: string[];
  page?: number;
  limit?: number;
  search?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: requestData, error: parseError } = await req.json().catch(() => ({ data: null, error: 'Invalid JSON' }));

    if (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { action, userId, userIds, page = 1, limit = 50, search } = requestData as UserManagementRequest;

    switch (action) {
      case 'list': {
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: limit,
        });

        if (listError) {
          throw listError;
        }

        let filteredUsers = users.users;

        if (search) {
          const searchLower = search.toLowerCase();
          filteredUsers = filteredUsers.filter(u =>
            u.email?.toLowerCase().includes(searchLower)
          );
        }

        const usersWithDetails = filteredUsers.map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          email_confirmed_at: u.email_confirmed_at,
          phone: u.phone,
          app_metadata: u.app_metadata,
          user_metadata: u.user_metadata,
        }));

        return new Response(
          JSON.stringify({
            users: usersWithDetails,
            total: users.users.length,
            page,
            limit,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'delete': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required for delete action' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        if (userId === user.id) {
          return new Response(
            JSON.stringify({ error: 'Cannot delete your own account' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
          throw deleteError;
        }

        return new Response(
          JSON.stringify({ success: true, message: 'User deleted successfully' }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'delete_multiple': {
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
          return new Response(
            JSON.stringify({ error: 'userIds array is required for delete_multiple action' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        if (userIds.includes(user.id)) {
          return new Response(
            JSON.stringify({ error: 'Cannot delete your own account' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const results = {
          deleted: [] as string[],
          failed: [] as { id: string; error: string }[],
        };

        for (const id of userIds) {
          try {
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

            if (deleteError) {
              results.failed.push({ id, error: deleteError.message });
            } else {
              results.deleted.push(id);
            }
          } catch (error) {
            results.failed.push({
              id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            deleted: results.deleted.length,
            failed: results.failed.length,
            results,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
    }
  } catch (error) {
    console.error('User management error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
