import type { Policy } from "@/lib/policy/types";

/** How the generated hooks authenticate to the ingest endpoint. */
export type AuthMode =
  | { kind: "env"; envVar: string } // header reads $ENV — manual / managed setup
  | { kind: "token"; token: string }; // header embeds the token — one-line installer

export interface GenerateInput {
  endpoint: string; // e.g. https://app.sentinel.dev or http://localhost:3000
  policies: Policy[];
  auth: AuthMode;
  defaultMode?: string; // permissions.defaultMode (omitted when "default")
}

const TRACKED_EVENTS = ["SessionStart", "UserPromptSubmit", "Stop", "SessionEnd"] as const;
const unique = (values: string[]) => [...new Set(values)];

/**
 * Produce a complete Claude Code settings.json: Sentinel's tracking hooks plus
 * the permission rules from the selected policies. Drop into ~/.claude/settings.json
 * (or push via managed settings to enforce org-wide).
 */
export function buildSettings({ endpoint, policies, auth, defaultMode }: GenerateInput) {
  const url = `${endpoint.replace(/\/+$/, "")}/api/ingest`;
  const authorization = auth.kind === "env" ? `Bearer $${auth.envVar}` : `Bearer ${auth.token}`;
  const hook = {
    type: "http",
    url,
    headers: { Authorization: authorization },
    ...(auth.kind === "env" ? { allowedEnvVars: [auth.envVar] } : {}),
  };

  const hooks: Record<string, unknown> = { PreToolUse: [{ matcher: "*", hooks: [hook] }] };
  for (const event of TRACKED_EVENTS) hooks[event] = [{ hooks: [hook] }];

  const deny = unique(policies.flatMap((p) => p.rules.deny ?? []));
  const ask = unique(policies.flatMap((p) => p.rules.ask ?? []));

  const permissions: Record<string, unknown> = {};
  if (deny.length) permissions.deny = deny;
  if (ask.length) permissions.ask = ask;
  if (defaultMode && defaultMode !== "default") permissions.defaultMode = defaultMode;

  const settings: Record<string, unknown> = {};
  if (Object.keys(permissions).length) settings.permissions = permissions;
  settings.hooks = hooks;
  return settings;
}

/** Resolve policy ids → policy objects (for buildSettings input). */
export function resolvePolicies(catalog: Policy[], ids: string[]): Policy[] {
  return ids.map((id) => catalog.find((p) => p.id === id)).filter((p): p is Policy => Boolean(p));
}
