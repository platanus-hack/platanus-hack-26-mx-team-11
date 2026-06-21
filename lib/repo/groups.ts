/**
 * Admin-created **groups** and policy assignments. Groups are dynamic (the admin
 * names them and attaches Library policies) — not fixed presets. Policies apply
 * at two scopes: organization-wide or per-group; a member's effective set is the
 * union (see lib/policy/effective.ts).
 *
 * Dual-mode: Supabase when configured (tables from migration 0005), otherwise an
 * in-memory store on globalThis seeded with example groups + demo members so the
 * feature is fully usable with zero env vars.
 */
import { randomUUID } from "crypto";
import { isSupabaseConfigured } from "@/lib/db/env";
import { getViewer } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/db/supabase/server";

export interface GroupView {
  id: string;
  name: string;
  description: string;
  policyIds: string[];
  memberIds: string[];
}

export interface DemoMember {
  id: string;
  fullName: string;
  email: string;
  team: string;
}

// ── In-memory store (demo) ─────────────────────────────────────────────────────
interface GroupRec {
  id: string;
  orgId: string;
  name: string;
  description: string;
}
interface AssignmentRec {
  orgId: string;
  policyId: string;
  scope: "org" | "group";
  groupId: string | null;
}
interface MembershipRec {
  orgId: string;
  groupId: string;
  memberId: string;
}
interface Store {
  groups: GroupRec[];
  assignments: AssignmentRec[];
  memberships: MembershipRec[];
  members: DemoMember[];
  seeded: boolean;
}

const g = globalThis as unknown as { __csOrg?: Store };

function store(): Store {
  if (!g.__csOrg) {
    g.__csOrg = { groups: [], assignments: [], memberships: [], members: [], seeded: false };
    seed(g.__csOrg);
  }
  return g.__csOrg;
}

function seed(s: Store): void {
  if (s.seeded) return;
  s.seeded = true;
  const ORG = "demo";

  s.members = [
    { id: "m1", fullName: "Ana Rivera", email: "ana@acme.test", team: "Marketing" },
    { id: "m2", fullName: "Bruno Salas", email: "bruno@acme.test", team: "Finance" },
    { id: "m3", fullName: "Carla Méndez", email: "carla@acme.test", team: "Marketing" },
    { id: "m4", fullName: "Diego Toro", email: "diego@acme.test", team: "Support" },
  ];

  // Organization-wide policies: everyone inherits these.
  for (const policyId of ["prevent-secrets", "prompt-injection-protection"]) {
    s.assignments.push({ orgId: ORG, policyId, scope: "org", groupId: null });
  }

  const mkt: GroupRec = { id: "g-mkt", orgId: ORG, name: "Marketing Vibe Coders", description: "Dashboards & sites with anonymized data and approved tools." };
  const fin: GroupRec = { id: "g-fin", orgId: ORG, name: "Finance Analysts", description: "Tight data controls — no PII export, no production." };
  s.groups.push(mkt, fin);

  for (const policyId of ["prevent-pii-export", "no-production-access", "approved-apis-only", "public-publish-approval"]) {
    s.assignments.push({ orgId: ORG, policyId, scope: "group", groupId: mkt.id });
  }
  for (const policyId of ["prevent-pii-export", "no-production-access", "no-destructive-commands"]) {
    s.assignments.push({ orgId: ORG, policyId, scope: "group", groupId: fin.id });
  }

  s.memberships.push(
    { orgId: ORG, groupId: mkt.id, memberId: "m1" },
    { orgId: ORG, groupId: mkt.id, memberId: "m3" },
    { orgId: ORG, groupId: fin.id, memberId: "m2" }
  );
}

/** Demo members for the Team / Groups UI when there's no database. */
export function listDemoMembers(): DemoMember[] {
  return store().members;
}

// ── Sync demo accessors (used by effective-policy resolution in demo mode) ──────
export function demoOrgPolicyIds(orgId = "demo"): string[] {
  return store().assignments.filter((a) => a.orgId === orgId && a.scope === "org").map((a) => a.policyId);
}

export function demoGroupIdsForMember(memberId: string): string[] {
  return store().memberships.filter((m) => m.memberId === memberId).map((m) => m.groupId);
}

export function demoGroupPolicyIds(groupId: string): string[] {
  return store().assignments.filter((a) => a.scope === "group" && a.groupId === groupId).map((a) => a.policyId);
}

// ── Org resolution ─────────────────────────────────────────────────────────────
async function orgScope(): Promise<string | null> {
  if (!isSupabaseConfigured) return "demo";
  const viewer = await getViewer();
  return viewer?.orgId ?? null;
}

// ── Reads ──────────────────────────────────────────────────────────────────────
export async function listGroups(): Promise<GroupView[]> {
  const orgId = await orgScope();
  if (!orgId) return [];

  if (!isSupabaseConfigured) {
    const s = store();
    return s.groups
      .filter((gr) => gr.orgId === orgId)
      .map((gr) => ({
        id: gr.id,
        name: gr.name,
        description: gr.description,
        policyIds: s.assignments
          .filter((a) => a.scope === "group" && a.groupId === gr.id)
          .map((a) => a.policyId),
        memberIds: s.memberships.filter((m) => m.groupId === gr.id).map((m) => m.memberId),
      }));
  }

  const supabase = await createServerSupabase();
  const [{ data: groups }, { data: assignments }, { data: members }] = await Promise.all([
    supabase.from("groups").select("id, name, description").eq("org_id", orgId).order("created_at"),
    supabase.from("policy_assignments").select("policy_id, group_id").eq("org_id", orgId).eq("scope", "group").eq("enabled", true),
    supabase.from("group_members").select("group_id, member_id").eq("org_id", orgId),
  ]);

  return (groups ?? []).map((gr: { id: string; name: string; description: string }) => ({
    id: gr.id,
    name: gr.name,
    description: gr.description ?? "",
    policyIds: (assignments ?? []).filter((a: { group_id: string }) => a.group_id === gr.id).map((a: { policy_id: string }) => a.policy_id),
    memberIds: (members ?? []).filter((m: { group_id: string }) => m.group_id === gr.id).map((m: { member_id: string }) => m.member_id),
  }));
}

