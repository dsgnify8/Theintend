-- Link a booking to the package it came from, and number it within that package.
-- Additive and nullable, so existing rows and code paths are untouched.
alter table public.bookings add column if not exists package_id uuid;
alter table public.bookings add column if not exists session_no integer;
create index if not exists bookings_package_idx on public.bookings (package_id);
