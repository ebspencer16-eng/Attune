#!/usr/bin/env node
/**
 * Puts the migration Ellie has to run into TASKS.md, verbatim.
 *
 * ── WHY IT IS INLINE AND NOT A PATH ───────────────────────────────────────
 * Step 2 of B17b used to say: run `cat <path> | pbcopy` in Terminal, then
 * paste into Supabase. She pasted the cat command into Supabase and got
 * "syntax error at or near cat". Two windows and two pastes, with nothing on
 * the page saying which was which.
 *
 * So the SQL is in TASKS.md, in the one document she reads, under the step it
 * belongs to. That is a second copy of something, which is the failure this
 * codebase is organised against, so it is generated rather than pasted and
 * check-tasks-doc fails the build if the two ever differ.
 *
 * ── THE MARKERS ───────────────────────────────────────────────────────────
 * An HTML comment naming the migration, a ```sql fence, and a closing comment.
 * Changing which migration is live is changing the name in that comment.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const TASKS = `${ROOT}TASKS.md`;

/** The one block, and which file fills it. */
const OPEN = /<!-- SQL ([\w.-]+): written by scripts\/build-tasks-sql\.mjs\. Do not edit\. -->\n```sql\n([\s\S]*?)```\n<!-- \/SQL -->/;

export function fill(doc, read = (f) => readFileSync(`${ROOT}supabase/migrations/${f}`, 'utf8')) {
  const m = OPEN.exec(doc);
  if (!m) return { doc, name: null, changed: false };
  const sql = read(m[1]).replace(/\s+$/, '');
  const block = `<!-- SQL ${m[1]}: written by scripts/build-tasks-sql.mjs. Do not edit. -->\n`
    + '```sql\n' + sql + '\n```\n<!-- /SQL -->';
  /**
   * ── A REPLACER FUNCTION, NOT A STRING ─────────────────────────────────
   * String.prototype.replace reads $&, $', $` and $1 inside a STRING
   * replacement as instructions. Migration 083 contains the regular
   * expression '^([01][0-9]|2[0-3]):[0-5][0-9]$' in a CHECK constraint, and
   * the `$'` in it means "everything after the match": TASKS.md came back
   * with the whole of itself from that point pasted in again, three times
   * over, and every gate about the document failed at once.
   *
   * A function replacement is handed the text literally. This had been right
   * for eighteen migrations and was waiting for the first one with a dollar
   * sign in it.
   */
  const out = doc.replace(OPEN, () => block);
  return { doc: out, name: m[1], changed: out !== doc };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const doc = readFileSync(TASKS, 'utf8');
  const { doc: out, name, changed } = fill(doc);
  if (!name) {
    /* Nothing to run is a state the document is allowed to be in: she has run
       everything, and the block comes back with the next migration. It used to
       exit 1 here, which failed `npm run check` for the document being up to
       date. check-tasks-doc holds the other half, that section 1 may not ask
       her to run SQL when there is no block. */
    console.log('[build-tasks-sql] no migration block in TASKS.md; nothing for her to run.');
    process.exit(0);
  }
  if (changed) writeFileSync(TASKS, out);
  console.log(`[build-tasks-sql] TASKS.md carries ${name}${changed ? ', rewritten' : ', already current'}.`);
}