export async function listOrgPolicyIds(): Promise<string[]> {
  const orgId = await orgScope();
  if (!orgId) return [];

  if (!isSupabaseConfigured) {
    return store().assignments.filter((a) => a.orgId === orgId && a.scope === "org").map((a) => a.policyId);
  }

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("policy_assignments")
    .select("policy_id")
    .eq("org_id", orgId)
    .eq("scope", "org")
    .eq("enabled", true);
  return (data ?? []).map((a: { policy_id: string }) => a.policy_id);
}

// ── Writes ─────────────────────────────────────────────────────────────────────
export async function createGroup(name: string, description: string, policyIds: string[]): Promise<string | null> {
  const orgId = await orgScope();
  if (!orgId) return null;

  if (!isSupabaseConfigured) {
    const s = store();
    const id = `g-${randomUUID().slice(0, 8)}`;
    s.groups.push({ id, orgId, name, description });
    for (const policyId of dedupe(policyIds)) {
      s.assignments.push({ orgId, policyId, scope: "group", groupId: id });
    }
    return id;
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("groups")
    .insert({ org_id: orgId, name, description })
    .select("id")
    .single();
  if (error || !data) return null;
  await writeGroupPolicies(orgId, data.id, policyIds);
  return data.id;
}

export async function renameGroup(groupId: string, name: string, description: string): Promise<void> {
  const orgId = await orgScope();
  if (!orgId) return;
  if (!isSupabaseConfigured) {
    const gr = store().groups.find((x) => x.id === groupId && x.orgId === orgId);
    if (gr) {
      gr.name = name;
      gr.description = description;
    }
    return;
  }
  const supabase = await createServerSupabase();
  await supabase.from("groups").update({ name, description }).eq("id", groupId).eq("org_id", orgId);
}

export async function deleteGroup(groupId: string): Promise<void> {
  const orgId = await orgScope();
  if (!orgId) return;
  if (!isSupabaseConfigured) {
    const s = store();
    s.groups = s.groups.filter((x) => !(x.id === groupId && x.orgId === orgId));
    s.assignments = s.assignments.filter((a) => a.groupId !== groupId);
    s.memberships = s.memberships.filter((m) => m.groupId !== groupId);
    return;
  }
  const supabase = await createServerSupabase();
  // group_members + policy_assignments cascade via FK on the group row.
  await supabase.from("groups").delete().eq("id", groupId).eq("org_id", orgId);
}

export async function setGroupPolicies(groupId: string, policyIds: string[]): Promise<void> {
  const orgId = await orgScope();
  if (!orgId) return;
  if (!isSupabaseConfigured) {
    const s = store();
    s.assignments = s.assignments.filter((a) => !(a.scope === "group" && a.groupId === groupId));
    for (const policyId of dedupe(policyIds)) {
      s.assignments.push({ orgId, policyId, scope: "group", groupId });
    }
    return;
  }
  await writeGroupPolicies(orgId, groupId, policyIds, true);
}

export async function setOrgPolicies(policyIds: string[]): Promise<void> {
  const orgId = await orgScope();
  if (!orgId) return;
  if (!isSupabaseConfigured) {
    const s = store();
    s.assignments = s.assignments.filter((a) => !(a.orgId === orgId && a.scope === "org"));
    for (const policyId of dedupe(policyIds)) {
      s.assignments.push({ orgId, policyId, scope: "org", groupId: null });
    }
    return;
  }
  const supabase = await createServerSupabase();
  await supabase.from("policy_assignments").delete().eq("org_id", orgId).eq("scope", "org");
  if (policyIds.length) {
    await supabase.from("policy_assignments").insert(
      dedupe(policyIds).map((policy_id) => ({ org_id: orgId, policy_id, scope: "org", group_id: null, enabled: true }))
    );
  }
}

export async function setGroupMembers(groupId: string, memberIds: string[]): Promise<void> {
  const orgId = await orgScope();
  if (!orgId) return;
  if (!isSupabaseConfigured) {
    const s = store();
    s.memberships = s.memberships.filter((m) => m.groupId !== groupId);
    for (const memberId of dedupe(memberIds)) {
      s.memberships.push({ orgId, groupId, memberId });
    }
    return;
  }
  const supabase = await createServerSupabase();
  await supabase.from("group_members").delete().eq("group_id", groupId).eq("org_id", orgId);
  if (memberIds.length) {
    await supabase.from("group_members").insert(
      dedupe(memberIds).map((member_id) => ({ org_id: orgId, group_id: groupId, member_id }))
    );
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────
async function writeGroupPolicies(orgId: string, groupId: string, policyIds: string[], replace = false): Promise<void> {
  const supabase = await createServerSupabase();
  if (replace) {
    await supabase.from("policy_assignments").delete().eq("org_id", orgId).eq("scope", "group").eq("group_id", groupId);
  }
  if (policyIds.length) {
    await supabase.from("policy_assignments").insert(
      dedupe(policyIds).map((policy_id) => ({ org_id: orgId, policy_id, scope: "group", group_id: groupId, enabled: true }))
    );
  }
}

function dedupe(xs: string[]): string[] {
  return [...new Set(xs)];
}
