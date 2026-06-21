import { createHash, randomBytes } from "node:crypto";
import { getServiceSupabase } from "@/lib/db/supabase/admin";

export interface TokenContext {
  memberId: string;
  orgId: string;
  memberName: string;
  team: string;
  roleId: string;
  policyIds: string[];
}

const PREFIX = "snt_live_";

/** A fresh opaque token. Returned to the admin ONCE; only its hash is stored. */
export function generateToken(): string {
  return PREFIX + randomBytes(24).toString("base64url");
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Short, safe-to-display prefix, e.g. "snt_live_ab12cd". */
export const tokenPrefix = (token: string) => token.slice(0, PREFIX.length + 6);

/** Resolve a bearer token to its member/org/role, or null. Updates last_used. */
export async function lookupMemberByToken(token: string): Promise<TokenContext | null> {
  const supabase = getServiceSupabase();
  if (!supabase) return null;

  const { data: tok } = await supabase
    .from("member_tokens")
    .select("id, member_id")
    .eq("token_hash", hashToken(token))
    .is("revoked_at", null)
    .maybeSingle();
  if (!tok) return null;

  const { data: member } = await supabase
    .from("members")
    .select("id, org_id, full_name, team, role_id, policy_ids")
    .eq("id", tok.member_id)
    .maybeSingle();
  if (!member) return null;

  void supabase.from("member_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", tok.id);

  return {
    memberId: member.id,
    orgId: member.org_id,
    memberName: member.full_name,
    team: member.team,
    roleId: member.role_id,
    policyIds: member.policy_ids ?? [],
  };
}
