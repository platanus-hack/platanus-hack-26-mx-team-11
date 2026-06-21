-- Atomically raise a session's risk to the max seen so far. Called by the ingest
-- endpoint (service role) after each analyzed event.
create or replace function public.bump_session_risk(p_session text, p_score int)
returns void
language sql security definer set search_path = public
as $$
  update public.sessions set risk_score = greatest(risk_score, p_score) where id = p_session;
$$;
