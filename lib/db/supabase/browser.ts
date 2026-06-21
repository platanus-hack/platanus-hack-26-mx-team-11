import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/db/env";

/**
 * Browser Supabase client (anon key, RLS-scoped). Components that need direct
 * client-side reads can use this; the console itself polls /api/sessions instead.
 */
export function createBrowserSupabase() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
