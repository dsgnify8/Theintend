-- Admin uploadable images, keyed by a stable string the app knows.
-- Keys in use: practice:sounds, practice:breathwork, practice:journaling,
-- practice:affirmations, library:<item id>
create table if not exists public.app_images (
  key text primary key,
  url text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_images enable row level security;

-- Anyone, signed in or not, can read. These are decorative and public.
drop policy if exists "app_images read" on public.app_images;
create policy "app_images read" on public.app_images
  for select using (true);

-- Only admins can write. Adjust this if role does not live on profiles.role.
drop policy if exists "app_images admin write" on public.app_images;
create policy "app_images admin write" on public.app_images
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
