#!/usr/bin/env node
/**
 * A figure built from a whole table counts the whole table.
 *
 * ── THE BUG THIS ENCODES ──────────────────────────────────────────────────
 * Ellie asked for a sweep making sure "admin updates as it should" (A169).
 * Supabase answers at most a thousand rows per request, and a bigger
 * `.limit()` is silently cut to that. Every admin read except the Engagement
 * page's took one request, so each of those figures would stop moving on the
 * day its table passed a thousand rows, with no error anywhere. The survey
 * nudge read its "already answered" exclusion list the same way, which past a
 * thousand respondents nudges people who have answered.
 *
 * ── WHAT IT HOLDS ─────────────────────────────────────────────────────────
 *   1. pageAll and restAll, run against a fake server that cuts every reply to
 *      a thousand rows, return all 2,500 rows of a 2,500 row table, each once,
 *      and an error on page two is an error rather than half a table.
 *   2. selectProfiles, which every admin profile read goes through, does too.
 *   3. No `.limit(n)` in api/ asks for more than the server will give.
 *   5. A read by a list of ids goes in batches (inBatches), because every id
 *      is written into the request's address and the address has a ceiling.
 *      Run against a fake that refuses more than IN_BATCH ids, and scanned:
 *      an `.in(` fed from a variable must sit inside inBatches. Found in the
 *      A170 sweep on the admin Feedback page.
 *   4. In the admin endpoints and the scheduled jobs, every read of a table
 *      that grows without bound goes through the pager, unless it is narrowed
 *      to a few rows: by id, by `.in(`, a single row, a write, an explicit
 *      top-N within the cap, or a time window (`.gte(` / `=gte.`), which is
 *      bounded by how much happens in a window rather than by the table.
 *
 * ── WHAT IT DOES NOT COVER ────────────────────────────────────────────────
 *   - Endpoints that read one person's rows (results, notes, home). Those are
 *     narrowed by owner and a person does not have a thousand of anything yet.
 *   - A REST path built at run time from a variable, which no scanner can read.
 *     They are counted and printed rather than skipped in silence.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { pageAll, restAll, inBatches, IN_BATCH, PAGE } from '../api/_lib/page-all.js';
import { selectProfiles } from '../api/_lib/demo-accounts.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];
const N = 2500;
const TABLE = Array.from({ length: N }, (_, i) => ({ id: i + 1 }));

/* ── 1 and 2: behaviour ─────────────────────────────────────────────────── */
/** A supabase-js shaped builder over TABLE that, like the server, never
    answers more than PAGE rows however it is asked. */
const fakeBuilder = (failOnPage = -1) => {
  let range = null; let page = 0;
  const b = {
    select() { return b; }, not() { return b; }, eq() { return b; }, order() { return b; },
    limit() { return b; },
    range(from, to) { range = [from, to]; page = Math.floor(from / PAGE); return b; },
    then(ok, bad) {
      if (page === failOnPage) return Promise.resolve({ data: null, error: { message: 'page failed' } }).then(ok, bad);
      const [from, to] = range || [0, N];
      const want = to - from + 1;
      return Promise.resolve({ data: TABLE.slice(from, from + Math.min(want, PAGE)), error: null }).then(ok, bad);
    },
  };
  return b;
};
{
  const r = await pageAll(() => fakeBuilder());
  const ids = new Set((r.data || []).map((x) => x.id));
  if (r.error || (r.data || []).length !== N || ids.size !== N) {
    fails.push(`pageAll returned ${(r.data || []).length} rows (${ids.size} distinct) of a ${N} row table.`);
  }
  const e = await pageAll(() => fakeBuilder(1));
  if (!e.error || e.data) fails.push('pageAll returned rows when page two failed. Half a table must not read as the table.');
}
{
  const admin = { from: () => fakeBuilder() };
  const r = await selectProfiles(admin, (q) => q.select('id'));
  if ((r.data || []).length !== N) fails.push(`selectProfiles returned ${(r.data || []).length} of ${N} profiles.`);
}
{
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (_u, init) => {
    const m = /^(\d+)-(\d+)$/.exec(init?.headers?.Range || '');
    const from = m ? Number(m[1]) : 0;
    const to = m ? Number(m[2]) : N;
    const rows = TABLE.slice(from, from + Math.min(to - from + 1, PAGE));
    return new Response(JSON.stringify(rows), { status: 200 });
  };
  const r = await restAll('https://x', 'k', 't?select=id');
  globalThis.fetch = realFetch;
  if (r.error || r.rows.length !== N) fails.push(`restAll returned ${r.rows.length} of ${N} rows.`);
}

