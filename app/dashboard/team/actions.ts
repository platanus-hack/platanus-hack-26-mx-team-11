"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/db/supabase/server";
import { getViewer } from "@/lib/auth/session";
import { generateToken, hashToken, tokenPrefix } from "@/lib/auth/tokens";
import { roleById } from "@/lib/policy/roles";

export interface NewMember {
  memberId: string;
  name: string;
  roleId: string;
  policyIds: string[];
  token: string; // plaintext — shown once
}

export interface TeamActionState {
  error?: string;
  created?: NewMember;
}

/** Add a tracked member and mint their first token. */
export async function addMember(_prev: TeamActionState, form: FormData): Promise<TeamActionState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Not signed in." };

  const roleId = String(form.get("role_id") || "engineering");
  const policyIds = roleById(roleId)?.policyIds ?? [];
  const supabase = await createServerSupabase();

  const { data: member, error } = await supabase
    .from("members")
    .insert({
      org_id: viewer.orgId,
      full_name: String(form.get("full_name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      team: String(form.get("team") || "").trim(),
      role_id: roleId,
      policy_ids: policyIds,
    })
    .select("id, full_name")
    .single();
  if (error || !member) return { error: error?.message ?? "Could not add member." };

  const token = await mintToken(member.id, viewer.orgId);
  revalidatePath("/dashboard/team");
  return { created: { memberId: member.id, name: member.full_name, roleId, policyIds, token } };
}

/** Change a member's role and/or policy selection. */
export async function setMember(memberId: string, roleId: string, policyIds: string[]): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return;
  const supabase = await createServerSupabase();
  await supabase.from("members").update({ role_id: roleId, policy_ids: policyIds }).eq("id", memberId);
  revalidatePath("/dashboard/team");
}

export async function removeMember(memberId: string): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return;
  const supabase = await createServerSupabase();
  await supabase.from("members").delete().eq("id", memberId);
  revalidatePath("/dashboard/team");
}

/** Revoke existing tokens and issue a fresh one (returned plaintext, once). */
export async function regenerateToken(memberId: string): Promise<{ token?: string; error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Not signed in." };
  const supabase = await createServerSupabase();
  await supabase
    .from("member_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("member_id", memberId)
    .is("revoked_at", null);
  const token = await mintToken(memberId, viewer.orgId);
  revalidatePath("/dashboard/team");
  return { token };
}

async function mintToken(memberId: string, orgId: string): Promise<string> {
  const token = generateToken();
  const supabase = await createServerSupabase();
  await supabase.from("member_tokens").insert({
    member_id: memberId,
    org_id: orgId,
    token_hash: hashToken(token),
    token_prefix: tokenPrefix(token),
  });
  return token;
}
