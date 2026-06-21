import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/db/env";

/** Supabase client for Client Components (browser-side auth state). */
export const createBrowserSupabase = () => createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