{
  const ids = Array.from({ length: 250 }, (_, i) => `id-${i}`);
  const fakeRead = (fail) => async (chunk) => {
    if (chunk.length > IN_BATCH) return { data: null, error: { message: 'URI too long' } };
    if (fail && chunk[0] === `id-${IN_BATCH}`) return { data: null, error: { message: 'batch failed' } };
    return { data: chunk.map((id) => ({ id })), error: null };
  };
  const r = await inBatches(ids, fakeRead(false));
  if (r.error || (r.data || []).length !== ids.length) fails.push(`inBatches returned ${(r.data || []).length} of ${ids.length} ids.`);
  const e = await inBatches(ids, fakeRead(true));
  if (!e.error || e.data) fails.push('inBatches returned people when a batch failed. Some of the people is not the people.');
}

/* ── 3 and 4: the reads ─────────────────────────────────────────────────── */
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n');

const files = [
  ...readdirSync(`${ROOT}api`).filter((f) => f.endsWith('.js')).map((f) => `api/${f}`),
  ...readdirSync(`${ROOT}api/_lib`).filter((f) => f.endsWith('.js')).map((f) => `api/_lib/${f}`),
];
const GROWS = ['profiles', 'orders', 'page_events', 'notes', 'post_reads', 'survey_responses', 'partner_sessions', 'beta_codes'];
const scoped = (f) => /^api\/(admin-|cron-)/.test(f);
const NARROW = /\.eq\(\s*['"](id|user_id|owner_id|respondent_id|code|invite_code|order_num)['"]|\.in\(|\.maybeSingle\(|\.single\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.gte\(|\.range\(|head:\s*true/;
let reads = 0; let paged = 0; let narrow = 0; let dynamic = 0; let inBatched = 0;

for (const f of files) {
  const code = strip(readFileSync(`${ROOT}${f}`, 'utf8'));
  for (const m of code.matchAll(/\.limit\(\s*(\d+)\s*\)/g)) {
    if (Number(m[1]) > PAGE) {
      const line = code.slice(0, m.index).split('\n').length;
      fails.push(`${f}:${line} asks for .limit(${m[1]}); the server gives ${PAGE}. Page it with pageAll.`);
    }
  }
  for (const m of code.matchAll(/\.in\(\s*['"][a-z_]+['"]\s*,\s*([A-Za-z_$][\w$.]*)\s*\)/g)) {
    const before = code.slice(Math.max(0, m.index - 220), m.index);
    if (/inBatches\(/.test(before)) { inBatched += 1; continue; }
    const line = code.slice(0, m.index).split('\n').length;
    fails.push(`${f}:${line} reads .in(..., ${m[1]}) in one request. Every id goes into the address; use inBatches.`);
  }
  /* The same thing spelled as PostgREST: `in.(${list.join(',')})` inside an
     address. cron-push wrote every opted-in person's id that way, which the
     `.in(` scan above could not see (A170). */
  for (const m of code.matchAll(/=in\.\(\$\{([^}]*)\.join\(/g)) {
    /* A list built from a fixed array literal is bounded by its own length:
       store-workbook-pdf joins [subject, partner], which is a couple and
       never more. Anything built by .map or a spread is as long as a query
       made it. */
    const name = (/^\s*([A-Za-z_$][\w$]*)\s*$/.exec(m[1]) || [])[1];
    if (name) {
      const decl = new RegExp(`const ${name} = \\[([^\\]]*)\\]`).exec(code);
      if (decl && !/\.\.\.|\.map\(/.test(decl[1]) && decl[1].split(',').length <= 4) continue;
    }
    const line = code.slice(0, m.index).split('\n').length;
    fails.push(`${f}:${line} writes a joined list into an in.(...) address in one request. Batch it by IN_BATCH.`);
  }
  if (!scoped(f)) continue;
  for (const m of code.matchAll(/\.from\(\s*['"]([a-z_]+)['"]\s*\)/g)) {
    if (!GROWS.includes(m[1])) continue;
    reads += 1;
    const line = code.slice(0, m.index).split('\n').length;
    const before = code.slice(Math.max(0, m.index - 160), m.index);
    const lastStop = Math.max(before.lastIndexOf(';'), before.lastIndexOf('}'));
    if (/pageAll\(\s*\(\)\s*=>[\s\S]*$/.test(before.slice(lastStop + 1))) { paged += 1; continue; }
    const after = code.slice(m.index, m.index + 600);
    const stmt = after.slice(0, (after.indexOf(';') + 1) || after.length);
    if (NARROW.test(stmt) || /\.limit\(\s*\d+\s*\)/.test(stmt)) { narrow += 1; continue; }
    fails.push(`${f}:${line} reads ${m[1]} whole in one request. Past ${PAGE} rows it stops counting. Use pageAll.`);
  }
  for (const m of code.matchAll(/rest\/v1\/([a-z_${}]+)\??([^`'"\s]*)/g)) {
    if (m[1].includes('$')) { dynamic += 1; continue; }
    if (!GROWS.includes(m[1])) continue;
    const ctx = code.slice(Math.max(0, m.index - 300), m.index);
    /* The whole request, not the first string of it: cron-checkin builds its
       URL over five concatenated lines and the window is on the fourth. And a
       DELETE or PATCH is a write, which the row ceiling does not apply to. */
    const tail = code.slice(m.index, m.index + 400);
    const q = (m[2] || '') + ' ' + tail.slice(0, (tail.indexOf(');') + 1) || tail.length);
    reads += 1;
    if (/=eq\.|=in\.|=gte\.|=lt\.|=lte\.|limit=|method:\s*['"](DELETE|PATCH|POST)/.test(q)) { narrow += 1; continue; }
    if (/restAll|Range:/.test(ctx)) { paged += 1; continue; }
    const line = code.slice(0, m.index).split('\n').length;
    fails.push(`${f}:${line} fetches ${m[1]} whole with no Range. Past ${PAGE} rows it stops counting. Use restAll.`);
  }
  for (const m of code.matchAll(/restAll\([^,]+,[^,]+,\s*['"`]([a-z_]+)\?([^'"`]*)/g)) {
    if (GROWS.includes(m[1])) { reads += 1; paged += 1; }
  }
}
if (reads < 15) fails.push(`only ${reads} reads of growing tables found in the admin and the scheduled jobs. The scanner has lost them.`);

if (fails.length) {
  console.error('check-row-cap FAILED');
  for (const x of fails) console.error('  - ' + x);
  process.exit(1);
}
console.log(`[check-row-cap] pageAll, restAll and selectProfiles return all ${N} rows through a server that answers ${PAGE} at a time. `
  + `${reads} reads of growing tables in the admin and the scheduled jobs: ${paged} paged, ${narrow} narrowed to a few rows or a time window. `
  + `${dynamic} REST paths built at run time, which no scanner can read. No .limit over ${PAGE} in api/. `
  + `${inBatched} reads by a list of ids, each in batches of ${IN_BATCH}.`);
