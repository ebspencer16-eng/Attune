/**
 * Every column the server READS, against every column the server WRITES.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * `feedback_given_at` has existed since migration 050 and nothing ever set
 * it, so both home cards gated on `!state.feedbackGivenAt` would have asked
 * for ever. The condition looked correct in every reading of the file,
 * because the bug is not in the reader.
 *
 * It happened again: `profile_setup_complete` is read by api/home.js and the
 * one function that wrote it sat in src/App.jsx with no caller.
 *
 * ── WHY THE FINDINGS NEED READING, NOT COUNTING ───────────────────────────
 * A column can be written somewhere this cannot see: by a migration's
 * backfill, by a database default, by a trigger, or by a surface outside
 * api/. So a name here is a question, not a verdict. What makes the question
 * worth asking is that the answer is usually one grep.
 *
 * The interesting ones are columns a CONDITION depends on, because an
 * unwritten column read as a condition is a branch that can never be taken,
 * and that is indistinguishable from the branch simply not applying yet.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/* ── WRITES HAPPEN IN FOUR PLACES, NOT ONE ────────────────────────────────
   The first version read writes out of api/ alone and reported six columns,
   every one of them a false positive. `ex3_completed` is written by
   src/App.jsx when somebody finishes the exercise. `is_comp` is set by Ellie
   in the SQL editor, which migration 028 says in its own header. And
   `conflict_data` and `intimacy_data` are written through EXERCISE_COLUMNS,
   which is the registry blindness CLAUDE.md already names: the literal never
   appears because the column is reached through a list.

   So reads come from api/, which is the only place that queries, and writes
   are looked for across the server, the website, the app and the migrations.
   A column written by a human in the SQL editor is still written. */
const files = [];
const walk = (d, into) => { for (const e of readdirSync(d, { withFileTypes: true })) {
  if (e.isDirectory()) walk(join(d, e.name), into);
  else if (/\.(js|jsx|ts|tsx|sql)$/.test(e.name)) into.push(join(d, e.name)); } };
walk('api', files);
const writeFiles = [];
for (const d of ['api', 'src', 'attune-app/src', 'supabase/migrations']) {
  try { walk(d, writeFiles); } catch {}
}

const read = new Map();      // column -> first file:line that selects it
const written = new Set();
const COL = /^[a-z][a-z0-9_]{3,}$/;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\.select\(\s*(['"`])([^'"`]+)\1/g)) {
    for (const raw of m[2].split(',')) {
      const c = raw.trim().split(/[\s(]/)[0];
      if (COL.test(c) && !read.has(c)) read.set(c, `${file}:${src.slice(0, m.index).split('\n').length}`);
    }
  }
}

for (const file of writeFiles) {
  const src = readFileSync(file, 'utf8');
  if (file.endsWith('.sql')) {
    /* A migration writes a column by adding it with a default, by setting it,
       or by naming it in an insert's column list. */
    for (const m of src.matchAll(/(?:add column(?: if not exists)?|set|,)\s+([a-z][a-z0-9_]{3,})\s*(?:=|boolean|text|int|uuid|timestamptz|jsonb|numeric)/gi)) written.add(m[1].toLowerCase());
    continue;
  }
  /* A key assigned in an object literal, anywhere in a file that writes. */
  if (/\.(insert|update|upsert)\(|method:\s*['"](?:PATCH|POST)/.test(src)) {
    for (const m of src.matchAll(/([a-z][a-z0-9_]{3,})\s*:/g)) written.add(m[1]);
  }
  for (const m of src.matchAll(/[?&]([a-z][a-z0-9_]{3,})=/g)) written.add(m[1]);
  /* Reached through a registry: EXERCISE_COLUMNS and friends list the column
     names as plain strings and the write is a computed key. */
  for (const m of src.matchAll(/['"]([a-z][a-z0-9_]{3,})['"]\s*[,\]]/g)) written.add(m[1]);
}

const unwritten = [...read.entries()].filter(([c]) => !written.has(c));
console.log('[sweep-unwritten-columns]');
console.log(`  ${read.size} distinct columns selected across ${files.length} files; `
  + `${written.size} names appear as a written key across api/, src/, the app and the migrations.`);
if (!unwritten.length) { console.log('  Every column read is written somewhere.'); process.exit(0); }
console.log(`  ${unwritten.length} read and never written anywhere (each is a question, not a verdict):`);
for (const [c, where] of unwritten.sort()) console.log(`    ${c.padEnd(30)} first selected at ${where}`);
