/**
 * GET /api/home
 *
 * Everything the app's landing screen needs, in one call: the greeting, the
 * primary action, up to three secondary ones, and the tab badges.
 *
 * One call on purpose. The landing screen is the first thing a person sees when
 * they open the app, often on a poor connection, and stitching it together from
 * four requests is how you get a screen that pops in piece by piece.
 *
 * The decision of WHAT to prompt lives in api/_lib/next-action.js, which is
 * pure and tested. This endpoint's only job is to gather the state that engine
 * needs and hand back what it returns.
 *
 * Returns 200 { ok, greeting, primary, secondary, badges, state } or 401.
 */

/**
 * ── AND WHERE IT RUNS ─────────────────────────────────────────────────────
 * Ellie: "Keep trying to speed things up."
 *
 * An edge function runs near whoever is asking, which is the right default
 * when the answer is already at the edge. It is the wrong default when every
 * answer has to come from one database somewhere else: the request lands in
 * San Francisco, measured, and then each read crosses the country and back.
 * A lookup by primary key measured 200 to 600ms, which is most of what is
 * left of the wait and far more than the query itself can account for.
 *
 * `regions` pins it. The customer's own hop gets longer by a few tens of
 * milliseconds and the two database hops get much shorter, which is the right
 * trade when there are more of the second kind than the first.
 *
 * iad1 is the guess, because it is where Supabase puts a project by default.
 * It IS a guess: the region is not visible from outside, so this is an
 * experiment with a measurement either side of it rather than a fact. If the
 * numbers get worse it comes straight back out, and the Server-Timing header
 * is what says which.
 */
export const config = { runtime: 'edge', regions: ['iad1'] };

import { nextActions, greeting, appTargetFor } from './_lib/next-action.js';
import { isBetaOrderSet } from './_lib/beta.js';
import { progressFor } from './_lib/exercise-progress.js';
import { isAdminAddress } from './_lib/admins.js';
import { EXERCISES, EXERCISE_COLUMNS, isExerciseDone } from './_exercises.js';
import { resultsGate } from './_lib/results-gate.js';
import { CATALOGUE, packageContents } from './_catalogue.js';
/**
 * The insight of the day comes from api/_insights.js, which is fifty of them.
 *
 * Ellie: "Build a list of 50 insights of the day to rotate through." It was
 * three, from api/_research.js, which is the three written for the Our Purpose
 * page and held word for word against it by check-research.mjs. Those three
 * are the first three of the fifty, with the same ids and the same sentences,
 * so a reader who meets one here and then reads the page finds it unchanged.
 */
import { insightOfTheDay } from './_insights.js';
import { wordOfTheDay } from './_words.js';
import { DAILY_DEFAULT_AT } from './daily-push.js';
import { dayNumberForOffset } from './_lib/day-number.js';
import { articleForNotes } from './_lib/note-article.js';
import { STORYCARD_STYLE } from './_lib/storycard-style.js';
import { pickUp } from './_lib/pick-up.js';
import { JOURNAL_ANCHOR } from './_lib/tags.js';
import { capabilitiesFor, OWNERSHIP_COLUMNS } from './_lib/ownership.js';
import { shareFooter } from './_lib/share-footer.js';
import { userForRequest } from './_lib/verify-token.js';
import { purchaseStatus, NO_PURCHASE_COPY } from './_lib/purchase-gate.js';
import { phases, withTiming } from './_lib/server-timing.js';

/**
 * The five questions the setup form asks about a person.
 *
 * Named here rather than written into the condition below, because the same
 * five are read by api/create-profile.js and drawn by ABOUT_YOU in
 * api/_lib/profile-setup-copy.js, and a sixth added there has to be required
 * here too or the form grows a question nothing checks.
 */
const DEMOGRAPHIC_COLUMNS = ['age_range', 'relationship_status', 'relationship_length', 'children', 'signup_source'];

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };

/**
 * ── HOW LONG THIS TOOK, SAID OUT LOUD ─────────────────────────────────────
 * Ellie: "My pages are still taking a long time to load."
 *
 * Every phase of this handler reports its own duration in the response, and
 * it is what found the one slow read. The helper is shared, because the other
 * two endpoints the app calls on launch need the same thing and the question
 * being asked of all three is the same question. See api/_lib/server-timing.js.
 */
const json = (body, status = 200, timing = null) => new Response(JSON.stringify(body), {
  status,
  headers: withTiming(HEADERS, timing),
});
const has = (o) => !!(o && Object.keys(o).length);

