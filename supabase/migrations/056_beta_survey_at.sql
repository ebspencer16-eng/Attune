-- 056: profiles.beta_survey_at
--
-- Found by the profiles-column gate once it started checking writes as well as
-- reads. /api/submit-beta-survey has been writing this column since it was
-- built, and no migration ever created it.
--
-- Nothing errored, which is why it lasted. The PATCH is wrapped in a try/catch
-- that warns and moves on, so the survey still saved to feedback_submissions,
-- and the only visible symptom was that finishing the survey on a phone did not
-- register on a laptop. The client reads profile.beta_survey_at to decide that,
-- and it was always undefined.
--
-- Safe to run whether or not the column was added by hand at some point.

alter table public.profiles
  add column if not exists beta_survey_at timestamptz;

comment on column public.profiles.beta_survey_at is
  'When this person completed the beta survey. Read by the results page so completion is known across devices, not just on the one they answered on.';

-- Verify.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name = 'beta_survey_at';
