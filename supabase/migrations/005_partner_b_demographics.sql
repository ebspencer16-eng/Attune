-- Attune schema addition: demographic columns on partner_sessions
--
-- Partner B does NOT have a real Supabase auth account — the
-- PartnerLandingScreen creates a local-only account object. Partner B's
-- real data (exercise answers + name) lives on the partner_sessions row
-- keyed by invite_code. To collect demographics from Partner B we need
-- matching columns on partner_sessions.
--
-- Safe to re-run (IF NOT EXISTS).

ALTER TABLE partner_sessions ADD COLUMN IF NOT EXISTS age_range             text;
ALTER TABLE partner_sessions ADD COLUMN IF NOT EXISTS gender                text;
ALTER TABLE partner_sessions ADD COLUMN IF NOT EXISTS relationship_length   text;
ALTER TABLE partner_sessions ADD COLUMN IF NOT EXISTS relationship_status   text;
ALTER TABLE partner_sessions ADD COLUMN IF NOT EXISTS children              text;
ALTER TABLE partner_sessions ADD COLUMN IF NOT EXISTS signup_source         text;
