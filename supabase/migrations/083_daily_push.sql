-- ============================================================================
-- 083: a once-a-day insight and a once-a-day word, at a time each person picks.
--
-- ── WHY ─────────────────────────────────────────────────────────────────────
-- Ellie: "Notifications settings should offer a once-a-day notification that
-- sends you the insight of the day at a time you select (default should be
-- 7:30am), same for word of the day."
--
-- ── WHAT IT ADDS ────────────────────────────────────────────────────────────
-- Three columns on profiles, all null by default, which means off. Nobody
-- starts receiving anything because this ran.
--
--   daily_insight_at    'HH:MM' in the reader's own clock, or null for off
--   daily_word_at       the same, for the word of the day
--   tz_offset_minutes   what getTimezoneOffset() returns on their device:
--                       minutes to ADD to local time to reach UTC. New York in
--                       summer is 240. Stored because a cron has to know when
--                       somebody's 7:30 is, and the only other place this is
--                       known is the query string of a request they are not
--                       making at 7:30 in the morning.
--
-- A time is text rather than `time`, because what is stored is a wall clock
-- reading in somebody else's day, not an instant. Postgres would happily
-- compare two of these and the comparison would be meaningless.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

alter table public.profiles
  add column if not exists daily_insight_at  text,
  add column if not exists daily_word_at     text,
  add column if not exists tz_offset_minutes integer;

comment on column public.profiles.daily_insight_at is
  'Local HH:MM to send the insight of the day, or null for off. Read by api/cron-daily-push.js.';
comment on column public.profiles.daily_word_at is
  'Local HH:MM to send the word of the day, or null for off. Read by api/cron-daily-push.js.';
comment on column public.profiles.tz_offset_minutes is
  'Date.getTimezoneOffset() from the reader''s device: minutes to add to local to reach UTC.';

-- A shape, not a preference: anything that is not a 24-hour clock reading
-- would silently never match the cron's window and the person would wonder
-- why nothing arrived.
alter table public.profiles drop constraint if exists profiles_daily_insight_at_shape;
alter table public.profiles add constraint profiles_daily_insight_at_shape
  check (daily_insight_at is null or daily_insight_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

alter table public.profiles drop constraint if exists profiles_daily_word_at_shape;
alter table public.profiles add constraint profiles_daily_word_at_shape
  check (daily_word_at is null or daily_word_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

-- The cron reads everybody with either one set, every half hour. Two partial
-- indexes rather than one on both columns: a row is usually in neither.
create index if not exists profiles_daily_insight_idx
  on public.profiles (daily_insight_at) where daily_insight_at is not null;
create index if not exists profiles_daily_word_idx
  on public.profiles (daily_word_at) where daily_word_at is not null;

-- ── Verification ────────────────────────────────────────────────────────────
-- Nobody should be signed up for anything yet. Both counts are 0 on a first run.
select count(*) filter (where daily_insight_at is not null) as insight_on,
       count(*) filter (where daily_word_at    is not null) as word_on,
       count(*) filter (where tz_offset_minutes is not null) as know_their_clock
  from public.profiles;
