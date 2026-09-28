#!/usr/bin/env node
/**
 * The admin's slicers order the journal buckets the way the server names them.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie: "Add this to every slicer in admin, not just the explore page." Every
 * tile slicer in the admin reads one list, SLICE_DIMS in public/admin.html, so
 * adding the two journal fields there was one edit and reached all of them.
 *
 * SLICE_ORDER beside it says what order a field's values appear in, and that is
 * a list of the actual strings. public/admin.html is a static page with no build
 * step, so it cannot import api/_lib/journal-use.js and the strings have to be
 * typed. I typed them and got four of nine wrong on the first attempt: "Never"
 * for "Never used", "3+ a month" for "3 or more a month", and two bands with a
 * hyphen where the module uses an en dash.
 *
 * Nothing would have failed. orderedCats falls back to whatever order the rows
 * happen to arrive in when a value is not in SLICE_ORDER, so a wrong string is a
 * bucket that quietly sorts itself somewhere else. The one place it matters is
 * the one place it is used: reading "3 or more a month" above "Never used" is a
 * chart that says the opposite of what it means.
 *
 * ── WHAT THIS CHECKS ──────────────────────────────────────────────────────
 * Every bucket and band the server can produce appears in admin.html's order
 * list, spelled the same, and nothing is in that list which the server cannot
 * produce. Both directions, because a stale value is as wrong as a missing one.
 *
 * And that the fields are in SLICE_DIMS at all, which is what makes them reach
 * every slicer rather than one page.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The other dimensions in SLICE_ORDER. Their values are demographic answers that
 * come from the profile columns, and check-demographics-capture is where those
 * are held to the form that writes them. This is scoped to the journal, because
 * the journal is the one whose vocabulary lives in a module of its own.
 *
 * Not whether the rows carry the fields. They do, from the same endpoint: the
 * cube behind every slicer is /api/admin-explore, which is why this was a
 * two-line change rather than a new query.
 */

import { readFileSync } from 'node:fs';
import { JOURNAL_BUCKETS, JOURNAL_VOLUME_BANDS } from '../api/_lib/journal-use.js';

const ROOT = new URL('..', import.meta.url).pathname;
const admin = readFileSync(`${ROOT}public/admin.html`, 'utf8');
const fails = [];

/** The two fields have to be on the list every slicer reads. */
const dims = admin.match(/const SLICE_DIMS = \[([\s\S]*?)\n\];/);
if (!dims) {
  console.error('[check-slicer-dims] cannot find SLICE_DIMS in public/admin.html.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}
for (const key of ['journal_use', 'journal_entries']) {
  if (!new RegExp(`key:\\s*'${key}'`).test(dims[1])) {
    fails.push(`SLICE_DIMS has no ${key}, so the journal is missing from every tile`
      + ' slicer in the admin except the Explore page, which builds its own fields.');
  }
}

/** And their values have to be the server's values, spelled the same. */
const orderBlock = admin.match(/const SLICE_ORDER = \{([\s\S]*?)\n\};/);
if (!orderBlock) {
  console.error('[check-slicer-dims] cannot find SLICE_ORDER in public/admin.html.'
    + ' Refusing to pass.');
  process.exit(1);
}

const listFor = (key) => {
  const m = orderBlock[1].match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`));
  if (!m) return null;
  return [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]);
};

const expected = {
  journal_use: Object.values(JOURNAL_BUCKETS),
  journal_entries: JOURNAL_VOLUME_BANDS,
};

for (const [key, want] of Object.entries(expected)) {
  const got = listFor(key);
  if (!got) {
    fails.push(`SLICE_ORDER has no ${key}, so its values sort in whatever order the`
      + ' rows happen to arrive in. For a scale that runs from never to often, an'
      + ' arbitrary order is a chart that can say the opposite of what it means.');
    continue;
  }
  for (const v of want) {
    if (!got.includes(v)) {
      fails.push(`the server can produce ${key} = ${JSON.stringify(v)} and`
        + ` SLICE_ORDER does not list it. It has ${JSON.stringify(got)}. A value`
        + ' missing from the order is not an error anywhere: it just sorts itself'
        + ' somewhere else, silently.');
    }
  }
  for (const v of got) {
    if (!want.includes(v)) {
      fails.push(`SLICE_ORDER lists ${key} = ${JSON.stringify(v)}, which the server`
        + ` never produces. It produces ${JSON.stringify(want)}. A stale value is as`
        + ' wrong as a missing one and neither shows up as a failure.');
    }
  }
  if (got.length === want.length && got.join('|') !== want.join('|')) {
    fails.push(`${key} has the right values in a different order. The module's order`
      + ' is the meaningful one: it runs from least to most.');
  }
}

if (fails.length) {
  console.error('\n check-slicer-dims: a journal bucket the admin cannot sort.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log('[check-slicer-dims] the journal reaches every tile slicer, and its'
  + ` ${Object.values(JOURNAL_BUCKETS).length} buckets and ${JOURNAL_VOLUME_BANDS.length}`
  + ' bands are spelled and ordered as the server names them.');
