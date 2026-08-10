-- 037_profiles_couple_type.sql
-- Persist each couple's derived couple type on the profile so beta cohorts can
-- be backtracked by type. The value is written client-side once BOTH partners
-- have completed both exercises (see the persist effect in src/App.jsx). It is
-- the couple type code (WW, XX, YY, ZZ, WX, WY, WZ, XY, XZ, YZ). Nullable, and
-- stays null until the couple's results are computed.
--
-- Run this in the Supabase SQL Editor (and actually click Run — saving the tab
-- is not enough). Safe to run more than once.

alter table public.profiles
  add column if not exists couple_type text;

comment on column public.profiles.couple_type is
  'Derived couple type code (WW, XY, ...). Set when both partners complete both exercises; null until then.';

create index if not exists idx_profiles_couple_type on public.profiles (couple_type);
