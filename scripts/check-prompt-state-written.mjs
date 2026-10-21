#!/usr/bin/env node
/**
 * Every column a home prompt branches on is written by something.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * `profiles.results_last_opened_at` has existed since migration 050, whose own
 * comment says it "drives results ready and never opened". Nothing ever wrote
 * it. Three live rules read it through /api/home:
 *
 *   "Your results are ready", priority 8, fires on `!resultsLastOpenedAt`, so
 *     it was the top card for every couple for ever, however many times they
 *     had opened their results;
 *   "Revisit <anchor>", priority 4, fires on `ago(lastOpened) > 30`, and
 *     `ago(null)` is Infinity, so that was permanently on too;
 *   the beta feedback prompt is gated on it being SET, so it could never
 *     appear at all.
 *
 * `feedback_given_at` was the same bug a few months earlier, and CLAUDE.md
 * already records it: "A flag nothing writes is a prompt that never stops."
 *
 * ── WHY THE EXISTING TESTS COULD NOT SEE IT ───────────────────────────────
 * next-action-test.mjs exercises all three rules and passes, because it hands
 * `resultsLastOpenedAt` in as a fixture value. A test that invents the field
 * is a guess about what the product stores: the same lesson CLAUDE.md records
 * about hand-typed answer sets.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * The mapping is read out of api/home.js: every `someField: me.some_column`.
 * The readers are read out of api/_lib/next-action.js: every `state.someField`
 * it branches on. For every column in both, some file has to name it while
 * writing to the profiles table.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the write happens at the right MOMENT, or at all at run time. A
 * column named inside a handler that patches profiles counts as written here;
 * that is deliberately weak, because this codebase writes a column through a
 * computed key more often than it writes one literally
 * (`updates[`${exercise}_completed_at`]`, `markSent(id, field)`,
 * `patch[DAILY_KINDS[kind]]`), and a stricter matcher would report fifteen
 * false findings and be switched off.
 *
 * What it catches is the one that matters: a column named in no writing file
 * anywhere, which is what both of these bugs were.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const strip = (s) => s.replace(/\/\*[^]*?\*\//g, ' ').replace(/^\s*\/\/[^\n]*/gm, ' ');

const home = strip(readFileSync(join(ROOT, 'api/home.js'), 'utf8'));
const next = strip(readFileSync(join(ROOT, 'api/_lib/next-action.js'), 'utf8'));

/** field -> column, from `someField: me.some_column`. */
const mapping = new Map();
for (const m of home.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*(?:!!)?me\.([a-z_][a-z0-9_]*)/g)) {
  mapping.set(m[1], m[2]);
}
if (mapping.size < 5) {
  console.error(`[check-prompt-state-written] read only ${mapping.size} state fields out of api/home.js;`
    + ' this gate expects the payload to be built as `field: me.column`.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/** Every state field next-action.js reads. */
const read = new Set([...next.matchAll(/state\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]));
if (!read.size) {
  console.error('[check-prompt-state-written] next-action.js reads no state fields. Refusing to pass.');
  process.exit(1);
}

/** Every file that writes to the profiles table at all. */
const writers = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(js|mjs|jsx)$/.test(name)) writers.push(full);
  }
})(join(ROOT, 'api'));
for (const name of readdirSync(join(ROOT, 'src'))) {
  const full = join(ROOT, 'src', name);
  if (!statSync(full).isDirectory() && /\.(js|jsx)$/.test(name)) writers.push(full);
}

/**
 * ── A MENTION IS NOT A WRITE ──────────────────────────────────────────────
 * The first version of this asked whether the column's name appeared anywhere
 * in a file that writes to profiles. Planting the bug back walked straight
 * through it: api/home.js both writes to profiles and SELECTS this column by
 * name, so the name was there and nothing had been written.
 *
 * The same family as every other matcher mistake in this repo: matching a name
 * rather than what surrounds it. So the name has to appear in a position that
 * sets something:
 *
 *   col: value        an object key, how a PATCH body is built
 *   patch.col = …     assigned onto a row being assembled
 *   obj['col'] = …    the same, quoted
 *   `${x}_suffix`     a computed key, how this codebase writes most columns
 */
const writing = [];
for (const f of writers) {
  const body = strip(readFileSync(f, 'utf8'));
  /* Every way this repo names that table. api/partner-nudge.js calls a local
     `rest('profiles?id=eq...')` helper, so the literal `rest/v1/profiles` is
     nowhere in it and the first version of this did not count it as a writer
     at all: the same indirection problem, one layer out. */
  const patches = /rest\/v1\/profiles/.test(body)
    || /from\(\s*['"`]profiles['"`]\s*\)/.test(body)
    || /['"`]profiles[?'"`]/.test(body);
  if (!patches) continue;
  const sets = [
    ...[...body.matchAll(/(?:^|[{,\s])([a-z_][a-z0-9_]*)\s*:/gm)].map((m) => m[1]),
    ...[...body.matchAll(/\.\s*([a-z_][a-z0-9_]*)\s*=[^=]/g)].map((m) => m[1]),
    ...[...body.matchAll(/\[\s*['"`]([a-z_][a-z0-9_]*)['"`]\s*\]\s*=/g)].map((m) => m[1]),
  ];
  writing.push({ rel: f.replace(ROOT, ''), sets: new Set(sets), code: body });
}
if (writing.length < 3) {
  console.error(`[check-prompt-state-written] found ${writing.length} files that touch the profiles`
    + ' table; there were nineteen when this was written. Refusing to pass.');
  process.exit(1);
}

const fails = [];
let checked = 0;
for (const [field, column] of mapping) {
  if (!read.has(field)) continue;
  checked += 1;
  /* Set by name, or built as a computed key whose tail is this column's. */
  const tail = /^(ex\d|daily|checkin)/.test(column) ? column.replace(/^(ex\d|daily|checkin)/, '') : null;
  const where = writing.filter((w) => w.sets.has(column)
    || (tail && new RegExp('\\$\\{[^}]*\\}' + tail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(w.code)));
  if (!where.length) {
    fails.push(`profiles.${column} reaches next-action.js as \`${field}\`, and no file that writes`
      + ' to profiles names it. A prompt gated on a column nothing sets is a prompt that never'
      + ' changes: on for ever, or off for ever.');
  }
}

if (!checked) {
  console.error('[check-prompt-state-written] no field in api/home.js is read by next-action.js.'
    + ' That cannot be right. Refusing to pass.');
  process.exit(1);
}

if (fails.length) {
  console.error('[check-prompt-state-written] a home prompt reads a column nothing writes:\n');
  for (const f of fails) console.error('  ' + f);
  process.exit(1);
}

console.log(`[check-prompt-state-written] ${checked} of ${mapping.size} profile columns in the home`
  + ` payload are branched on by next-action.js; every one is named by at least one of the`
  + ` ${writing.length} files that write to profiles.`);
