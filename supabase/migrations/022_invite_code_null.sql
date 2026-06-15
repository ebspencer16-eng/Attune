-- Migration 022: invite_code empty-string -> NULL
-- APPLIED IN PROD 2026-06-15 via SQL Editor.
--
-- profiles.invite_code has a UNIQUE constraint (profiles_invite_code_key).
-- create-profile wrote '' (empty string) for invitees with no code of their
-- own. The first such profile took the '' slot; every subsequent invitee
-- collided, so create-profile 500'd and NO profile row was written. This
-- silently blocked all Partner B signups (and any direct signup that left
-- invite_code empty). A UNIQUE index ignores NULLs, so the fix is to store
-- NULL instead of '' (done in api/create-profile.js) and convert existing
-- empties here.

UPDATE profiles SET invite_code = NULL WHERE invite_code = '';
