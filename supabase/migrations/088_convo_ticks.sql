-- 088: which expectations conversations a couple have already had.
--
-- ── WHY ─────────────────────────────────────────────────────────────────────
-- Ellie: "I want the check boxes to be functional on the expectations convos to
-- have. I don't want the row to disappear once you check it, but I want the
-- check mark to appear in the box and I want the row to be moved to the bottom
-- (but still above the see how these differ line) and greyed out slightly. The
-- progress/checks should update the what comes next dropdown rows as well."
--
-- The boxes have been drawn since the page shipped and have never been
-- connected to anything: tapping one did nothing on either surface.
--
-- ── WHY IT BELONGS TO THE COUPLE ────────────────────────────────────────────
-- A conversation is something the two of them have together. If one of them
-- ticks "we have talked about who cooks", it is true for both, and a per-person
-- tick would let the same conversation be both had and not had.
--
-- That is the same argument migration 076 makes about the checklist, so this is
-- a column on the row 076 created rather than a table of its own: one row per
-- couple, keyed by the sorted pair of profile ids, written only by the server.
-- The alternative was a third place that knows how to name a couple.
--
-- ── WHAT IS IN IT ───────────────────────────────────────────────────────────
-- { "<conversation key>": "<iso timestamp>" }
--
-- The key is the question's id, like `household__Cooking meals`, which is what
-- api/_lib/expectations.js already keys a row by. Deliberately not the sentence
-- the reader sees: Ellie writes that copy and edits it, and a tick stored
-- against the wording would come untied the first time a word changed.
--
-- The value is when it was ticked rather than `true`, because "we talked about
-- this in March" is worth more than "yes" and costs the same to store. Nothing
-- reads it yet. Unticking removes the key, so absence is the only way a
-- conversation is outstanding and there is no second falsy state to get wrong.
--
-- ── ACCESS ──────────────────────────────────────────────────────────────────
-- Unchanged from 076: row level security is on, there is no policy, and the
-- only thing that reaches this table is the server with the service key, which
-- authenticates the caller and works out which couple they are.

alter table public.couple_tools
  add column if not exists convos_data jsonb;

comment on column public.couple_tools.convos_data is
  'Which expectations conversations this couple have had: { "<question id>": "<iso timestamp> " }. Keyed by question id, never by the sentence, so a copy edit cannot untie a tick. Written only by the server.';
