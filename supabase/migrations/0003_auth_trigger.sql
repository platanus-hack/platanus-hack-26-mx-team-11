-- On admin signup, bootstrap their organization and profile from the metadata
-- passed at registration (full_name, org_name). Runs as the table owner so it
-- can write across RLS.

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into public.orgs (name)
  values (coalesce(nullif(new.raw_user_meta_data ->> 'org_name', ''), 'My organization'))
  returning id into new_org_id;

  insert into public.profiles (id, org_id, email, full_name)
  values (
    new.id,
    new_org_id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
