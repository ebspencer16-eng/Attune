#!/usr/bin/env node
/**
 * S41: a column the code selects that nothing ever writes.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * `profiles.feedback_given_at` has existed since migration 050 and no code
 * has ever set it. Two home cards were gated on `!state.feedbackGivenAt`, so
 * both would have asked for ever. The card looked correct in every reading of
 * the file that drew it, because the bug is not in the reader.
 *
 * CLAUDE.md: "When a condition reads a column, grep for the write before
 * trusting it." This is that grep, over every column in every migration.
 *
 * ── WHAT IS MEASURED ──────────────────────────────────────────────────────
 * For each column the migrations create:
 *
 *   read   it is named in a PostgREST `select=` list or a `.select('...')`
 *   write  it is an object-literal key anywhere under api/, which is how a
 *          row is built for an insert, an update or an upsert here
 *
 * A finding is a column that is read and never written. Both halves are
 * string matches on shapes this codebase actually uses, which is the part
 * worth checking before believing a count.
 *
 * ── WHAT IT CANNOT SEE ────────────────────────────────────────────────────
 * A write performed in SQL by a migration or by a trigger. Those are listed
 * separately rather than counted as absent, because a column that a migration
 * backfills is written, just not by this code.
 *
 * A `select=*`. Three endpoints use one; they are named in the output, and a
 * column read only through a star is invisible to the read half here.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;

/** Every column any migration creates, with the table it belongs to. */
const columns = new Map();            // col -> Set(table)
const sqlFiles = readdirSync(join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql'));
let sqlText = '';
for (const f of sqlFiles) sqlText += '\n' + readFileSync(join(ROOT, 'supabase/migrations', f), 'utf8');

const sql = sqlText.replace(/^\s*--[^\n]*/gm, ' ');

/* add column [if not exists] <name> */
for (const m of sql.matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/gi)) {
  const col = m[1].toLowerCase();
  const before = sql.slice(0, m.index);
  const t = [...before.matchAll(/alter\s+table\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi)].pop();
  if (!columns.has(col)) columns.set(col, new Set());
  columns.get(col).add(t ? t[1] : '?');
}
/* create table ( ... ) */
for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\s*\(([^;]*?)\)\s*;/gis)) {
  const table = m[1];
  for (const line of m[2].split('\n')) {
    const c = /^\s*([a-z_][a-z0-9_]*)\s+(?:text|jsonb|json|uuid|boolean|bool|int|integer|bigint|numeric|timestamptz|timestamp|date|serial)/i.exec(line);
    if (!c) continue;
    const col = c[1].toLowerCase();
    if (['primary', 'unique', 'constraint', 'foreign', 'check'].includes(col)) continue;
    if (!columns.has(col)) columns.set(col, new Set());
    columns.get(col).add(table);
  }
}

/** Every source file that could read or write one. */
const src = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(js|mjs|jsx|tsx?|html)$/.test(name)) src.push(full);
  }
})(join(ROOT, 'api'));
for (const d of ['src', 'public', 'attune-app/src', 'scripts']) {
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(js|mjs|jsx|tsx?|html)$/.test(name)) src.push(full);
    }
  })(join(ROOT, d));
}

const text = new Map();
for (const f of src) text.set(f.replace(ROOT, ''), readFileSync(f, 'utf8'));

