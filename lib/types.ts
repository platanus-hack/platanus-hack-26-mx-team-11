export type Role = "admin" | "employee";
export type Tool = "claude" | "copilot" | "cursor";
export type EventType = "prompt" | "response" | "code_change" | "tool_call";
export type RiskCategory = "pii" | "injection" | "insecure" | "policy";
export type Severity = "low" | "medium" | "high" | "critical";

export interface User {
  id: string;
  name: string;
  email: string;
  team: string;
  role: Role;
  orgId: string;
}

export interface RiskFlag {
  id: string;
  category: RiskCategory;
  severity: Severity;
  title: string;
  explanation: string; // plain-English, for non-technical users
  suggestedFix: string;
  confidence: number; // 0–1
}

export interface SessionEvent {
  id: string;
  type: EventType;
  who: string;
  content: string;
  timestamp: number; // epoch ms
  riskScore: number; // 0–100, the analyst's rating of THIS event
  summary: string; // one-line analyst note ("" when benign)
  flags: RiskFlag[];
}

export interface Session {
  id: string; // Claude Code's own session_id
  userId: string;
  user: string;
  team: string;
  tool: Tool;
  title: string;
  status: "active" | "completed";
  riskScore: number; // 0–100, aggregate of event flag weights
  startedAt: number;
  endedAt?: number;
  events: SessionEvent[];
}
