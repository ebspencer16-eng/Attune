-- Attune schema addition: deleted_user_archive table
-- Captures de-identified research data when a user deletes their account.
-- No names, emails, partner info, invite_codes, or other identifiers.
-- Only accessible by service_role (no RLS policies = no user access).

CREATE TABLE IF NOT EXISTS public.deleted_user_archive (
  id                uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  deleted_at        timestamptz  DEFAULT now(),
  -- Demographic / product context (not identifying)
  pkg               text,                 -- core | newlywed | anniversary | premium
  signed_up_at      timestamptz,          -- when they originally joined (profile.created_at)
  pronouns          text,
  partner_pronouns  text,
  -- Research data
  ex1_answers       jsonb,                -- Communication exercise answers
  ex2_answers       jsonb,                -- Expectations exercise answers
  ex3_answers       jsonb,                -- Relationship Reflection answers
  couple_type       jsonb,                -- derived couple type object
  exp_gaps          jsonb                 -- derived expectation gaps
);

-- No RLS policies means no user-role access. service_role (backend) bypasses RLS.
ALTER TABLE public.deleted_user_archive ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_deleted_archive_deleted_at ON public.deleted_user_archive(deleted_at);
CREATE INDEX IF NOT EXISTS idx_deleted_archive_pkg        ON public.deleted_user_archive(pkg);
