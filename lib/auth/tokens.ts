import { createHash, randomBytes } from "crypto";
import { adminSupabase } from "@/lib/db/supabase/admin";
import { DEV_KEY, isSupabaseConfigured, staticKeys } from "@/lib/db/env";
import { ROLE_DEFAULT, roleById } from "@/lib/policy/roles";

/** A tracked member as the installer / onboarding needs it. */
export interface MemberToken {
  memberId: string;
  memberName: string;
  policyIds: string[];
}

/** Mint a fresh plaintext token. Shown once, stored only as a hash. */
export function generateToken(): string {
  return `cs_live_${randomBytes(24).toString("hex")}`;
}

/** Deterministic sha256 hash stored at rest. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Short, safe-to-display prefix (e.g. "cs_live_ab12cd34…"). */
export function tokenPrefix(token: string): string {
  return token.slice(0, 16);
}

/**
 * Resolve a raw token to the member it belongs to. Tries (1) static keys from
 * env / the dev key, then (2) the hashed member_tokens table. Returns null if
 * unknown or revoked.
 */
export async function lookupMemberByToken(token: string): Promise<MemberToken | null> {
  if (!token) return null;

  // 1) Static keys (dev key + CODESENTINEL_KEYS) — works without a database.
  const fromStatic = staticKeys()[token];
  if (fromStatic) {
    return {
      memberId: token === DEV_KEY ? "demo" : `static:${tokenPrefix(token)}`,
      memberName: fromStatic.name,
      policyIds: fromStatic.policyIds ?? roleById(ROLE_DEFAULT)?.policyIds ?? [],
    };
  }

  // 2) Hashed lookup in the database.
  if (!isSupabaseConfigured) return null;
  const db = adminSupabase();
  if (!db) return null;

  const { data, error } = await db
    .from("member_tokens")
    .select("member_id, revoked_at, members ( id, full_name, policy_ids )")
    .eq("token_hash", hashToken(token))
    .is("revoked_at", null)
    .maybeSingle();
  if (error || !data) return null;

  // Supabase types the joined relation loosely; normalise it.
  const member = (Array.isArray(data.members) ? data.members[0] : data.members) as
    | { id: string; full_name: string; policy_ids: string[] }
    | undefined;
  if (!member) return null;

  // Best-effort "last used" stamp; ignore failures.
  await db
    .from("member_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", hashToken(token));

  return { memberId: member.id, memberName: member.full_name, policyIds: member.policy_ids ?? [] };
}
