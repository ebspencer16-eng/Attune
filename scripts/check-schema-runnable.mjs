#!/usr/bin/env node
/**
 * The schema file can be run, and is idempotent the way it says it is.
 *
 * ── THE BUG THIS ENCODES ──────────────────────────────────────────────────
 * supabase/schema.sql opens with "Run this in the Supabase SQL Editor" and
 * "Safe to run in order; each block is idempotent". It could not be run at
 * all. Seven statements read `create policy if not exists`, and PostgreSQL has
 * never had an IF NOT EXISTS clause on CREATE POLICY, so the file stopped at
 * its first policy, on line 25, with `syntax error at or near "not"`. An
 * eighth error sat behind the first, invisible until it was fixed: a FOR
 * INSERT policy carrying a USING clause, which it may not, because there is no
 * existing row for an insert to test.
 *
 * The two lines of header are why it cost nothing to believe. A file that
 * says it is safe to paste is the thing somebody reads instead of trying it,
 * and the only person who would ever have tried it is Ellie, setting up a new
 * project, getting an error she cannot act on.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * The promise in the header, not the typo that broke it: every CREATE in the
 * file is idempotent, by one of the only two mechanisms PostgreSQL offers.
 *
 *   IF NOT EXISTS        on the create itself, for tables, indexes and the
 *                        rest that support it
 *   DROP ... IF EXISTS   immediately before, which is the only form available
 *                        for a policy and is therefore what the policies use
 *
 * Checking the promise rather than the spelling is the difference between a
 * gate that catches this one and a gate that catches the next one. CREATE
 * TRIGGER has no IF NOT EXISTS either, and nor does CREATE RULE; both would
 * fail this on the first attempt to add one carelessly.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the SQL parses. That needs a real PostgreSQL parser and this repo
 * has no SQL dependency: it is a JavaScript project and adding libpg_query to
 * the build for one file is a worse trade than writing down how to run it.
 * The schema and all 112 other .sql files were parsed with libpg_query, the
 * parser Postgres itself uses, on 2026-10-28, and the command is in
 * HANDOFF.md so the figure can be taken again rather than remembered.
 *
 * Nor does it cover the OTHER files under supabase/. migrations are run once
 * each, in order, and are not expected to be idempotent; several deliberately
 * are not. This is about the one file that claims it.
 */
import { readFileSync } from 'node:fs';

const FILE = 'supabase/schema.sql';
const sql = readFileSync(new URL(`../${FILE}`, import.meta.url), 'utf8');
const fails = [];

/**
 * Comments out, then split on statement boundaries.
 *
 * BOTH kinds of comment. The first version stripped `-- line` comments only,
 * and the file has a `/* block *\u002f` comment explaining the FOR INSERT
 * rule directly above a CREATE POLICY. So that statement's text began with
 * the comment, `startsWith('create ')` was false, and the whole policy was
 * skipped: the gate reported 18 CREATEs where there are 19, and a plant
 * putting the old syntax error back into that exact statement walked
 * straight through.
 *
 * A gate that passes for the wrong reason, in the gate written to stop a file
 * passing for the wrong reason. Found by planting, which is the only way it
 * was going to be found.
 *
 * A `--` or a `/*` inside a string literal would still break this; there are
 * none, and a parser is the answer if there ever are, which the header says.
 */
const bare = sql
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n')
  .filter((l) => !/^\s*--/.test(l))
  .join('\n');
const statements = bare.split(';').map((s) => s.trim()).filter(Boolean);

if (statements.length < 20) {
  console.error(`[check-schema-runnable] only ${statements.length} statements found in ${FILE}.`
    + ' This gate has lost its subject, and a gate that has lost its subject must never'
    + ' report success.');
  process.exit(1);
}

/* The header makes the promise. If the words go, so does the reason for this
   file, and that should be a decision rather than a drift. */
if (!/each block is idempotent/i.test(sql)) {
  fails.push(`${FILE} no longer promises that each block is idempotent, which is the`
    + ' whole subject of this gate. If that promise was dropped on purpose, delete this'
    + ' gate in the same commit.');
}

let creates = 0;
let guardedBySelf = 0;
let guardedByDrop = 0;
statements.forEach((st, i) => {
  const first = st.replace(/\s+/g, ' ').toLowerCase();
  if (!first.startsWith('create ')) return;
  creates += 1;

  if (/^create\s+(?:or\s+replace\s+)?[a-z ]*?if\s+not\s+exists\b/.test(first)) {
    guardedBySelf += 1;
    return;
  }
  /* CREATE OR REPLACE is its own idempotence, for the objects that have it. */
  if (/^create\s+or\s+replace\b/.test(first)) { guardedBySelf += 1; return; }

  /* Otherwise the statement before it has to clear the way. Immediately
     before, not somewhere above: a drop six statements back is not a guard,
     it is a coincidence. */
  const prev = (statements[i - 1] || '').replace(/\s+/g, ' ').toLowerCase();
  const what = /^create\s+([a-z]+)/.exec(first)?.[1];
  const dropped = new RegExp(`^drop\\s+${what}\\s+if\\s+exists\\b`).test(prev);
  if (dropped) { guardedByDrop += 1; return; }

  fails.push(`${FILE} statement ${i + 1} is a CREATE that is not idempotent:\n      `
    + `${st.split('\n')[0].slice(0, 90)}\n      Either add IF NOT EXISTS, or put`
    + ` "drop ${what} if exists ..." immediately before it. A policy and a trigger have`
    + ' no IF NOT EXISTS in PostgreSQL, so for those the drop is the only form.');
});

/* PostgreSQL has no CREATE POLICY ... IF NOT EXISTS. A statement claiming to
   use one is the original bug exactly, and the loop above would call it
   guarded, because it only reads the words. */
for (const st of statements) {
  const flat = st.replace(/\s+/g, ' ').toLowerCase();
  if (/^create\s+policy\s+if\s+not\s+exists\b/.test(flat)) {
    fails.push(`${FILE} has "create policy if not exists", which PostgreSQL does not`
      + ' have at any version. Use drop policy if exists, then create policy.');
  }
  /* And a FOR INSERT policy may not carry USING: there is no existing row to
     test. This was the second error, hidden behind the first. */
  if (/^create\s+policy\b/.test(flat) && /\bfor\s+insert\b/.test(flat) && /\busing\s*\(/.test(flat)) {
    fails.push(`${FILE} has a FOR INSERT policy with a USING clause, which PostgreSQL`
      + ' rejects. An insert has no existing row, so the test is WITH CHECK alone.');
  }
}

if (fails.length) {
  console.error('check-schema-runnable FAILED');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-schema-runnable] ${FILE}: ${statements.length} statements, ${creates} of them`
  + ` CREATE, every one idempotent (${guardedBySelf} by IF NOT EXISTS or OR REPLACE,`
  + ` ${guardedByDrop} by a DROP IF EXISTS immediately before), and no policy written in a`
  + ' form PostgreSQL does not have.');
