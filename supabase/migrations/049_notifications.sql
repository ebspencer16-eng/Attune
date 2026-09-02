-- Migration 049: notifications
-- ============================================================================
-- Ellie wants a place in the app to see alerts from Attune and from a partner.
--
-- api/_lib/notifications.js already decides what is PUSH-ELIGIBLE and applies
-- rate limits. What it cannot do is show a list, because nothing is stored: it
-- answers "should we push this right now" and then forgets. An in-app list
-- needs a record.
--
-- ── WHY THIS IS NOT JUST A LOG ────────────────────────────────────────────
-- Two things make it more than an append-only table.
--
-- Read state has to be per person, not per couple. "Preston finished" is read
-- by Ellie and never seen by Preston, so the row belongs to one owner even
-- when the event concerns both.
--
-- And a notification points at something. deep_link carries where it goes, so
-- the app routes without re-deriving intent from the kind, which is the same
-- mistake as branching on card kind for layout.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,

  -- Matches the kinds in api/_lib/notifications.js. Kept as text rather than an
  -- enum so adding one is a code change, not a migration.
  kind        text not null,
  title       text not null,
  body        text,
  -- Where tapping it goes, e.g. '/results?s=conflict-overview'.
  deep_link   text,

  -- Who or what it is about, when that matters: the partner's profile id for a
  -- partner event, a post id for a content event. Nullable.
  subject_id  text,

  -- Whether this was also sent as a push. An in-app notification that was
  -- never pushed is still worth showing; the reverse tells us the rate limiter
  -- suppressed it.
  pushed      boolean not null default false,

  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- The unread badge and the list, which is the only query the app makes.
create index if not exists notifications_owner_idx
  on public.notifications (owner_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (owner_id) where read_at is null;

-- Idempotency. A partner completing an exercise can fire from several paths
-- (their write, a sync, a cron), and three identical rows in someone's list is
-- worse than none. Same owner, kind and subject on the same day collapses.
--
-- The day has to be computed in a fixed zone. created_at::date on a timestamptz
-- reads the session's TimeZone setting, which makes it STABLE rather than
-- IMMUTABLE, and Postgres refuses to index it. AT TIME ZONE 'UTC' pins it, and
-- that form is immutable.
--
-- A stored generated column rather than an index expression, so the value is
-- visible when debugging why a row did or did not collapse.
alter table public.notifications
  add column if not exists created_on date
  generated always as (((created_at at time zone 'UTC')::date)) stored;

create unique index if not exists notifications_dedupe_idx
  on public.notifications (owner_id, kind, coalesce(subject_id, ''), created_on);

comment on table public.notifications is
  'Per-person in-app alerts. Read state is per owner, not per couple: "your partner finished" belongs to the other partner only.';
comment on column public.notifications.pushed is
  'True when this also went out as a push. False means the rate limiter suppressed the push but the alert still belongs in the list.';

alter table public.notifications enable row level security;

-- ── Verification ───────────────────────────────────────────────────────────
select
  (select count(*) from public.notifications)                        as rows,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications')  as columns;
