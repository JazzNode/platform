import { createClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client with service_role key (bypasses RLS).
 * Use this in API routes for admin operations like writing audit logs.
 * NEVER expose this on the client side.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role config');
  return createClient(url, key);
}
