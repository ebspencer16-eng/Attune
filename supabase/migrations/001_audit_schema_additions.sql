-- Attune schema additions — run in Supabase SQL editor
-- Generated from audit: columns written to in code but potentially missing from DB
-- All statements use IF NOT EXISTS so safe to run multiple times

-- ── orders ──────────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS addon_reflection  boolean     DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS addon_budget      boolean     DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS card_url          text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS claimed           boolean     DEFAULT false;

-- ── profiles ────────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ex3_answers            jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ex3_completed          boolean     DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS checkin_sent_at        timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS checkin_1yr_sent_at    timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_setup_complete boolean     DEFAULT false;

-- ── partner_sessions ────────────────────────────────────────────────────────
ALTER TABLE partner_sessions ADD COLUMN IF NOT EXISTS ex3_answers jsonb;

-- ── feedback_submissions (create if doesn't exist) ──────────────────────────
CREATE TABLE IF NOT EXISTS feedback_submissions (
  id            bigserial PRIMARY KEY,
  type          text,
  rating        integer,
  text          text,
  email         text,
  couple_type   text,
  source        text,
  submitted_at  timestamptz DEFAULT now()
);

-- Verify: show all columns for each table
SELECT 'orders' as tbl, column_name, data_type
  FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position;
SELECT 'profiles' as tbl, column_name, data_type
  FROM information_schema.columns WHERE table_name = 'profiles' ORDER BY ordinal_position;
SELECT 'partner_sessions' as tbl, column_name, data_type
  FROM information_schema.columns WHERE table_name = 'partner_sessions' ORDER BY ordinal_position;
SELECT 'feedback_submissions' as tbl, column_name, data_type
  FROM information_schema.columns WHERE table_name = 'feedback_submissions' ORDER BY ordinal_position;
