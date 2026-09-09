/**
 * GET /api/results
 *
 * The couple's derived results, computed on the server from the answers of
 * record. Authenticated with the caller's Supabase access token.
 *
 * WHY: the native app must not reimplement scoring. If the ten dimensions, the
 * axis weights, the visibility blend and the flipped questions exist in both
 * JavaScript and Swift, they drift, and the drift is invisible until someone
 * notices two products disagreeing about a couple's type. The app asks this
 * endpoint what the results are and renders the answer.
 *
 * It is also the fix for the pattern that has caused most of this month's
 * bugs: the client treating its own cache as the source of truth. This reads
 * profiles, not localStorage.
 *
 * Returns:
 *   200 { ok, ready: true,  results }     both partners have finished
 *   200 { ok, ready: false, reason, self } waiting on someone
 *   401 not signed in or a bad token
 */

export const config = { runtime: 'edge' };

import { sectionsWithLabels, resultsNav } from './_lib/results-sections.js';
import { expectationsSummary } from './_lib/expectations.js';
import { intimacyResults } from './_lib/intimacy-results.js';
import { reflectionResults } from './_lib/reflection-results.js';
import { whatComesNext } from './_lib/what-comes-next.js';
import { EXERCISES, EXERCISE_COLUMNS, isExerciseDone } from './_exercises.js';
import { capabilitiesFor, OWNERSHIP_COLUMNS } from './_lib/ownership.js';
import { DIM_META } from './_workbook-content.js';
import { DIM_KEYS, AXIS_CONFIG } from './_type-engine.js';
import { ALIGNMENT_THRESHOLD } from './_lib/results.js';
import { alignedAdvice, getDimShift } from './_lib/dimension-copy.js';
import { COUPLE_TYPES } from './_couple-types.js';
import { DOMAIN_OF, DOMAIN_LABEL } from './_lib/tags.js';
import { personResults } from './_lib/results.js';
import { getOrComputeResults, orderPair } from './_lib/results-store.js';

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

/**
 * Attach customer-facing dimension names to a results payload.
 *
 * Non-destructive and tolerant of a payload that predates rankedGaps entirely,
 * because these rows were written by older versions of this engine and a read
 * path that assumes the current shape will throw on the oldest couples.
 */
function withLabels(results) {
  if (!results || !Array.isArray(results.rankedGaps)) return results;
  return {
    ...results,
    rankedGaps: results.rankedGaps.map(g => ({
      ...g,
      label: g.label || DIM_META[g.dim]?.label || g.dim,
    })),
  };
}

/**
 * Everything needed to render results, that the stored payload does not carry.
 *
 * Stored results hold scores. They deliberately do not hold the words, because
 * the words are content and freezing them means a typo fixed today never
 * reaches a couple who finished yesterday. So the display layer is attached on
 * the way out, the same way labels are.
 *
 * `content` is additive. Nothing that already existed in the payload changes
 * shape, so the website keeps reading exactly what it read before.
 */
