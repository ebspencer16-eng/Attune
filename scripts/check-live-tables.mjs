#!/usr/bin/env node
/**
 * A table something reads is a table something writes.
 *
 * ── THE SHAPE ─────────────────────────────────────────────────────────────
 * A figure built on a table nothing writes is uniformly negative, and that
 * output is indistinguishable from the truth. It has happened twice:
 *
 *   Both admin CSV exports read `workbooks` for whether a couple's workbook
 *   had been made. Nothing has ever written a row to it, so the column said
 *   no for every couple from the day it shipped.
 *
 *   The dashboard's Completion rate counted rows in `partner_sessions`, where
 *   an invited partner's answers used to go. They go on that partner's own
 *   profile now. Nothing has written to that table since, so the tile read 0%
 *   for every couple.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * Every table named under api/, with how many files read it and how many
 * write it. A table that is read and never written fails, unless it is named
 * below with a reason.
 *
 * ── THE TWO WAYS A TABLE HIDES FROM THIS ──────────────────────────────────
 * Both cost a run while this was being written, and both are the same trap:
 *
 *   A file-local helper that takes the path. api/notes.js writes every note
 *   through `const rest = (path, init) => fetch(`${url}/rest/v1/${path}`)`,
 *   so the literal `/rest/v1/notes` appears nowhere and the table read as
 *   never written.
 *
 *   A regular expression that CONSUMES its window. Matching the table name
 *   plus 200 characters of context moves lastIndex past the next call, and
 *   api/privacy-choices.js has its read and its write five lines apart: the
 *   read swallowed the write. The window is sliced, not matched.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

/**
 * Read and never written, on purpose.
 *
 * Each one needs a reason, because "it is fine" is what was said about the
 * two tables above.
 */
const ALLOWED = new Map([
  ['partner_sessions', 'Legacy: an invited partner has a profile of their own now.'
    + ' Kept as a fallback for couples whose rows predate that, and no figure is built'
    + ' on it alone any more. See completedCouples in api/admin-data.js.'],
]);

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (!/node_modules/.test(name)) walk(p); continue; }
    if (/\.(js|mjs)$/.test(name)) files.push(p);
  }
};
walk(join(ROOT, 'api'));

const blank = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));

const reads = new Map();
const writes = new Map();
const add = (map, table, file) => {
  if (!map.has(table)) map.set(table, new Set());
  map.get(table).add(file);
};
const WRITE_METHOD = /method:\s*['"](POST|PATCH|PUT|DELETE)['"]/i;

for (const file of files) {
  const src = blank(readFileSync(file, 'utf8'));
  const rel = file.slice(ROOT.length);

  /* supabase-js */
  for (const m of src.matchAll(/\.from\(\s*['"](\w+)['"]\s*\)/g)) {
    if (/\.storage\s*$/.test(src.slice(0, m.index))) continue;   // a bucket
    const after = src.slice(m.index + m[0].length, m.index + m[0].length + 220);
    add(/^\s*\.?\s*(insert|upsert|update|delete)\s*\(/.test(after) ? writes : reads, m[1], rel);
  }
  /* A PostgREST url written out */
  for (const m of src.matchAll(/\/rest\/v1\/(\w+)/g)) {
    const window = src.slice(m.index, m.index + 300);
    add(WRITE_METHOD.test(window) ? writes : reads, m[1], rel);
  }
  /* A file-local helper that takes the path */
  if (/\/rest\/v1\/\$\{/.test(src)) {
    for (const m of src.matchAll(/\b(?:rest|req|db|q)\(\s*[`'"](\w+)[?`'"]/g)) {
      const window = src.slice(m.index, m.index + 220);
      add(WRITE_METHOD.test(window) ? writes : reads, m[1], rel);
    }
  }
}

const tables = [...new Set([...reads.keys(), ...writes.keys()])].sort();
if (tables.length < 10) {
  console.error(`[check-live-tables] only ${tables.length} tables found under api/.`
    + ' That is not this product. Refusing to pass.');
  process.exit(1);
}

const fails = [];
const excused = [];
for (const t of tables) {
  const r = reads.get(t)?.size || 0;
  const w = writes.get(t)?.size || 0;
  if (!r || w) continue;
  if (ALLOWED.has(t)) { excused.push(`${t} (${ALLOWED.get(t)})`); continue; }
  fails.push(`${t}: read in ${r} file(s) and written in none.`
    + `\n      ${[...reads.get(t)].slice(0, 4).join(', ')}`
    + '\n      Either something should be writing it, or whatever reads it is answering'
    + '\n      from a table that is always empty, which looks exactly like a real answer.');
}

if (fails.length) {
  console.error('[check-live-tables] a table is read and nothing writes it:');
  for (const f of fails) console.error(`  ✗ ${f}`);
  console.error('');
  console.error('  If that is deliberate, name it in ALLOWED in this file with the reason.');
  process.exit(1);
}

console.log(`[check-live-tables] ${tables.length} tables named under api/; every one that is read`
  + ` is written by something, bar ${excused.length} named as deliberate`
  + `${excused.length ? `: ${excused.map((e) => e.split(' (')[0]).join(', ')}` : ''}.`);
