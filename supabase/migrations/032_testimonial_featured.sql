-- Migration 032: featured flag for post-results testimonials
-- Lets the admin mark which survey testimonials appear on the homepage.
-- Safe to run more than once.
alter table public.feedback_submissions
  add column if not exists featured boolean default false;
