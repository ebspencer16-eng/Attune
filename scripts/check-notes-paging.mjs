#!/usr/bin/env node
/**
 * The Notes tab asks for three. The marking layer asks for all of them.
 *
 * ── WHAT SHE ASKED FOR ────────────────────────────────────────────────────
 * Ellie: "What if we only load the previous 3 marks in the tile on notes page,
 * and you can click to see previous 10, then same with shared notes... but
 * those click to see pages don't have to load when the user initially opens
 * their notes page. The tags list needs to load, but each individual tags list
 * with all the marks with that tag only need to load when a user opens that tag
 * list, so again, shouldn't load initially."
 *
 * ── THE BUG THIS GATE IS REALLY ABOUT ─────────────────────────────────────
 * /api/notes has two callers and only one of them wants a cap. The other is the
 * marking layer on a results page, which reads the anchored list to draw every
 * highlight, underline and margin icon on the page in front of the reader. A
 * default limit of three would have rubbed out every mark past the third, on
 * every results page, with nothing failing: three marks is what a page with
 * three marks looks like.
 *
 * That is the same shape as the bug check-annotation-source exists for, where
 * the screen read `notes` instead of `annotations` and no mark had ever drawn
 * on a results page. A list that is a real list and the wrong length is as
 * quiet as a list that is a real list and the wrong list.
 *
 * ── AND THE FIGURES A CAP TAKES AWAY ──────────────────────────────────────
 * A tile holding three rows still has to say "212", say how many of the
 * partner's notes are unread, print how many marks carry each tag, and work out
 * a journal streak that can be longer than three days. All four used to be
 * counted out of the whole list in the app. So a capped answer has to carry
 * them, and this checks that it does, because the failure is a number that is
 * quietly the size of a tile.
 *
 * ── HOW IT CHECKS ─────────────────────────────────────────────────────────
 * By running the handler against a stubbed fetch and reading the queries it
 * sends and the payload it builds. Not by reading the file: the question is
 * what the endpoint asks Postgres for, and the cap is assembled from three
 * pieces of a template string.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether Postgres honours `limit` and `count=exact`, which is PostgREST's job.
 * The stub answers whatever it is asked for; what is checked is the asking.
 *
 * How deep the handler's waterfall is, which is check-waterfalls, and it holds
 * both the capped and the uncapped path to their own figure.
 */

process.env.SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_SERVICE_KEY = 'test-not-a-real-key';
process.env.SUPABASE_ANON_KEY = 'test-not-a-real-key';

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;

/* Rows the stub hands back: more than any cap, so a cap that is not applied
   shows up as rows nobody asked for. */
const ROWS = Array.from({ length: 12 }, (_, i) => ({
  id: `n${i}`, owner_id: 'u1', body: `mark ${i}`, anchor_type: i % 3 ? null : 'post',
  anchor_key: 'slug#b1', updated_at: `2026-10-${String(12 - i).padStart(2, '0')}T00:00:00Z`,
  opened_at: null,
}));

let asked = [];
globalThis.fetch = async (u, init) => {
  const url = String(u && u.url ? u.url : u);
  asked.push({ url, headers: (init && init.headers) || {}, method: (init && init.method) || 'GET' });
  const body = /\/auth\/v1\/user/.test(url) ? { id: 'u1', email: 'a@example.com' }
    : /\/profiles/.test(url) ? [{ id: 'u1', partner_profile_id: 'u2', name: 'Lanae', pronouns: 'she/her', pkg: 'premium' }]
    : /note_tags\?select=tag_id/.test(url) ? [
      { tag_id: 't1', notes: { owner_id: 'u1', updated_at: '2026-10-12T00:00:00Z' } },
      { tag_id: 't1', notes: { owner_id: 'u1', updated_at: '2026-10-11T00:00:00Z' } },
      { tag_id: 't2', notes: { owner_id: 'u1', updated_at: '2026-10-01T00:00:00Z' } },
    ]
    : /note_tags/.test(url) ? [{ note_id: 'n0', tag_id: 't1' }]
    : /anchor_type=eq\.journal/.test(url) ? [
      { anchor_key: '2026-10-15' }, { anchor_key: '2026-10-14' }, { anchor_key: '2026-10-13' },
      { anchor_key: '2026-10-12' }, { anchor_key: '2026-10-11' },
    ]
    : /\/notes/.test(url) ? ROWS
    : [];
  /**
   * The stub honours `limit`, because otherwise the assertion about how many
   * rows come back is an assertion about the stub.
   *
   * This is the smallest piece of PostgREST worth imitating: the one clause the
   * handler is being checked for sending. Everything else the stub answers
   * flatly, and the queries themselves are asserted on above, so a handler that
   * sent the clause and ignored the answer would still be caught.
   */
  const cap = /[?&]limit=(\d+)/.exec(url);
  const rows = Array.isArray(body) && cap ? body.slice(0, Number(cap[1])) : body;
  /* PostgREST answers a count request in content-range. 212 is a number no
     list in this fixture is the length of, so a figure read off a list rather
     than off the header is obvious. */
  const headers = { 'content-type': 'application/json' };
  const prefer = String((init && init.headers && (init.headers.Prefer || init.headers.prefer)) || '');
  if (prefer.includes('count=exact')) headers['content-range'] = '0-2/212';
  return new Response(JSON.stringify(rows), { status: 200, headers });
};

const mod = await import('../api/notes.js');
const problems = [];

async function list(query) {
  asked = [];
  const res = await mod.default(new Request(`https://www.attune-relationships.com/api/notes${query}`, {
    headers: { authorization: 'Bearer test-token' },
  }));
  const payload = await res.json().catch(() => null);
  return { status: res.status, payload, asked: asked.slice() };
}

