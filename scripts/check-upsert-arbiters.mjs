/**
 * Every `onConflict` names an arbiter PostgreSQL can actually infer.
 *
 * ── THE BUG THIS ENCODES ──────────────────────────────────────────────────
 * The survey had never saved a single answer. api/survey.js upserts with
 * `{ onConflict: 'respondent_id' }`, and migration 079 created that index as
 * a PARTIAL one, `where respondent_id is not null`. PostgreSQL will not infer
 * a partial index as an ON CONFLICT arbiter unless the statement repeats the
 * index predicate, and supabase-js emits only the column list, so every save
 * raised 42P10 and the endpoint answered 500 "Could not save".
 *
 * Nothing could see it, and three things specifically hid it. The anonymous
 * branch of the same handler is a plain insert and worked, so the code was not
 * uniformly broken. supabase-js RETURNS its error rather than throwing, so no
 * exception escaped. And the table existed and answered queries, so anything
 * asking whether survey storage was ready got yes: an empty table answers like
 * a working one. Ellie found it by completing a survey and then reading a
 * diagnostic that said there were no rows.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * For each `.from(table)...upsert(..., { onConflict: 'a,b' })` in api/, the
 * migrations must declare, on that table, a unique index or constraint over
 * exactly those columns in any order, and it must not be partial. A primary
 * key counts. Anything it cannot resolve is a failure, not a skip: an
 * unresolved arbiter is not evidence that the arbiter is fine.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the migration has been RUN. That is a question about a database and
 * this is a question about the repo; 097 ends with a count so the database can
 * answer for itself. It also says nothing about an upsert with no onConflict,
 * which arbitrates on the primary key and is a different question.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const fail = [];

/* ── WHAT THE MIGRATIONS DECLARE ───────────────────────────────────────── */
const dir = 'supabase/migrations';
/* Flat on purpose: migrations are files in one directory, and `diagnostics`
   beside them holds read-only scripts that declare nothing. */
const sqlFiles = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const sql = sqlFiles.map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');

const norm = (s) => s.split(',').map((c) => c.trim().replace(/^"|"$/g, '').toLowerCase()).filter(Boolean).sort().join(',');

/** table -> [{ cols, partial, how }] */
const arbiters = new Map();
const add = (table, cols, partial, how) => {
  const t = table.replace(/^public\./, '').replace(/^"|"$/g, '').toLowerCase();
  if (!arbiters.has(t)) arbiters.set(t, []);
  arbiters.get(t).push({ cols: norm(cols), partial, how });
};

/* create unique index [if not exists] name on [public.]t (a, b) [where ...]; */
for (const m of sql.matchAll(/create\s+unique\s+index\s+(?:if\s+not\s+exists\s+)?[\w"]+\s+on\s+([\w".]+)\s*\(([^)]*)\)([^;]*);/gi)) {
  add(m[1], m[2], /\bwhere\b/i.test(m[3]), 'unique index');
}
/* alter table [public.]t add constraint n unique (a, b); — never partial. */
for (const m of sql.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?([\w".]+)[\s\S]{0,200}?add\s+constraint\s+[\w"]+\s+unique\s*\(([^)]*)\)/gi)) {
  add(m[1], m[2], false, 'unique constraint');
}
/* Inside create table: a column line with `primary key` or `unique`, and a
   table-level `unique (a, b)` / `primary key (a, b)`. */
for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?([\w".]+)\s*\(([\s\S]*?)\n\);/gi)) {
  const table = m[1];
  for (const line of m[2].split('\n')) {
    const bare = line.replace(/--.*$/, '').trim().replace(/,$/, '');
    if (!bare) continue;
    const tableLevel = bare.match(/^(?:primary\s+key|unique)\s*\(([^)]*)\)/i);
    if (tableLevel) { add(table, tableLevel[1], false, 'table-level key'); continue; }
    const col = bare.match(/^([\w"]+)\s+[\s\S]*?\b(primary\s+key|unique)\b/i);
    if (col) add(table, col[1], false, 'column ' + col[2].toLowerCase());
  }
}

/* ── WHAT THE CODE ASKS FOR ────────────────────────────────────────────── */
let checked = 0;
const apiFiles = [];
const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) {
  if (e.isDirectory()) walk(join(d, e.name)); else if (e.name.endsWith('.js')) apiFiles.push(join(d, e.name)); } };
walk('api');

for (const file of apiFiles) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/onConflict\s*:\s*['"]([^'"]+)['"]/g)) {
    const cols = m[1];
    /* The table is the nearest `.from('x')` ABOVE the onConflict. Scoped to
       the enclosing 1,200 characters so it cannot reach into the previous
       statement's read, which is the window trap this repo keeps hitting. */
    const before = src.slice(Math.max(0, m.index - 1200), m.index);
    const froms = [...before.matchAll(/\.from\(\s*['"]([\w.]+)['"]\s*\)/g)];
    if (!froms.length) {
      fail.push(`${file}: onConflict '${cols}' with no .from('table') above it, so this gate cannot tell which table it arbitrates`);
      continue;
    }
    const table = froms[froms.length - 1][1].toLowerCase();
    checked++;
    const want = norm(cols);
    const onTable = arbiters.get(table) || [];
    const exact = onTable.filter((a) => a.cols === want);
    if (!exact.length) {
      fail.push(`${file}: upsert on ${table} arbitrates on (${cols}), and no unique index or constraint in ${dir} covers exactly those columns`
        + (onTable.length ? `. That table has: ${onTable.map((a) => a.cols + ' [' + a.how + (a.partial ? ', partial' : '') + ']').join('; ')}` : '. Nothing unique is declared on it at all'));
      continue;
    }
    if (exact.every((a) => a.partial)) {
      fail.push(`${file}: upsert on ${table} arbitrates on (${cols}), and the only unique index covering those columns is PARTIAL.`
        + ' PostgreSQL cannot infer a partial index as an ON CONFLICT arbiter unless the statement repeats the index predicate,'
        + ' which supabase-js does not emit, so every upsert raises 42P10. This is the survey bug: make the index plain.');
    }
  }
}

if (!checked) fail.push('found no onConflict upserts in api/ at all, so this gate proved nothing');

if (fail.length) {
  console.error('check-upsert-arbiters FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-upsert-arbiters] ${checked} upsert arbiter(s) each resolve to a non-partial unique index or constraint, `
  + `out of ${[...arbiters.values()].reduce((n, a) => n + a.length, 0)} declared across ${arbiters.size} tables.`);
