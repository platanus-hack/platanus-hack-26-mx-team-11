import type { RiskFlag, Session, SessionEvent } from "@/lib/types";
import type { EventRow, RiskFlagRow, SessionRow } from "@/lib/db/types";

type EventWithFlags = EventRow & { risk_flags?: RiskFlagRow[] };
type SessionWithEvents = SessionRow & { events?: EventWithFlags[] };

const ms = (iso: string) => new Date(iso).getTime();

export const mapFlag = (r: RiskFlagRow): RiskFlag => ({
  id: r.id,
  category: r.category as RiskFlag["category"],
  severity: r.severity as RiskFlag["severity"],
  title: r.title,
  explanation: r.explanation,
  suggestedFix: r.suggested_fix,
  confidence: Number(r.confidence),
});

export const mapEvent = (r: EventWithFlags): SessionEvent => ({
  id: r.id,
  type: r.type as SessionEvent["type"],
  who: r.who,
  content: r.content,
  timestamp: ms(r.created_at),
  riskScore: r.risk_score,
  summary: r.summary,
  flags: (r.risk_flags ?? []).map(mapFlag),
});

export const mapSession = (r: SessionWithEvents): Session => ({
  id: r.id,
  userId: r.member_id ?? "",
  user: r.member_name,
  team: r.team,
  tool: "claude",
  title: r.title,
  status: r.status as Session["status"],
  riskScore: r.risk_score,
  startedAt: ms(r.started_at),
  endedAt: r.ended_at ? ms(r.ended_at) : undefined,
  events: (r.events ?? []).slice().sort((a, b) => ms(a.created_at) - ms(b.created_at)).map(mapEvent),
});

/** Active sessions first, then most recently started. */
export const activeFirst = (a: Session, b: Session) => {
  if (a.status !== b.status) return a.status === "active" ? -1 : 1;
  return b.startedAt - a.startedAt;
};
