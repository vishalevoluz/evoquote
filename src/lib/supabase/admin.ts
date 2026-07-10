import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Admin client — uses the SERVICE ROLE key and bypasses Row Level Security.
 * Only ever import this in server-side code (API routes / server actions),
 * never in client components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
