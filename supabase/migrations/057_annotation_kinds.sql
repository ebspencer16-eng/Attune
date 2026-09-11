-- 057: annotation kinds, colours, and an opened marker for shared notes
--
-- The notes table already carries everything an annotation needs to say WHERE
-- it is: anchor_type, anchor_key, and anchor_context for the text itself. What
-- it cannot say is what KIND of annotation it is.
--
-- Ellie's spec: selecting text offers highlight, underline, tag, note and
-- share. Tag and share already have a home, on note_tags and on
-- visibility/couple_key. Highlight and underline do not: both are an
-- annotation with a colour and no words, and stored as notes today they would
-- be indistinguishable from an empty note.
--
-- `opened_at` is the other half of "which of these are unread". A shared note
-- is written by one partner and read by the other, so the recipient is always
-- a single known person and one timestamp on the row answers it. A separate
-- receipts table would be the right shape if a note could ever reach more than
-- one reader, and it cannot: sharing is couple-scoped by constraint.
--
-- Safe to run more than once. Existing rows become kind 'note', which is what
-- every row in the table is today.

alter table public.notes
  add column if not exists kind text not null default 'note',
  add column if not exists color text,
  add column if not exists opened_at timestamptz;

-- Added separately from the column so re-running does not fail on a constraint
-- that already exists.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notes_kind_check'
  ) then
    alter table public.notes
      add constraint notes_kind_check
      check (kind in ('note', 'highlight', 'underline'));
  end if;
end $$;

comment on column public.notes.kind is
  'note, highlight or underline. A highlight and an underline carry a colour and usually no body; a note carries words. All three anchor the same way.';

comment on column public.notes.color is
  'The colour a highlight or underline was made in. Null on a plain note.';

comment on column public.notes.opened_at is
  'When the partner this note was shared with first opened it. Null means unread. Meaningless on a private note, which has no reader but its author.';

-- The Notes tab lists a person's own annotations newest first, and separately
-- lists what their partner has shared with them. Both are hot paths on a screen
-- that opens on every visit.
create index if not exists notes_owner_kind_created_idx
  on public.notes (owner_id, kind, created_at desc);

create index if not exists notes_shared_unopened_idx
  on public.notes (couple_key, created_at desc)
  where visibility = 'shared' and opened_at is null;

-- Verify.
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'notes'
  and column_name in ('kind', 'color', 'opened_at')
order by column_name;
