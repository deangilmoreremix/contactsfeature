import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env['VITE_SUPABASE_URL']
const supabaseAnonKey = import.meta.env['VITE_SUPABASE_ANON_KEY']

// Log warning if env vars are missing but don't crash during initialization
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Using mock client for demo mode. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect to Supabase.')
}

// Export a mock-aware client - will work in demo mode without crashing
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    // Demo mode (no env): never hit the placeholder host
    ...(supabaseUrl && supabaseAnonKey
      ? {}
      : {
          global: {
            fetch: (async () =>
              new Response(JSON.stringify({ message: 'Supabase is not configured', code: 'NOT_CONFIGURED' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              })) as typeof fetch
          }
        }),
  }
)

// Export individual functions if needed
export { createClient }
export default supabase