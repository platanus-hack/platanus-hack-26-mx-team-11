import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/db/env";
import { createServerSupabase } from "@/lib/db/supabase/server";

export interface Viewer {
  userId: string;
  email: string;
  fullName: string;
  orgId: string;
  orgName: string;
}

/** The signed-in admin + their org, or null (also null in demo mode). */
export async function getViewer(): Promise<Viewer | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, full_name, email, orgs(name)")
    .eq("id", auth.user.id)
    .maybeSingle();

  const org = profile?.orgs as { name?: string } | { name?: string }[] | null | undefined;
  const orgName = Array.isArray(org) ? org[0]?.name ?? "" : org?.name ?? "";

  return {
    userId: auth.user.id,
    email: profile?.email ?? auth.user.email ?? "",
    fullName: profile?.full_name ?? "",
    orgId: profile?.org_id ?? "",
    orgName,
  };
}

/** For protected pages: redirect to /login when configured & unauthenticated;
 *  returns null in demo mode so the page still renders. */
export async function requireViewer(): Promise<Viewer | null> {
  const viewer = await getViewer();
  if (isSupabaseConfigured && !viewer) redirect("/login");
  return viewer;
}
