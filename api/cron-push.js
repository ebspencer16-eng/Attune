/**
 * GET /api/cron-push — the three of Ellie's six that nothing else can notice.
 *
 * ── WHY A CRON AND NOT A TRIGGER ──────────────────────────────────────────
 * Three of the six push notifications she approved are about something NOT
 * happening, or about a condition that only becomes true with the passage of
 * time:
 *
 *   exercise_unfinished   they still have one to do
 *   journal_streak        a run of days that today would end
 *   new_post              an article published, for someone who reads them
 *
 * The other three hang off an event: a note being shared, a couple becoming
 * complete, a workbook finishing. Those are raised where they happen, which is
 * api/notes.js, api/_lib/completion.js and api/store-workbook-pdf.js.
 *
 * ── WHAT IT DOES NOT DECIDE ───────────────────────────────────────────────
 * Whether any of these is actually sent. api/_lib/notifications.js carries the
 * cooldown, the monthly cap and the rule about what the reader has already
 * seen, and api/_lib/push.js refuses anyone whose answer to being asked was
 * not yes. This file decides WHO QUALIFIES, which is a set of queries, and
 * hands each one over.
 *
 * So on a product with nobody opted in, a run of this sends nothing and says
 * so, which is the honest state until Ellie's build reaches TestFlight.
 *
 * ── THE WORDING IS NOT HERE ───────────────────────────────────────────────
 * Every sentence is hers and lives in notificationFor. This file passes facts:
 * a streak length, an exercise label, an article title and its length.
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_KEY, CRON_SECRET.
 */

import { EXERCISES, EXERCISE_COLUMNS } from './_exercises.js';
import { capabilitiesFor, OWNERSHIP_COLUMNS } from './_lib/ownership.js';
import { doneFromProfile, ownsExercise } from './_lib/results-gate.js';
import { firstUnfinished } from './_lib/next-action.js';
import { journalStreak } from './_lib/journal-use.js';
import { JOURNAL_ANCHOR } from './_lib/tags.js';
import { pushOnly } from './_lib/notifications.js';
import { publishedFilter } from './_lib/posts-filter.js';

export const config = { runtime: 'edge' };

const HOUR = 3600000;

/** A streak is at risk when the last entry is a day old but not yet two. */
const STREAK_RISK_FROM_HOURS = 20;
const STREAK_RISK_TO_HOURS = 44;
/** Shorter than this and losing it is not worth a notification. */
const STREAK_WORTH_SAVING = 2;
/** Ellie: "only if someone read 2 in the previous week". */
const POSTS_READ_FOR_A_PUSH = 2;
const READER_WINDOW_DAYS = 7;
/** A new article is new for a day, which is how often this runs. */
const POST_IS_NEW_HOURS = 26;
/** Nobody is nagged about an exercise in their first few days. */
const SETTLING_IN_DAYS = 3;

