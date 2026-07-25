-- What the homepage features this week. One row per slot.
-- slot in ('expert','ebook','article','program'); value is the item id.
create table if not exists public.featured (
  slot text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.featured enable row level security;

drop policy if exists "featured read" on public.featured;
create policy "featured read" on public.featured
  for select using (true);

drop policy if exists "featured admin write" on public.featured;
create policy "featured admin write" on public.featured
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
