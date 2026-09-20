#!/usr/bin/env node
/**
 * The database and the validator agree on what an anchor type is.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * `notes.anchor_type` carries a CHECK listing the types a row may have.
 * `isValidAnchor` in api/_lib/tags.js switches on the same list. Neither may
 * know a type the other does not.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * The relationship journal stores an entry as a note anchored to its day. The
 * validator was taught the type; the CHECK was not, because it is in a
 * migration written a year earlier and nothing connects the two. So the
 * request passed validation, reached Postgres, and the row was refused. The
 * app said "That entry did not save. Try again in a moment", which is true and
 * says nothing at all: trying again would fail the same way forever.
 *
 * This is the failure this codebase is organised against, in its purest form:
 * one rule maintained by hand in two places, in two languages, with nothing
 * checking that they agree. It was found by writing an entry rather than by
 * reading the code, which is the whole argument for testing the real path.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * The CHECK is read out of the migrations, latest definition wins, because a
 * later migration may replace an earlier one's constraint. The validator's
 * types are read out of its switch. Then both directions: a type in one and
 * not the other is a failure either way round.
 *
 * Reading SQL with a regex is usually the wrong tool. It is the right one here
 * because there is no other way to know what the live column allows without a
 * database, and the alternative is what was already in place, which is nothing.
 * The regex is anchored on the column name and the constraint name and fails
 * loudly if it finds neither, rather than passing on an empty list.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the migration has been RUN. Only Ellie runs migrations, by design,
 * and a gate cannot see her database. What it covers is the thing that can be
 * got wrong in a commit: shipping code that needs a constraint nobody wrote.
 */

import { readFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const MIGRATIONS = `${ROOT}supabase/migrations/`;
const problems = [];

// ── 1. What the column allows, from the latest migration that says ─────────
const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();

let sqlTypes = null;
let sqlFrom = null;
for (const f of files) {
  const text = readFileSync(MIGRATIONS + f, 'utf8');
  /**
   * Either the original column definition or a later ADD CONSTRAINT. Both are
   * found the same way: the word anchor_type, then the next `in ( ... )`.
   * Taking the last match in the file rather than the first, because a
   * migration that replaces a constraint mentions the column twice.
   */
  if (!/anchor_type/.test(text)) continue;
  const lists = [...text.matchAll(/anchor_type[\s\S]{0,400}?\bin\s*\(([^)]*)\)/gi)];
  if (!lists.length) continue;
  const found = new Set(
    [...lists[lists.length - 1][1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]),
  );
  if (!found.size) continue;
  sqlTypes = found;
  sqlFrom = f;
}

if (!sqlTypes || !sqlTypes.size) {
  // A gate that has lost its subject must never report success.
  console.error('[check-anchor-types] no anchor_type CHECK found in any migration; refusing to pass.');
  process.exit(1);
}

// ── 2. What the validator allows, from its switch ──────────────────────────
const tags = readFileSync(`${ROOT}api/_lib/tags.js`, 'utf8');
const fn = tags.slice(tags.indexOf('export function isValidAnchor'));
const body = fn.slice(0, fn.indexOf('\n}'));
const jsTypes = new Set([...body.matchAll(/case\s+'([a-z_]+)'\s*:/g)].map((m) => m[1]));

if (!jsTypes.size) {
  console.error('[check-anchor-types] no cases found in isValidAnchor; refusing to pass.');
  process.exit(1);
}

// ── 3. Both directions ─────────────────────────────────────────────────────
for (const t of jsTypes) {
  if (!sqlTypes.has(t)) {
    problems.push(
      `isValidAnchor accepts '${t}' and the column's CHECK does not (${sqlFrom}).\n`
      + '      The note passes validation, reaches Postgres and is refused there,\n'
      + '      which surfaces as "that did not save" and never as a reason.',
    );
  }
}
for (const t of sqlTypes) {
  if (!jsTypes.has(t)) {
    problems.push(
      `the column's CHECK allows '${t}' and isValidAnchor refuses it.\n`
      + '      Nothing can ever write one, and anything already stored under it\n'
      + '      is unreachable by every surface that resolves an anchor.',
    );
  }
}

if (problems.length) {
  console.error('[check-anchor-types] the database and the validator disagree:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('Adding an anchor type takes both: a case in api/_lib/tags.js and a');
  console.error('migration widening notes.anchor_type. See 073_journal_anchor.sql.');
  process.exit(1);
}

console.log(
  `[check-anchor-types] ${jsTypes.size} anchor types; the validator and the column's `
  + `CHECK (${sqlFrom}) hold the same list.`,
);
