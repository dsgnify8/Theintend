create table if not exists calendar_connections (
  expert_id text primary key references experts(id) on delete cascade,
  provider text not null default 'google',
  google_email text,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  connected_at timestamptz default now()
);

alter table calendar_connections enable row level security;

-- Tokens are never read by the app directly; only Edge Functions (service role) touch them.
drop policy if exists "no_client_access" on calendar_connections;
create policy "no_client_access" on calendar_connections
  for all to authenticated using (false) with check (false);

-- Safe, token-free status the app can read for a given expert.
create or replace function get_calendar_status(p_expert text)
returns table(connected boolean, google_email text, connected_at timestamptz)
language sql security definer set search_path = public as $$
  select true, google_email, connected_at
  from calendar_connections
  where expert_id = p_expert
$$;

grant execute on function get_calendar_status(text) to authenticated;
