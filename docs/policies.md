# Roles & policies

Policy is how Sentinel goes from *watching* to *enforcing*. It maps to native
Claude Code permission rules, generated into each member's `settings.json`.

## Concepts

- **Policy** (`lib/policy/catalog.ts`) — a named bundle of permission rules.
  `deny` = refused outright; `ask` = forces a confirmation. e.g. *Protect
  production*, *No destructive commands*, *Protect secrets*, *No external
  network*, *Approve deploys*, *Approve installs*.
- **Role** (`lib/policy/roles.ts`) — a preset that selects a sensible set of
  policies. e.g. Finance, Support, Marketing, Engineering, Locked down.
- **Member** — has one `role_id` and a `policy_ids[]` selection (defaulted from
  the role, then editable per person).

## Assigning (Team page)

`/dashboard/team`:
- **Add member** with a role → policies default from that role.
- **Change role** → resets policies to the new role's defaults.
- **Policies · N** → toggle individual policies for that member, Save.
- **Get setup** → regenerates a token and opens onboarding with the install
  command + the exact `settings.json` those policies produce.

## How rules reach Claude Code

`buildSettings` (`lib/policy/generate.ts`) merges the selected policies' `deny`/
`ask` arrays (deduped) into `permissions`, alongside the tracking hooks. The
installer writes that into `~/.claude/settings.json`.

## The three enforcement layers

1. **Declarative rules** (these policies) — pattern-matched, instant, free. Good
   for known-bad shapes (`Bash(psql *)`, `Read(./.env)`).
2. **The LLM analyst** — contextual judgment for novel/obfuscated risk; can
   `deny` critical `PreToolUse` actions when `CS_BLOCK_CRITICAL=true`.
3. **Managed settings / sandbox** — for things that must *never* run and can't be
   user-removed. Command-string rules are defense-in-depth, not airtight (a
   `psql "$DB"` evades `Bash(psql *)`); the OS sandbox is sturdier.

## Policy Studio

`/policies` is a standalone generator (no member needed) for quick experiments or
the managed-settings path. It uses the env-var auth mode
(`Authorization: Bearer $CODESENTINEL_KEY`) rather than an embedded token.

## Extending

Add a policy to `POLICIES` (id, label, description, category, rules) and, if it
should ship with a role by default, reference its id in that role's `policyIds`.
No schema change needed — members store `policy_ids` as text.
