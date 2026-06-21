import { adminSupabase } from "@/lib/db/supabase/admin";
import { DEV_KEY, isSupabaseConfigured, staticKeys } from "@/lib/db/env";
import { hashToken } from "@/lib/auth/tokens";

/**
 * Who an inbound hook / pre-request call belongs to. Carries enough to attribute
 * events to an org + member and to resolve their effective policies.
 */
export interface Identity {
  orgId: string;
  memberId: string;
  memberName: string;
  team: string;
  /** Group ids the member belongs to (empty in demo / static-key mode). */
  groupIds: string[];
  /** Directly-attached policy ids (legacy per-member selection). */
  policyIds: string[];
}

const DEMO_ORG = "demo";

/** Parse the `Bearer <token>` header to the raw token. */
function bearer(header: string | null): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1].trim() : null;
}

/**
 * Resolve an Authorization header to an Identity, or null if unauthorized.
 * Static keys (incl. the dev key) resolve without a database; otherwise the
 * token is hashed and looked up in member_tokens.
 */
export async function resolveIdentity(authHeader: string | null): Promise<Identity | null> {
  const token = bearer(authHeader);
  if (!token) return null;

  // 1) Static keys / dev key.
  const fromStatic = staticKeys()[token];
  if (fromStatic) {
    return {
      orgId: fromStatic.org ?? DEMO_ORG,
      memberId: fromStatic.memberId ?? (token === DEV_KEY ? "demo" : `static:${token.slice(0, 12)}`),
      memberName: fromStatic.name,
      team: fromStatic.team ?? "",
      groupIds: [],
      policyIds: fromStatic.policyIds ?? [],
    };
  }

  // 2) Hashed DB lookup.
  if (!isSupabaseConfigured) return null;
  const db = adminSupabase();
  if (!db) return null;

  const { data, error } = await db
    .from("member_tokens")
    .select("org_id, revoked_at, members ( id, full_name, team, policy_ids )")
    .eq("token_hash", hashToken(token))
    .is("revoked_at", null)
    .maybeSingle();
  if (error || !data) return null;

  const member = (Array.isArray(data.members) ? data.members[0] : data.members) as
    | { id: string; full_name: string; team: string; policy_ids: string[] }
    | undefined;
  if (!member) return null;

  // Group memberships (table may not exist yet on older schemas — tolerate).
  let groupIds: string[] = [];
  const { data: groups } = await db
    .from("group_members")
    .select("group_id")
    .eq("member_id", member.id);
  if (groups) groupIds = groups.map((g: { group_id: string }) => g.group_id);

  return {
    orgId: data.org_id as string,
    memberId: member.id,
    memberName: member.full_name,
    team: member.team ?? "",
    groupIds,
    policyIds: member.policy_ids ?? [],
  };
}
