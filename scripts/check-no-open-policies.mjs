#!/usr/bin/env node
/**
 * No table ends up open to whoever holds the public key.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * A row level security policy whose test is `true`, for a role a browser can
 * be, hands its table to anybody: the public key is in every visitor's
 * browser. Migration 010 removed six of those for that reason. Two problems
 * survived it, found in the A170 sweep:
 *
 *   - 010 created two of its own, an open read of every promo code and an
 *     open insert into feedback_submissions, and nothing removed them.
 *   - supabase/schema.sql still created all six 010 removed. It could not run
 *     until A164b fixed its syntax; from then, pasting it reopened profiles
 *     and orders to the public.
 *
 * 098 drops all eight and schema.sql no longer creates any.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * Every CREATE POLICY and DROP POLICY in schema.sql and the migrations,
 * replayed in order, in BOTH orders a person could plausibly run them:
 * schema.sql first (a new project), and schema.sql last (somebody pasting it
 * into the live one on its promise that it is safe). Whatever is left open at
 * the end of either fails the build.
 *
 * ── WHAT ANOTHER GATE COVERS ──────────────────────────────────────────────
 * check-rls-policies holds the reads of personal tables to policies that tie a
 * row to the caller, and every table to having row level security on. This
 * one is narrower in one way and wider in two: only always-true policies, but
 * for every command and every table, and with schema.sql pasted last as well
 * as first. Neither can be deleted without losing coverage.
 *
 * ── WHAT IT DOES NOT COVER ────────────────────────────────────────────────
 * The live database, which only Ellie can read: supabase/diagnostics/
 * open-policies.sql is the query, and it should print nothing. Nor a policy
 * that is merely too wide rather than always true, such as one testing a
 * column a person can set themselves. That needs reading, not matching.
 */
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

const strip = (sql) => sql
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/--[^\n]*/g, ' ');

/** Every policy statement in a file, in the order it appears. */
function statements(file) {
  const sql = strip(readFileSync(`${ROOT}${file}`, 'utf8'));
  const out = [];
  const re = /\b(create|drop)\s+policy\s+(?:if\s+exists\s+)?"([^"]+)"\s+on\s+([\w.]+)([^;]*);/gi;
  for (const m of sql.matchAll(re)) {
    const body = m[4];
    const table = m[3].replace(/^public\./, '');
    const always = /\busing\s*\(\s*true\s*\)|\bwith\s+check\s*\(\s*true\s*\)/i.test(body);
    const roles = (/\bto\s+([\w\s,]+?)(?=\s+(?:using|with|for)\b|$)/i.exec(body) || [])[1];
    const browserCan = !roles || /\b(public|anon|authenticated)\b/i.test(roles);
    out.push({ op: m[1].toLowerCase(), key: `${table}.${m[2]}`, open: m[1].toLowerCase() === 'create' && always && browserCan, file });
  }
  return out;
}

const migrations = readdirSync(`${ROOT}supabase/migrations`)
  .filter((f) => /^\d+.*\.sql$/.test(f))
  .sort()
  .map((f) => `supabase/migrations/${f}`);
const schema = 'supabase/schema.sql';
/* Every other setup script at the top of supabase/, which check-rls-policies
   already read and this did not: beta_codes_setup.sql carried an open read of
   every promo code that no migration removed, and this gate passed without
   having looked at the file (A170). Run first, as they were, and pasted last,
   as anybody might. */
const setups = readdirSync(`${ROOT}supabase`)
  .filter((f) => f.endsWith('.sql') && f !== 'schema.sql')
  .sort()
  .map((f) => `supabase/${f}`);

function replay(files) {
  const state = new Map();
  for (const f of files) for (const s of statements(f)) {
    if (s.op === 'drop') state.delete(s.key);
    else state.set(s.key, s);
  }
  return [...state.values()].filter((s) => s.open);
}

let total = 0;
for (const f of [schema, ...setups, ...migrations]) total += statements(f).length;
if (total < 30) fails.push(`only ${total} policy statements found across the SQL files. The matcher has lost them.`);

for (const [name, order] of [['the setup files first, then the migrations', [schema, ...setups, ...migrations]],
                            ['the migrations, then the setup files pasted on top', [...migrations, schema, ...setups]]]) {
  for (const s of replay(order)) {
    fails.push(`${name}: "${s.key}" is left open to anybody with the public key (created in ${s.file}).`);
  }
}

if (fails.length) {
  console.error('check-no-open-policies FAILED');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-no-open-policies] ${total} policy statements across ${1 + setups.length} setup files and ${migrations.length} migrations,`
  + ' replayed in both orders a person could run them: no table ends open to whoever holds the public key.'
  + ' The live database is read with supabase/diagnostics/open-policies.sql.');
