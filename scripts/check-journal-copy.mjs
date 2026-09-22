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

const ROOT = new URL('..', import.meta.url).pathname;
const APP = `${ROOT}attune-app/src/components/journal.tsx`;
const WEB = `${ROOT}src/notes-web.jsx`;

/** Which named constant in the app holds which key of the shared map. */
const PAIRS = {
  placeholder: 'PLACEHOLDER',
  search: 'SEARCH',
  noMatch: 'NO_MATCH',
  empty: 'EMPTY',
};

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

if (fails.length) {
  console.error('\n check-journal-copy: the journal says different things on the two surfaces.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`✓ check-journal-copy: ${Object.keys(PAIRS).length} strings, the same on the website and in the app, all four drawn on both.`);
