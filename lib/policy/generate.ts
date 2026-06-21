/**
 * Generate the `~/.claude/settings.json` an agent needs to be governed by
 * CodeSentinel: the declarative permission rules from the selected policies plus
 * the hooks that (a) review each request before it runs and (b) stream activity
 * to the console for observability.
 */
import type { Policy } from "@/lib/policy/catalog";

export type AuthConfig =
  | { kind: "token"; token: string }
  | { kind: "env"; envVar: string };

export interface BuildSettingsInput {
  endpoint: string;
  policies: Policy[];
  auth: AuthConfig;
  /** Claude Code default permission mode. */
  defaultMode?: "default" | "acceptEdits" | "plan";
}

export interface ClaudeHook {
  type: "command";
  command: string;
}
export interface HookMatcher {
  matcher?: string;
  hooks: ClaudeHook[];
}
export interface GeneratedSettings {
  permissions: { deny?: string[]; ask?: string[]; defaultMode?: string };
  hooks: Record<string, HookMatcher[]>;
}

/** Filter the library down to a set of ids, preserving catalog order. */
export function resolvePolicies(all: Policy[], ids: string[]): Policy[] {
  const want = new Set(ids);
  return all.filter((p) => want.has(p.id));
}

/** Render the Authorization header value for the chosen auth mode. */
function authHeader(auth: AuthConfig): string {
  return auth.kind === "token"
    ? `Authorization: Bearer ${auth.token}`
    : `Authorization: Bearer $${auth.envVar}`;
}

/** A curl one-liner that POSTs the hook's stdin JSON to a CodeSentinel route. */
function post(endpoint: string, path: string, auth: AuthConfig): ClaudeHook {
  const url = `${endpoint.replace(/\/$/, "")}${path}`;
  return {
    type: "command",
    command:
      `curl -fsS -m 12 -X POST ${url} ` +
      `-H "${authHeader(auth)}" -H "content-type: application/json" --data-binary @-`,
  };
}

export function buildSettings(input: BuildSettingsInput): GeneratedSettings {
  const { endpoint, policies, auth, defaultMode = "default" } = input;

  const deny = dedupe(policies.flatMap((p) => p.rules.deny ?? []));
  const ask = dedupe(policies.flatMap((p) => p.rules.ask ?? []));

  const permissions: GeneratedSettings["permissions"] = { defaultMode };
  if (deny.length) permissions.deny = deny;
  if (ask.length) permissions.ask = ask;

  return {
    permissions,
    hooks: {
      // Pre-request governance: review (and possibly rewrite/block) before send.
      UserPromptSubmit: [{ hooks: [post(endpoint, "/api/evaluate", auth)] }],
      // Observability: stream activity to the console.
      PreToolUse: [{ matcher: "*", hooks: [post(endpoint, "/api/ingest", auth)] }],
      PostToolUse: [{ matcher: "*", hooks: [post(endpoint, "/api/ingest", auth)] }],
      Stop: [{ hooks: [post(endpoint, "/api/ingest", auth)] }],
    },
  };
}

function dedupe(xs: string[]): string[] {
  return [...new Set(xs)];
}
