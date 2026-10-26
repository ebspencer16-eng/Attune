-- ============================================================================
-- 094: everybody who can invite a partner gets a code to do it with.
--
-- ── WHY ─────────────────────────────────────────────────────────────────────
-- Ellie, of Rebecca: "Did she invite a partner? If no to any of that, we need
-- to prompt her with it immediately."
--
-- Rebecca's row had Abram's name and Abram's email on it and no invite code,
-- so nothing could ever be sent to him. That was not her broken sign-up. The
-- code was only ever minted by the website; api/create-profile.js stored
-- whatever a client sent and null when it sent nothing; and the app sends one
-- only when somebody is JOINING on an invite.
--
-- So every first partner who set up in the app got no code, collected their
-- partner's email, and could never invite them. The server mints it now, for
-- any surface. This fills in the people it already happened to.
--
-- ── WHO IS LEFT OUT, AND WHY ────────────────────────────────────────────────
-- The second partner. They joined on the first partner's code and have none by
-- design: `joined_via_invite` records that. A second code on one couple makes
-- "which code is this couple" a question with two answers.
--
-- ── SAFE TO RUN TWICE ───────────────────────────────────────────────────────
-- It only fills a code that is missing. A code already there is never changed,
-- because an invite already sent has that code in the link.
--
-- Run in the Supabase SQL Editor and click Run.
-- ============================================================================

-- ── Before: who is missing one ─────────────────────────────────────────────
select
  'before' as when,
  count(*) filter (where coalesce(invite_code, '') = '' and coalesce(joined_via_invite, false) = false) as first_partners_with_no_code,
  count(*) filter (where coalesce(invite_code, '') = '' and coalesce(joined_via_invite, false) = false
                     and coalesce(partner_email, '') <> '')                                            as of_those_with_a_partner_email,
  count(*) filter (where coalesce(invite_code, '') <> '')                                              as already_have_one
from public.profiles;

-- ── The fill ───────────────────────────────────────────────────────────────
-- Eight uppercase hex characters, derived per row from that row's own id and a
-- random draw. The id is in the hash so that two rows cannot land on the same
-- code even if random() were to repeat; `invite_code` is unique, so a
-- collision would fail this statement loudly rather than merge two couples.
--
-- The alphabet is 0-9 and A-F, which is not the alphabet the server mints
-- from. That is deliberate and it is safe. The server's alphabet drops O and
-- 0, and I and 1, because the one thing anybody does with a code is read it
-- off a screen and type it into a phone. Hex has no letter O and no letter I,
-- so its 0 and 1 are not ambiguous with anything. Both shapes pass the app's
-- own check, which accepts A-Z and 0-9.
--
-- An earlier version built the string from generate_series and string_agg to
-- match the server's alphabet exactly. It was harder to read, easy to get
-- wrong in a way that hands every row the same code, and there is no Postgres
-- on the machine this was written on to run it against. This form cannot have
-- that bug by construction.
update public.profiles p
   set invite_code = upper(substr(md5(p.id::text || random()::text), 1, 8))
 where coalesce(p.invite_code, '') = ''
   and coalesce(p.joined_via_invite, false) = false;

-- ── After: nobody who can invite is without a code ─────────────────────────
select
  'after' as when,
  count(*) filter (where coalesce(invite_code, '') = '' and coalesce(joined_via_invite, false) = false) as first_partners_with_no_code,
  count(*) filter (where coalesce(invite_code, '') <> '')                                              as have_one
from public.profiles;

-- ── Who now has a partner to invite and a code to do it with ───────────────
-- These are the people to prompt. An email on the row and nobody joined.
select
  u.email            as their_email,
  p.name             as their_name,
  p.partner_name,
  p.partner_email,
  p.invite_code,
  p.partner_joined
from public.profiles p
join auth.users u on u.id = p.id
where coalesce(p.partner_email, '') <> ''
  and coalesce(p.partner_joined, false) = false
  and coalesce(p.joined_via_invite, false) = false
order by p.created_at;
