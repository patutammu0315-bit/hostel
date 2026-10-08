import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serverClientInstance: SupabaseClient | null = null;

/**
 * Returns a server-side Supabase client using SUPABASE_SERVICE_ROLE_KEY.
 * Only callable on the server. Never import this into client components.
 */
export function getServiceRoleSupabaseClient(): SupabaseClient {
  if (serverClientInstance) {
    return serverClientInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase server credentials. Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }

  serverClientInstance = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serverClientInstance;
}

/**
 * Returns a public/anon Supabase client using SUPABASE_ANON_KEY.
 * Safe for client-side or anon operations.
 */
export function getAnonSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      'Missing Supabase anon credentials. Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set.'
    );
  }

  return createClient(supabaseUrl, anonKey);
}
