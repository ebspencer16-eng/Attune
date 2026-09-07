-- 053_privacy_preferences.sql
-- ============================================================================
-- Where a person's privacy choices are recorded.
--
-- WHY THIS EXISTS
-- The site had no way to record a privacy choice, so "Your privacy choices"
-- had nothing to write to and the Global Privacy Control browser signal had
-- nowhere to land. A control that stores nothing is worse than no control:
-- it tells someone their choice was honoured when it was not.
--
-- WHAT IS ACTUALLY OPTIONAL
-- Attune runs no advertising or analytics trackers, so there is no sale or
-- sharing of personal information to opt out of. The one real choice is
-- research use: api/delete-account.js keeps a de-identified copy of exercise
-- answers and demographics after an account is deleted. opt_out_research
-- stops that copy being kept.
--
-- Only add a column here when something in the code actually reads it.
--
-- Run this in the Supabase SQL Editor and click Run. Saving the tab is not
-- running it. Safe to run more than once.
-- ============================================================================

create table if not exists public.privacy_preferences (
  owner_id          uuid primary key references public.profiles(id) on delete cascade,

  -- Read by api/delete-account.js before it writes the research archive.
  opt_out_research  boolean not null default false,

  -- The Global Privacy Control signal, recorded when a browser sends it.
  -- Kept separately from the choice itself so we can tell a signal apart from
  -- a person deciding on the page. Both are honoured the same way.
  gpc_seen_at       timestamptz,

  -- 'page' or 'gpc'. Which of the two last set opt_out_research.
  source            text,

  updated_at        timestamptz not null default now()
);

comment on table public.privacy_preferences is
  'Privacy choices, one row per person. opt_out_research is read by api/delete-account.js before archiving; gpc_seen_at records a Global Privacy Control signal.';

alter table public.privacy_preferences enable row level security;

-- A person may read and change only their own row. The API uses the service
-- key and bypasses this; the policy is the backstop for anything that does not.
drop policy if exists privacy_preferences_own on public.privacy_preferences;
create policy privacy_preferences_own on public.privacy_preferences
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ── Verification ───────────────────────────────────────────────────────────
select
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'privacy_preferences')  as table_exists,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'privacy_preferences')     as policies;
