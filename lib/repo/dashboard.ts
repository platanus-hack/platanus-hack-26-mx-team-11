import type { Session } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/db/env";
import { createServerSupabase } from "@/lib/db/supabase/server";
import { memoryStore } from "@/lib/repo/memory-store";
import { activeFirst, mapSession } from "@/lib/repo/map";

/**
 * Sessions for the current viewer's org. In production this runs under the
 * signed-in admin's RLS context; in demo mode it returns the in-memory store.
 */
export async function listSessionsForViewer(): Promise<Session[]> {
  if (!isSupabaseConfigured) return memoryStore.list();

  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data } = await supabase
    .from("sessions")
    .select("*, events(*, risk_flags(*))")
    .order("started_at", { ascending: false })
    .limit(100);

  return (data ?? []).map(mapSession).sort(activeFirst);
}
