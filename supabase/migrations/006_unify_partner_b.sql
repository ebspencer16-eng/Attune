-- Attune schema addition: partner_profile_id on profiles
--
-- Unifies Partner A and Partner B into the same auth + profile model.
-- Previously Partner B had no auth.users row and their data lived on the
-- separate partner_sessions table. In the new model both partners are real
-- Supabase auth users with their own profiles row, and the link between
-- them is a mutual foreign key partner_profile_id.
--
-- partner_sessions is kept in place for backwards compatibility with any
-- pre-existing test data but is no longer written to by the app.
--
-- Safe to re-run (IF NOT EXISTS).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS partner_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_partner_profile_id_idx ON profiles(partner_profile_id);

-- Also add a tiny helper: a column flagging whether a user joined via an
-- invite link (Partner B flow) vs signed up directly (Partner A flow).
-- Used only for lightweight UX differentiation — the underlying data model
-- is identical either way.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS joined_via_invite boolean DEFAULT false;
