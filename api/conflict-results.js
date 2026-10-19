/**
 * /api/conflict-results
 *
 * Conflict Patterns results, for the one person asking.
 *
 * ── THE RULE THIS ENDPOINT EXISTS TO ENFORCE ──────────────────────────────
 * A person's own conflict patterns are never shown to their partner. Not
 * behind a toggle, not in a debug view, not in a field the app happens not to
 * render today.
 *
 * The safest way to keep that true is to never put them in the response. So
 * the partner's half of this payload carries their shared answers and their
 * repair preferences and nothing else: no pattern values, no bands, no flags,
 * not even a count. A screen cannot leak what it was never sent, and an app
 * built later by someone who has not read SCREENS.md cannot leak it either.
 *
 * This is also why there is no couple score here. Averaging two people's risk
 * patterns hides the case that matters most, one partner high and one low, and
 * invites a couple to read a middling number as fine.
 *
 * Returns 200 { ok, ready } in every non-error case. Not owning the add-on and
 * a partner who has not finished are both normal states, not failures.
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

import { summarizeConflict } from './_lib/conflict-results.js';
import { partnerView } from './_lib/conflict-partner-view.js';
import { capabilitiesFor, OWNERSHIP_COLUMNS } from './_lib/ownership.js';
import {
  PATTERN_COPY, PATTERN_ACTIONS, PATTERN_NOTES, BAND_COLORS, FREQUENCY_LABELS,
  SNAPSHOT_ROWS, OPENING_CHIPS, CONFLICT_RESULTS_COPY, NO_ACTION_NEEDED,
  WROTE_ROWS,
  interpConflict,
} from './_conflict-results-prose.js';
import { CONFLICT_QUESTIONS } from './_conflict-questions.js';
import { userForRequest } from './_lib/verify-token.js';
import { phases, withTiming } from './_lib/server-timing.js';

/**
 * Put the real names into every string in the content tree.
 *
 * The copy carries {partner}, {a} and {b}. Done here rather than in the app,
 * for the same reason the copy itself is here: a surface that interpolates is a
 * surface that can forget to, and an app shipping "When {partner} raises
 * something" to a couple is the kind of thing nobody catches until a customer
 * does.
 *
 * Walks the whole tree rather than naming fields, because the copy module gains
 * fields and a hand-listed set of paths goes stale silently.
 */
function interpDeep(value, names) {
  if (typeof value === 'string') return interpConflict(value, names);
  if (Array.isArray(value)) return value.map(v => interpDeep(v, names));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, interpDeep(v, names)]));
  }
  return value;
}

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
/**
 * ── IT SAYS HOW LONG IT TOOK TOO ──────────────────────────────────────────
 * This is one of the three endpoints the app calls the moment it opens, and
 * the open question is whether each of them separately pays the two seconds
 * that /api/home's first database read sometimes costs, or whether they share
 * it. One costs seconds to fix and the other costs nothing, so it is worth
 * knowing before building either. See api/_lib/server-timing.js.
 */
const json = (b, s = 200, timing = null) => new Response(JSON.stringify(b), {
  status: s,
  headers: withTiming(HEADERS, timing),
});


