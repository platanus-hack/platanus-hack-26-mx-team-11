# Auth

Admin authentication uses **Supabase Auth** (email/password) with cookie-based
sessions via `@supabase/ssr`. Tracked members are *not* auth users — they
authenticate to the ingest endpoint with a per-member token (see
[onboarding.md](./onboarding.md)).

## Pieces

| Concern | File |
|---|---|
| Login / register / logout | `app/(auth)/actions.ts` |
| Forms (light theme) | `components/auth/AuthForm.tsx`, `app/(auth)/{login,register}/page.tsx` |
| Session refresh + route gating | `middleware.ts` |
| Server clients | `lib/db/supabase/{server,browser,admin}.ts` |
| Viewer helper | `lib/auth/session.ts` (`getViewer`, `requireViewer`) |

## Flows

**Register** → `supabase.auth.signUp({ email, password, options: { data: { full_name, org_name } } })`.
The DB trigger creates the org + profile. If email confirmation is on, the user
gets a "check your email" notice; otherwise they're signed straight in.

**Login** → `signInWithPassword`, then redirect to `/dashboard`.

**Protect** → `middleware.ts` refreshes the session on every request and redirects
unauthenticated users away from `/dashboard*`. Pages also call `requireViewer()`
defensively.

**Logout** → `signOut()` + redirect to `/login` (a server action rendered as the
"Sign out" button in the console header).

## Demo mode

When Supabase env vars are absent, `isSupabaseConfigured` is false:
- `middleware.ts` is a no-op (console stays open),
- `requireViewer()` returns `null` instead of redirecting,
- auth actions return a "not configured" message.

So you can run and demo the console with zero credentials, then switch on auth by
adding env vars.

## Setup note

For a frictionless demo, disable "Confirm email" in Supabase →
Authentication → Providers → Email. With it on, new admins must confirm before
their first sign-in.