function withContent(results, viewer) {
  if (!results) return results;

  const a = results.partners?.a;
  const b = results.partners?.b;

  // The couple type, with its name and prose. {U} and {P} are left in place:
  // two people read the same results and each is {U} in their own view, so the
  // substitution belongs to whoever is rendering.
  const type = COUPLE_TYPES.find(t => t.id === results.coupleType) || null;

  // Per-dimension display: what it is called, what each end of it means, and
  // where both partners landed. Built from the live dimension list so a new
  // dimension appears here without anyone remembering to add it.
  const dimensions = Object.keys(DIM_KEYS).map((dim) => {
    const meta = DIM_META[dim] || {};
    const axis = AXIS_CONFIG[dim] || {};
    return {
      key: dim,
      label: meta.label || dim,
      left: meta.left || null,
      right: meta.right || null,
      color: meta.color ? `#${String(meta.color).replace(/^#/, '')}` : null,
      axis: axis.axis || null,
      weight: axis.weight ?? null,
      // Which Communication screen this dimension belongs on.
      domain: DOMAIN_OF[dim] || null,
      domainLabel: DOMAIN_LABEL[DOMAIN_OF[dim]] || null,
      // Self-report, not the blended score.
      //
      // blendedDimScores mixes a person's answers with their partner's view of
      // them. That is right for deriving the couple type and wrong for showing
      // someone where they placed themselves: the mark under your own name
      // would move because of what your partner said about you. src/App.jsx is
      // explicit about the split, and the app was plotting the wrong one, so
      // the same person sat at a different point in the app than on the site.
      a: a?.dimensions?.[dim]?.self ?? null,
      b: b?.dimensions?.[dim]?.self ?? null,
      // Kept alongside for anything that legitimately needs the typing input.
      // Not what the scales draw.
      aBlended: a?.dimensions?.[dim]?.blended ?? null,
      bBlended: b?.dimensions?.[dim]?.blended ?? null,
      gap: results.gaps?.[dim] ?? null,
    };
  });

  /**
   * The words each dimension gets, the same ones the website shows.
   *
   * `aligned` when the two landed close together, `shift` when they did not.
   * Only ever one of the two, chosen by the threshold rather than by whoever
   * is rendering, so both surfaces make the same call.
   *
   * Names are substituted here because getDimShift writes the sentence around
   * whichever of the two sits lower on the scale. Which of them is the reader
   * does not change the sentence.
   */
  const nameA = a?.name || 'Your partner';
  const nameB = b?.name || 'Your partner';
  for (const d of dimensions) {
    if (d.a == null || d.b == null) continue;
    const wide = d.gap != null && d.gap >= ALIGNMENT_THRESHOLD.gap;
    d.aligned = wide ? null : alignedAdvice(d.key, d.a, d.b, null);
    d.shift = wide ? getDimShift(d.key, d.a, d.b, nameA, nameB, null) : null;
  }

  return {
    ...results,
    content: {
      /**
       * Which side of `partners` is the person asking.
       *
       * Stored results are keyed by the two user ids in sorted order, and the
       * answers travel with their owner through that sort. So `partners.a` is
       * whichever id sorts lower, not whoever is reading. For one partner in
       * every couple, a and b are the other way round from what they expect.
       *
       * Without this a client has no way to tell, and the obvious assumption,
       * that a is you, is wrong half the time: names swapped, and both marks on
       * every scale on the wrong side.
       */
      viewer,
      /**
       * When a gap counts as wide, from ALIGNMENT_THRESHOLD in _lib/results.js.
       * Sent so no surface has to keep its own copy of the number that decides
       * what a couple is told about their own results.
       */
      alignmentThreshold: ALIGNMENT_THRESHOLD,
      coupleType: type ? {
        id: type.id,
        name: type.name,
        tagline: type.tagline,
        description: type.description,
        nuance: type.nuance,
        color: type.color,
        shade: type.shade,
      } : null,
      dimensions,
      names: { a: a?.name || null, b: b?.name || null },
    },
  };
}

