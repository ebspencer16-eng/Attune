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

/**
 * Every block, and which file fills each one.
 *
 * It was one block, matched once. She can have more than one thing to run at a
 * time: an approved migration she has not got to yet, and a new read-only
 * question that cannot wait behind it. Pointing the single block at the newer
 * one would have quietly dropped the older from the document, which is how an
 * approved migration stops being asked for.
 *
 * Global, so every marker in the file is filled from its own named migration.
 */
const OPEN = /<!-- SQL ([\w.-]+): written by scripts\/build-tasks-sql\.mjs\. Do not edit\. -->\n```sql\n([\s\S]*?)```\n<!-- \/SQL -->/g;

export function fill(doc, read = (f) => readFileSync(`${ROOT}supabase/migrations/${f}`, 'utf8')) {
  OPEN.lastIndex = 0;
  const names = [...doc.matchAll(OPEN)].map((m) => m[1]);
  if (!names.length) return { doc, name: null, names: [], changed: false };
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
  OPEN.lastIndex = 0;
  const out = doc.replace(OPEN, (...args) => {
    const file = args[1];
    const sql = read(file).replace(/\s+$/, '');
    return `<!-- SQL ${file}: written by scripts/build-tasks-sql.mjs. Do not edit. -->\n`
      + '```sql\n' + sql + '\n```\n<!-- /SQL -->';
  });
  return { doc: out, name: names[0], names, changed: out !== doc };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const doc = readFileSync(TASKS, 'utf8');
  const { doc: out, name, names, changed } = fill(doc);
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
  console.log(`[build-tasks-sql] TASKS.md carries ${names.length} migration block(s): `
    + `${names.join(', ')}${changed ? ', rewritten' : ', already current'}.`);
}
