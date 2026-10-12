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
  return { doc: doc.replace(OPEN, block), name: m[1], changed: doc.replace(OPEN, block) !== doc };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const doc = readFileSync(TASKS, 'utf8');
  const { doc: out, name, changed } = fill(doc);
  if (!name) {
    console.error('[build-tasks-sql] TASKS.md has no SQL block to fill.');
    process.exit(1);
  }
  if (changed) writeFileSync(TASKS, out);
  console.log(`[build-tasks-sql] TASKS.md carries ${name}${changed ? ', rewritten' : ', already current'}.`);
}
