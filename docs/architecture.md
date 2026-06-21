# Architecture

Sentinel is a single Next.js (App Router) application. Frontend, API, and
risk-analysis logic deploy together to Vercel; Postgres lives on Supabase.

```
 Teammate's machine                         Sentinel (Vercel)                    Supabase
┌────────────────────┐                  ┌───────────────────────────┐        ┌──────────────┐
│ Claude Code        │   http hooks     │ POST /api/ingest          │        │ Postgres     │
│  (Sentinel hooks)  │ ───────────────▶ │   1. resolve token→member │        │  + RLS       │
│                    │                  │   2. LLM analyst (Claude) │ ─────▶ │  sessions    │
└────────────────────┘                  │   3. persist (service key)│        │  events      │
                                        └───────────────────────────┘        │  risk_flags  │
 Admin's browser                          ▲            │                     └──────────────┘
┌────────────────────┐  poll /api/sessions│            │ writes                     ▲
│ Console (dark)     │ ───────────────────┘            ▼                            │ RLS reads
│ Team · Policies    │                  ┌───────────────────────────┐               │
└────────────────────┘ ◀──────────────  │ Dashboard (RLS, org-scoped)│ ──────────────┘
                         server render   └───────────────────────────┘
```

## Request flows

**Ingestion** (`app/api/ingest`): Claude Code POSTs a hook event. `resolveIdentity`
(`lib/auth/identity.ts`) maps the bearer token to a member+org (hashed lookup in
Supabase, or the env dev key in demo mode). `processHookEvent`
(`lib/ingest/process.ts`) maps the payload to our domain, runs the analyst
(`lib/risk/analyzer.ts`), and persists via the repository (`lib/repo/ingest.ts`)
using the service-role key (bypasses RLS, scoped by the org we resolved).

**Dashboard** (`app/api/sessions` + `/dashboard`): the console polls for sessions.
`listSessionsForViewer` (`lib/repo/dashboard.ts`) reads under the signed-in
admin's RLS context, so an org only ever sees its own data.

**Team & onboarding** (`/dashboard/team`): server actions (`app/dashboard/team/actions.ts`)
CRUD members and mint per-member tokens. The installer endpoint
(`app/api/install/[token]`) returns a shell script that wires the member's Claude
Code with their role's policies.

## Layering

- **`app/`** — routes, pages, server actions, API handlers. Thin: HTTP + auth only.
- **`components/`** — presentational React, split by surface (marketing/auth/dashboard/team/policy). Palette-agnostic via `lib/ui/theme`.
- **`lib/`** — all logic behind clean interfaces: `repo` (data), `risk` (analyst), `policy` (rules), `auth` (identity/session/tokens), `db` (Supabase plumbing).

The `repo` layer is the seam: it has a Supabase implementation and an in-memory
one, selected by whether Supabase env is present. Swapping the database touches
only `lib/repo` and `lib/db`.

## Why this shape

- **One app, one deploy** — minimal infra, fast to iterate, Vercel-native.
- **Graceful degradation** — no credentials → demo mode, so the build and the
  core tracking demo always work.
- **Security by construction** — untrusted hook content is analyzed as data
  (see [agent.md](./agent.md)); tenants are isolated by RLS (see [database.md](./database.md)).
