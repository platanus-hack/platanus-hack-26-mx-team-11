import { isSupabaseConfigured } from "@/lib/db/env";
import { createServerSupabase } from "@/lib/db/supabase/server";

export interface MemberView {
  id: string;
  fullName: string;
  email: string;
  team: string;
  roleId: string;
  policyIds: string[];
  tokenPrefix?: string;
  tokenActive: boolean;
}

type TokenRow = { token_prefix: string; revoked_at: string | null; created_at: string };

/** Members of the signed-in admin's org, with token status. RLS-scoped. */
export async function listMembers(): Promise<MemberView[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data } = await supabase
    .from("members")
    .select("id, full_name, email, team, role_id, policy_ids, member_tokens(token_prefix, revoked_at, created_at)")
    .order("created_at", { ascending: true });

  return (data ?? []).map((m) => {
    const active = ((m.member_tokens as TokenRow[]) ?? [])
      .filter((t) => !t.revoked_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return {
      id: m.id,
      fullName: m.full_name,
      email: m.email,
      team: m.team,
      roleId: m.role_id,
      policyIds: m.policy_ids ?? [],
      tokenPrefix: active[0]?.token_prefix,
      tokenActive: active.length > 0,
    };
  });
}
