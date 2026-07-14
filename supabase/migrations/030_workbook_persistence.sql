-- 030_workbook_persistence.sql
--
-- The generated workbook was only ever persisted against an ORDER row. Comp
-- accounts (profiles.is_comp = true) have no order, so the workbook URL had
-- nowhere to live: every download re-rendered the PDF from scratch, and a new
-- device saw "Generating now" forever because nothing server-side said it was
-- ready.
--
-- Fix: persist the workbook on the PROFILE as well. The profile is the one row
-- every account has, comp or paid, so comp accounts behave exactly like normal
-- ones without fabricating fake orders. (Fake orders would pollute revenue
-- reporting, the admin order list, and the CSV exports.)
--
-- orders.workbook_url / workbook_format are added defensively: store-workbook-pdf.js
-- has always written them, but they were never in the committed schema.
--
-- Run in the Supabase SQL Editor.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS workbook_url text,
  ADD COLUMN IF NOT EXISTS workbook_format text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS workbook_url text,
  ADD COLUMN IF NOT EXISTS workbook_status text,
  ADD COLUMN IF NOT EXISTS workbook_generated_at timestamptz;

COMMENT ON COLUMN profiles.workbook_url IS
  'Signed URL to the couple''s generated workbook PDF. Written by store-workbook-pdf for BOTH partners, so either one can download from any device. Source of truth for accounts with no order row (comp).';
COMMENT ON COLUMN profiles.workbook_status IS
  'pending | generating | ready | failed. Mirrors orders.workbook_status for accounts with no order row.';
