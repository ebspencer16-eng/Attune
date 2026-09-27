#!/usr/bin/env node
/**
 * Every migration the code tolerates being absent is in the diagnostic.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Migrations here are run by hand, deliberately, and nothing records which ones
 * have been. So ten places in the server carry a comment saying they are
 * tolerant of a particular migration not having been run, and quietly do less
 * when the object is missing. That tolerance is right: a behind schema degrades
 * rather than erroring.
 *
 * It also means a behind schema is invisible, and the things that go quiet are
 * not small: a highlight that cannot save, a consent record that is never
 * written, a deleted partner's results that cannot be found.
 * supabase/diagnostics/migrations-actually-run.sql is the one place that asks.
 *
 * ── WHAT THIS CHECKS ──────────────────────────────────────────────────────
 * The diagnostic is a document that describes the product, and this file exists
 * because of what happens to those. The copy-review document listed ten action
 * items the product has never rendered, and /email-preview showed six
 * hand-written mock-ups while the product sent nineteen real emails. Both were
 * built to show the product and quietly became a second draft of it.
 *
 * So: every migration the code says it tolerates has a row in the diagnostic,
 * every migration the diagnostic names exists as a file, and the scan that finds
 * them refuses to pass if it finds nothing.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the SQL is correct. There is no Postgres in this toolchain. sqlglot
 * parses it as valid Postgres, which catches an unclosed CASE or a missing comma
 * in a select list and is blind to a missing comma between VALUES rows, tested
 * by planting all three. A syntax error costs one paste and no data, because the
 * file only reads.
 *
 * Nor whether the row's description of what degrades is true. That is prose
 * about behaviour and a check cannot read it. What a check can do is make sure
 * the row exists at all, which is the half that goes stale.
 *
 * It does not cover migrations nothing is tolerant of. One of those would have
 * thrown the first time anything touched it, so it is not a silent failure.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIAGNOSTIC = 'supabase/diagnostics/migrations-actually-run.sql';
const fails = [];

/** Every source file that could carry a tolerance comment. */
const sources = [];
for (const dir of ['api', 'src', 'attune-app/src']) {
  (function walk(d) {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(js|jsx|ts|tsx)$/.test(p)) sources.push(p);
    }
  })(join(ROOT, dir));
}

/**
 * A tolerance, not merely a mention.
 *
 * Fifteen migration numbers appear across these files and only ten of them are
 * about absence; the rest are notes about what a column is for. The wording is
 * what separates them, so it is matched rather than the number alone. A gate
 * that matches too much is not the safe direction: five extra rows in the
 * diagnostic would be five things Ellie is told to check that cannot be wrong.
 */
const TOLERANT = /not (?:been )?run|until\s|\byet\b|behind|missing|expected (?:state|failure)/i;

const tolerated = new Map(); // migration number -> where it was found
for (const file of sources) {
  const src = readFileSync(file, 'utf8');
  src.split('\n').forEach((line, i) => {
    const m = line.match(/migration (\d{3})/i);
    if (!m) return;
    if (!TOLERANT.test(line)) return;
    const rel = file.replace(ROOT, '');
    if (!tolerated.has(m[1])) tolerated.set(m[1], `${rel}:${i + 1}`);
  });
}

if (tolerated.size < 5) {
  console.error(`[check-migration-diagnostic] found only ${tolerated.size} tolerated`
    + ' migrations across api/, src/ and attune-app/src/. There were ten. Refusing'
    + ' to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

const sql = readFileSync(`${ROOT}${DIAGNOSTIC}`, 'utf8');

/** Which migrations the diagnostic names, by their file prefix. */
const named = new Set([...sql.matchAll(/'(\d{3})_[a-z0-9_]+'/g)].map((m) => m[1]));

for (const [num, where] of tolerated) {
  if (!named.has(num)) {
    fails.push(`${where} is tolerant of migration ${num} not having been run, and`
      + ` ${DIAGNOSTIC} does not ask whether it has. That path goes quiet on a`
      + ' behind schema and nothing anywhere would say so.');
  }
}

/** And nothing in the diagnostic names a migration that does not exist. */
const files = readdirSync(join(ROOT, 'supabase/migrations'));
for (const num of named) {
  if (!files.some((f) => f.startsWith(`${num}_`))) {
    fails.push(`${DIAGNOSTIC} names migration ${num} and there is no`
      + ` supabase/migrations/${num}_*.sql. Either it was renamed or the row is`
      + ' about a migration that was never written.');
  }
}

/** Every row must say what is degraded, or it is a row nobody can act on. */
const rows = [...sql.matchAll(/'(\d{3})_[a-z0-9_]+',\s*\n\s*'([^']+)',\s*'(table|column)',\s*\n\s*'([^']*)'/g)];
for (const [, num, , , degraded] of rows) {
  if (!degraded.trim()) {
    fails.push(`the row for migration ${num} does not say what is degraded until`
      + ' it is run, so MISSING beside it is a fact with no consequence attached.');
  }
}
if (rows.length && rows.length < named.size - 1) {
  // -1 because 065 is a dropped constraint and is a separate statement, by shape.
  fails.push(`${DIAGNOSTIC} names ${named.size} migrations and only ${rows.length}`
    + ' are in the checked-object table. A row that is not in that table is not'
    + ' reported on.');
}

/**
 * The file must read and never write. It is handed to Ellie to paste.
 *
 * Checked on each statement's LEADING keyword, not by looking for a verb beside
 * a noun. The first version asked for `update` followed by one of into/table/
 * from, and `update public.profiles set is_comp = true` sailed past it, which was
 * the plant. A statement's kind is its first word.
 */
const WRITES = /^(insert|update|delete|drop|alter|truncate|create|grant|revoke|call|do)\b/i;
const statements = sql
  .split('\n')
  .filter((l) => !/^\s*--/.test(l))
  .join('\n')
  .split(';')
  .map((x) => x.trim())
  .filter(Boolean);
for (const st of statements) {
  if (WRITES.test(st)) {
    fails.push(`${DIAGNOSTIC} contains a statement that writes:\n      `
      + `${st.split('\n')[0].slice(0, 80)}\n      Diagnostics are pasted into the`
      + ' SQL editor to find out what is true, and a write in one is a change'
      + ' nobody asked for.');
  }
}
if (!statements.length) {
  fails.push(`${DIAGNOSTIC} has no statements in it at all.`);
}

if (fails.length) {
  console.error('\n check-migration-diagnostic: a silently behind schema.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-migration-diagnostic] all ${tolerated.size} migrations the code`
  + ' tolerates being absent are asked about, every one exists, and the diagnostic only reads.');
