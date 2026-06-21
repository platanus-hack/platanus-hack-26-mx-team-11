-- Governance model: Organization + Group policy scoping and decision logging.
-- See docs/governance-spec.md. Groups replace the flat role assignment as the
-- primary mechanism; members may belong to several groups and accumulate policies.

-- Groups -----------------------------------------------------------------------
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs (id) on delete cascade,
  name        text not null,
  description text not null default '',
  created_at  timestamptz not null default now()
);
create index groups_org_id_idx on public.groups (org_id);

-- Group membership (many-to-many) ----------------------------------------------
create table public.group_members (
  group_id   uuid not null references public.groups (id) on delete cascade,
  member_id  uuid not null references public.members (id) on delete cascade,
  org_id     uuid not null references public.orgs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, member_id)
);
create index group_members_member_idx on public.group_members (member_id);

-- Policy assignments (org-wide or per-group) -----------------------------------
-- policy_id references a Library policy id (code-defined in lib/policy/catalog).
create table public.policy_assignments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs (id) on delete cascade,
  policy_id   text not null,
  scope       text not null check (scope in ('org', 'group')),
  group_id    uuid references public.groups (id) on delete cascade,
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  -- An org policy is unique per id; a group policy is unique per (group, id).
  constraint policy_assignment_scope_ck check (
    (scope = 'org' and group_id is null) or (scope = 'group' and group_id is not null)
  )
);
create unique index policy_assignments_org_unique
  on public.policy_assignments (org_id, policy_id) where scope = 'org';
create unique index policy_assignments_group_unique
  on public.policy_assignments (group_id, policy_id) where scope = 'group';

-- Decision logging on events ---------------------------------------------------
-- severity: the policy severity ceiling; decision: what the hook did.
alter table public.events add column if not exists severity   text not null default 'info';
alter table public.events add column if not exists decision   text not null default 'allowed';
alter table public.events add column if not exists policy_ids  text[] not null default '{}';
alter table public.events add column if not exists group_id    uuid references public.groups (id) on delete set null;
alter table public.events add column if not exists applied_request text not null default '';

create index if not exists events_decision_idx on public.events (org_id, decision, created_at desc);
create index if not exists events_severity_idx on public.events (org_id, severity, created_at desc);

-- RLS --------------------------------------------------------------------------
alter table public.groups             enable row level security;
alter table public.group_members      enable row level security;
alter table public.policy_assignments enable row level security;

create policy "groups: org"        on public.groups             for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());
create policy "group_members: org" on public.group_members      for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());
create policy "assignments: org"   on public.policy_assignments for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());
