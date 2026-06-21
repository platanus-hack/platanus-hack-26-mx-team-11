/** Supabase config, read once. When absent the app runs in demo mode (in-memory,
 *  no auth) so it builds and the tracking demo works without credentials. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** True when the public client can talk to Supabase (auth + dashboard reads). */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** True when server-side writes (the ingest endpoint) can reach Supabase. */
export const isServiceConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
