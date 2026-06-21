import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/db/supabase/server";
import { isSupabaseConfigured } from "@/lib/db/env";

/** The signed-in admin, with their org resolved from their profile. */
export interface Viewer {
  id: string;
  orgId: string;
  email: string;
  fullName: string;
  orgName: string;
}

/**
 * The current admin, or null. In demo mode (no Supabase) this is always null —
 * the console still renders (reads come from the in-memory store) but write
 * actions short-circuit.
 */
export async function getViewer(): Promise<Viewer | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, org_id, email, full_name, orgs ( name )")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  const org = (Array.isArray(profile.orgs) ? profile.orgs[0] : profile.orgs) as
    | { name: string }
    | undefined;

  return {
    id: profile.id,
    orgId: profile.org_id,
    email: profile.email,
    fullName: profile.full_name ?? "",
    orgName: org?.name ?? "",
  };
}

/**
 * Like getViewer, but redirects unauthenticated admins to /login when Supabase
 * is configured. In demo mode it returns null and the page renders anyway.
 */
export async function requireViewer(): Promise<Viewer | null> {
  if (!isSupabaseConfigured) return null;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}
