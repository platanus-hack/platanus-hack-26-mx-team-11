import type { RiskFlag, SessionEvent } from "@/lib/types";
import { isServiceConfigured } from "@/lib/db/env";
import { getServiceSupabase } from "@/lib/db/supabase/admin";
import { memoryStore } from "@/lib/repo/memory-store";

export interface EnsureInput {
  id: string;
  orgId: string;
  memberId: string;
  memberName: string;
  team: string;
  title: string;
}

export interface RecordInput {
  sessionId: string;
  orgId: string;
  type: SessionEvent["type"];
  who: string;
  content: string;
  riskScore: number;
  summary: string;
  flags: RiskFlag[];
}

export type ContextItem = { type: SessionEvent["type"]; who: string; content: string };

const useDb = () => isServiceConfigured;

/** Create the session on first sight (idempotent). */
export async function ensureSession(i: EnsureInput): Promise<void> {
  if (!useDb()) return memoryStore.ensure({ id: i.id, user: i.memberName, team: i.team, title: i.title });
  const supabase = getServiceSupabase()!;
  await supabase.from("sessions").upsert(
    {
      id: i.id,
      org_id: i.orgId,
      member_id: isUuid(i.memberId) ? i.memberId : null,
      member_name: i.memberName,
      team: i.team,
      title: i.title,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );
}

/** Recent prior events for the analyst's context window. */
export async function recentContext(sessionId: string, limit: number): Promise<ContextItem[]> {
  if (!useDb()) return memoryStore.recent(sessionId, limit);
  const supabase = getServiceSupabase()!;
  const { data } = await supabase
    .from("events")
    .select("type, who, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).reverse() as ContextItem[];
}

/** Persist one analyzed event + its flags, then bump the session's risk. */
export async function recordEvent(i: RecordInput): Promise<void> {
  if (!useDb()) {
    return memoryStore.record({
      sessionId: i.sessionId,
      type: i.type,
      who: i.who,
      content: i.content,
      riskScore: i.riskScore,
      summary: i.summary,
      flags: i.flags,
    });
  }
  const supabase = getServiceSupabase()!;
  const { data: event } = await supabase
    .from("events")
    .insert({
      session_id: i.sessionId,
      org_id: i.orgId,
      type: i.type,
      who: i.who,
      content: i.content,
      risk_score: i.riskScore,
      summary: i.summary,
    })
    .select("id")
    .single();

  if (event && i.flags.length) {
    await supabase.from("risk_flags").insert(
      i.flags.map((f) => ({
        event_id: event.id,
        org_id: i.orgId,
        category: f.category,
        severity: f.severity,
        title: f.title,
        explanation: f.explanation,
        suggested_fix: f.suggestedFix,
        confidence: f.confidence,
      }))
    );
  }
  await supabase.rpc("bump_session_risk", { p_session: i.sessionId, p_score: i.riskScore });
}

export async function endSession(orgId: string, sessionId: string): Promise<void> {
  if (!useDb()) return memoryStore.end(sessionId);
  const supabase = getServiceSupabase()!;
  await supabase
    .from("sessions")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("org_id", orgId);
}

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
