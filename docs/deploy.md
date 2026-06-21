# Deploy (Vercel + Supabase)

## 1. Supabase

1. Create a project. Note the **Project URL**, **anon key**, **service-role key**
   (Settings → API).
2. Apply migrations (Settings → see [database.md](./database.md)):
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
3. Authentication → Providers → Email: for a smooth demo, turn **Confirm email**
   off.

## 2. Environment variables

Set these locally (`.env.local`) and in Vercel (Project → Settings → Environment
Variables). See `.env.example`.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # server-only — do NOT prefix NEXT_PUBLIC

ANTHROPIC_API_KEY=sk-ant-...            # risk scoring
ANTHROPIC_MODEL=claude-sonnet-4-6       # optional

CS_BLOCK_CRITICAL=false                 # true = deny critical PreToolUse actions
```

> `SUPABASE_SERVICE_ROLE_KEY` is a secret with full DB access. It is only read by
> server code (`lib/db/supabase/admin.ts`, used by the ingest route and token
> lookup) and never shipped to the browser.

## 3. Vercel

1. Import the repo. Framework preset: **Next.js**. No special build config.
2. Add the env vars above (Production + Preview).
3. Deploy. Your app is at `https://<project>.vercel.app`.

## 4. Onboard your team

1. Register an admin account at `/register` (creates your org).
2. `/dashboard/team` → add members, assign roles/policies.
3. **Get setup** → send each member their one-line install command.
4. Sessions appear live in `/dashboard` as they use Claude Code.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in (or leave blank for demo mode)
npm run dev                  # http://localhost:3000
```

Without Supabase vars you get **demo mode** (in-memory, no auth, dev key
`cs_dev_local`). With them you get the full multi-tenant app. See
[INTEGRATION.md](./INTEGRATION.md) to point a local Claude Code at it via ngrok.

## Production checklist

- [ ] Migrations applied (RLS enabled — verify in Supabase → Auth → Policies).
- [ ] Service-role key set server-side only.
- [ ] `ANTHROPIC_API_KEY` set (else scores are 0).
- [ ] Email confirmation decision made.
- [ ] Decide `CS_BLOCK_CRITICAL` (start `false`, enable once FP rate is acceptable).
