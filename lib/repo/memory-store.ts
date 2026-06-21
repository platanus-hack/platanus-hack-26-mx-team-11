import { randomUUID } from "node:crypto";
import type { RiskFlag, Session, SessionEvent } from "@/lib/types";

/** In-memory backend used in demo mode (no Supabase). Single demo org. */
class MemoryStore {
  private sessions = new Map<string, Session>();

  ensure(input: { id: string; user: string; team: string; title: string }) {
    if (this.sessions.has(input.id)) return;
    this.sessions.set(input.id, {
      id: input.id,
      userId: "demo",
      user: input.user,
      team: input.team,
      tool: "claude",
      title: input.title,
      status: "active",
      riskScore: 0,
      startedAt: Date.now(),
      events: [],
    });
  }

  record(input: {
    sessionId: string;
    type: SessionEvent["type"];
    who: string;
    content: string;
    riskScore: number;
    summary: string;
    flags: RiskFlag[];
  }) {
    const session = this.sessions.get(input.sessionId);
    if (!session) return;
    session.events.push({
      id: randomUUID(),
      type: input.type,
      who: input.who,
      content: input.content,
      timestamp: Date.now(),
      riskScore: input.riskScore,
      summary: input.summary,
      flags: input.flags,
    });
    session.riskScore = session.events.reduce((max, e) => Math.max(max, e.riskScore), 0);
  }

  end(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = "completed";
      session.endedAt = Date.now();
    }
  }

  recent(sessionId: string, limit: number) {
    const session = this.sessions.get(sessionId);
    return (session?.events ?? []).slice(-limit).map((e) => ({ type: e.type, who: e.who, content: e.content }));
  }

  list(): Session[] {
    return [...this.sessions.values()].sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      return b.startedAt - a.startedAt;
    });
  }
}

// Persist across Next.js dev hot-reloads.
const globalRef = globalThis as unknown as { __sn_mem?: MemoryStore };
export const memoryStore = globalRef.__sn_mem ?? (globalRef.__sn_mem = new MemoryStore());
