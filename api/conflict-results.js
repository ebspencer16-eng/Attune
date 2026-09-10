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

export const config = { runtime: 'edge' };

import { summarizeConflict } from './_lib/conflict-results.js';
import { partnerView } from './_lib/conflict-partner-view.js';
import { capabilitiesFor } from './_lib/ownership.js';
import {
  PATTERN_COPY, PATTERN_ACTIONS, PATTERN_NOTES, BAND_COLORS, FREQUENCY_LABELS,
  SNAPSHOT_ROWS, SNAPSHOT_PROSE, OPENING_CHIPS, CONFLICT_RESULTS_COPY, NO_ACTION_NEEDED,
  WROTE_ROWS,
  interpConflict,
} from './_conflict-results-prose.js';
import { CONFLICT_QUESTIONS } from './_conflict-questions.js';

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
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: HEADERS });


export default async function handler(req) {
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
    const uRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    if (!uRes.ok) return json({ ok: false, error: 'invalid auth token' }, 401);
    const user = await uRes.json().catch(() => null);
    if (!user?.id) return json({ ok: false, error: 'invalid auth token' }, 401);

    const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const cols = 'id,name,partner_name,partner_profile_id,pkg,addon_conflict,conflict_data';

    const meRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=${cols}`, { headers: svc });
    const me = (await meRes.json().catch(() => []))?.[0];
    if (!me) return json({ ok: false, error: 'profile not found' }, 404);

    // Premium bundles Conflict Patterns; otherwise it is an explicit add-on.
    const { ownsConflict: owns } = capabilitiesFor(me);
    if (!owns) return json({ ok: true, ready: false, reason: 'not_owned' });

    let partner = null;
    if (me.partner_profile_id) {
      const pRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${me.partner_profile_id}&select=${cols}`, { headers: svc });
      partner = (await pRes.json().catch(() => []))?.[0] || null;
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
        snapshotRows: SNAPSHOT_ROWS,
        snapshotProse: SNAPSHOT_PROSE,
        openingChips: OPENING_CHIPS,
        noActionNeeded: NO_ACTION_NEEDED,
        copy: CONFLICT_RESULTS_COPY,
      }, { partner: me.partner_name || partner?.name, a: me.name, b: me.partner_name || partner?.name }),
    });
  } catch (e) {
    console.error('[conflict-results] failed:', e);
    return json({ ok: false, error: 'conflict results unavailable' }, 500);
  }
}
