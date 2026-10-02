#!/usr/bin/env node
/**
 * A rejected query must not read as an empty table.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * /api/admin-engagement answers with the rows it could read, a list of the
 * queries that failed, and a count of what each read. A select that the
 * database rejects appears in that list. It never reaches the page as a zero.
 *
 * And the one rejection that was actually going to happen, an events select
 * naming a column a migration has not added yet, is retried without that
 * column so the rest of the page still works.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Ellie: "there should be data for some of these already."
 *
 * The events select asked for `surface`, which migration 061 adds. She had run
 * 060 but not 061. PostgREST rejects a select naming a column that does not
 * exist, and the paging helper stopped on a bad response and returned what it
 * had, which was nothing. So every chart on the Engagement page read zero from
 * a table with rows in it, and the page said "nothing recorded yet", which was
 * a confident answer and the wrong one.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * By running the handler against a database that rejects exactly that select
 * and answers everything else, then asserting three things: the events are
 * read anyway, the reason is reported, and a measure computed from them is
 * available rather than empty.
 *
 * ── AND THE EXPLORE ENDPOINT, WHICH HAD THE SAME HABIT ────────────────────
 * This file used to say: "The other admin endpoints. This one is the one that
 * failed." api/admin-explore.js had three selects in `try { ... } catch {}`
 * leaving an empty array behind, so a rejected query made the page quietly
 * smaller: a couple whose partner joined by invite read as UNPAIRED, a filter
 * lost its options, the testimonials vanished. Every one a confident answer and
 * a wrong one, which is this file's whole subject.
 *
 * It is here rather than in a gate of its own because that would be a second
 * fixture for one rule, and CLAUDE.md is explicit that the two then drift and
 * the weaker one wins. Same promise, second endpoint.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the admin page draws the warning well. It has to print it, which is
 * checked, but how it looks is not something a check can answer.
 */

import { readFileSync } from 'node:fs';

import { SITE_URL } from '../api/_lib/site.js';

const ROOT = new URL('..', import.meta.url).pathname;

process.env.SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_SERVICE_KEY = 'test-key';
process.env.ADMIN_SECRET = 'test-admin-secret';

const NOW = new Date().toISOString();
const EVENTS = [
  { kind: 'visit', key: '/home', ms: null, owner_id: null, created_at: NOW },
  { kind: 'visit', key: '/faq', ms: null, owner_id: null, created_at: NOW },
  { kind: 'page_time', key: 'app:exercise1', ms: 600000, owner_id: null, created_at: NOW },
];

const asked = [];
globalThis.fetch = async (u) => {
  const url = String(u);
  asked.push(url);
  const table = url.split('/rest/v1/')[1]?.split('?')[0];
  // The database as it stands after migration 060 and before 061.
  if (table === 'page_events' && url.includes('surface')) {
    return new Response('{"code":"42703","message":"column page_events.surface does not exist"}', { status: 400 });
  }
  const rows = table === 'page_events' ? EVENTS : [];
  return new Response(JSON.stringify(rows), { status: 200, headers: { 'content-type': 'application/json' } });
};

const { default: handler } = await import('../api/admin-engagement.js');
const res = await handler(new Request(`${SITE_URL}/api/admin-engagement`, {
  headers: { authorization: 'Bearer test-admin-secret' },
}));

const problems = [];
const body = await res.json().catch(() => null);

if (res.status !== 200 || !body?.ok) {
  problems.push(`the endpoint answered ${res.status} when one column was missing. It has to answer with what it can read.`);
} else {
  if ((body.rowsRead?.events ?? 0) !== EVENTS.length) {
    problems.push(
      `it read ${body.rowsRead?.events ?? 0} of ${EVENTS.length} events when the surface column was missing.\n`
      + `      A rejected select has to be retried without the column, not reported as an empty table.`);
  }
  if (!Array.isArray(body.queryErrors) || !body.queryErrors.length) {
    problems.push('it read the events but said nothing about why the app and site split is missing. Silence here is how the page lied the first time.');
  }
  if (body.headlines?.siteVisits?.available !== true) {
    problems.push('site visits came back unavailable from events that were read. A measure computed from rows that exist is not "nothing recorded yet".');
  }
  const tried = asked.filter((u) => u.includes('page_events')).length;
  if (tried < 2) {
    problems.push(`it asked page_events ${tried} time(s). The point is that it asks again without the column it could not have.`);
  }
}


// ── The Explore endpoint, same promise ──────────────────────────────────────
{
  /** Everything answers, except the invited partners. */
  globalThis.fetch = async (u) => {
    const url = String(u);
    const table = url.split('/rest/v1/')[1]?.split('?')[0];
    if (table === 'partner_sessions') {
      return new Response('{"code":"42P01","message":"relation does not exist"}', { status: 400 });
    }
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const { default: explore } = await import('../api/admin-explore.js');
  const r = await explore(new Request(`${SITE_URL}/api/admin-explore`, {
    headers: { authorization: 'Bearer test-admin-secret' },
  }));
  const b = await r.json().catch(() => null);

  if (r.status !== 200 || !b) {
    problems.push(`admin-explore answered ${r.status} when one table was missing. It has to answer`
      + ' with what it can read.');
  } else if (!Array.isArray(b.couldNotRead) || !b.couldNotRead.length) {
    problems.push('admin-explore read none of the invited partners and said nothing about it.\n'
      + '      A couple whose partner joined by invite then reads as unpaired, and the page has\n'
      + '      no way to tell that from the truth. Silence here is how the Engagement page lied.');
  }

  /* And the page prints it. A field reported and never drawn is the same
     silence one layer out, which is a mistake this repo made today in the
     other direction: the website read a `tint` nothing sent. */
  const admin = readFileSync(`${ROOT}public/admin.html`, 'utf8');
  if (!/couldNotRead/.test(admin)) {
    problems.push('public/admin.html never reads couldNotRead, so the endpoint reports a failed'
      + ' query to nobody.');
  }
}

if (problems.length) {
  console.error('[check-query-failures] an admin endpoint confuses a rejected query with an empty table:\n');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

console.log('[check-query-failures] a rejected select is retried, reported, and never drawn as a zero.');
