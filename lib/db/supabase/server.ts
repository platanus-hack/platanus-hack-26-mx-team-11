import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/db/env";

/**
 * Supabase client bound to the request's cookies — carries the signed-in admin's
 * auth context, so RLS scopes every read to their org. Used by server actions and
 * server components. Callers must guard with `isSupabaseConfigured` first.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component where cookies are read-only — the
          // middleware refreshes the session instead, so this is safe to ignore.
        }
      },
    },
  });
}
