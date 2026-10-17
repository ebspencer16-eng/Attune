#!/usr/bin/env node
/**
 * Every column a query asks for exists on the table it asks.
 *
 * ── THE SHAPE ─────────────────────────────────────────────────────────────
 * CLAUDE.md names it among the bugs that keep happening here: "a column
 * existed on one table and was selected from another". Nothing checked it, and
 * the cost of being wrong is silent, because a failed PostgREST select returns
 * an error object that reads as "no rows" to anything that does not check it.
 *
 * ── WHAT IT FOUND ─────────────────────────────────────────────────────────
 * Both admin CSV exports asked `workbooks` for `user_id, storage_path`. There
 * is no workbooks TABLE. api/delete-account.js says so in a comment, having
 * gone looking: workbooks is a storage BUCKET, and nothing has ever written a
 * row to a table of that name. So the query errored, the destructure defaulted
 * to [], and the workbook_generated column was N for every couple in both
 * exports, including every couple holding a finished workbook. The order knows
 * the answer and one of those exports was already selecting it.
 *
 * ── READ THE COUNTS, NOT JUST THE PASS ────────────────────────────────────
 * Three things it cannot see, and it prints all three rather than passing
 * quietly over them: a select built at run time, a table created outside this
 * repo, and an embedded resource. The first version of this reported 78
 * findings of which 72 were its own fault: it read one add-column clause per
 * ALTER when migration 078 adds three in one statement, and it paired a
 * `.from()` with a `.select()` belonging to a different query two lines down.
 * A sweep's first hypothesis is the harness.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { EXERCISE_COLUMNS } from '../api/_exercises.js';
import { ORDER_SELECT } from '../api/_lib/entitlements.js';
import { OWNERSHIP_COLUMNS } from '../api/_lib/ownership.js';

const ROOT = new URL('..', import.meta.url).pathname;
const MIG = join(ROOT, 'supabase/migrations');

// ── The schema this repo builds ───────────────────────────────────────────
const tables = new Map();
const created = new Set();
const add = (t, c) => {
  if (!tables.has(t)) tables.set(t, new Set());
  if (c) tables.get(t).add(c);
};

const sqlFiles = readdirSync(MIG).filter((f) => f.endsWith('.sql')).sort();
const sql = [readFileSync(join(ROOT, 'supabase/schema.sql'), 'utf8'),
  ...sqlFiles.map((f) => readFileSync(join(MIG, f), 'utf8'))]
  .join('\n').replace(/--[^\n]*/g, '');

for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?(\w+)"?\s*\(([\s\S]*?)\n\s*\);/gi)) {
  created.add(m[1]);
  add(m[1], null);
  let depth = 0, cur = '';
  const chunks = [];
  for (const ch of m[2]) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { chunks.push(cur); cur = ''; continue; }
    cur += ch;
  }
  chunks.push(cur);
  for (const c of chunks) {
    const t = c.trim();
    if (!t || /^(primary|foreign|unique|constraint|check|exclude)\b/i.test(t)) continue;
    const col = t.match(/^"?(\w+)"?/);
    if (col) add(m[1], col[1]);
  }
}
/* Every add-column clause in a statement, not the first: 078 adds three. */
for (const stmt of sql.split(';')) {
  const t = stmt.match(/alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?(\w+)"?/i);
  if (!t) continue;
  for (const m of stmt.matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?"?(\w+)"?/gi)) add(t[1], m[1]);
  for (const m of stmt.matchAll(/rename\s+column\s+"?\w+"?\s+to\s+"?(\w+)"?/gi)) add(t[1], m[1]);
}
const views = new Set([...sql.matchAll(/create\s+(?:or\s+replace\s+)?view\s+(?:public\.)?"?(\w+)"?/gi)]
  .map((m) => m[1]));

/* A gate that has lost its subject must never report success. */
if (created.size < 10 || (tables.get('orders')?.size ?? 0) < 20) {
  console.error('[check-selected-columns] the schema did not parse: '
    + `${created.size} tables, orders has ${tables.get('orders')?.size ?? 0} columns.`
    + ' Refusing to pass.');
  process.exit(1);
}

// ── Every query under api/ ────────────────────────────────────────────────
function files(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (!/node_modules/.test(n)) files(p, out); continue; }
    if (/\.(js|mjs)$/.test(n)) out.push(p);
  }
  return out;
}
const blank = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
const lineOf = (s, i) => s.slice(0, i).split('\n').length;

const fails = [];
const dynamic = [];
const unseen = new Set();
let queries = 0, columns = 0;

