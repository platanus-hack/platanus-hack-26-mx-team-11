/**
 * Map a Claude Code hook event to our domain model, run the analyst, persist it,
 * and decide whether to block. This is the observability path; the pre-request
 * correction path lives in app/api/evaluate.
 */
import { randomUUID } from "crypto";
import type { EventType, SessionEvent } from "@/lib/types";
import type { Identity } from "@/lib/auth/identity";
import type { ClaudeHookEvent } from "@/lib/ingest/claudeHooks";
import { blockCritical } from "@/lib/db/env";
import { analyzeEvent } from "@/lib/risk/analyzer";
import { markSessionEnded, recordEvent, recordSession } from "@/lib/repo/ingest";

export interface ProcessResult {
  blocked?: boolean;
  reason?: string;
}

export async function processHookEvent(identity: Identity, event: ClaudeHookEvent): Promise<ProcessResult> {
  const sessionId = event.session_id;
  await recordSession(identity, { id: sessionId, title: deriveTitle(event) });

  // Lifecycle-only events: close the session, nothing to analyze.
  if (event.hook_event_name === "Stop" || event.hook_event_name === "SessionEnd") {
    await markSessionEnded(identity, sessionId);
    return {};
  }

  const mapped = toEventShape(event, identity);
  if (!mapped) return {};

  const assessment = await analyzeEvent({ type: mapped.type, who: mapped.who, content: mapped.content });

  const sessionEvent: SessionEvent = {
    id: randomUUID(),
    type: mapped.type,
    who: mapped.who,
    content: mapped.content,
    summary: assessment.summary || undefined,
    riskScore: assessment.riskScore,
    timestamp: new Date().toISOString(),
    flags: assessment.flags,
  };
  await recordEvent(identity, sessionId, sessionEvent);

  // Hard backstop: deny a critical tool call before it runs (opt-in).
  if (event.hook_event_name === "PreToolUse" && blockCritical) {
    const crit = assessment.flags.find((f) => f.severity === "critical");
    if (crit) return { blocked: true, reason: crit.suggestedFix || assessment.summary || crit.title };
  }
  return {};
}

interface EventShape {
  type: EventType;
  who: string;
  content: string;
}

function toEventShape(event: ClaudeHookEvent, identity: Identity): EventShape | null {
  switch (event.hook_event_name) {
    case "UserPromptSubmit":
      return event.prompt
        ? { type: "prompt", who: identity.memberName, content: event.prompt }
        : null;
    case "PreToolUse":
    case "PostToolUse":
      return {
        type: "tool_call",
        who: "Claude Code",
        content: `${event.tool_name ?? "tool"} ${stringifyInput(event.tool_input)}`.trim(),
      };
    case "Notification":
      return event.message ? { type: "response", who: "Claude Code", content: event.message } : null;
    default:
      return null;
  }
}

function deriveTitle(event: ClaudeHookEvent): string | undefined {
  if (event.hook_event_name === "UserPromptSubmit" && event.prompt) {
    return event.prompt.split(/\s+/).slice(0, 7).join(" ");
  }
  return undefined;
}

function stringifyInput(input: Record<string, unknown> | undefined): string {
  if (!input) return "";
  try {
    const s = JSON.stringify(input);
    return s.length > 800 ? `${s.slice(0, 800)}…` : s;
  } catch {
    return "";
  }
}
