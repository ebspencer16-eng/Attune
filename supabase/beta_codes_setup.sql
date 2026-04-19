-- ═══════════════════════════════════════════════════════════════════════════
-- Beta codes table setup
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this once in the Supabase SQL Editor to create the `beta_codes` table.
-- After running, the 4 beta codes (one per package) will be seeded as active.
--
-- Location: Supabase Dashboard → SQL Editor → New query → paste → Run
-- Project ref: xixzdigqhmzuxymzezve
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.beta_codes (
  code           text primary key,
  package_key    text not null,   -- 'core' | 'newlywed' | 'anniversary' | 'premium' | '*'
  active         boolean not null default true,
  uses_count     integer not null default 0,
  last_used_at   timestamptz,
  last_used_by   text,
  created_at     timestamptz not null default now()
);

-- Allow the admin UI (which reads with the anon key) to see all codes
-- and allow the serverless payment API (service role) to upsert.
alter table public.beta_codes enable row level security;

drop policy if exists "beta_codes_read_all" on public.beta_codes;
create policy "beta_codes_read_all"
  on public.beta_codes for select
  using (true);

drop policy if exists "beta_codes_service_write" on public.beta_codes;
create policy "beta_codes_service_write"
  on public.beta_codes for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Seed the 4 per-package codes (no-op if they already exist)
insert into public.beta_codes (code, package_key, active)
values
  ('BETA-CORE',        'core',        true),
  ('BETA-NEWLYWED',    'newlywed',    true),
  ('BETA-ANNIVERSARY', 'anniversary', true),
  ('BETA-PREMIUM',     'premium',     true)
on conflict (code) do nothing;

-- Verify
select code, package_key, active, uses_count, last_used_at from public.beta_codes order by code;
