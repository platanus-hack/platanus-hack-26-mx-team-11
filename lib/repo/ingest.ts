/**
 * Write side for the ingest pipeline. Demo mode writes to the in-memory store;
 * with the service role it persists to Postgres (bypassing RLS, org set
 * explicitly) and bumps the session's rolling max risk.
 */
import type { SessionEvent } from "@/lib/types";
import type { Identity } from "@/lib/auth/identity";
import { hasServiceRole } from "@/lib/db/env";
import { adminSupabase } from "@/lib/db/supabase/admin";
import { appendEvent, endSession, upsertSession } from "@/lib/repo/memstore";

export interface SessionMeta {
  id: string;
  title?: string;
}

/** Ensure the session row exists / is current. */
export async function recordSession(identity: Identity, meta: SessionMeta): Promise<void> {
  if (!hasServiceRole) {
    upsertSession(identity.orgId, {
      id: meta.id,
      user: identity.memberName,
      team: identity.team,
      title: meta.title,
    });
    return;
  }
  const db = adminSupabase();
  if (!db) return;
  await db.from("sessions").upsert(
    {
      id: meta.id,
      org_id: identity.orgId,
      member_id: isUuid(identity.memberId) ? identity.memberId : null,
      member_name: identity.memberName,
      team: identity.team,
      ...(meta.title ? { title: meta.title } : {}),
    },
    { onConflict: "id" }
  );
}

/** Persist one analyzed event and its flags; raise session risk. */
export async function recordEvent(identity: Identity, sessionId: string, event: SessionEvent): Promise<void> {
  if (!hasServiceRole) {
    appendEvent(identity.orgId, sessionId, event);
    return;
  }
  const db = adminSupabase();
  if (!db) return;

  const { data: inserted } = await db
    .from("events")
    .insert({
      session_id: sessionId,
      org_id: identity.orgId,
      type: event.type,
      who: event.who,
      content: event.content,
      risk_score: event.riskScore,
      summary: event.summary ?? "",
    })
    .select("id")
    .single();

  const eventId = inserted?.id;
  if (eventId && event.flags.length) {
    await db.from("risk_flags").insert(
      event.flags.map((f) => ({
        event_id: eventId,
        org_id: identity.orgId,
        category: f.category,
        severity: f.severity,
        title: f.title,
        explanation: f.explanation,
        suggested_fix: f.suggestedFix,
        confidence: f.confidence ?? 0.5,
      }))
    );
  }

  await db.rpc("bump_session_risk", { p_session: sessionId, p_score: event.riskScore });
}

export async function markSessionEnded(identity: Identity, sessionId: string): Promise<void> {
  if (!hasServiceRole) {
    endSession(sessionId);
    return;
  }
  const db = adminSupabase();
  if (!db) return;
  await db
    .from("sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("org_id", identity.orgId);
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
