#!/usr/bin/env node
/**
 * No row-level-security policy lets a stranger read personal data.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * For the tables that hold personal data, every SELECT policy the repo's SQL
 * leaves in place ties the row to the caller: auth.uid(), the JWT's email
 * claim, or a service-role check. A policy whose USING clause names none of
 * those is open to anyone holding the publishable key, which is printed on
 * every page of the site.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * supabase/qr_tokens_setup.sql added this so a scanned card could look up its
 * order before anyone had signed in:
 *
 *     create policy "orders_qr_token_lookup"
 *       on public.orders for select
 *       using (qr_token is not null);
 *
 * and the same script backfilled a token onto every existing order. Policies
 * are permissive and OR together, so this sat beside orders_self_select and
 * widened it: orders carry the buyer's name, email, shipping address and gift
 * message. Migration 019 rewrote orders_self_select three months later and
 * never saw this one, because it was not looking.
 *
 * Migration 062 drops it. This is what stops the next one.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * The SQL files are replayed in the order they would be run, so a policy that
 * a later migration drops does not count against the current state. That
 * matters: the answer is not "does this string appear anywhere", it is "what
 * is on the table after everything has run".
 *
 * ── THE OTHER HALF ────────────────────────────────────────────────────────
 * A policy only matters on a table that has row level security switched on. A
 * table in the public schema without it is open to anyone holding the
 * publishable key, and not only to read: the anonymous role is granted insert,
 * update and delete on public tables by default. admin_presets was created in
 * migration 036 without it, so a stranger could have deleted every saved
 * Explore view. Migration 063 turns it on.
 *
 * So this checks both: every table created here has row level security, and
 * every policy that survives ties its rows to the caller.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The live database, which this cannot reach. It checks what the repo says
 * should be there. If a policy was ever created by hand in the SQL editor, no
 * file here knows about it, and the only way to see it is:
 *
 *     select policyname, cmd, qual from pg_policies
 *     where schemaname = 'public';
 *
 * Not INSERT or UPDATE policies. Those matter too, and the bug this came from
 * was a read.
 *
 * Not tables that are meant to be world-readable. Those are named below, each
 * with the reason, and adding one is a decision rather than a formality.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

/** Tables whose rows are about a person. A stranger must not read these. */
const PERSONAL = new Set([
  'orders', 'profiles', 'partner_sessions', 'notes', 'note_tags', 'tags',
  'feedback_submissions', 'notifications', 'workbooks', 'post_reads',
  'privacy_preferences', 'consent_events', 'page_events', 'lmft_requests',
]);

/**
 * Tables anyone may read, each for a reason.
 *
 * beta_codes  is a list of codes to check one against. Knowing a code is the
 *             point of having one; the rows carry nothing about a person.
 * posts       is the In Practice library, published on the website.
 */
const WORLD_READABLE = new Set(['beta_codes', 'posts']);

/** Expressions that tie a row to the caller. */
const TIES_TO_CALLER = /auth\.uid\(\)|auth\.jwt\(\)|auth\.role\(\)|current_setting\s*\(|auth\.email\(\)/i;

/** SQL files in the order they would be run. */
const files = [
  ...readdirSync(join(ROOT, 'supabase'))
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => join('supabase', f)),
  ...readdirSync(join(ROOT, 'supabase/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => join('supabase/migrations', f)),
];

if (files.length < 10) {
  console.error(`[check-rls-policies] only found ${files.length} SQL files; refusing to pass.`);
  process.exit(1);
}

/** policyName + table -> { file, using, cmd } for whatever survives. */
const live = new Map();
let created = 0;

/** Tables this SQL creates, and the ones it switches row security on for. */
const tables = new Map();
const secured = new Set();

for (const rel of files) {
  const sql = readFileSync(join(ROOT, rel), 'utf8').replace(/--[^\n]*/g, '');

  for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/gi)) {
    if (!tables.has(m[1])) tables.set(m[1], rel);
  }
  for (const m of sql.matchAll(/alter\s+table\s+(?:public\.)?(\w+)\s+enable\s+row\s+level\s+security/gi)) {
    secured.add(m[1]);
  }

  for (const m of sql.matchAll(/drop\s+policy\s+(?:if\s+exists\s+)?"?([\w ]+)"?\s+on\s+(?:public\.)?(\w+)/gi)) {
    live.delete(`${m[2]}.${m[1].trim()}`);
  }

  for (const m of sql.matchAll(
    /create\s+policy\s+(?:if\s+not\s+exists\s+)?"?([\w ]+)"?\s+on\s+(?:public\.)?(\w+)\s+(?:for\s+(\w+)\s+)?(?:to\s+[\w, ]+\s+)?using\s*\(/gi)) {
    const [, name, table, cmd] = m;
    // The USING expression, by paren matching from the one we just matched.
    const open = m.index + m[0].length - 1;
    let d = 0, end = open;
    for (let i = open; i < sql.length; i++) {
      if (sql[i] === '(') d++;
      else if (sql[i] === ')') { d--; if (d === 0) { end = i; break; } }
    }
    created++;
    live.set(`${table}.${name.trim()}`, {
      file: rel, table, name: name.trim(), cmd: (cmd || 'all').toLowerCase(),
      using: sql.slice(open + 1, end).replace(/\s+/g, ' ').trim(),
    });
  }
}

if (created < 15) {
  console.error(`[check-rls-policies] only parsed ${created} policies; there were 25 when this was written, so the parser has gone blind.`);
  process.exit(1);
}

const problems = [];

for (const [table, rel] of tables) {
  if (secured.has(table)) continue;
  problems.push(
    `${rel}: table ${table} is created without row level security.\n`
    + `      Anyone with the publishable key can read it, and the anonymous role is\n`
    + `      granted insert, update and delete on public tables by default.`);
}

for (const p of live.values()) {
  if (!PERSONAL.has(p.table)) {
    if (!WORLD_READABLE.has(p.table)) {
      problems.push(
        `${p.file}: policy "${p.name}" is on ${p.table}, which is in neither list in this file.\n`
        + `      Say whether its rows are about a person, in PERSONAL or in WORLD_READABLE.`);
    }
    continue;
  }
  if (p.cmd !== 'select' && p.cmd !== 'all') continue;
  if (TIES_TO_CALLER.test(p.using)) continue;
  problems.push(
    `${p.file}: policy "${p.name}" lets anyone read ${p.table}.\n`
    + `      USING (${p.using})\n`
    + `      Nothing there ties the row to the caller, and ${p.table} holds personal data.\n`
    + `      Every client of this database holds the publishable key: it is printed on the site.`);
}

if (problems.length) {
  console.error('[check-rls-policies] a row-level-security policy is open:\n');
  for (const p of problems) console.error('  ' + p);
  console.error('\nThis reads the SQL in this repo, replayed in order. A policy created by hand');
  console.error('in the SQL editor is invisible here; check pg_policies for those.');
  process.exit(1);
}

console.log(`[check-rls-policies] ${tables.size} tables, all with row level security; ${created} policies, ${live.size} still standing, and every read of personal data checks the caller.`);
