-- Private notes a client writes about a session they have had.
-- booking_key is refId + '|' + when_text, the stable handle the app has.
create table if not exists public.session_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_key text not null,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, booking_key)
);

alter table public.session_notes enable row level security;

-- Own rows only, in every direction. Nobody else sees these, including experts.
drop policy if exists "session_notes own" on public.session_notes;
create policy "session_notes own" on public.session_notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
