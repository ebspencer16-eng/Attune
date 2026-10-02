-- 077 — the Word file stops being anyone's workbook
--
-- Ellie: "I want customers to be able to download the pdf. Remove the word file."
--
-- orders.workbook_url holds a signed link to whatever the last builder wrote,
-- and for every couple in the product that is a .docx: the PDF service has only
-- just started answering, so no PDF had ever been built. The app opened one in
-- front of her, 40 KB, named Attune_Workbook_..._and_Preston.docx.
--
-- The code no longer serves a link that does not point at a PDF, so this row of
-- data is already inert. It is cleared anyway, because a column holding a link
-- to a document the product will not serve is a fact waiting to be believed by
-- the next thing that reads it, and `workbook_status = 'ready'` beside it says
-- a workbook exists when none does.
--
-- The .docx objects in Storage are NOT touched. Deleting files is not something
-- a migration should do quietly, and nothing points at them now.
--
-- Safe to run twice.

update public.orders
   set workbook_url = null,
       workbook_status = null
 where workbook_url is not null
   and lower(workbook_url) !~ '\.pdf(\?|$)';

-- Profiles carry the same pair for comp accounts, which have no order row.
update public.profiles
   set workbook_url = null,
       workbook_status = null
 where workbook_url is not null
   and lower(workbook_url) !~ '\.pdf(\?|$)';
