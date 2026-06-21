import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "@/lib/db/env";

let cached: SupabaseClient | null = null;

/**
 * Service-role client — bypasses RLS. Used only on the server by the ingest
 * pipeline and token lookups, where the org is set explicitly. Never expose to
 * the browser. Returns null when the service key is absent (demo mode).
 */
export function adminSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!cached) {
    cached = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
