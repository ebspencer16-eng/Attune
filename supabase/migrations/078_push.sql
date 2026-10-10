-- ============================================================================
-- 078: everything a push notification needs to exist.
--
-- ── WHY ─────────────────────────────────────────────────────────────────────
-- Ellie approved six push notifications on 2026-10-10 and asked for the
-- migration that operationalises them. Until this runs, nothing can be sent:
-- there is nowhere to keep a device token, no record of who said yes, and no
-- log of what has already gone out, which is what the rate limit reads.
--
-- The copy for all six lives in api/_lib/notifications.js. The decision rules
-- (a four day cooldown, four a month, and nothing pushed to someone who has
-- already seen the card) live in the same file and have since before anything
-- could send. This migration is the storage under them.
--
-- ── WHAT IT ADDS ────────────────────────────────────────────────────────────
-- 1. push_tokens — one row per DEVICE, not per person. Someone with a phone
--    and an iPad has two, and a person who reinstalls gets a new one while the
--    old one stays until Expo tells us it is dead. The token is the primary
--    key for that reason: the same token can be reassigned by the OS to a
--    different install, and the last writer owns it.
--
-- 2. Three columns on profiles. `push_opt_in` is three-valued on purpose:
--    null means nobody has been asked yet, which is a different state from
--    having said no, and the app needs to tell them apart to know whether to
--    ask. `push_asked_at` is when, so a second ask can be timed rather than
--    guessed at. `app_last_opened_at` is what "they have already seen the
--    card" reads; it is stamped by /api/push-token on launch rather than by
--    /api/home, because /api/home is polled and a write on a polled path is
--    its own problem.
--
-- 3. push_sends — what has already been sent to whom. This is the cooldown's
--    and the monthly cap's only source. It cannot be read off the
--    notifications table: two of the six kinds deliberately write no alert row
--    at all, because the home screen already carries a card saying the same
--    thing, so the row and the push are not the same event.
--
-- ── ACCESS ──────────────────────────────────────────────────────────────────
-- Row level security on, no policies. Nothing reaches these tables except the
-- server with the service key: /api/push-token writes a token and the consent,
-- and api/_lib/push.js reads tokens and writes the log. A device token is a
-- credential for interrupting somebody, and the anon role has no business with
-- one.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

-- ── 1. Devices ──────────────────────────────────────────────────────────────
create table if not exists public.push_tokens (
  -- Expo's token for one install, e.g. ExponentPushToken[xxxxxxxx]. The key,
  -- because the OS can hand the same token to a different install later.
  token        text primary key,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  -- 'ios' or 'android'. Kept so a platform-specific failure can be seen as one.
  platform     text,
  created_at   timestamptz not null default now(),
  -- Refreshed on every launch that registers. A token nobody has presented for
  -- months is probably an uninstalled app, and Expo will say so when we try.
  last_seen_at timestamptz not null default now()
);

-- Every send starts from "whose devices", so this is the only lookup shape.
create index if not exists push_tokens_profile_idx
  on public.push_tokens (profile_id);

alter table public.push_tokens enable row level security;

comment on table public.push_tokens is
  'One row per device that has agreed to receive push notifications. Written only by /api/push-token with the service key.';

-- ── 2. Consent, and when the app was last opened ────────────────────────────
alter table public.profiles
  add column if not exists push_opt_in        boolean,
  add column if not exists push_asked_at      timestamptz,
  add column if not exists app_last_opened_at timestamptz;

comment on column public.profiles.push_opt_in is
  'Three-valued. null = never asked, true = said yes, false = said no. Asking again is a decision, so "not asked" and "declined" must not look alike.';
comment on column public.profiles.push_asked_at is
  'When the app last asked. A second ask is timed from this rather than guessed.';
comment on column public.profiles.app_last_opened_at is
  'Last launch that registered a push token. Read by the rule that will not push something the home screen is already showing them.';

-- ── 3. What has already been sent ───────────────────────────────────────────
create table if not exists public.push_sends (
  id          bigserial primary key,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  -- Matches the kinds in api/_lib/notifications.js. Text, not an enum, so a
  -- seventh kind is a code change rather than a migration.
  kind        text not null,
  sent_at     timestamptz not null default now(),
  -- False when Expo refused it. Kept rather than dropped: a token that fails
  -- every time is how we learn the app was deleted.
  ok          boolean not null default true,
  -- Expo's own message when it refused. Short, and never anything the reader
  -- wrote: nothing from a note or a journal entry reaches this table.
  detail      text
);

-- The cooldown and the monthly cap both ask "what has this person had
-- recently", newest first.
create index if not exists push_sends_recent_idx
  on public.push_sends (profile_id, sent_at desc);

alter table public.push_sends enable row level security;

comment on table public.push_sends is
  'One row per push attempt. The only source for the four day cooldown and the four a month cap, because two of the six kinds write no alert row to join against.';

-- ── Verification ────────────────────────────────────────────────────────────
select
  (select count(*) from public.push_tokens)  as devices,
  (select count(*) from public.push_sends)   as sends,
  (select count(*) from public.profiles where push_opt_in is true)  as said_yes,
  (select count(*) from public.profiles where push_opt_in is false) as said_no,
  (select count(*) from public.profiles where push_opt_in is null)  as never_asked;

select column_name, data_type
  from information_schema.columns
 where table_name = 'profiles'
   and column_name in ('push_opt_in', 'push_asked_at', 'app_last_opened_at')
 order by column_name;
