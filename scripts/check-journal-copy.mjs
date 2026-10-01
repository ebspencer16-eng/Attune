#!/usr/bin/env node
/**
 * The journal says the same thing on both surfaces.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Four strings: the composer's placeholder, the search field, the line when a
 * search matches nothing, and the line when there are no entries. Ellie writes
 * every word a customer reads, and these are placeholders standing in until
 * she does, listed as C4 in TASKS.md.
 *
 * The app's failure line is deliberately not among them. It says "pull down to
 * try again", which is a phone, and the website's Notes page carries one
 * failure line for the whole page rather than one per block. journal-copy.js
 * says so where the string would have been.
 *
 * Whatever they end up saying, they have to say it in both places. A journal
 * whose empty state reads one way on a phone and another on a laptop is the
 * same product disagreeing with itself about its own voice.
 *
 * ── WHY THIS IS TWO FILES AT ALL ──────────────────────────────────────────
 * api/_lib/journal-copy.js is the source, and the website imports it. An Expo
 * project cannot import from api/, so attune-app/src/components/journal.tsx
 * carries named constants instead, and this holds them together.
 *
 * That is the arrangement check-budget-mirror.mjs already has for the budget's
 * arithmetic and for the same reason: a bundler boundary, not a decision.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * The module is imported and the app's constants are read out of its source by
 * name. If a name is gone this fails rather than skipping it: a gate that has
 * lost half its subject must not report success on the other half.
 */

import { readFileSync } from 'node:fs';
import { JOURNAL_COPY } from '../api/_lib/journal-copy.js';
import { NOTES_COPY } from '../api/_lib/notes-copy.js';

const ROOT = new URL('..', import.meta.url).pathname;
const APP = `${ROOT}attune-app/src/components/journal.tsx`;
const NOTES_APP = `${ROOT}attune-app/src/app/notes.tsx`;
const WEB = `${ROOT}src/notes-web.jsx`;

/** Which named constant in the app holds which key of the shared map. */
const PAIRS = {
  placeholder: 'PLACEHOLDER',
  search: 'SEARCH',
  noMatch: 'NO_MATCH',
  empty: 'EMPTY',
};

/**
 * The Notes tab's own words, which live one file over.
 *
 * ── WHY THEY ARE HERE AND NOT IN A GATE OF THEIR OWN ──────────────────────
 * This is the same promise about a different handful of strings, and CLAUDE.md
 * is explicit that a second fixture mirroring an existing one is the failure
 * rather than the fix: two gates testing the same thing slightly differently
 * drift, and the weaker one wins because it is the one that still passes.
 *
 * `lockedApp` is in this list too. Its twin `lockedWeb` deliberately is not:
 * the app locks the journal with the phone's passcode and the website with the
 * account password, so one sentence for both would be wrong on one of them.
 */
const NOTES_PAIRS = {
  recent: 'JUMP_BACK_IN',
  sharedWithMe: 'SHARED_WITH_ME',
  writeEntry: 'WRITE_ENTRY',
  wordInUse: 'WORD_IN_USE',
  journalTitle: 'JOURNAL_TITLE',
  journalOpen: 'JOURNAL_OPEN',
  mineEmpty: 'PEEK_MINE_EMPTY',
  sharedEmpty: 'PEEK_SHARED_EMPTY',
};
const LOCK_PAIRS = { lockedApp: 'JOURNAL_LOCKED' };

const fails = [];
const app = readFileSync(APP, 'utf8');
const web = readFileSync(WEB, 'utf8');

for (const [key, name] of Object.entries(PAIRS)) {
  const m = app.match(new RegExp(`\\bconst ${name} = '((?:[^'\\\\]|\\\\.)*)'`));
  if (!m) {
    fails.push(`journal.tsx no longer declares ${name}, which holds the app's`
      + ` copy of JOURNAL_COPY.${key}. Either the string moved, in which case`
      + ' point this gate at where it went, or the app stopped saying it.');
    continue;
  }
  const appValue = m[1].replace(/\\'/g, "'");
  if (appValue !== JOURNAL_COPY[key]) {
    fails.push(`the journal's ${key} differs between the surfaces.\n`
      + `      api/_lib/journal-copy.js: ${JSON.stringify(JOURNAL_COPY[key])}\n`
      + `      journal.tsx ${name}:       ${JSON.stringify(appValue)}`);
  }
}

/** And the website has to actually read the module, not restate it. */
for (const key of Object.keys(PAIRS)) {
  if (!web.includes(`JOURNAL_COPY.${key}`)) {
    fails.push(`src/notes-web.jsx never draws JOURNAL_COPY.${key}. A string in`
      + ' the shared module that one surface does not render is a string that'
      + ' will be reviewed and never seen, which is how ten action items got'
      + ' approved for a page the product has never drawn.');
  }
}

/**
 * ── THE NOTES TAB'S WORDS, THE SAME WAY ───────────────────────────────────
 * Read out of attune-app/src/app/notes.tsx by name, compared to the shared
 * module, and required to be drawn by the website. The last part is what stops
 * this becoming a list of strings nobody renders.
 */
const notesApp = readFileSync(NOTES_APP, 'utf8');
const readConst = (src, name) => {
  const m = src.match(new RegExp(`\\bconst ${name} = '((?:[^'\\\\]|\\\\.)*)'`));
  return m ? m[1].replace(/\\'/g, "'") : null;
};

for (const [map, pairs, label] of [
  [NOTES_COPY, NOTES_PAIRS, 'NOTES_COPY'],
  [JOURNAL_COPY, LOCK_PAIRS, 'JOURNAL_COPY'],
]) {
  for (const [key, name] of Object.entries(pairs)) {
    const got = readConst(notesApp, name);
    if (got === null) {
      fails.push(`attune-app/src/app/notes.tsx no longer declares ${name}, which holds the`
        + ` app's copy of ${label}.${key}. Either the string moved, in which case point this`
        + ' gate at where it went, or the app stopped saying it. Refusing to skip it: a gate'
        + ' that has lost half its subject must not report success on the other half.');
      continue;
    }
    if (got !== map[key]) {
      fails.push(`${label}.${key} differs between the surfaces:\n`
        + `      app:     ${JSON.stringify(got)}\n`
        + `      shared:  ${JSON.stringify(map[key])}`);
    }
  }
}

for (const key of Object.keys(NOTES_PAIRS)) {
  if (!web.includes(`NOTES_COPY.${key}`)) {
    fails.push(`src/notes-web.jsx never draws NOTES_COPY.${key}. A string in the shared`
      + ' module that one surface does not render is a string that will be reviewed and'
      + ' never seen.');
  }
}
if (!web.includes('JOURNAL_COPY.lockedWeb')) {
  fails.push('src/notes-web.jsx never draws JOURNAL_COPY.lockedWeb, which is the only line'
    + ' telling someone why their journal is shut.');
}

if (fails.length) {
  console.error('\n check-journal-copy: the journal says different things on the two surfaces.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
const total = Object.keys(PAIRS).length + Object.keys(NOTES_PAIRS).length
  + Object.keys(LOCK_PAIRS).length;
console.log(`✓ check-journal-copy: ${total} strings across the journal and the Notes tab,`
  + ' the same on the website and in the app, every one of them drawn on both.');
