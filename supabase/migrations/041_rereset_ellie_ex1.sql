-- Migration 041: re-reset Exercise 1 for Ellie
-- ============================================================================
-- Migration 040 worked. All four rows were cleared, and the diagnostic
-- confirmed it. Then ebspencer16@gmail.com came back with 28 answers and 5
-- partner-view keys, which is the pre-restructure shape.
--
-- WHAT PUT THEM BACK: on SIGNED_IN the app resynced any local exercise answers
-- to the server whenever the server had none, to cover people who finished
-- exercises before confirming their email. After a deliberate reset the server
-- has none by design, so signing in on a browser that still held the old
-- answers pushed them straight back. The reset had not failed; it had been
-- reversed, silently, seconds later.
--
-- The app now refuses to resync Exercise 1 answers that do not match the
-- current two-part question set, and clears them locally instead. That fix
-- must be deployed BEFORE running this, or the same thing happens again.
--
-- Only Ellie's row is touched. Preston, Carolina and Aaron are still clear.
--
-- Keyed strictly on the auth user id. 040 matched on
-- "id = any(uids) OR lower(email) = any(emails)", which is looser than what
-- the app does: the app reads profiles by auth user id and nothing else.
-- ============================================================================

do $$
declare
  target_email constant text := lower('ebspencer16@gmail.com');
  uid uuid;
  n_reset int;
begin
  select id into uid from auth.users where lower(email) = target_email;
  if uid is null then
    raise exception 'No auth user for %.', target_email;
  end if;

  with u as (
    update public.profiles set
      ex1_answers           = null,
      ex1_progress          = null,
      ex1_completed         = false,
      ex1_completed_at      = null,
      couple_type           = null,
      results_email_sent_at = null
    where id = uid          -- auth user id only, the way the app reads it
    returning 1
  ) select count(*) into n_reset from u;

  if n_reset <> 1 then
    raise exception 'Expected to reset exactly 1 profile, reset %.', n_reset;
  end if;
end $$;

-- ── Verification, reading the row the way the app reads it ─────────────────
-- Expect all four rows: ex1_count = 0.
-- Anything else means something wrote answers back again.
select
  u.email,
  p.id                                            as profile_id,
  (select count(*)::int from jsonb_object_keys(coalesce(p.ex1_answers, '{}'::jsonb))) as ex1_count,
  (select count(*)::int from jsonb_object_keys(coalesce(p.ex1_answers, '{}'::jsonb)) k
     where k like 'pv\_%')                        as partner_view_count,
  coalesce(p.ex1_completed, false)                as ex1_completed,
  p.couple_type,
  p.partner_profile_id is not null                as partner_linked
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) in (
  'ebspencer16@gmail.com',
  'mightyhunter00@gmail.com',
  'carolina.c.cannon@gmail.com',
  'aaron.m.miner@gmail.com'
)
order by u.email;