function check(rel, line, table, cols, how) {
  if (!created.has(table)) {
    if (views.has(table)) return;
    unseen.add(table);
    fails.push(`${rel}:${line} queries \`${table}\`, which no SQL in supabase/ creates.`
      + '\n      Either it is a table made by hand that belongs in schema.sql, or it does not'
      + '\n      exist and this query has been returning an error nobody reads. That is what'
      + '\n      `workbooks` was: a storage bucket, queried as a table, for every couple.');
    return;
  }
  const known = tables.get(table);
  let depth = 0, cur = '';
  const names = [];
  for (const ch of cols) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { names.push(cur); cur = ''; continue; }
    cur += ch;
  }
  names.push(cur);
  for (const raw of names) {
    let n = raw.trim();
    if (!n || n === '*') continue;
    if (n.includes('${')) { dynamic.push(`${rel}:${line} ${how}`); continue; }
    if (n.includes('(')) continue;                       // embedded resource
    if (n.includes(':')) n = n.split(':').pop().trim();  // alias:column
    n = n.replace(/::.*$/, '').trim();
    if (!/^\w+$/.test(n)) continue;
    columns += 1;
    if (!known.has(n)) {
      fails.push(`${rel}:${line} ${how} asks for "${n}", and ${table} has no such column.`
        + `\n      ${table} has: ${[...known].sort().join(', ')}`);
    }
  }
}

for (const f of files(join(ROOT, 'api'))) {
  const src = blank(readFileSync(f, 'utf8'));
  const rel = f.slice(ROOT.length);

  /* A select passed as a constant hides every column from a scan that reads
     literals, the same way EXERCISE_COLUMNS hid conflict_data. */
  const consts = Object.fromEntries(
    [...src.matchAll(/const\s+([A-Z][A-Z0-9_]*)\s*=\s*(['"`])([^'"`]*)\2/g)].map((m) => [m[1], m[3]]),
  );

  for (const m of src.matchAll(/\.from\(\s*['"](\w+)['"]\s*\)([\s\S]{0,400}?)\.select\(\s*([^)]*?)\)/g)) {
    if (/\.from\(/.test(m[2])) continue;                 // another query in between
    if (/\.storage\s*$/.test(src.slice(0, m.index))) continue;
    const arg = m[3].trim();
    let cols = null;
    const lit = arg.match(/^(['"`])([\s\S]*)\1$/);
    if (lit) cols = lit[2];
    else if (consts[arg]) cols = consts[arg];
    queries += 1;
    if (cols === null) { dynamic.push(`${rel}:${lineOf(src, m.index)} .select(${arg.slice(0, 40)})`); continue; }
    check(rel, lineOf(src, m.index), m[1], cols, `.from('${m[1]}').select(...)`);
  }

  for (const m of src.matchAll(/\/rest\/v1\/(\w+)\?([^'"`\s]*)/g)) {
    const sel = m[2].match(/select=([^&'"`]*)/);
    if (!sel) continue;
    queries += 1;
    check(rel, lineOf(src, m.index), m[1], decodeURIComponent(sel[1]), `/rest/v1/${m[1]}?select=`);
  }
}

// ── The column lists that are passed as constants ─────────────────────────
/**
 * The scan above reads literals, and the biggest selects in this codebase are
 * not literals: they are lists imported from a module and joined. That is the
 * indirection CLAUDE.md warns about, where `EXERCISE_COLUMNS` hid the string
 * `conflict_data` from a privacy gate that matched on the literal. Deriving
 * the list is still right; it just means a scanner has to resolve it too.
 */
{
  const lists = [
    ['orders', ORDER_SELECT.split(',').map((c) => c.trim()), 'ORDER_SELECT in api/_lib/entitlements.js'],
    ['profiles', OWNERSHIP_COLUMNS, 'OWNERSHIP_COLUMNS in api/_lib/ownership.js'],
    ['profiles', EXERCISE_COLUMNS, 'EXERCISE_COLUMNS in api/_exercises.js'],
  ];
  for (const [table, cols, where] of lists) {
    if (!cols.length) {
      fails.push(`${where} is empty, so this check is proving nothing about ${table}.`);
      continue;
    }
    for (const c of cols) {
      columns += 1;
      if (!tables.get(table).has(c)) {
        fails.push(`${where} names "${c}", and ${table} has no such column.`
          + '\n      Every endpoint that selects through that list asks for it on every request.');
      }
    }
  }
}

/* Storage buckets are not tables and are reached through .storage.from(). The
   check above skips those; this is the note that says so, because a silent
   skip is how a sweep becomes evidence for something it never looked at. */
if (fails.length) {
  console.error('[check-selected-columns] a query asks for something that is not there:');
  for (const f of fails) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`[check-selected-columns] ${queries} queries under api/, ${columns} column references,`
  + ` all present on the table asked; ${created.size} tables built by supabase/schema.sql and`
  + ` ${sqlFiles.length} migrations. ${dynamic.length} select(s) built at run time, which this`
  + ' cannot read, of which the three column lists passed as constants are resolved from their'
  + ' own modules and checked.'
  + (unseen.size ? ` Tables it could not find: ${[...unseen].join(', ')}.` : ''));
