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
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The other admin endpoints. This one is the one that failed, and the one that
 * paginates by hand. If another grows the same helper, it belongs here.
 */

import { SITE_URL } from '../api/_lib/site.js';

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

if (problems.length) {
  console.error('[check-query-failures] the Engagement endpoint confuses a rejected query with an empty table:\n');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

console.log('[check-query-failures] a rejected select is retried, reported, and never drawn as a zero.');
