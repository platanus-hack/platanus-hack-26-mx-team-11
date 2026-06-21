# Onboarding & tokens

How a teammate's Claude Code starts reporting to your console.

## The token model — per-member, not org-wide

Each member gets a **unique opaque token** (`snt_live_…`). We considered an
org-wide shared token and rejected it: the hook only transmits its bearer header,
so identity must live in the token. A shared token couldn't attribute a session to
a person or team, couldn't drive per-role policy, and couldn't be revoked for one
user. Per-member tokens give us all three while staying just as simple to install.

- Generated in `lib/auth/tokens.ts` (`generateToken`).
- Stored **hashed** (`member_tokens.token_hash = sha256(token)`) with a short
  display prefix. The plaintext is shown to the admin **once**, at creation or
  regeneration.
- Resolved on every ingest request by `lookupMemberByToken` → member + org +
  role + policies. Revoked tokens (`revoked_at`) stop working immediately.

## The one-line installer — chosen mechanism

We weighed a native binary (heavy, scary, multi-platform builds), a pip package
(needs Python, off-domain), and manual JSON editing (error-prone for
non-technical users). The winner is a **per-member one-line command**:

```bash
curl -fsSL https://<app>/api/install/<token> | sh
```

`app/api/install/[token]/route.ts` looks up the member, builds their
`settings.json` (Sentinel hooks + their role's policy rules, with the token
embedded so there's no env-var step), and returns a small, auditable POSIX script
that **merges** it into `~/.claude/settings.json` (backing up any existing file)
using Node — which ships with Claude Code. One paste, nothing to install.

The admin gets this command from **Team → Get setup** (the onboarding modal),
which also shows the raw `settings.json` for the manual / managed-settings path.

## What lands on the machine

`buildSettings` (`lib/policy/generate.ts`) emits:
- **hooks** — `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `Stop`,
  `SessionEnd`, each an `http` hook POSTing to `/api/ingest` with the token.
- **permissions** — the `deny`/`ask` rules from the member's policies (see
  [policies.md](./policies.md)).

## Lifecycle

- **Add member** (Team page) → mints the first token, opens onboarding.
- **Regenerate** ("Get setup" again) → revokes old tokens, issues a fresh one.
- **Remove member** → cascades (tokens, and the member link on past sessions is
  nulled, sessions are retained for audit).

## Security notes

- The token appears in the install URL; serve over HTTPS in production. It's a
  one-time setup link and identical in power to the bearer it installs.
- The installer is human-readable at the URL — encourage the cautious to inspect
  it before piping to `sh`.
- For org-wide enforcement users can't remove, push the same `settings.json` via
  Claude Code **managed settings** instead of the per-user install.
