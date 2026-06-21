import { NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/auth/identity";
import { processHookEvent } from "@/lib/ingest/process";
import type { ClaudeHookEvent } from "@/lib/ingest/claudeHooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Receives Claude Code hook events. One endpoint, all event types. */
export async function POST(req: Request) {
  const identity = await resolveIdentity(req.headers.get("authorization"));
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let event: ClaudeHookEvent;
  try {
    event = (await req.json()) as ClaudeHookEvent;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!event?.session_id || !event?.hook_event_name) {
    return NextResponse.json({ error: "missing session_id or hook_event_name" }, { status: 400 });
  }

  const result = await processHookEvent(identity, event);

  if (result.blocked) {
    return NextResponse.json({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `Sentinel blocked this: ${result.reason}`,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
