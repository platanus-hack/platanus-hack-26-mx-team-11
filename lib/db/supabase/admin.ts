import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, isServiceConfigured } from "@/lib/db/env";

/** Service-role client — bypasses RLS. Server-only (ingest writes, token lookup).
 *  Never import this into a Client Component. */
let admin: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient | null {
  if (!isServiceConfigured) return null;
  return (admin ??= createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }));
}
