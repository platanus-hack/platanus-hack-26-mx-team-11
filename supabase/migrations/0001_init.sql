-- Sentinel — core schema
-- Multi-tenant: every row is scoped to an org. Admins are auth users (profiles);
-- members are the tracked citizen developers (not auth users). Sessions/events/
-- flags are written by the ingest endpoint via the service role.

create extension if not exists "pgcrypto";

-- Organizations ----------------------------------------------------------------
create table public.orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Admin users (1:1 with auth.users) --------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  org_id      uuid not null references public.orgs (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  role        text not null default 'admin',
  created_at  timestamptz not null default now()
);
create index profiles_org_id_idx on public.profiles (org_id);

-- Tracked members (citizen developers) -----------------------------------------
create table public.members (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs (id) on delete cascade,
  full_name   text not null,
  email       text not null,
  team        text not null default '',
  role_id     text not null default 'engineering',  -- preset id from lib/policy/roles
  policy_ids  text[] not null default '{}',          -- resolved policy ids from lib/policy/catalog
  created_at  timestamptz not null default now()
);
create index members_org_id_idx on public.members (org_id);

-- Per-member API tokens (hashed at rest) ---------------------------------------
create table public.member_tokens (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.members (id) on delete cascade,
  org_id        uuid not null references public.orgs (id) on delete cascade,
  token_hash    text not null unique,        -- sha256(token)
  token_prefix  text not null,               -- e.g. "snt_live_ab12" for display
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index member_tokens_member_id_idx on public.member_tokens (member_id);

-- Sessions (keyed by Claude Code's own session_id) -----------------------------
create table public.sessions (
  id          text primary key,
  org_id      uuid not null references public.orgs (id) on delete cascade,
  member_id   uuid references public.members (id) on delete set null,
  member_name text not null default '',
  team        text not null default '',
  title       text not null default 'claude session',
  tool        text not null default 'claude',
  status      text not null default 'active',
  risk_score  int  not null default 0,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);
create index sessions_org_started_idx on public.sessions (org_id, started_at desc);

-- Events -----------------------------------------------------------------------
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null references public.sessions (id) on delete cascade,
  org_id      uuid not null references public.orgs (id) on delete cascade,
  type        text not null,                 -- prompt | response | code_change | tool_call
  who         text not null default '',
  content     text not null default '',
  risk_score  int  not null default 0,
  summary     text not null default '',
  created_at  timestamptz not null default now()
);
create index events_session_idx on public.events (session_id, created_at);
create index events_org_idx on public.events (org_id, created_at desc);

-- Risk flags -------------------------------------------------------------------
create table public.risk_flags (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events (id) on delete cascade,
  org_id        uuid not null references public.orgs (id) on delete cascade,
  category      text not null,               -- pii | injection | insecure | policy
  severity      text not null,               -- low | medium | high | critical
  title         text not null,
  explanation   text not null default '',
  suggested_fix text not null default '',
  confidence    numeric not null default 0.5,
  created_at    timestamptz not null default now()
);
create index risk_flags_event_idx on public.risk_flags (event_id);
create index risk_flags_org_idx on public.risk_flags (org_id, created_at desc);
