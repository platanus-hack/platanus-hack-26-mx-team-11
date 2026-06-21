-- Row-level security. Dashboard reads go through the anon/auth client and are
-- scoped to the admin's org. Writes from the ingest endpoint use the service
-- role, which bypasses RLS entirely, so no insert policies are needed here.

alter table public.orgs           enable row level security;
alter table public.profiles       enable row level security;
alter table public.members        enable row level security;
alter table public.member_tokens  enable row level security;
alter table public.sessions       enable row level security;
alter table public.events         enable row level security;
alter table public.risk_flags     enable row level security;

-- The caller's org, derived from their profile.
create or replace function public.current_org_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select org_id from public.profiles where id = auth.uid() $$;

-- Profiles: a user sees their own row and others in the same org.
create policy "profiles: own"        on public.profiles for select using (id = auth.uid());
create policy "profiles: same org"   on public.profiles for select using (org_id = public.current_org_id());
create policy "profiles: update own" on public.profiles for update using (id = auth.uid());

-- Orgs: members of the org can read it.
create policy "orgs: member reads"   on public.orgs for select using (id = public.current_org_id());

-- Everything else: full CRUD for admins within their own org.
create policy "members: org"      on public.members       for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());
create policy "tokens: org"       on public.member_tokens for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());
create policy "sessions: org"     on public.sessions      for select using (org_id = public.current_org_id());
create policy "events: org"       on public.events        for select using (org_id = public.current_org_id());
create policy "flags: org"        on public.risk_flags    for select using (org_id = public.current_org_id());
