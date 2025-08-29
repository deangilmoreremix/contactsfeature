/**
 * Supabase Client Configuration
 * Centralized Supabase client setup with proper error handling
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'];
const supabaseAnonKey = import.meta.env['VITE_SUPABASE_ANON_KEY'];

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

// Create Supabase client with optimized settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'smartcrm-web'
    }
  }
});

// Helper function to call Edge Functions with proper error handling
export async function callEdgeFunction(
  functionName: string,
  payload: any = {},
  options: {
    headers?: Record<string, string>;
    method?: 'POST' | 'GET' | 'PUT' | 'DELETE';
  } = {}
) {
  try {
    console.log(`Calling Edge Function: ${functionName}`, { payload });

    // Get current session for authentication
    const { data: { session } } = await supabase.auth.getSession();

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add authorization if user is logged in
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
      headers,
      method: options.method || 'POST'
    });

    if (error) {
      console.error(`Edge Function ${functionName} error:`, error);
      throw new Error(error.message || `Failed to call ${functionName}`);
    }

    console.log(`Edge Function ${functionName} success:`, data);
    return data;

  } catch (error) {
    console.error(`Failed to call Edge Function ${functionName}:`, error);

    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Please check your internet connection and try again.');
      }
      if (error.message.includes('401')) {
        throw new Error('Authentication required. Please sign in again.');
      }
      if (error.message.includes('403')) {
        throw new Error('Access denied. You may not have permission to perform this action.');
      }
      if (error.message.includes('500')) {
        throw new Error('Server error. Please try again later.');
      }
    }

    throw error;
  }
}

// Helper to check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch {
    return false;
  }
}

// Helper to get current user
export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

// Export types for better TypeScript support
export type { User, Session } from '@supabase/supabase-js';