export default async function handler(req) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  const secret = process.env.CRON_SECRET;
  /* Fail closed. This endpoint interrupts real people's phones; without the
     secret set, anyone finding the URL could do it. */
  if (!secret) {
    console.error('[cron-push] CRON_SECRET is not set, refusing to run');
    return new Response('Cron not configured', { status: 500 });
  }
  if (auth !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY
           || process.env.SUPABASE_SERVICE_ROLE
           || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 });
  }
  const svc = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async (path) => {
    const r = await fetch(`${url}/rest/v1/${path}`, { headers: svc });
    if (!r.ok) return null;
    return r.json().catch(() => null);
  };

  const now = Date.now();
  const counts = { unfinished: 0, streak: 0, post: 0, considered: 0, skipped: 0 };
  let stage = 'starting';

  try {
    /**
     * Only people who can be reached at all.
     *
     * Every one of the three sweeps below would otherwise walk the whole
     * profile table to decide things about people who have never been asked
     * about notifications. `push_opt_in=is.true` is the one filter that makes
     * this cheap, and it is also the filter that makes it correct.
     *
     * A 404 here means migration 078 has not been run, which is not a failure:
     * it is the state before Ellie runs it, and the honest answer is nobody.
     */
    stage = 'reachable';
    const cols = ['id', 'name', 'partner_profile_id', 'created_at',
      ...OWNERSHIP_COLUMNS, ...EXERCISE_COLUMNS].join(',');
    const people = await get(`profiles?push_opt_in=is.true&select=${cols}`);
    if (!Array.isArray(people)) {
      return new Response(JSON.stringify({
        ok: true, ready: false,
        reason: 'push storage is not set up yet (migration 078)',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    counts.considered = people.length;
    if (!people.length) {
      return new Response(JSON.stringify({ ok: true, ...counts, reason: 'nobody has opted in' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    const byId = new Map(people.map((p) => [p.id, p]));
    const firstOf = (n) => (n || '').trim().split(/\s+/)[0] || null;

    // ── 1. An exercise they have not finished ───────────────────────────────
    stage = 'unfinished exercises';
    for (const me of people) {
      /* Their first few days are theirs. A reminder on day one is the product
         asking for something before anyone has had a chance to do it. */
      const age = (now - Date.parse(me.created_at || 0)) / (24 * HOUR);
      if (!(age >= SETTLING_IN_DAYS)) { counts.skipped += 1; continue; }

      const { caps } = capabilitiesFor(me);
      const mine = doneFromProfile(me);
      /* The same per-exercise shape /api/home builds, so firstUnfinished
         answers the same question for the push as it does for the card. */
      const ex = Object.fromEntries(EXERCISES.map((e) => [e.key, {
        owned: ownsExercise(e, caps),
        mine: !!mine[e.key],
      }]));
      const next = firstUnfinished(ex);
      if (!next) continue;

      const sent = await pushOnly({
        ownerId: me.id,
        kind: 'exercise_unfinished',
        copy: { exerciseLabel: next.label, exerciseView: next.view },
      });
      if (sent.sent) counts.unfinished += 1;
    }

    // ── 2. A journal streak that today would end ────────────────────────────
    //
    // Timezone-free on purpose. A day key is written in the reader's own
    // timezone and this runs in UTC, so "have they written today" cannot be
    // asked by comparing to a UTC date: at the hour this runs, a reader in
    // California is still on yesterday. What is the same everywhere is how
    // long ago their last entry was, so the risk window is in hours.
    //
    // The NUMBER comes from journalStreak over their day keys, which is the
    // function the app's own streak counter uses, so the push and the button
    // cannot disagree.
    stage = 'journal streaks';
    /* The columns first, and on one line with the table, so a privacy check
       can see what this asks for. Three fields: an id, a day, and a time.
       Nothing anybody wrote. check-journal-privacy reads this select and
       fails the build if `body`, `title` or `anchor_context` appears in it. */
    const entries = await get('notes?select=owner_id,anchor_key,created_at'
      + `&anchor_type=eq.${JOURNAL_ANCHOR}`
      + `&owner_id=in.(${people.map((p) => p.id).join(',')})`);
    if (Array.isArray(entries) && entries.length) {
      const byOwner = new Map();
      for (const e of entries) {
        if (!e?.owner_id || !e.anchor_key) continue;
        const seen = byOwner.get(e.owner_id) || { days: [], newest: 0 };
        seen.days.push(e.anchor_key);
        const at = Date.parse(e.created_at || '');
        if (Number.isFinite(at) && at > seen.newest) { seen.newest = at; seen.newestKey = e.anchor_key; }
        byOwner.set(e.owner_id, seen);
      }
      for (const [ownerId, seen] of byOwner) {
        const sinceHours = (now - seen.newest) / HOUR;
        if (sinceHours < STREAK_RISK_FROM_HOURS || sinceHours > STREAK_RISK_TO_HOURS) continue;
        /* Counted back from their own last entry, which is what makes this the
           same number the app shows whether or not they have written today. */
        const days = journalStreak(seen.days, seen.newestKey);
        if (days < STREAK_WORTH_SAVING) continue;
        const sent = await pushOnly({
          ownerId, kind: 'journal_streak', copy: { streakDays: days },
        });
        if (sent.sent) counts.streak += 1;
      }
    }

    // ── 3. A new article, for someone who reads them ────────────────────────
    stage = 'new articles';
    const since = new Date(now - POST_IS_NEW_HOURS * HOUR).toISOString();
    /* Published is one condition on published_at and not a status column; it
       lives in api/_lib/posts-filter.js, which is what /api/posts asks with. */
    const fresh = await get(`posts?${publishedFilter()}`
      + `&published_at=gte.${since}&select=id,title,read_minutes,published_at`
      + '&order=published_at.desc&limit=1');
    const post = Array.isArray(fresh) ? fresh[0] : null;
    if (post) {
      const readerSince = new Date(now - READER_WINDOW_DAYS * 24 * HOUR).toISOString();
      const reads = await get(`post_reads?read_at=gte.${readerSince}`
        + `&owner_id=in.(${people.map((p) => p.id).join(',')})`
        + '&select=owner_id,post_id');
      const perOwner = new Map();
      for (const r of (Array.isArray(reads) ? reads : [])) {
        if (!r?.owner_id) continue;
        const set = perOwner.get(r.owner_id) || new Set();
        set.add(r.post_id);
        perOwner.set(r.owner_id, set);
      }
      for (const [ownerId, set] of perOwner) {
        /* Her rule, exactly: two in the previous week. Two reads of the same
           article is one article, which is why these are counted as a set. */
        if (set.size < POSTS_READ_FOR_A_PUSH) continue;
        if (set.has(post.id)) continue;   // they have already read this one
        if (!byId.has(ownerId)) continue;
        const sent = await pushOnly({
          ownerId,
          kind: 'new_post',
          copy: { postTitle: post.title, readMinutes: post.read_minutes },
        });
        if (sent.sent) counts.post += 1;
      }
    }

    return new Response(JSON.stringify({ ok: true, ...counts }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    /* A partial run has to be visible. This sends to real phones, so the
       failure names the stage it reached and reports what already went. */
    console.error(`[cron-push] failed during ${stage}:`, e?.message || e);
    return new Response(JSON.stringify({ ok: false, stage, ...counts, error: String(e?.message || e) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
