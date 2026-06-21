/** Shapes of the JSON Claude Code POSTs to an `http` hook, per event. */

interface Base {
  session_id: string;
  cwd: string;
  transcript_path?: string;
  permission_mode?: string;
}

export interface SessionStartEvent extends Base {
  hook_event_name: "SessionStart";
  source?: string;
}
export interface UserPromptSubmitEvent extends Base {
  hook_event_name: "UserPromptSubmit";
  prompt: string;
}
export interface PreToolUseEvent extends Base {
  hook_event_name: "PreToolUse";
  tool_name: string;
  tool_input: Record<string, unknown>;
}
export interface StopEvent extends Base {
  hook_event_name: "Stop";
}
export interface SessionEndEvent extends Base {
  hook_event_name: "SessionEnd";
  reason?: string;
}

export type ClaudeHookEvent =
  | SessionStartEvent
  | UserPromptSubmitEvent
  | PreToolUseEvent
  | StopEvent
  | SessionEndEvent;

const CODE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);

/** Tools that produce a code change vs. a generic tool call, for timeline labelling. */
export function isCodeChange(toolName: string): boolean {
  return CODE_TOOLS.has(toolName);
}

/** Collapse a tool_input object into one readable line for the timeline + rules. */
export function describeTool(toolName: string, input: Record<string, unknown>): string {
  if (toolName === "Bash" && typeof input.command === "string") {
    return `Bash: ${input.command}`;
  }
  if (isCodeChange(toolName)) {
    const path = (input.file_path ?? input.notebook_path ?? "file") as string;
    const body = (input.file_text ?? input.new_string ?? input.content ?? "") as string;
    return `${path}\n${String(body).slice(0, 600)}`.trim();
  }
  return `${toolName}: ${JSON.stringify(input).slice(0, 600)}`;
}

/** Derive a friendly session title from the working directory. */
export function titleFromCwd(cwd: string): string {
  const base = cwd.replace(/\/+$/, "").split("/").pop();
  return base && base.length ? base : "claude session";
}
