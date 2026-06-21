/**
 * Claude Code hook payloads. One ingest endpoint handles every event type; these
 * are the fields we read. See the Claude Code hooks docs for the full shape.
 */

export type HookEventName =
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse"
  | "Stop"
  | "SubagentStop"
  | "SessionStart"
  | "SessionEnd"
  | "Notification";

export interface ClaudeHookEvent {
  session_id: string;
  hook_event_name: HookEventName | string;
  transcript_path?: string;
  cwd?: string;

  /** UserPromptSubmit */
  prompt?: string;

  /** Pre/PostToolUse */
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: unknown;

  /** Notification / generic */
  message?: string;
}
