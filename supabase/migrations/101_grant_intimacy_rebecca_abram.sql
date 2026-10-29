-- ============================================================================
-- 101: give Rebecca and Abram the Physical Intimacy exercise (A195).
--
-- Ellie: "Please also grant rebecca and abram the physical intimacy exercise."
--
-- A grant is the add-on flag on both profiles. Two places read it, and both
-- are set so neither surface can disagree with the other:
--   profiles.addon_intimacy       what the app's ownership check reads
--   profiles.entitlements         the stored union the website reads,
--     .addonIntimacy              recomputed grant-only, so it never removes
--                                 this again
--
-- ── FOUND AS A COUPLE, AND ONLY IF IT IS EXACTLY ONE COUPLE ─────────────────
-- By first name, linked to each other both ways, as migration 093 found
-- Rebecca. No address is written here: this file is in a public repository.
-- If anything other than exactly two profiles match, nothing changes and the
-- message says how many were found.
--
-- Safe to run again: setting a flag that is already on changes nothing.
-- ============================================================================

do $$
declare
  n int;
begin
  create temporary table _pair on commit drop as
  select r.id
  from public.profiles r
  join public.profiles a on a.id = r.partner_profile_id and a.partner_profile_id = r.id
  where (lower(coalesce(r.name, '')) like 'rebecca%' and lower(coalesce(a.name, '')) like 'abram%')
     or (lower(coalesce(r.name, '')) like 'abram%'   and lower(coalesce(a.name, '')) like 'rebecca%');

  select count(*) into n from _pair;
  if n <> 2 then
    raise exception 'Expected Rebecca and Abram as one linked couple (2 profiles), found %. Nothing was changed.', n;
  end if;

  update public.profiles p
     set addon_intimacy = true,
         entitlements = jsonb_set(coalesce(p.entitlements, '{}'::jsonb), '{addonIntimacy}', 'true'::jsonb, true)
   where p.id in (select id from _pair);

  raise notice 'Physical Intimacy granted to both.';
end
$$;