export default async function handler(req) {
  if (req.method !== 'GET') return json({ ok: false, error: 'GET only' }, 405);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey;
  if (!supabaseUrl || !serviceKey) {
    console.error('[results] missing env');
    return json({ ok: false, error: 'Server not configured' }, 500);
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) return json({ ok: false, error: 'missing auth token' }, 401);

  try {
    // Identity comes from the verified token, never from the request body.
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) return json({ ok: false, error: 'invalid auth token' }, 401);
    const user = await userRes.json().catch(() => null);
    if (!user?.id) return json({ ok: false, error: 'invalid auth token' }, 401);

    const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    // Enough to answer which sections exist, not just what the scales say.
    // The app was deciding that for itself and reached six of twenty-nine.
    const cols = [
      'id', 'name', 'partner_profile_id',
      // From the registry. Naming answer columns by hand is how a new exercise
      // ends up read as never started: it is simply not in the select.
      ...EXERCISE_COLUMNS, 'ex3_completed',
      ...OWNERSHIP_COLUMNS,
    ].join(',');
    const meRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=${cols}`, { headers: svc });
    const me = (await meRes.json().catch(() => []))?.[0];
    if (!me) return json({ ok: false, error: 'profile not found' }, 404);

    const mine = me.ex1_answers && Object.keys(me.ex1_answers).length ? me.ex1_answers : null;

    // No partner linked yet: report self-report scoring rather than nothing, so
    // the app can show an interim read while waiting.
    if (!me.partner_profile_id) {
      return json({
        ok: true, ready: false, reason: 'no_partner_linked',
        self: mine ? personResults(mine, null) : null,
      });
    }

    const partRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${me.partner_profile_id}&select=${cols}`, { headers: svc });
    const partner = (await partRes.json().catch(() => []))?.[0];
    const theirs = partner?.ex1_answers && Object.keys(partner.ex1_answers).length ? partner.ex1_answers : null;

    if (!mine || !theirs) {
      return json({
        ok: true, ready: false,
        reason: !mine && !theirs ? 'neither_complete' : (!mine ? 'you_incomplete' : 'partner_incomplete'),
        // Whoever has answered still gets their own read.
        self: mine ? personResults(mine, null) : null,
        partnerName: partner?.name || null,
      });
    }

    // Results are frozen. A stored row is served back whatever engine version
    // it was computed under, so changing the weights, the questions or the
    // prose never changes what an existing couple sees. Only a retake
    // recomputes, and the previous row is archived first so notes written
    // against it still resolve.
    const table = `${supabaseUrl}/rest/v1/couple_results`;
    const db = {
      read: async (a, b) => {
        const r = await fetch(`${table}?partner_a=eq.${a}&partner_b=eq.${b}&select=*`, { headers: svc });
        if (!r.ok) return null;
        return (await r.json().catch(() => []))?.[0] || null;
      },
      archive: async (row) => {
        await fetch(`${supabaseUrl}/rest/v1/couple_results_history`, {
          method: 'POST',
          headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({
            partner_a: row.partner_a, partner_b: row.partner_b,
            version: row.version, couple_type: row.couple_type,
            results: row.results, answers_hash: row.answers_hash,
            content_version: row.content_version ?? null,
            frozen_at: row.frozen_at || row.computed_at || new Date().toISOString(),
          }),
        });
      },
      write: async (row) => {
        const r = await fetch(`${table}?on_conflict=partner_a,partner_b`, {
          method: 'POST',
          headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(row),
        });
        if (!r.ok) throw new Error(`upsert ${r.status}`);
      },
    };

    const { results, cached, reason, frozenAt, computedUnderVersion, contentVersion, stale } = await getOrComputeResults({
      db,
      aId: me.id, bId: partner.id,
      aAnswers: mine, bAnswers: theirs,
      aName: me.name || null, bName: partner.name || null,
    });
    if (!results) return json({ ok: true, ready: false, reason: 'neither_complete' });

    // What this couple owns, and which exercises both of them have finished.
    // Ownership sits on the buyer's profile and is inherited by the partner,
    // so it is read from whichever of the two has it rather than from the
    // person asking: an invited partner owns exactly what was bought for them.
    const ownership = capabilitiesFor(
      capabilitiesFor(me).owned.length ? me : (partner || me));
    // An unknown key is a mistake, not a "no".
    //
    // This returned false for anything it did not recognise, and 'reflection'
    // is the customer-facing name while 'ex3' is the registry key. Asking for
    // the wrong one made a whole section permanently empty with nothing
    // anywhere reporting why. Loud is the only safe behaviour here.
    const bothDone = (key) => {
      const ex = EXERCISES.find((e) => e.key === key);
      if (!ex) {
        console.error(`[results] no exercise named "${key}". Keys are: ${EXERCISES.map((e) => e.key).join(', ')}`);
        return false;
      }
      return isExerciseDone(ex, me[ex.column]) && isExerciseDone(ex, partner?.[ex.column]);
    };

    const expectations = (me.ex2_answers && partner?.ex2_answers)
      ? expectationsSummary({
          mine: me.ex2_answers,
          theirs: partner.ex2_answers,
          youName: me.name || 'You',
          themName: partner.name || 'Your partner',
        })
      : null;

    const intimacy = (ownership.ownsIntimacy && bothDone('intimacy'))
      ? intimacyResults({ mine: me.intimacy_data, theirs: partner?.intimacy_data })
      : null;

    const reflection = (ownership.ownsReflection && bothDone('ex3'))
      ? reflectionResults({
          mine: me.ex3_answers,
          theirs: partner?.ex3_answers,
          youName: me.name || 'You',
          themName: partner?.name || 'Your partner',
        })
      : null;

    return json({
      ok: true, ready: true, cached, recomputed: reason,
      // Labels are applied on the way out, not baked into the stored blob.
      //
      // Results are frozen: once a couple's row exists it is served back as it
      // was written, which is the whole point of freezing them. So adding a
      // display label at compute time reaches new couples only, and every
      // existing couple keeps reading raw dimension keys forever.
      //
      // Scores are frozen. Names for things are not, and should follow the
      // current copy rather than whatever was current the day the couple
      // finished.
      // Which half of the stored payload belongs to the person asking. Derived
      // with the same orderPair the store uses, rather than re-deriving the
      // comparison here and risking the two disagreeing.
      results: withContent(withLabels(results), orderPair(me.id, partner.id).swapped ? 'b' : 'a'),
      owned: ownership.owned,
      // frozenAt is when these results were fixed. computedUnderVersion is the
      // engine that produced them, which may be older than the current one:
      // that is the point, not a problem.
      frozenAt: frozenAt || null,
      computedUnderVersion: computedUnderVersion ?? null,
      // Which copy to render this couple's results from. The client must honour
      // this rather than using whatever the current copy library says.
      contentVersion: contentVersion ?? null,
      olderEngine: !!stale,
      /**
       * Which sections this couple's results contain, in order, with names.
       *
       * The app used to work this out and arrived at six, with labels it had
       * written itself. The website showed twenty-nine. Same couple, same
       * purchase, two different products.
       *
       * The three conditions match the website exactly, including that they
       * are not the same shape as each other. Reflection and Conflict appear
       * on ownership alone; Physical Intimacy waits for both partners,
       * because its sections compare two sets of answers and have nothing to
       * show with one.
       */
      /**
       * The Expectations comparison, Physical Intimacy and Reflection.
       *
       * Computed above rather than inline, so What Comes Next can be assembled
       * from the finished payloads instead of deriving all three a second
       * time. A closing page that re-derives what the sections already said is
       * a closing page that can disagree with them.
       */
      expectations,
      intimacy,
      reflection,

      /**
       * What Comes Next: everything the results ask this couple to do.
       *
       * Assembled from the payloads above and the couple type's own tips.
       * Nothing new is asserted here, because a closing page that introduces a
       * fresh claim is a claim nothing else in the results supports.
       */
      whatComesNext: whatComesNext({
        coupleTypeId: results.coupleType,
        expectations,
        intimacy,
        reflection,
        conflictReady: ownership.ownsConflict,
        names: { you: me.name || 'You', them: partner?.name || 'your partner' },
      }),
      /**
       * The navigation, as two levels, exactly as the website's sidebar.
       *
       * A group with no children is a page. A group with children is a section
       * whose first child is its overview. The app renders this rather than
       * grouping the flat list itself, because a grouping invented in the app
       * is a second opinion about what the product is.
       */
      nav: resultsNav({
        hasReflection: ownership.ownsReflection,
        intimacyReady: ownership.ownsIntimacy && bothDone('intimacy'),
        conflictListed: ownership.ownsConflict,
      }),
      sections: sectionsWithLabels({
        hasReflection: ownership.ownsReflection,
        intimacyReady: ownership.ownsIntimacy && bothDone('intimacy'),
        conflictListed: ownership.ownsConflict,
      }),
    });
  } catch (e) {
    console.error('[results] failed:', e);
    return json({ ok: false, error: 'results unavailable' }, 500);
  }
}
