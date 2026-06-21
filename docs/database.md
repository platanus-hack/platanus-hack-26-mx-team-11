# Database

Postgres on Supabase. Migrations are plain SQL in `supabase/migrations/`, applied
in filename order.

| File | What it does |
|---|---|
| `0001_init.sql` | Tables + indexes |
| `0002_rls.sql` | Row-level security policies |
| `0003_auth_trigger.sql` | Bootstrap org + profile on signup |
| `0004_functions.sql` | `bump_session_risk()` |

## Apply them

**Supabase CLI** (recommended):
```bash
supabase link --project-ref <ref>
supabase db push
```
**Or** paste each file, in order, into the Supabase SQL editor.

## Schema

```
orgs ─┬─< profiles        (admins; 1:1 with auth.users)
      ├─< members         (tracked citizen developers)
      │     └─< member_tokens   (per-member, hashed at rest)
      └─< sessions
            └─< events
                  └─< risk_flags
```

- **orgs** — one per company. Created by the signup trigger.
- **profiles** — admin users. `id` references `auth.users`. Carries `org_id`.
- **members** — the people whose Claude Code we watch. Not auth users. Hold
  `role_id` (a preset from `lib/policy/roles`) and `policy_ids` (resolved from
  `lib/policy/catalog`).
- **member_tokens** — bearer tokens. Only the **sha256 hash** is stored, plus a
  short display prefix. Revocable (`revoked_at`).
- **sessions / events / risk_flags** — the telemetry. `sessions.id` is Claude
  Code's own `session_id`. `risk_flags` carry the plain-English explanation + fix.

Row shapes are typed in `lib/db/types.ts`; the domain model they map to is in
`lib/types.ts` (mapping in `lib/repo/map.ts`).

## Row-level security

Every tenant table has RLS on. Reads are scoped to the caller's org via
`current_org_id()` (derived from their profile). This is what guarantees one
org can never read another's sessions.

**Writes from ingestion bypass RLS** by using the service-role key
(`lib/db/supabase/admin.ts`) — the org is set explicitly from the resolved token,
so isolation is preserved. That's why there are no `insert` policies for
`sessions/events/risk_flags`.

## The signup trigger

`handle_new_user()` runs after a row is inserted into `auth.users`. It reads
`raw_user_meta_data` (`full_name`, `org_name`, passed at `signUp`) and creates the
org + profile. `security definer` lets it write across RLS.
