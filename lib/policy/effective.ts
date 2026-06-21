/**
 * Resolve a member's **effective** policy set: all Organization policies plus the
 * policies of every group they belong to (a union — memberships accumulate). In
 * demo / static-key mode this falls back to the identity's directly-attached
 * policy ids (defaulted from their role).
 *
 * Conflict resolution (most-restrictive-wins) is applied at decision time in
 * evaluateRequest.ts; here we only compute the set.
 */
import type { Identity } from "@/lib/auth/identity";
import type { Policy } from "@/lib/policy/catalog";
import { POLICIES } from "@/lib/policy/catalog";
import { resolvePolicies } from "@/lib/policy/generate";
import { isSupabaseConfigured } from "@/lib/db/env";
import { adminSupabase } from "@/lib/db/supabase/admin";
import { demoGroupIdsForMember, demoGroupPolicyIds, demoOrgPolicyIds } from "@/lib/repo/groups";

export async function effectivePolicyIds(identity: Identity): Promise<string[]> {
  const ids = new Set<string>(identity.policyIds);

  if (!isSupabaseConfigured) {
    // Demo: union org-wide policies + the policies of every group the member is
    // in, read straight from the in-memory store — so editing groups in the UI
    // changes enforcement live.
    for (const id of demoOrgPolicyIds(identity.orgId)) ids.add(id);
    const groupIds = identity.groupIds.length ? identity.groupIds : demoGroupIdsForMember(identity.memberId);
    for (const gid of groupIds) for (const id of demoGroupPolicyIds(gid)) ids.add(id);
    return [...ids];
  }

  if (isSupabaseConfigured) {
    const db = adminSupabase();
    if (db) {
      const { data } = await db
        .from("policy_assignments")
        .select("policy_id, scope, group_id, enabled")
        .eq("org_id", identity.orgId)
        .eq("enabled", true);
      for (const row of data ?? []) {
        const r = row as { policy_id: string; scope: string; group_id: string | null };
        if (r.scope === "org") ids.add(r.policy_id);
        else if (r.scope === "group" && r.group_id && identity.groupIds.includes(r.group_id)) {
          ids.add(r.policy_id);
        }
      }
    }
  }

  return [...ids];
}

export async function effectivePolicies(identity: Identity): Promise<Policy[]> {
  return resolvePolicies(POLICIES, await effectivePolicyIds(identity));
}