const stars = [];
for (const [rel, body] of text) {
  if (/select=\*|\.select\(\s*['"`]\*/.test(body)) stars.push(rel);
}

const readIn = new Map();   // col -> [files]
const writeIn = new Map();

for (const [rel, body] of text) {
  const code = body.replace(/\/\*[^]*?\*\//g, ' ').replace(/^\s*\/\/[^\n]*/gm, ' ');

  /* Reads: every select list, as PostgREST writes them. */
  const lists = [
    ...[...code.matchAll(/select=([a-z0-9_,().:\s*]+)/gi)].map((m) => m[1]),
    ...[...code.matchAll(/\.select\(\s*['"`]([^'"`]*)['"`]/g)].map((m) => m[1]),
    ...[...code.matchAll(/[?&]order=([a-z0-9_.]+)/gi)].map((m) => m[1]),
    ...[...code.matchAll(/([a-z_][a-z0-9_]*)=(?:eq|neq|gt|gte|lt|lte|is|in|not)\./gi)].map((m) => m[1]),
  ];
  /* ── AND A COLUMN LIST BUILT AS AN ARRAY ────────────────────────────
     The first run said 61 columns were written and never read, and the first
     one checked, `feedback_given_at`, is read by api/home.js. It is not in a
     `select=` string: it is an element of a JavaScript array of column names
     that is joined later. CLAUDE.md's own rule, pointed at this scan: when a
     scanner looks for a string, ask what the indirection for that string is.
     A bare quoted string equal to a column name is a read. */
  for (const m of code.matchAll(/['"`]([a-z_][a-z0-9_]{3,})['"`]/g)) {
    const col = m[1].toLowerCase();
    if (!columns.has(col)) continue;
    if (!readIn.has(col)) readIn.set(col, new Set());
    readIn.get(col).add(rel);
  }

  for (const list of lists) {
    for (const part of String(list).split(/[,()\s]+/)) {
      const col = part.replace(/\..*$/, '').trim().toLowerCase();
      if (!col || !columns.has(col)) continue;
      if (!readIn.has(col)) readIn.set(col, new Set());
      readIn.get(col).add(rel);
    }
  }

  /* Writes: assigned onto a patch object. `patch.tz_offset_minutes = ...` is
     a write and has no colon in it, which is why the first run reported that
     column as read and never written while api/daily-push.js sets it. */
  for (const m of code.matchAll(/\.\s*([a-z_][a-z0-9_]*)\s*=[^=]/g)) {
    const col = m[1].toLowerCase();
    if (!columns.has(col)) continue;
    if (!writeIn.has(col)) writeIn.set(col, new Set());
    writeIn.get(col).add(rel);
  }

  /* Writes: the column as an object key, which is how every row is built. */
  for (const m of code.matchAll(/(?:^|[{,\s])(?:'([a-z_][a-z0-9_]*)'|"([a-z_][a-z0-9_]*)"|([a-z_][a-z0-9_]*))\s*:/gm)) {
    const col = (m[1] || m[2] || m[3] || '').toLowerCase();
    if (!columns.has(col)) continue;
    if (!writeIn.has(col)) writeIn.set(col, new Set());
    writeIn.get(col).add(rel);
  }
}

/**
 * ── AND THE WRITES THIS CODEBASE BUILDS BY NAME RATHER THAN BY KEY ───────
 * The first honest run listed twenty columns read and never written, and
 * nineteen were the matcher. This repository writes a column through a
 * computed key more often than it writes one literally:
 *
 *   updates[`${exercise}_completed_at`] = ...        api/save-exercise.js
 *   [`ex${exerciseNum}_progress`]: ...               src/App.jsx
 *   markSent(user.id, 'checkin_sent_at')             api/cron-checkin.js
 *   patch[DAILY_KINDS[kind]] = ...                   api/daily-push.js
 *
 * CLAUDE.md's own rule, pointed at this scan: when a scanner looks for a
 * string, ask what the indirection for that string is. So a column also
 * counts as possibly written when its name appears in a file that writes to
 * the table at all. That is weaker than a literal key and it is said out loud:
 * the two are reported separately, and only "never seen in a writing file" is
 * a finding.
 */
const writesRows = new Set();
for (const [rel, body] of text) {
  if (/method:\s*['"`]PATCH['"`]|method:\s*['"`]POST['"`]|\.update\(|\.upsert\(|\.insert\(/.test(body)) writesRows.add(rel);
}
const maybeWritten = new Map();
for (const [rel, body] of text) {
  if (!writesRows.has(rel)) continue;
  const code = body.replace(/\/\*[^]*?\*\//g, ' ').replace(/^\s*\/\/[^\n]*/gm, ' ');
  for (const col of columns.keys()) {
    if (writeIn.has(col)) continue;
    /* The whole name, or its tail after a template hole: `${e}_completed_at`. */
    const tail = col.replace(/^ex\d|^daily|^checkin/, '');
    const re = new RegExp(`(['"\`\\$\\{}])${col}\\b|\\$\\{[^}]*\\}${tail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (!re.test(code)) continue;
    if (!maybeWritten.has(col)) maybeWritten.set(col, new Set());
    maybeWritten.get(col).add(rel);
  }
}

/** Written by SQL rather than by this code: an update or an insert in a migration. */
const sqlWritten = new Set();
for (const col of columns.keys()) {
  if (new RegExp(`set\\s+${col}\\s*=|insert\\s+into[^;]*\\b${col}\\b`, 'i').test(sql)) sqlWritten.add(col);
}

const readNeverWritten = [...columns.keys()]
  .filter((c) => readIn.has(c) && !writeIn.has(c) && !maybeWritten.has(c) && !sqlWritten.has(c))
  .sort();
const readMaybeWritten = [...columns.keys()]
  .filter((c) => readIn.has(c) && !writeIn.has(c) && (maybeWritten.has(c) || sqlWritten.has(c)))
  .sort();
const writtenNeverRead = [...columns.keys()]
  .filter((c) => writeIn.has(c) && !readIn.has(c))
  .sort();

console.log(`[sweep-unwritten-columns] ${columns.size} columns across ${sqlFiles.length} migrations,`
  + ` read in ${readIn.size}, written in ${writeIn.size}.\n`);

console.log(`read, and named in no file that writes to a table: ${readNeverWritten.length}`);
for (const c of readNeverWritten) {
  const where = [...readIn.get(c)].slice(0, 3).join(', ');
  console.log(`  ${c.padEnd(28)} on ${[...columns.get(c)].join('/')}`
    + `${sqlWritten.has(c) ? '  [a migration writes it]' : ''}  read in ${where}`);
}

console.log(`\nread, with no literal key but named inside a file that writes: ${readMaybeWritten.length}`);
for (const c of readMaybeWritten) {
  const where = [...(maybeWritten.get(c) || new Set())].slice(0, 2).join(', ');
  console.log(`  ${c.padEnd(28)} ${sqlWritten.has(c) ? '[a migration writes it] ' : ''}${where}`);
}

console.log(`\nwritten and never selected by name: ${writtenNeverRead.length}`);
for (const c of writtenNeverRead.slice(0, 40)) {
  console.log(`  ${c.padEnd(28)} on ${[...columns.get(c)].join('/')}`);
}
if (writtenNeverRead.length > 40) console.log(`  ... and ${writtenNeverRead.length - 40} more`);

console.log(`\nfiles using select=*, where a read is invisible to this scan: ${stars.length}`);
for (const s of stars) console.log('  ' + s);
