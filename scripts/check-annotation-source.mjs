#!/usr/bin/env node
/**
 * Anything that draws marks reads the list the marks are in.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "I have a note called test that I can't find. It says it's in
 * internal processing but there's no icon on the page to point it out."
 *
 * There was no icon because there was no mark. /api/notes answers with three
 * lists, and the split is deliberate:
 *
 *   notes         rows with no anchor      standalone, written on the Notes tab
 *   annotations   rows WITH an anchor      every highlight, underline and note
 *                                          made on a page
 *   sharedWithMe  the partner's
 *
 * attune-app/src/components/results.tsx did `setNotes(n.data.notes)` and handed
 * that to the annotation provider. `notes` is the half with the anchored rows
 * filtered out, so the marking layer was given an empty list on every results
 * page, on every account, for as long as it has existed. No highlight, no
 * underline and no margin icon had ever drawn there.
 *
 * Nothing failed. The screen rendered, the list was a real list, and it was
 * simply the wrong one. The Learn tab took both lists and worked, which is why
 * marking an article looked fine and marking a results page never did: one
 * surface was written from the endpoint and the other from the name of the
 * field.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * A file that calls fetchNotes() has to read `annotations` from the answer.
 * Reading `notes` as well is fine and usually right; reading only `notes` is
 * the bug, and it is invisible from the outside.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the list reaches the provider, or whether a mark's anchor matches
 * the page it is on. This is about the one confusion that actually happened:
 * two lists with similar names where only one carries anchors.
 *
 * It also cannot see a file that receives notes as a prop, like post-reader,
 * which is correct: the file that fetched them is the one that chose.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'attune-app/src');

/** Every .ts and .tsx under the app's source. */
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(SRC);
const problems = [];
let callers = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  // The client module is where fetchNotes is declared, not a caller of it.
  if (file.endsWith('api/client.ts')) continue;
  if (!/\bfetchNotes\s*\(/.test(src)) continue;
  callers += 1;

  // Comments explain the rule; they must not be what satisfies it.
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  if (!/\bannotations\b/.test(code)) {
    problems.push(
      `${file.slice(ROOT.length)} calls fetchNotes() and never reads `
      + '`annotations`. That is the list every anchored mark is in; `notes` is '
      + 'the list they have been filtered out of.');
  }
}

if (!callers) {
  console.error('[check-annotation-source] nothing calls fetchNotes(), so this is checking nothing.');
  process.exit(1);
}

if (problems.length) {
  console.error('[check-annotation-source] a screen is reading the wrong half of /api/notes:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('/api/notes returns `notes` (no anchor) and `annotations` (anchored).');
  console.error('Marks on a page are annotations. See api/notes.js.');
  process.exit(1);
}

console.log(`[check-annotation-source] ${callers} callers of fetchNotes(); every one reads the anchored list.`);
