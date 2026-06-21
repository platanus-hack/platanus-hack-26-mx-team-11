/**
 * Read side for the Team page. Lists members with their role/policy selection and
 * the status of their most recent token. Empty in demo mode (writes are disabled
 * there). With Supabase, RLS scopes to the admin's org.
 */
import { isSupabaseConfigured } from "@/lib/db/env";
import { getViewer } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/db/supabase/server";
import { ROLE_DEFAULT } from "@/lib/policy/roles";
import { listDemoMembers } from "@/lib/repo/groups";

export interface MemberView {
  id: string;
  fullName: string;
  email: string;
  team: string;
  roleId: string;
  policyIds: string[];
  tokenActive: boolean;
  tokenPrefix: string;
}

export async function listMembers(): Promise<MemberView[]> {
  if (!isSupabaseConfigured) {
    // Demo: surface the seeded members so they can be assigned to groups.
    return listDemoMembers().map((m) => ({
      id: m.id,
      fullName: m.fullName,
      email: m.email,
      team: m.team,
      roleId: ROLE_DEFAULT,
      policyIds: [],
      tokenActive: m.id === "m1",
      tokenPrefix: m.id === "m1" ? "cs_dev_local" : "",
    }));
  }
  const viewer = await getViewer();
  if (!viewer) return [];

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("members")
    .select(
      `id, full_name, email, team, role_id, policy_ids,
       member_tokens ( token_prefix, revoked_at, created_at )`
    )
    .eq("org_id", viewer.orgId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return data.map((m: any): MemberView => {
    const tokens = (m.member_tokens ?? [])
      .slice()
      .sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)));
    const latest = tokens[0];
    const active = Boolean(latest && !latest.revoked_at);
    return {
      id: m.id,
      fullName: m.full_name,
      email: m.email,
      team: m.team ?? "",
      roleId: m.role_id ?? ROLE_DEFAULT,
      policyIds: m.policy_ids ?? [],
      tokenActive: active,
      tokenPrefix: active ? latest.token_prefix : "",
    };
  });
}
