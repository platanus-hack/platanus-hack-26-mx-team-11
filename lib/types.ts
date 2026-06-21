/**
 * The domain model shared by the console UI, the repo layer, and the analyst.
 * Kept framework-free so both server and client can import it.
 */

/** What kind of risk a flag describes (matches the analyst's categories). */
export type RiskCategory = "policy" | "pii" | "insecure" | "injection";

/** Flag severity — the analyst's 0–100 score bucketed for display + colour. */
export type RiskSeverity = "low" | "medium" | "high" | "critical";

/** The shapes of activity we record within a session. */
export type EventType = "prompt" | "response" | "code_change" | "tool_call";

export type SessionStatus = "active" | "ended";

/** One concrete risk the analyst raised on a single event. */
export interface RiskFlag {
  id: string;
  category: RiskCategory;
  severity: RiskSeverity;
  title: string;
  explanation: string;
  /** A concrete, safer rewrite of what triggered the flag. */
  suggestedFix: string;
  confidence?: number;
}

/** A single moment in a session: a prompt, a response, a tool call, an edit. */
export interface SessionEvent {
  id: string;
  type: EventType;
  /** Display name of who produced it ("Ana" / "Claude Code"). */
  who: string;
  content: string;
  summary?: string;
  riskScore: number;
  /** ISO timestamp. */
  timestamp: string;
  flags: RiskFlag[];
}

/** A Claude Code session as the console sees it. */
export interface Session {
  id: string;
  user: string;
  team: string;
  title: string;
  tool: string;
  status: SessionStatus;
  /** Max event score so far — the single most dangerous moment. */
  riskScore: number;
  startedAt: string;
  events: SessionEvent[];
}

/** The decision the pre-request hook reached for a vibe coder's request. */
export type Decision = "allowed" | "enriched" | "corrected" | "blocked";