export default async function handler(req) {
  /* For the Server-Timing header. See api/_lib/server-timing.js. */
  const t = phases();
  if (req.method !== 'GET') return json({ ok: false, error: 'GET only' }, 405);

  /**
   * Minutes to add to the reader's local time to reach UTC, exactly as
   * Date.prototype.getTimezoneOffset() reports it. Sent by the caller
   * because this runs on the edge, where the server's clock is UTC and
   * knows nothing about where the reader is.
   *
   * Clamped to a real range so a junk value cannot move the greeting by a
   * day; anything out of range is treated as absent.
   */
  const rawTz = Number(new URL(req.url).searchParams.get('tzOffset'));
  const tzOffset = Number.isFinite(rawTz) && Math.abs(rawTz) <= 900 ? rawTz : 0;
  /* Which calendar day the reader is standing in, for the two things that
     change once a day. See api/_lib/day-number.js. */
  const readerDay = dayNumberForOffset(tzOffset);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey;
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'Server not configured' }, 500);

  const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ ok: false, error: 'missing auth token' }, 401);

  try {
    /**
     * ── WHO THIS IS, WITHOUT A ROUND TRIP ─────────────────────────────
     * This was a fetch to Supabase asking who the token belonged to,
     * before any work started, on every request. Ellie: "My pages are
     * still taking a long time to load." Measured at 4.1s for this
     * endpoint on a cold launch against 238ms for a static file in the
     * same run, so the time was here.
     *
     * The token is a JWT signed with the project's own key and the
     * project publishes the public half, so it is checked in memory.
     * The round trip is still the fall-back for anything the local
     * check cannot decide. See api/_lib/verify-token.js.
     */
    const user = await t.mark('auth', () => userForRequest({ token, supabaseUrl, anonKey }));
    if (!user?.id) return json({ ok: false, error: 'invalid auth token' }, 401);

    const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    // The half-answered ones, from the registry for the same reason the answer
    // columns come from it. Built above the select rather than inside it:
    // check-profile-columns reads the quoted strings in that array, and a
    // shape name written in a filter there reads as a column.
    const PROGRESS_COLUMNS = EXERCISES
      .filter((e) => e.shape !== 'record')
      .map((e) => `${e.key}_progress`);
    const cols = [
      'id', 'name', 'pronouns', 'partner_pronouns', 'partner_name', 'partner_profile_id', 'pkg',
      // Answer columns come from the registry. Selecting them by hand is how a
      // new exercise ends up read as never started: the column is simply not in
      // the select, so it arrives undefined and nothing errors.
      ...EXERCISE_COLUMNS,
      ...PROGRESS_COLUMNS,
      // The ownership rule's own list. These were named here by hand, which
      // is how `entitlements` came to be missing from this endpoint's select
      // while the rule needed it: a column that is not selected reads as
      // undefined, and undefined reads as "does not own it".
      ...OWNERSHIP_COLUMNS,
      /* The five setup questions, from the same list the completeness rule
         reads. Added with that rule and not before: a column that is not
         selected arrives undefined, and undefined would have read as "not
         answered" for everybody, which is the comment three lines above this
         one describing the bug it was written about. */
      ...DEMOGRAPHIC_COLUMNS,
      'email', 'partner_email', 'partner_joined',
      'budget_data', 'checklist_data',
      'results_last_opened_at', 'partner_nudged_at', 'feedback_given_at',
    ].join(',');

    /**
     * ── THE TWO THAT MIGRATION 083 ADDS ─────────────────────────────────
     * Asked for separately, and allowed to be missing.
     *
     * PostgREST fails the WHOLE select on one unknown column, so adding these
     * to the list above would have answered 400 to every app open between the
     * deploy and Ellie running the SQL. That is migration 061's lesson, where
     * `surface` took every engagement chart to zero.
     *
     * So the select is tried with them and run again without on exactly that
     * failure, which costs a second round trip once and nothing afterwards.
     */
    /**
     * ── WHAT THIS SCREEN WAITS FOR, AND WHY IT USED TO BE EVERYTHING ────
     * Ellie: "the app takes a long time to load when I refresh. Please
     * thoroughly scan and see how we can optimize this."
     *
     * Measured rather than guessed at: with every upstream call pegged at
     * 80ms, this handler took 609ms and made eight calls, 7.6 round trips
     * deep. Only one pair overlapped. The screen was waiting for each answer
     * before asking the next question, and five of the eight questions did
     * not depend on any of the others.
     *
     * Four of them need nothing but the id that came back with the token:
     * their notes, their unread alerts, the newest article, and whether they
     * have read it. They are asked NOW, in parallel with the profile read,
     * and awaited where their answers are used. That is the whole change.
     *
     * The three that cannot move are a real chain: the profile gives the
     * partner's id, the partner gives their email, and the beta lookup needs
     * both. So the floor is four round trips rather than one, and this gets
     * there.
     *
     * `.catch` on each, at the point it is created rather than at the await:
     * a promise that rejects before anything is waiting on it is an unhandled
     * rejection, which on some runtimes takes the process down.
     */
    const nowIso = new Date().toISOString();
    const early = {
      posts: fetch(`${supabaseUrl}/rest/v1/posts?published_at=not.is.null&published_at=lte.${nowIso}&select=id,title,published_at&order=published_at.desc&limit=1`, { headers: svc }).catch(() => null),
      postReads: fetch(`${supabaseUrl}/rest/v1/post_reads?owner_id=eq.${user.id}&select=post_id,read_at&order=read_at.desc&limit=1`, { headers: svc }).catch(() => null),
      /**
       * ── NOT THE JOURNAL ────────────────────────────────────────────────
       * pick-up.js says it itself: "the home screen is the most
       * over-the-shoulder place in it". The row quotes ninety characters of
       * whatever was written last, and a diary entry is the one thing in this
       * product that must not appear on a screen someone else can glance at.
       *
       * The `or` is needed because a plain note's anchor_type is NULL, and
       * `not.eq` drops NULLs: filtering the journal out with it would empty
       * the row for everyone who writes ordinary notes.
       */
      notes: fetch(
        `${supabaseUrl}/rest/v1/notes?owner_id=eq.${user.id}`
        + `&or=(anchor_type.is.null,anchor_type.neq.${JOURNAL_ANCHOR})`
        + '&select=title,body,anchor_context&order=updated_at.desc&limit=1',
        { headers: svc }).catch(() => null),
      /* Where their notes are, for the article the dashboard suggests when
         nothing else is waiting (A245). Anchors only, never a note's words. */
      noteAnchors: fetch(
        `${supabaseUrl}/rest/v1/notes?owner_id=eq.${user.id}&anchor_type=not.is.null`
        + `&anchor_type=neq.${JOURNAL_ANCHOR}&select=anchor_type,anchor_key&order=updated_at.desc&limit=200`,
        { headers: svc }).catch(() => null),
      alerts: fetch(
        `${supabaseUrl}/rest/v1/notifications?owner_id=eq.${user.id}&read_at=is.null`
        + '&select=id,kind,title,body,deep_link,created_at&order=created_at.desc&limit=5',
        { headers: svc }).catch(() => null),
    };

    const DAILY_COLUMNS = ['daily_insight_at', 'daily_word_at', 'tz_offset_minutes'];
    /**
     * ── BOTH ROWS IN ONE READ ───────────────────────────────────────────
     * Ellie: "Keep trying to speed things up."
     *
     * This read this person's row, then read their partner's, one after the
     * other, because the partner's id is a column on the first row. Measured
     * on the live site, a single read of this table costs between 200ms and
     * 1500ms, so doing it twice in a row is the most expensive thing this
     * endpoint does.
     *
     * It does not have to be twice. api/partner-sync.js writes
     * `partner_profile_id` on BOTH rows when two people are linked, so the
     * partner's row is "whoever points back at me" and the pair can be asked
     * for together.
     *
     * The second read is kept as a fall-back for a link that is only written
     * one way, which should not exist and would otherwise silently drop a
     * partner from the home screen. It reports itself as `partner-fallback`,
     * so if that ever starts appearing the data has a problem worth knowing
     * about rather than a performance regression nobody can see.
     */
    const bothUrl = (list) => `${supabaseUrl}/rest/v1/profiles`
      + `?or=${encodeURIComponent(`(id.eq.${user.id},partner_profile_id.eq.${user.id})`)}`
      + `&select=${list}`;
    let dailyKnown = true;
    let rows = [];
    const me = await (async () => {
      let meRes = await t.mark('profile', () => fetch(bothUrl([cols, ...DAILY_COLUMNS].join(',')), { headers: svc }));
      if (!meRes.ok) {
        /**
         * Marked separately on purpose.
         *
         * If migration 083 has not run, this second read happens on EVERY
         * request and the first one is a wasted round trip. The profile read
         * measured between 278ms and 2029ms on the live site for the same
         * couple, and a phase that only appears when the fallback runs is
         * what tells the two explanations apart. A `profile-retry` in the
         * header means the migration is outstanding.
         */
        dailyKnown = false;
        meRes = await t.mark('profile-retry', () => fetch(bothUrl(cols), { headers: svc }));
      }
      return await t.mark('profile-read', async () => {
        rows = (await meRes.json().catch(() => [])) || [];
        /* By id, not by position: the pair comes back in whatever order the
           table felt like, and taking the first row would hand somebody their
           partner's home screen. */
        return rows.find((r) => r.id === user.id) || null;
      });
    })();
    if (!me) return json({ ok: false, error: 'profile not found' }, 404);

    /**
     * ── THE CLOCK CHANGES TWICE A YEAR ───────────────────────────────────
     * The daily notification is matched against the offset stored when the
     * time was picked, and nothing updated it, so every daylight-saving
     * change moved everybody's 7:30 by an hour: Europe on 25 October, the
     * US on 1 November (A203). The app sends its device's current offset on
     * every load of this endpoint, so when it differs from the stored one
     * for somebody who has a time set, it is written here. Once per person
     * per change. Only when the app actually sent one: the default of 0 is
     * not a time zone.
     */
    // has(), not isFinite: Number(null) is 0, so a request with no offset at
    // all would have set everybody to UTC.
    if (dailyKnown && new URL(req.url).searchParams.has('tzOffset')
        && Number.isFinite(rawTz) && Math.abs(rawTz) <= 900
        && (me.daily_insight_at || me.daily_word_at)
        && me.tz_offset_minutes !== Math.round(rawTz)) {
      const r = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ tz_offset_minutes: Math.round(rawTz) }),
      }).catch(() => null);
      if (!r?.ok) console.warn('[home] could not update the stored time zone:', r?.status);
    }

    let partner = null;
    if (me.partner_profile_id) {
      partner = rows.find((r) => r.id === me.partner_profile_id) || null;
      if (!partner) {
        let partnerUnread = false;
        partner = await t.mark('partner-fallback', async () => {
          const pRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${me.partner_profile_id}&select=${cols}`, { headers: svc });
          if (!pRes.ok) { partnerUnread = true; return null; }
          return (await pRes.json().catch(() => []))?.[0] || null;
        });
        /* Unknown is not "not started". A failed read here made the partner
           null, and null draws as somebody who has done nothing, with results
           held back to match. The app keeps its last good home on a refusal
           and says it could not refresh, which is true; a partner row that is
           genuinely gone still comes back empty and reads as absent. Same
           family as A167. Found in the A170 sweep. */
        if (partnerUnread) return json({ ok: false, error: 'could not read your partner just now' }, 503);
      }
    }

    /**
     * ── NOBODY GETS IN WITHOUT A PURCHASE ───────────────────────────────
     * Ellie (A191): "you cannot sign in or create an account on the app
     * without first purchasing a package." Mya had made one through Continue
     * with Google and was using the whole app with no order behind it.
     *
     * Every app tab loads this first, so this is the door. The fast answer is
     * the profiles' own `purchased`, which leans towards yes; only a no is
     * asked again of the orders themselves, live, because a new buyer's order
     * can be ahead of what their profile says (the header of
     * capabilitiesFor says exactly this). A check that could not finish lets
     * them in.
     */
    if (!(capabilitiesFor(me).purchased || (partner && capabilitiesFor(partner).purchased))) {
      const st = await t.mark('purchase', () => purchaseStatus({ supabaseUrl, serviceKey, userId: user.id, email: me.email || user.email || null }));
      if (st.ok && !st.owns) {
        return json({ ok: false, reason: 'no_purchase', error: 'no purchase on this account', copy: NO_PURCHASE_COPY, email: me.email || user.email || null }, 403);
      }
    }

    // What the couple owns. Premium bundles reflection and intimacy; add-ons
    // grant them on other packages. Exercises 1 and 2 are in every package.
    // From api/_lib/ownership.js. It used to be worked out here, and results
    // needed the same answer, which is one copy away from the bug this
    // endpoint already had: premium bundles Conflict Patterns and not Physical
    // Intimacy, and the stale copy said the opposite.
    const {
      pkg, ownsReflection, ownsIntimacy, ownsConflict,
      ownsBudget, ownsChecklist, caps, owned,
    } = capabilitiesFor(me);

    // Per-exercise progress, built from the registry rather than listed here.
    // This block used to name all five by hand, which is the exact shape of the
    // bug api/_exercises.js exists to prevent: add an exercise, update four of
    // the five places that enumerate them, and the missed one fails silently.
    //
    // The capability names are the registry's own (`capability: 'hasIntimacy'`),
    // so ownership is a lookup rather than another branch per exercise.
    // Completion comes from isExerciseDone, which knows the two shapes apart.
    // This block previously tested `has(me.intimacy_data?.answers)`, marking a
    // record-shaped exercise complete as soon as it had any answers rather than
    // when completedAt was set: done the moment someone opened it.
    const exercises = Object.fromEntries(EXERCISES.map((e) => [
      e.key,
      {
        key: e.key,
        label: e.label,
        fullLabel: e.fullLabel || e.label,
        order: e.order,
        owned: !e.capability || !!caps[e.capability],
        // Whether the app can ask this one. Sent so the app holds no list of
        // its own: a hand-kept set of answerable exercises is the same shape of
        // bug as a hand-kept list of exercises.
        inApp: !!e.inApp,
        mine: isExerciseDone(e, me[e.column]),
        theirs: isExerciseDone(e, partner?.[e.column]),
        /**
         * ── STARTED, AND HOW FAR ────────────────────────────────────────
         * Ellie: "I exited after only a few questions of ex1, but I expected
         * the status table to say in progress or something, it didn't, but it
         * did save my progress."
         *
         * It was saved. Nothing read it. ex{N}_progress has held a partly
         * answered exercise since the column was added, and both surfaces
         * asked only whether the thing was finished, so a person who had
         * answered thirty of fifty questions was shown Start.
         *
         * Counted here rather than in the app, because the app would have to
         * know the shape of every exercise's progress blob to count it.
         */
        ...progressFor(me, e),
      },
    ]));

    // A flat list of what this person owns, for surfaces that ask "what do
    // they have" rather than "how far through are they". Derived here so the
    // app never works it out for itself.
    // Results need both partners through every exercise the couple OWNS, not
    // the core two. api/_lib/results-gate.js is the only place that decides
    // this now; it was decided differently here, in api/results.js and in
    // src/App.jsx, and a couple who owned Conflict Patterns and had not
    // finished it saw everything but the conflict section.
    const gate = resultsGate({
      pkg: caps,
      mine: Object.fromEntries(Object.entries(exercises).map(([k, e]) => [k, e.mine])),
      theirs: Object.fromEntries(Object.entries(exercises).map(([k, e]) => [k, e.theirs])),
      partnerLinked: !!me.partner_profile_id,
      /* The same question /api/results asks. This one decides a CARD, so the
         profile's own answer is enough: a false here says "not ready yet"
         rather than refusing anything, and results.js does the authoritative
         read before it refuses. A partner's grant counts. */
      purchased: !!(capabilitiesFor(me).purchased || capabilitiesFor(partner || {}).purchased),
    });
    const resultsReady = gate.ready;

    /**
     * ── THE LAST TWO READS GO TOGETHER ──────────────────────────────────
     * Ellie: "My pages are still taking a long time to load."
     *
     * The chain here was four reads deep: this person's profile, then their
     * partner's, then the stored results, then the orders table. Four round
     * trips one after another, and the server's own timing says the whole
     * request is between 1.3 and 5.9 seconds, essentially all of it here.
     *
     * The first two genuinely wait: the partner's id is on this person's row,
     * and whether results exist depends on what the partner has finished. The
     * last two do not wait on each other at all. They are started together and
     * awaited where their answers are used, which takes the chain to three.
     *
     * The beta read still waits for the partner, because it looks them up by
     * email and the email is a column on the partner's row. Dropping that
     * predicate would make it concurrent with the partner read and would also
     * stop finding a tester who bought before the two accounts were linked, so
     * it stays.
     */
    const resultsP = (resultsReady && me.partner_profile_id)
      ? (() => {
        const [a, b] = [me.id, me.partner_profile_id].sort();
        return fetch(
          `${supabaseUrl}/rest/v1/couple_results?partner_a=eq.${a}&partner_b=eq.${b}&select=couple_type,results`,
          { headers: svc }).catch(() => null);
      })()
      : null;

    /**
     * ── IS EITHER PARTNER A BETA TESTER ─────────────────────────────────
     * Ellie: "Beta feedback should be one of the two action prompts once a beta
     * user has viewed results. Should not have its own banner."
     *
     * The prompt comes from the priority engine, so the engine has to know. The
     * answer lives on the orders table, as a promo code, and api/beta.js owns
     * what counts rather than this file deciding again.
     *
     * No extra round trips for the identities: the signed-in user's email came
     * back with the token check and the partner's is a column already selected
     * above. couple-beta-status has to ask the auth admin for both, because it
     * starts from a user id and nothing else.
     *
     * A failure here is not an error. Not knowing someone is a beta tester
     * costs a prompt; refusing to draw the home screen over it costs the
     * screen.
     */
    const ordersP = (() => {
      try {
        const ids = [me.id, me.partner_profile_id].filter(Boolean);
        const emails = [user.email, partner?.email]
          .filter(Boolean).map((e) => String(e).toLowerCase());
        const or = [
          `user_id.in.(${ids.join(',')})`,
          ...(emails.length ? [`buyer_email.in.(${emails.map((e) => `"${e}"`).join(',')})`] : []),
        ].join(',');
        return fetch(
          `${supabaseUrl}/rest/v1/orders?select=promo_code&or=(${encodeURIComponent(or)})`,
          { headers: svc },
        ).catch(() => null);
      } catch { return null; }
    })();

    // The revisit anchor: the couple's widest gap, read from the stored results
    // rather than recomputed, since this endpoint should stay cheap.
    let topGapDimensionLabel = null, coupleType = null;
    let betaTester = false;
    {
      const [rRes, oRes] = await t.mark('results+beta', () => Promise.all([resultsP, ordersP]));
      const row = rRes ? (await rRes.json().catch(() => []))?.[0] : null;
      coupleType = row?.couple_type || null;
      const top = row?.results?.rankedGaps?.[0]?.dim;
      if (top) topGapDimensionLabel = top;
      try {
        betaTester = oRes ? isBetaOrderSet(await oRes.json().catch(() => [])) : false;
      } catch { /* a missing beta flag costs a prompt, not the screen */ }
    }

    // Newest published post, and whether they have read it. Drives the
    // "new in In Practice" card, and the badge below.
    let inPractice = {};
    try {
      /* Asked for before the profile read, because neither depends on it. */
      const [pRes, rRes] = await t.mark('practice', () => Promise.all([early.posts, early.postReads]));
      const latest = (await pRes?.json().catch(() => []))?.[0];
      const lastRead = (await rRes?.json().catch(() => []))?.[0];
      if (latest) {
        inPractice = {
          latestId: latest.id,
          latestTitle: latest.title,
          latestPublishedAt: latest.published_at,
          lastReadAt: lastRead?.read_at || null,
        };
      }
    } catch { /* no posts table yet, or a read failure: the card just never raises */ }

    // Their own most recently touched note, for the home screen's third row.
    let lastNote = null;
    try {
      /* Asked for before the profile read; the journal is excluded there. */
      const nRes = await t.mark('notes', () => early.notes);
      lastNote = (await nRes?.json().catch(() => []))?.[0] || null;
    } catch { /* no notes table yet, or a read failure: the row falls back to a post */ }

    /* A failed read suggests nothing; the next card down fills the slot. */
    let noteArticle = null;
    try {
      const aRes = await t.mark('note-anchors', () => early.noteAnchors);
      if (aRes?.ok) noteArticle = articleForNotes(await aRes.json().catch(() => []), readerDay);
    } catch { /* no article */ }

    /**
     * Unread alerts, which is the whole of the app's notification surface.
     *
     * ── WHY HERE AND NOT ON A SCREEN OF ITS OWN ───────────────────────────
     * /api/notifications has served this list since the table was added, the
     * app has had fetchNotifications in its client for as long, and no screen
     * has ever called it. A bell and an inbox is a second place to look for
     * things to do, next to a home screen that exists to say what to do next.
     *
     * So they arrive as alerts on that screen, above the cards, carrying the
     * same `app` destination a card does, worked out by the same function. The
     * app routes them through the code that already routes cards.
     *
     * Five, newest first. A home screen is not an archive; /api/notifications
     * still returns fifty for anything that wants the history.
     */
    let alerts = [];
    try {
      /* Asked for before the profile read, because an unread alert is the
         reader's and needs nothing from their partner. */
      const aRes = await t.mark('alerts', () => early.alerts);
      alerts = ((await aRes?.json().catch(() => [])) || []).map(n => ({
        id: n.id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        deepLink: n.deep_link,
        app: appTargetFor(n.deep_link),
        createdAt: n.created_at,
      }));
    } catch { /* no notifications table yet: the strip simply does not appear */ }

    const state = {
      now: new Date().toISOString(),
      firstName: (me.name || '').trim().split(/\s+/)[0] || null,
      partnerName: (partner?.name || '').trim().split(/\s+/)[0] || null,
      // For the one line that needs a possessive: "Results unlock once Preston
      // finishes his final exercise". Their own pronouns first, and what this
      // reader wrote down about them as the fallback.
      partnerPronouns: partner?.pronouns || me.partner_pronouns || null,
      /**
       * Is the profile actually set up?
       *
       * This read profile_setup_complete alone, and that flag is only ever
       * written by one modal on the website. Every account made before the
       * flag existed has it false forever, so the dashboard told people with a
       * complete profile to go and finish it, with a button that opens a form
       * they have already filled in.
       *
       * Derived from the profile now, with the flag kept as an OR so nothing
       * that already passes starts failing. Names are what results prose
       * cannot do without: it addresses both people by name throughout.
       *
       * ── AND THE DEMOGRAPHICS, AT HER ASK ────────────────────────────────
       * Ellie, of Rebecca: "Prompt rebecca to do her profile setup, this was a
       * miss to allow her to take a backdoor into attune, we need to ensure
       * that users always have to complete their demos."
       *
       * This used to say, in these words: "Pronouns are deliberately not
       * required, because the setup form lets someone leave them blank on
       * purpose and a card they can never dismiss is worse than copy that says
       * they." Both halves of that round trip are kept, because the second one
       * is why this is safe to change now and was not before.
       *
       * What made the old objection right was that declining had no value of
       * its own: the only way to say "I would rather not" was to leave it
       * blank, so requiring an answer WOULD have been a card nobody could
       * dismiss. "Prefer not to say" is a real stored answer now, so a person
       * can finish this form in one click without telling us anything, and the
       * product can still tell them apart from somebody who never looked.
       *
       * `profile_setup_complete` is gone from this rule. It was an OR term,
       * there so nobody who had passed the old website modal started failing,
       * and that modal is gone: its writer sat in src/App.jsx with no caller
       * until a sweep for dead functions found it, so the column is now one
       * nothing can set. check-prompt-state-written exists for exactly that
       * and failed the moment the dead writer went, which is the gate doing
       * its job.
       *
       * The rule is the field test, which is what Ellie approved as S80:
       * "Profile complete now means both names, pronouns and the five
       * questions." An account that passed the old modal and still has a
       * blank field will now be asked to finish it, which is what that
       * change was for.
       */
      profileComplete: !!(me.name || '').trim() && !!(me.partner_name || '').trim()
        && !!(me.pronouns || '').trim()
        && DEMOGRAPHIC_COLUMNS.every((c) => !!(me[c] || '').trim()),
      profileMissing: [
        !(me.name || '').trim() && 'your name',
        !(me.partner_name || '').trim() && "your partner's name",
        !(me.pronouns || '').trim() && 'your pronouns',
        DEMOGRAPHIC_COLUMNS.some((c) => !(me[c] || '').trim()) && 'a few questions about you',
      ].filter(Boolean),
      exercises,
      resultsReady,
      resultsLastOpenedAt: me.results_last_opened_at || null,
      resources: {
        budget: { owned: ownsBudget,
                  started: has(me.budget_data), complete: !!me.budget_data?.completedAt },
        checklist: { owned: ownsChecklist,
                     started: has(me.checklist_data), complete: !!me.checklist_data?.completedAt },
      },
      inPractice,
      partnerNudgedAt: me.partner_nudged_at || null,
      /* Nobody to wait for yet (A206): no partner linked, none invited, and
         this person is not the one who was invited. */
      needsPartnerInvite: !me.partner_profile_id && !me.joined_via_invite && !(me.partner_email || '').trim(),
      opens30d: 0,
      feedbackGivenAt: me.feedback_given_at || null,
      betaTester,
      topGapDimensionLabel,
      noteArticle,
    };

    const { primary, secondary } = nextActions(state);

    return json({
      ok: true,
      /**
       * Whether to show the way into the admin.
       *
       * Not a permission: every admin endpoint is behind ADMIN_SECRET and asks
       * for it regardless. This is what decides whether the app draws the row
       * at all, so the two people who use it stop having to type the address
       * into a browser. See api/_lib/admins.js.
       */
      admin: isAdminAddress(me.email),
      /**
       * The admin's own pages, for the menu the app draws.
       *
       * Sent rather than mirrored. Ellie asked for the admin's left nav as a
       * list inside the app, and an Expo project cannot import from api/, so
       * the alternative was seventeen labels typed a second time. The shorter
       * list always wins that argument; see api/_lib/admin-sections.js.
       *
       * Null for everyone else, because it is a map of a surface they have no
       * business knowing the shape of.
       */
      greeting: greeting({
        now: state.now,
        firstName: state.firstName,
        returning: !!me.results_last_opened_at,
        // The reader's clock, not this server's. See greeting() for why.
        tzOffsetMinutes: tzOffset,
      }),
      primary,
      secondary,
      // Unread alerts, newest first. Empty is the normal case.
      alerts,
      owned,
      /* The account, as the website's Account page lays it out, for the
         app's Settings (A231): both names and addresses, whether the partner
         has joined, and the package with what it includes. */
      account: {
        email: me.email || null,
        name: me.name || null,
        partnerName: partner?.name || me.partner_name || null,
        partnerEmail: me.partner_email || null,
        partnerJoined: !!partner || !!me.partner_joined,
        ...packageContents(pkg, owned),
      },
      // Both names, which the app needs to label a two-column status table.
      // client.ts already declared partnerName and the response has never
      // carried it, so every app screen naming the partner said "your partner"
      // to people whose partner has a name. Computed on `state` below since the
      // first version of this endpoint; simply never returned.
      firstName: state.firstName,
      partnerName: state.partnerName,
      // Results readiness, alongside the copy of it inside `state`. Insights
      // read a top-level field that was never sent, so a couple who had both
      // finished were shown their exercise progress instead of their results.
      resultsReady,
      // No waiting list here on purpose, though the gate computes one. This
      // response already carries `exercises`, keyed by exercise, each with
      // owned, mine and theirs, and the app's Insights screen already filters
      // it to work out who owes what. A second field saying the same thing is
      // the failure this whole codebase is organised against, and adding it
      // here would have been that mistake made while fixing an instance of it.
      //
      // /api/results does send waitingOn, because its not-ready response
      // carries no per-exercise state and a waiting screen there has nothing
      // else to read.
      // What exists to buy, so the app renders the server's catalogue rather
      // than a copy that goes stale the moment an add-on is added or repriced.
      catalogue: CATALOGUE,
      // One insight, the same for everyone on a given day, from
      // api/_insights.js. The field is still called `research` because the app
      // reads that name.
      //
      // This said the copy lives in api/_research.js "so they cannot drift
      // from the website's Our Purpose page". Neither half is true any more:
      // e80b8d9a replaced researchOfTheDay with insightOfTheDay here and left
      // the old module behind, nothing imports it now, and public/purpose.html
      // carries its own words. A comment claiming a single source of truth
      // that does not exist is worse than no comment, because the next person
      // to change one of them will believe the other follows.
      /* The reader's day, from the offset their device already sends. Both of
         these counted days from the epoch in UTC, so they turned over at 00:00Z,
         which is 5pm in California: two devices opened either side of that hour
         disagreed about the day while plainly being on the same one. */
      research: insightOfTheDay(readerDay),
      /* The word the Notes tab defines today. Same shape and the same reason
         as the research finding: the copy lives on the server so it is one
         copy and so Ellie can change it without an app build. */
      word: wordOfTheDay(readerDay),
      /**
       * When this reader has asked for the two of them, as stored.
       *
       * Settings draws the two rows from this rather than asking for it
       * separately: that screen already waits on this payload, and a second
       * request for two strings is a second thing that can fail on a slow
       * connection. `defaultAt` is the time the picker opens on, from the
       * endpoint that stores it, so the default is not written twice.
       */
      dailyPush: {
        insight: me.daily_insight_at || null,
        word: me.daily_word_at || null,
        defaultAt: DAILY_DEFAULT_AT,
        /* False until migration 083 has run. Settings draws nothing rather
           than a control that cannot save, because a switch that silently
           fails is worse than one that is not there. */
        available: dailyKnown,
      },
      /**
       * How a storycard is set.
       *
       * The insight of the day opens as a full card from the home screen and
       * from Learn, and neither of those calls /api/results, which is where
       * this used to be the only copy. Without it the card renders with no
       * type scale at all: black fourteen point on a navy ground, legible to
       * nobody. Same constant as the results payload sends, so the two cannot
       * disagree about how a card is set.
       */
      storycardStyle: STORYCARD_STYLE,
      /**
       * The line under anything the app shares.
       *
       * Sent rather than written in the app because it changes the day the
       * store listing goes live, and that is a flag here rather than an app
       * release. See api/_lib/share-footer.js.
       */
      shareFooter: shareFooter(),
      /**
       * The home screen's third row: a note to return to, or the newest In
       * Practice post when there is none. Two states, decided server-side so
       * the app renders one shape either way. See api/_lib/pick-up.js.
       */
      pickUp: pickUp({ note: lastNote, inPractice }),
      // Per-exercise progress, so the Insights tab can show what is left
      // before results exist rather than a locked empty screen. Computed here
      // already; it was simply never returned.
      exercises,
      // Tab badges: what each tab should show as outstanding.
      badges: {
        toolbox: EXERCISES.filter(e => exercises[e.key].owned && !exercises[e.key].mine).length
               + (state.resources.budget.owned && !state.resources.budget.complete ? 1 : 0)
               + (state.resources.checklist.owned && !state.resources.checklist.complete ? 1 : 0),
        insights: resultsReady && !me.results_last_opened_at ? 1 : 0,
        practice: (inPractice.latestId && (!inPractice.lastReadAt
          || new Date(inPractice.lastReadAt) < new Date(inPractice.latestPublishedAt))) ? 1 : 0,
        notes: 0,
      },
      state: { resultsReady, coupleType, partnerLinked: !!me.partner_profile_id },
    }, 200, t.header());
  } catch (e) {
    console.error('[home] failed:', e);
    return json({ ok: false, error: 'home unavailable' }, 500);
  }
}
