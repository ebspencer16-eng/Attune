-- Attune schema additions: notification preferences + optional demographics
--
-- Purpose:
--   1. notification_prefs jsonb — structured toggles for the Settings →
--      Notifications page. Replaces the legacy email_opt_in boolean (which
--      stays for backwards compat but is no longer the source of truth).
--   2. Optional demographic columns — age_range, gender, relationship_status,
--      relationship_length, children, signup_source. Collected via the
--      signup form and used in the admin Demographics page charts. All are
--      nullable because they're optional.
--
-- All statements use IF NOT EXISTS so the migration is safe to re-run.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{"partner_done":true,"invited":true,"reminder":true,"lmft_sched":true,"lmft_remind":true,"product":false}'::jsonb;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_range             text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender                text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS relationship_status   text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS relationship_length   text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS children              text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_source         text;

-- Also add matching archive columns so the delete-account endpoint can
-- preserve these as research data when users delete their accounts.
ALTER TABLE deleted_user_archive ADD COLUMN IF NOT EXISTS age_range           text;
ALTER TABLE deleted_user_archive ADD COLUMN IF NOT EXISTS gender              text;
ALTER TABLE deleted_user_archive ADD COLUMN IF NOT EXISTS relationship_status text;
ALTER TABLE deleted_user_archive ADD COLUMN IF NOT EXISTS relationship_length text;
ALTER TABLE deleted_user_archive ADD COLUMN IF NOT EXISTS children            text;
ALTER TABLE deleted_user_archive ADD COLUMN IF NOT EXISTS signup_source       text;
