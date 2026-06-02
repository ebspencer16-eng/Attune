-- 015_waitlist.sql
-- Pre-launch email waitlist captured by the site popup ("10% off at launch").
-- Writes happen server-side via /api/join-waitlist using the service role,
-- so no anon insert policy is needed.

create table if not exists public.waitlist (
  id          bigserial primary key,
  email       text unique not null,
  name        text,
  source      text default 'popup',   -- popup | footer | registry | ...
  created_at  timestamptz default now()
);

alter table public.waitlist enable row level security;
-- (No anon policy on purpose. The service role bypasses RLS for the endpoint.)

-- How many signups so far:
--   select count(*) from public.waitlist;
-- Recent signups:
--   select email, name, source, created_at from public.waitlist order by created_at desc limit 50;