/** The row queries, which are the ones a cap belongs on. */
const rowQueries = (calls) => calls
  .map((c) => c.url)
  .filter((u) => /\/rest\/v1\/notes\?/.test(u))
  .filter((u) => !/select=anchor_key/.test(u) && !/opened_at=is\.null/.test(u));

// ── 1. The way the Notes tab asks ──────────────────────────────────────────
const capped = await list('?action=list&limit=3');
if (capped.status !== 200) {
  problems.push(`asking with a limit answered ${capped.status}: ${JSON.stringify(capped.payload).slice(0, 120)}`);
} else {
  const rows = rowQueries(capped.asked);
  if (!rows.length) problems.push('a capped list sent no notes query at all.');
  for (const q of rows) {
    if (!/[?&]limit=3(&|$)/.test(q)) {
      problems.push(`a capped list asked for rows with no limit on them: ${q.split('/rest/v1/')[1]}`);
    }
  }
  const countingHeaders = capped.asked
    .filter((c) => rows.includes(c.url))
    .every((c) => String(c.headers.Prefer || c.headers.prefer || '').includes('count=exact'));
  if (!countingHeaders) {
    problems.push('a capped row query did not ask for the count, so the tile\'s number has to'
      + ' come from somewhere else. count=exact rides along with the rows for nothing.');
  }
  const mine = (capped.payload.notes || []).length + (capped.payload.annotations || []).length;
  if (mine > 3) problems.push(`a limit of 3 came back with ${mine} of the reader's own rows.`);
  if ((capped.payload.sharedWithMe || []).length > 3) {
    problems.push(`a limit of 3 came back with ${capped.payload.sharedWithMe.length} shared rows.`);
  }
  if (capped.payload.limited !== true) problems.push('a capped answer does not say it is capped.');

  const c = capped.payload.counts || {};
  for (const [key, want] of [['marks', 212], ['shared', 212], ['unopened', 212]]) {
    if (c[key] !== want) {
      problems.push(`counts.${key} came back as ${c[key]} rather than the ${want} the server`
        + ' reported. A figure counted off the rows in hand is the size of the tile, not the'
        + ' size of the library.');
    }
  }
  if (c.journal !== 5) {
    problems.push(`counts.journal is ${c.journal} and the fixture has 5 journal days. The`
      + ' streak is made of these and a capped list holds none of them.');
  }
  if ((capped.payload.journalDays || []).length !== 5) {
    problems.push('a capped answer carries no journal days, so the streak would be the size'
      + ' of a tile. The longest streak anybody has would read as three.');
  }
  const stats = capped.payload.tagStats || {};
  if (!stats.t1 || stats.t1.count !== 2) {
    problems.push(`tagStats.t1 is ${JSON.stringify(stats.t1)} and the fixture has two marks`
      + ' under that tag. The tag list prints this beside every tag.');
  }
}

// ── 2. The way the marking layer asks ──────────────────────────────────────
const all = await list('?action=list');
if (all.status !== 200) {
  problems.push(`asking with no limit answered ${all.status}.`);
} else {
  for (const q of rowQueries(all.asked)) {
    if (/[?&]limit=/.test(q)) {
      problems.push(`an uncapped list still capped its rows: ${q.split('/rest/v1/')[1]}.`
        + ' The marking layer on a results page reads this list to draw every highlight on'
        + ' the page. A cap here loses marks and nothing fails.');
    }
  }
  const mine = (all.payload.notes || []).length + (all.payload.annotations || []).length;
  if (mine !== ROWS.length) {
    problems.push(`an uncapped list returned ${mine} of ${ROWS.length} rows.`);
  }
  if (all.payload.limited !== false) problems.push('an uncapped answer says it is capped.');
  if (!all.payload.counts || typeof all.payload.counts.marks !== 'number') {
    problems.push('an uncapped answer carries no counts. Both shapes carry them, so a screen'
      + ' reads one number rather than sometimes a number and sometimes a length.');
  }
}

// ── 3. One tag's marks, which is a different request ───────────────────────
const tagged = await list('?action=list&tagId=t1&limit=10');
if (tagged.status !== 200) {
  problems.push(`asking for one tag answered ${tagged.status}.`);
} else {
  const filtered = rowQueries(tagged.asked).every((q) => /[?&]id=in\./.test(q));
  if (!filtered) {
    problems.push('asking for one tag did not filter the rows to that tag\'s notes, so'
      + ' opening a tag downloads the whole library and sorts it on the phone.');
  }
}

// ── 4. And the two callers in the app ──────────────────────────────────────
const screen = readFileSync(`${ROOT}attune-app/src/app/notes.tsx`, 'utf8');
if (!/fetchNotes\(\{\s*limit:/.test(screen)) {
  problems.push('attune-app/src/app/notes.tsx does not ask fetchNotes for a limit, so the'
    + ' tab downloads every mark to draw two rows.');
}
if (!/counts\.marks/.test(screen) || !/counts\.shared/.test(screen)) {
  problems.push('the Notes screen does not read counts.marks and counts.shared, so its tiles'
    + ' are printing the length of a list that holds three.');
}
const marking = readFileSync(`${ROOT}attune-app/src/components/results.tsx`, 'utf8');
if (/fetchNotes\(\s*\{/.test(marking)) {
  problems.push('attune-app/src/components/results.tsx asks fetchNotes for a subset. That'
    + ' list draws the marks on the page in front of the reader and has to be all of them.');
}

if (problems.length) {
  console.error('[check-notes-paging] the notes list is the wrong length somewhere:');
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}

console.log('[check-notes-paging] the tab asks for 3 and gets 3 with the library\'s own'
  + ' figures beside them, one tag asks only for its own rows, and the marking layer\'s'
  + ' request is still uncapped.');
