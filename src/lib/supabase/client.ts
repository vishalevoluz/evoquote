import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Supabase not configured yet — callers should check for null and
    // degrade gracefully (e.g. skip auth, skip session persistence).
    return null;
  }

  return createBrowserClient(url, anonKey);
}
