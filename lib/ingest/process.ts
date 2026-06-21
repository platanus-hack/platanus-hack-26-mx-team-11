import type { RiskFlag, SessionEvent } from "@/lib/types";
import type { Identity } from "@/lib/auth/identity";
import { ensureSession, endSession, recentContext, recordEvent } from "@/lib/repo/ingest";
import { analyzeEvent, isCritical } from "@/lib/risk/analyzer";
import {
  describeTool,
  isCodeChange,
  titleFromCwd,
  type ClaudeHookEvent,
} from "@/lib/ingest/claudeHooks";

export interface IngestResult {
  ok: boolean;
  blocked: boolean;
  reason?: string;
}

const ACCEPTED: IngestResult = { ok: true, blocked: false };
const MAX_CONTEXT_EVENTS = 6;

/**
 * Translate one Claude Code hook event into our domain model, run the analyst,
 * and persist it. Returns whether the tool call should be blocked (PreToolUse +
 * a critical flag + blocking enabled).
 */
export async function processHookEvent(identity: Identity, e: ClaudeHookEvent): Promise<IngestResult> {
  await ensureSession({
    id: e.session_id,
    orgId: identity.orgId,
    memberId: identity.id,
    memberName: identity.name,
    team: identity.team,
    title: titleFromCwd(e.cwd),
  });

  switch (e.hook_event_name) {
    case "SessionStart":
      return ACCEPTED;

    case "UserPromptSubmit":
      await record(identity, e.session_id, "prompt", identity.name, e.prompt);
      return ACCEPTED;

    case "PreToolUse": {
      const content = describeTool(e.tool_name, e.tool_input);
      const type = isCodeChange(e.tool_name) ? "code_change" : "tool_call";
      const flags = await record(identity, e.session_id, type, "Claude Code", content);
      if (isCritical(flags) && process.env.CS_BLOCK_CRITICAL === "true") {
        return { ok: true, blocked: true, reason: flags.find((f) => f.severity === "critical")!.explanation };
      }
      return ACCEPTED;
    }

    case "SessionEnd":
      await endSession(identity.orgId, e.session_id);
      return ACCEPTED;

    default: // Stop and any future events.
      return ACCEPTED;
  }
}

/** Analyze an event against the session's recent history, then store it. */
async function record(
  identity: Identity,
  sessionId: string,
  type: SessionEvent["type"],
  who: string,
  content: string
): Promise<RiskFlag[]> {
  const context = await recentContext(sessionId, MAX_CONTEXT_EVENTS);
  const assessment = await analyzeEvent({ type, who, content, context });
  await recordEvent({
    sessionId,
    orgId: identity.orgId,
    type,
    who,
    content,
    riskScore: assessment.riskScore,
    summary: assessment.summary,
    flags: assessment.flags,
  });
  return assessment.flags;
}