export default async function handler(req) {
  /* See api/_lib/server-timing.js, and the note above `json`. */
  const t = phases();
  if (req.method !== 'GET') return json({ ok: false, error: 'GET only' }, 405);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey;
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'Server not configured' }, 500);

  const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ ok: false, error: 'missing auth token' }, 401);

  try {
    /**
     * ── WHO THIS IS, WITHOUT A ROUND TRIP ─────────────────────────────
     * Identity comes from the verified token, never from the request body.
     *
     * This was a fetch to Supabase asking who the token belonged to,
     * before any work started, on every request. Ellie: "My pages are
     * still taking a long time to load." Measured at 6.3s for this
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
    // The ownership rule's own list, rather than the two columns this used to
    // name. A grant that reached the account through an order lands in
    // profiles.entitlements, which was not selected, so a couple who bought
    // Conflict Patterns at checkout were told they do not own it.
    const cols = ['id', 'name', 'partner_name', 'partner_profile_id', 'conflict_data', ...OWNERSHIP_COLUMNS].join(',');

    /**
     * ── BOTH ROWS IN ONE READ ───────────────────────────────────────────
     * Ellie: "Keep trying to speed things up."
     *
     * This read this person's row and then their partner's, one after the
     * other, and a single read of this table measures between 200ms and
     * 1500ms on the live site. api/partner-sync.js writes
     * `partner_profile_id` on BOTH rows, so the partner is "whoever points
     * back at me" and the pair comes back together. The same change as
     * api/home.js, for the same reason.
     */
    const meRes = await t.mark('profile', () => fetch(
      `${supabaseUrl}/rest/v1/profiles`
      + `?or=${encodeURIComponent(`(id.eq.${user.id},partner_profile_id.eq.${user.id})`)}`
      + `&select=${cols}`, { headers: svc }));
    const rows = (await meRes.json().catch(() => [])) || [];
    /* By id, not by position: the pair comes back in whatever order the table
       felt like, and taking the first row would hand somebody their partner's
       results. */
    const me = rows.find((r) => r.id === user.id) || null;
    if (!me) return json({ ok: false, error: 'profile not found' }, 404);

    // Premium bundles Conflict Patterns; otherwise it is an explicit add-on.
    const { ownsConflict: owns } = capabilitiesFor(me);
    if (!owns) return json({ ok: true, ready: false, reason: 'not_owned' });

    let partner = null;
    if (me.partner_profile_id) {
      partner = rows.find((r) => r.id === me.partner_profile_id) || null;
      if (!partner) {
        /* A link written only one way, which should not exist. Kept so it
           costs a round trip rather than silently losing the partner, and
           named so it is visible in the timing if it ever happens. */
        const pRes = await t.mark('partner-fallback', () => fetch(
          `${supabaseUrl}/rest/v1/profiles?id=eq.${me.partner_profile_id}&select=${cols}`, { headers: svc }));
        partner = (await pRes.json().catch(() => []))?.[0] || null;
      }
    }

    // conflict_data is record-shaped: { answers, completedAt }. Opening the
    // exercise creates answers, so answers alone does not mean finished.
    const mineDone = !!me.conflict_data?.completedAt;
    const theirsDone = !!partner?.conflict_data?.completedAt;

    if (!mineDone) return json({ ok: true, ready: false, reason: 'you_have_not_finished' });

    const mine = summarizeConflict(me.conflict_data?.answers);
    if (!mine) return json({ ok: true, ready: false, reason: 'you_have_not_finished' });

    const theirs = theirsDone ? summarizeConflict(partner?.conflict_data?.answers) : null;

    return json({
      ok: true,
      ready: true,
      names: { you: me.name || 'You', partner: me.partner_name || partner?.name || 'Your partner' },
      // Yours in full. This is the only place patterns appear in this payload.
      you: mine,
      // Theirs, minus everything about their patterns. See partnerView.
      partner: partnerView(theirs, me.partner_name || partner?.name),
      partnerFinished: !!theirs,
      // The words, sent with the numbers so the app writes none of its own,
      // and with the names already in them so it cannot forget to.
      content: interpDeep({
        patternCopy: PATTERN_COPY,
        patternActions: PATTERN_ACTIONS,
        patternNotes: PATTERN_NOTES,
        bandColors: BAND_COLORS,
        frequencyLabels: FREQUENCY_LABELS,
        /**
         * The five answers to c0, in order, which is the one shared measure
         * this exercise produces: how each of you describes the way you handle
         * disagreements.
         *
         * Derived from the question rather than written out. src/App.jsx had
         * them as a C0_LABELS array typed inline next to the chart, which is
         * why the app's Conflict at a glance had no chart: the words were in a
         * file the app cannot read, so there was nothing to label the bars
         * with.
         */
        overallLabels: CONFLICT_QUESTIONS
          .find((q) => q.id === 'c0')?.options.map((o) => o.label) || [],
        /** The two rows on What You Each Wrote, with the website's headings. */
        wroteRows: WROTE_ROWS,
        /**
         * The c8 question, verbatim, to label each person's `strength`.
         *
         * c8 is a picked option: "The thing you do that most often helps you
         * reset mid-conflict". Both partners agreed to share it, it is in the
         * partner allowlist, and neither surface has ever shown it. Ellie
         * asked for it to be displayed, and Your Conflict Snapshot's Repair
         * block is the place it belongs: that block is what helps each of you
         * reset, and this is the half about what you each DO, next to the
         * ranking of what you each want done for you.
         *
         * The question's own text is the label. Writing a heading here would
         * be writing customer copy, which is Ellie's.
         */
        resetQuestion: CONFLICT_QUESTIONS.find((q) => q.id === 'c8')?.text || '',
        snapshotRows: SNAPSHOT_ROWS,
        openingChips: OPENING_CHIPS,
        noActionNeeded: NO_ACTION_NEEDED,
        copy: CONFLICT_RESULTS_COPY,
      }, { partner: me.partner_name || partner?.name, a: me.name, b: me.partner_name || partner?.name }),
    }, 200, t.header());
  } catch (e) {
    console.error('[conflict-results] failed:', e);
    return json({ ok: false, error: 'conflict results unavailable' }, 500);
  }
}
