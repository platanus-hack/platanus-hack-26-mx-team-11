# Sentinel — Documentation

Open-source security & observability for AI-assisted coding. One Next.js app
(Vercel) + Postgres (Supabase). This folder explains every module and where to
find it.

## Start here

| You want to… | Read | Key files |
|---|---|---|
| Understand the whole system | [architecture.md](./architecture.md) | — |
| Set up the database | [database.md](./database.md) | `supabase/migrations/*` |
| Understand login/register | [auth.md](./auth.md) | `app/(auth)/*`, `middleware.ts`, `lib/auth/session.ts` |
| Onboard a teammate's Claude Code | [onboarding.md](./onboarding.md) | `app/api/install/[token]`, `lib/auth/tokens.ts` |
| Tune risk detection | [agent.md](./agent.md) | `lib/risk/*` |
| Manage roles & policies | [policies.md](./policies.md) | `lib/policy/*`, `app/dashboard/team/*` |
| Plan governance & pre-request enforcement | [governance-spec.md](./governance-spec.md) | *(spec — org/group policies, intercept-before)* |
| Deploy to production | [deploy.md](./deploy.md) | `.env.example` |
| Hand-write the Claude Code hooks | [INTEGRATION.md](./INTEGRATION.md) | — |

## Map of the codebase

```
app/
  page.tsx                     Landing (public, light theme)
  (auth)/                      login, register, auth actions, auth layout
  dashboard/                   Console (protected, dark theme)
    page.tsx                   live session console
    team/                      add members · assign roles/policies · onboarding
  policies/                    standalone settings.json generator (Policy Studio)
  api/
    ingest/                    receives Claude Code hook events
    sessions/                  live feed the console polls
    install/[token]/           per-member one-line installer script

components/
  ui/Brand.tsx                 the Sentinel mark + wordmark (dark/light)
  marketing/                   landing page
  auth/                        auth form
  dashboard/                   console, session rows, replay, events, flags, stats
  team/                        team manager + onboarding modal
  policy/                      Policy Studio

lib/
  ui/theme.ts                  design tokens (dark + light, shared accent)
  types.ts                     domain model (Session, Event, RiskFlag)
  db/                          Supabase env, clients (server/browser/admin), row types
  repo/                        data access (Supabase or in-memory fallback)
  auth/                        tokens (per-member), identity (ingest), session (admin)
  risk/                        the LLM analyst: systemPrompt + analyzer
  policy/                      policy catalog, role presets, settings generator
  ingest/                      Claude hook payload types + the processor

supabase/migrations/           SQL: schema, RLS, auth trigger, functions
middleware.ts                  refresh session + gate /dashboard
```

## Demo mode vs. production

Without Supabase env vars the app runs in **demo mode**: in-memory sessions, no
auth, the built-in dev key (`cs_dev_local`) works on `/api/ingest`. Add the env
vars (see [deploy.md](./deploy.md)) to enable multi-tenant auth, persistence, and
per-member tokens. Everything degrades gracefully — the build and the tracking
demo work either way.
