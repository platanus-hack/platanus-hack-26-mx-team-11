# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**CodeSentinel** — real-time security & observability platform for AI-assisted coding (Claude Code, Cursor, Copilot). Built for Platanus Hack 26 CDMX.

Full-stack Next.js 15 app (TypeScript, React 19, Supabase, Anthropic Claude API). No UI component library — all styling uses inline CSS + CSS variables defined in `components/dashboard/theme.ts`.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run start    # Run production build
```

No lint or test scripts are configured yet.

## Environment Setup

Copy `.env.example` to `.env.local`. The app has a **demo mode**: if Supabase vars are absent, it runs with an in-memory store, no auth, and the built-in dev key `cs_dev_local` works for testing ingest.

Required for full functionality:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY` (for risk scoring; model defaults to `claude-sonnet-4-6`)
- `CODESENTINEL_KEYS` (JSON map of bearer token → member identity)

## Architecture

### Routing (App Router)

| Route | Purpose |
|---|---|
| `/` | Public landing page |
| `/login`, `/register` | Auth forms (admin users only) |
| `/dashboard` | Live session console (protected) |
| `/dashboard/groups` | Create groups, attach Library policies (org + group scope), assign members |
| `/dashboard/team` | Team management + member onboarding |
| `/policies` | Policy Studio — generate `settings.json` for Claude Code |
| `POST /api/evaluate` | **Pre-request hook** (UserPromptSubmit) — enrich/reformulate/block a request before the agent runs |
| `POST /api/ingest` | Receives Claude Code hook events from tracked members (observability) |
| `GET /api/sessions` | Live feed polled by console (RLS-scoped) |
| `GET /api/install/[token]` | Per-member curl installer script |

`middleware.ts` refreshes Supabase sessions and protects all `/dashboard*` routes.

### Data Flow

```
Claude Code hook → POST /api/ingest
  → lib/auth/identity.ts      (resolve bearer token → member + org)
  → lib/ingest/process.ts     (map payload → domain model)
  → lib/risk/analyzer.ts      (Claude API risk analysis)
  → lib/repo/ingest.ts        (persist session/event/flag to Supabase)
```

The console polls `/api/sessions` every 1.5 s and renders real-time updates.

### Key Directories

- `app/` — Next.js routes, page components, server actions
- `components/` — React components grouped by surface (`marketing/`, `auth/`, `dashboard/`, `team/`, `policy/`, `ui/`)
- `lib/` — **Business logic** (implemented — see below)
- `supabase/migrations/` — Plain SQL schema, RLS policies, triggers, functions
- `docs/` — Architecture, auth, database, agent, policies, onboarding, deploy docs

### `lib/` Layer

The `lib/` directory is the main layer that wires everything together (implemented):

- `lib/auth/` — identity resolution (`identity.ts`), admin session helpers (`session.ts`), token gen/hash/lookup (`tokens.ts`)
- `lib/db/` — `env.ts` (config, `isSupabaseConfigured`, static keys), `supabase/{server,browser,admin}.ts`
- `lib/risk/` — `analyzer.ts` (post-hoc event scoring) + `systemPrompt.ts`, and `evaluateRequest.ts` (the pre-request governor)
- `lib/ingest/` — `claudeHooks.ts` (payload types), `process.ts` (hook → analyst → persist)
- `lib/repo/` — `memstore.ts` (demo in-memory store, anchored on globalThis), `dashboard.ts`, `members.ts`, `ingest.ts`
- `lib/policy/` — `catalog.ts` (spec-aligned Policy Library), `roles.ts` (presets, used as optional group templates), `generate.ts` (settings.json + hooks), `effective.ts` (org+group resolution, union)
- `lib/repo/groups.ts` — admin-created groups + org/group policy assignments + memberships (Supabase or in-memory demo, seeded)
- `lib/client/useSessions.ts` — polls `/api/sessions`; `lib/ui/theme.ts` — tokens + helpers; `lib/types.ts` — domain types

**Graceful degradation:** every module falls back to demo mode when Supabase / `ANTHROPIC_API_KEY` are absent — in-memory store, the `cs_dev_local` key (acts as a Marketing vibe coder), and a heuristic keyword evaluator instead of the LLM. `npm run build` and the demo console work with zero env vars.

**Groups UI (`/dashboard/groups`):** admins create their own groups (not fixed presets — role presets are only optional creation templates), attach Library policies at org or group scope via the `PolicyLibrary` modal (`components/policy/PolicyLibrary.tsx`, search + filter by category/severity/source), and assign members. In demo mode the `cs_dev_local` key acts as member `m1` (Ana, Marketing), so editing the Marketing group changes what `/api/evaluate` enforces for that key live.

**Pending (next steps):** dashboard decision/severity filters, and applying migration `0005_groups_governance.sql` to a real Supabase project. The Team page still uses the legacy per-member role model. See `docs/governance-spec.md`.

### Database (Supabase / PostgreSQL)

Core tables: `orgs`, `profiles`, `members`, `member_tokens`, `sessions`, `events`, `risk_flags`.

Multi-tenancy is enforced via **Row-Level Security** — every table has `org_id` scoped RLS. The `/api/ingest` route uses the service-role key (bypasses RLS) and sets `org_id` explicitly. Signup auto-creates an org + profile via a database trigger.

### Authentication Model

Two distinct identity types:
1. **Admin users** — register via email/password, manage teams via Supabase Auth session cookie
2. **Tracked members** — citizen developers; not auth users; identified by per-member bearer tokens sent in Claude Code hook headers. Tokens are hashed at rest and revocable.

### Risk Analysis (Injection Defense)

Three-layer defense in depth against prompt injection from user code:
1. **Structural** — `tool_choice` forces a single `report_risk` tool call; only the tool input is read (not text output)
2. **Spotlighting** — untrusted content is wrapped in `<event>` tags between framing reminders
3. **Behavioral** — system prompt states that manipulation attempts raise scores, never lower them

### Policy Engine

Policies are named rule sets (e.g. "Protect production", "Protect secrets"). Roles are presets that bundle policies for specific personas (Finance, Support, Marketing, etc.). The Policy Studio UI generates a `settings.json` file that members paste into their Claude Code setup to enforce rules.

## Docs

`docs/` contains detailed documentation on every subsystem. Read the relevant doc before modifying a subsystem:
- `docs/architecture.md` — full system design and request flow diagrams
- `docs/auth.md` — login/register, demo mode, token lifecycle
- `docs/database.md` — schema, RLS, migration workflow
- `docs/agent.md` — LLM risk analyst design, prompt caching, tuning
- `docs/policies.md` — policy and role definitions
- `docs/onboarding.md` — member token model, installer script
- `docs/deploy.md` — Vercel + Supabase production setup
