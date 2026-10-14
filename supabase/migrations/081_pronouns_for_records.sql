-- ============================================================================
-- 081: two people's pronouns, for the record.
--
-- ── WHY ─────────────────────────────────────────────────────────────────────
-- Ellie, having looked at who the admin was counting as non-binary: "Alex and
-- Sam were demos, not sure why lanae and spencer didn't have pronouns, but
-- lanae is she/her and spencer is he/him, please update for our records."
--
-- Nothing in Attune asks anybody their gender; the admin converts the pronouns
-- somebody chose at setup. A blank is not a category, so these two were in no
-- slice at all rather than in a wrong one. This fills them in.
--
-- ── WHAT IT TOUCHES ─────────────────────────────────────────────────────────
-- Two fields, in two places each, because each partner records the other's
-- pronouns as well as their own:
--
--   profiles.pronouns          the person's own
--   profiles.partner_pronouns  what their partner is recorded as
--
-- Matching is on the first name, case-insensitively, and only where the field
-- is empty. A row where somebody has chosen something is never overwritten:
-- the point of this is to fill two gaps, not to decide for anybody.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once;
-- the second run matches nothing because the fields are no longer empty.
-- ============================================================================

-- ── Their own pronouns ──────────────────────────────────────────────────────
update public.profiles
   set pronouns = 'she/her'
 where name ilike 'lanae%'
   and coalesce(pronouns, '') = '';

update public.profiles
   set pronouns = 'he/him'
 where name ilike 'spencer%'
   and coalesce(pronouns, '') = '';

-- ── And what their partner has recorded about them ──────────────────────────
update public.profiles
   set partner_pronouns = 'she/her'
 where partner_name ilike 'lanae%'
   and coalesce(partner_pronouns, '') = '';

update public.profiles
   set partner_pronouns = 'he/him'
 where partner_name ilike 'spencer%'
   and coalesce(partner_pronouns, '') = '';

-- ── Verification ────────────────────────────────────────────────────────────
-- Both rows should now carry a pronoun, and nobody else is touched. If a name
-- matched more than one account, every match is listed here.
select id, name, pronouns, partner_name, partner_pronouns, created_at
  from public.profiles
 where name ilike 'lanae%'
    or name ilike 'spencer%'
    or partner_name ilike 'lanae%'
    or partner_name ilike 'spencer%'
 order by created_at desc;

-- Everyone still without pronouns, which is what the Gender tile cannot place.
select count(*) as profiles_without_pronouns
  from public.profiles
 where coalesce(pronouns, '') = '';
