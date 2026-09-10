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
 *   200 { ok, ready: false, reason, waitingOn, self } waiting on someone
 *   401 not signed in or a bad token
 */

export const config = { runtime: 'edge' };

import { sectionsWithLabels, resultsNav } from './_lib/results-sections.js';
import { expectationsSummary } from './_lib/expectations.js';
import { INDIVIDUAL_TYPE_DISPLAY, MAP_QUADRANTS } from './_individual-types.js';
import { AXES, MAP_CAPTION } from './_axes.js';
import { coupleTypeProse } from './_lib/near-axis.js';
import { individualBlurb, axisRows } from './_lib/individual-profile.js';
import { mapCoords } from './_lib/results.js';
import { resolveRoleTokens } from './_lib/role-tokens.js';
import { intimacyResults } from './_lib/intimacy-results.js';
import { reflectionResults } from './_lib/reflection-results.js';
import { whatComesNext } from './_lib/what-comes-next.js';
import { highlightCards } from './_lib/highlight-cards.js';
import { commDomains } from './_lib/comm-domains.js';
import { sideBySide } from './_lib/side-by-side.js';
import { STORYCARD_STYLE } from './_lib/storycard-style.js';
import { personalityFeedback, commsProtocols, commsActionPlan } from './_lib/comms-plan.js';
import { deriveAnniversaryInsights, reflectionActionTitle } from './_lib/reflection-insights.js';
import { EXERCISES, EXERCISE_COLUMNS, isExerciseDone } from './_exercises.js';
import { capabilitiesFor, OWNERSHIP_COLUMNS } from './_lib/ownership.js';
import { resultsGate, doneFromProfile } from './_lib/results-gate.js';
import { DIM_META } from './_workbook-content.js';
import { DIM_KEYS, AXIS_CONFIG } from './_type-engine.js';
import { ALIGNMENT_THRESHOLD } from './_lib/results.js';
import { alignedAdvice, getDimShift } from './_lib/dimension-copy.js';
import { contentFor } from './_content/index.js';
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
function withContent(results, viewer, contentVersion, pronouns = {}) {
  if (!results) return results;

  // ── ROLE TOKENS, RESOLVED ON THE WAY OUT ─────────────────────────────────
  // Couple-type prose is written with {EXP}/{GRD} on the open axis and
  // {RCH}/{WDR} on the engage axis, plus _sub/_obj/_pos/_isC pronoun forms.
  // The website resolves them in resolveRoleTokens; the app cannot, because
  // deciding which partner is the expressive one means comparing their scores,
  // and the app does not score.
  //
  // They only resolve when the two partners actually differ on that axis. When
  // they do not, the role is genuinely ambiguous and the token is replaced with
  // a generic phrase rather than a name, which is what the website does.
  //
  // Whatever happens, no brace token survives this function. That guard is the
  // point: forwarding strengths and stickingPoints without it put "{EXP} can
  // feel like {EXP_isC} always the one initiating depth" on screen.

  // ── MAP POSITIONS, ADDED ON THE WAY OUT ──────────────────────────────────
  // Derived here rather than stored with the results, because results are
  // frozen: a couple whose row was written before the map existed is served
  // that row for ever. A new field added to the compute path would only ever
  // have reached couples who had not finished yet, which is to say almost
  // nobody. See mapCoords in _lib/results.js.
  results = {
    ...results,
    partners: {
      a: results.partners?.a ? { ...results.partners.a, coords: mapCoords(results.partners.a.axes) } : null,
      b: results.partners?.b ? { ...results.partners.b, coords: mapCoords(results.partners.b.axes) } : null,
    },
  };

  const a = results.partners?.a;
  const b = results.partners?.b;

  // The couple type, with its name and prose. {U} and {P} are left in place:
  // two people read the same results and each is {U} in their own view, so the
  // substitution belongs to whoever is rendering.
  const type = COUPLE_TYPES.find(t => t.id === results.coupleType) || null;

  // The two prose lists this couple actually gets, with the near-axis
  // overrides already chosen from their two axis scores.
  const nearAxis = coupleTypeProse(type, a?.axes, b?.axes);

  /** Role tokens, resolved against these two people. See the note above. */
  // Pronouns live on the profile, not in the stored results, so they are
  // handed in. Without them every {EXP_isC} would come out as "they're" for a
  // couple who use she and he.
  const role = (text) => resolveRoleTokens(
    text,
    a ? { ...a, pronouns: pronouns.a } : a,
    b ? { ...b, pronouns: pronouns.b } : b,
  );

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

  /**
   * The copy this couple's results were stamped with, not whatever is current.
   *
   * This passed null, which contentFor reads as "use the newest version". That
   * is exactly what the version stamp exists to prevent: a couple who finished
   * under v1 must keep reading v1 until someone deliberately republishes them,
   * or a note written against a sentence points at a sentence that changed.
   *
   * Invisible today because only v1 exists. It would have become a silent
   * disagreement between the app and the website the day v2 shipped, with the
   * website right and the app wrong.
   */
  const copy = contentFor(contentVersion ?? null);
  for (const d of dimensions) {
    if (d.a == null || d.b == null) continue;
    const wide = d.gap != null && d.gap >= ALIGNMENT_THRESHOLD.gap;
    d.aligned = wide ? null : alignedAdvice(d.key, d.a, d.b, copy);
    d.shift = wide ? getDimShift(d.key, d.a, d.b, nameA, nameB, copy) : null;
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
        description: role(type.description),
        /**
         * What the couple-type page actually prints, with near-axis overrides
         * applied.
         *
         * Two things were wrong before this. The app rendered `description`
         * where the website's "What this looks like in your relationship" tile
         * renders `patterns`, which is a different field with different words,
         * so that tile said something else entirely on the two products. And
         * neither the app nor the endpoint applied the near-axis variants,
         * which the website has swapped in since they were written: a couple
         * with a partner on an axis line read the overstated default in the
         * app and the hedged version on the website.
         *
         * Both fixed here rather than in either renderer, so there is one
         * implementation. See api/_lib/near-axis.js.
         */
        patterns: nearAxis.patterns.map(role),
        nuance: role(type.nuance),
        color: type.color,
        shade: type.shade,
        // The website reads these three straight off api/_couple-types.js and
        // draws "What comes naturally", "What's worth being aware of" and
        // "Phrase to try" from them. They were not forwarded, so the app could
        // not show any of the three no matter how it was written: the data
        // never left the server.
        strengths: (type.strengths || []).map(role),
        stickingPoints: nearAxis.stickingPoints.map(role),
        // phraseTry was not forwarded, so the app could not draw the nested
        // quote tile the website's couple-type tips end with no matter how it
        // was written: the words never left the server.
        tips: (type.tips || []).map((t) => ({
          title: role(t.title), body: role(t.body),
          phraseTry: t.phraseTry ? role(t.phraseTry) : null,
        })),
      } : null,
      dimensions,
      names: { a: a?.name || null, b: b?.name || null },
      /**
       * The four quadrants of the couple map, with the names and colours the
       * website paints them. Sent so the app can draw the same map instead of
       * holding a second copy of a colour table.
       */
      mapQuadrants: MAP_QUADRANTS.map((code) => INDIVIDUAL_TYPE_DISPLAY[code]),
      /**
       * What the two axes mean. Without them the map is a picture: a reader
       * can see two dots in different corners and cannot tell what the corners
       * are. The website prints these under its map; the app could not,
       * because the copy was inline in src/App.jsx.
       */
      axes: AXES,
      /**
       * The small print under the map. Ellie's copy, from api/_axes.js.
       *
       * The website printed it inline and the app printed nothing, which is
       * the same shape as the axis copy before this: words that lived in a
       * React DOM file the app cannot import. Sent, so both surfaces say it.
       */
      mapCaption: MAP_CAPTION,
      /**
       * Each partner's own placement, in words. Derived here, not stored,
       * for the same reason coords are: results are frozen, so a field added
       * to the compute path reaches only couples who have not finished yet.
       *
       * The blurb and the band both come from api/_lib/individual-profile.js,
       * which the website also calls, so the two surfaces cannot word this
       * differently.
       */
      individualTypes: {
        a: individualProfile(a, a?.name, pronouns.a),
        b: individualProfile(b, b?.name, pronouns.b),
      },
    },
  };
}

/**
 * One partner's individual type panel: who they are on this map, and why.
 *
 * Returns null when the person has no placement yet, because half a panel
 * reads as one partner having been assessed and the other not.
 */
function individualProfile(person, name, pronouns) {
  const coords = person?.coords;
  if (!person || coords?.open == null || coords?.engage == null) return null;
  const display = INDIVIDUAL_TYPE_DISPLAY[person.typeCode];
  if (!display) return null;
  return {
    name: name || null,
    typeName: display.name,
    color: display.color,
    blurb: individualBlurb(name || 'They', pronouns, coords.engage, coords.open),
    rows: axisRows(name || 'They', coords),
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
      // Needed to resolve the {EXP_sub} style pronoun forms in couple-type
      // prose. Without it those tokens print raw.
      'pronouns',
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

    // Readiness is api/_lib/results-gate.js's decision, not this endpoint's.
    // This tested Communication and nothing else, so a couple who owned
    // Conflict Patterns and had not finished it were served a full results
    // payload. Every owned exercise counts now, for both partners.
    //
    // ex1 is in every package, so a ready gate guarantees mine and theirs are
    // both populated for the scoring below.
    const { caps } = capabilitiesFor(me);
    const gate = resultsGate({
      pkg: caps,
      mine: doneFromProfile(me),
      theirs: doneFromProfile(partner),
      partnerLinked: true,
    });
    if (!gate.ready) {
      return json({
        ok: true, ready: false,
        reason: gate.reason,
        // Which exercises, and whose. A waiting screen should be able to name
        // them rather than work out the list a second time.
        waitingOn: gate.waitingOn,
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
          // So each category page can open with the paragraph written for this
          // pairing, which is what the website prints.
          coupleTypeId: results?.coupleType || null,
        })
      : null;

    const intimacy = (ownership.ownsIntimacy && bothDone('intimacy'))
      ? intimacyResults({
          mine: me.intimacy_data,
          theirs: partner?.intimacy_data,
          // The wording each of them answered under. Taken from the stored
          // record rather than recomputed from the profile, so the rows read
          // back the questions they actually saw.
          variant: me.intimacy_data?.variant || partner?.intimacy_data?.variant || 'premarital',
        })
      : null;

    const reflection = (ownership.ownsReflection && bothDone('ex3'))
      ? reflectionResults({
          mine: me.ex3_answers,
          theirs: partner?.ex3_answers,
          youName: me.name || 'You',
          themName: partner?.name || 'Your partner',
        })
      : null;

    // The display payload, built once. The highlight cards read the same
    // dimensions the results screens do, so both are the reader's own side.
    const viewerSide = orderPair(me.id, partner.id).swapped ? 'b' : 'a';
    // Whose pronouns are whose: the stored pair is ordered by user id, not by
    // who is asking, so this follows the same swap the viewer side does.
    const swapped = orderPair(me.id, partner.id).swapped;
    const displayed = withContent(withLabels(results), viewerSide, contentVersion, {
      a: swapped ? partner.pronouns : me.pronouns,
      b: swapped ? me.pronouns : partner.pronouns,
    });

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
      results: displayed,
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
       * The Communication action plan, and the protocols behind it.
       *
       * DIM_ACTION_ITEMS and DOMAIN_ALIGNED were the last two copy sources the
       * app could not reach: the website's Communication overview ends with
       * three tiles and the app's ended with nothing.
       */
      /**
       * The three Communication domain pages: label, colour, the paragraph
       * each opens with, and the gradient the website paints it. All four were
       * inline in src/App.jsx, so the app had no intro prose and drew every
       * domain page on cream while the website tinted each to its domain.
       * See api/_lib/comm-domains.js.
       */
      commDomains: commDomains(),
      /**
       * Every Communication question with both answers and both cross-view
       * reads on it, for the dropdown the website ends each detail page with.
       * The app had nothing here: it received scores and never an answer.
       * See api/_lib/side-by-side.js.
       */
      commResponses: sideBySide(mine, theirs),
      commsPlan: (() => {
        const copy = contentFor(contentVersion ?? null);
        const feedback = personalityFeedback({
          dimensions: displayed.content?.dimensions || [],
          viewer: viewerSide,
          youName: me.name || 'You',
          themName: partner?.name || 'Your partner',
          copy,
        });
        return {
          tiles: commsActionPlan({ feedback, copy }),
          protocols: commsProtocols(
            Object.fromEntries(feedback.map((f) => [f.dim, f])),
            me.name || 'You', partner?.name || 'Your partner'),
        };
      })(),

      /**
       * The Reflection action plan.
       *
       * Titles come from REFLECTION_ACTION_TITLES, the third source. Insights
       * are derived rather than written: each carries the evidence it rests
       * on, and one that speaks for both people needs a piece from each.
       */
      reflectionPlan: (ownership.ownsReflection && bothDone('ex3') && me.ex3_answers && partner?.ex3_answers)
        ? deriveAnniversaryInsights(
            me.ex3_answers, partner.ex3_answers,
            me.name || 'You', partner?.name || 'Your partner',
            COUPLE_TYPES.find((t) => t.id === results.coupleType) || null,
          ).map((ins) => ({
            title: reflectionActionTitle(ins.title, contentFor(contentVersion ?? null)),
            body: ins.body || null,
            action: ins.action || null,
            tier: ins.tier || null,
          }))
        : null,

      /**
       * The highlight storycards, read in order before anything else.
       *
       * Words and numbers only. The website draws these as nine designed
       * cards; the app draws its own. What neither does is invent a summary of
       * its own, which is what the app was doing here.
       */
      /**
       * How the cards are presented: ratio, the opener's stripe, the wordmark
       * and the address, the grounds. Sent rather than written twice, because
       * writing them twice is exactly how the two surfaces stopped looking
       * like the same product. See api/_lib/storycard-style.js.
       */
      storycardStyle: STORYCARD_STYLE,
      highlights: highlightCards({
        dimensions: displayed.content?.dimensions || [],
        coupleTypeId: results.coupleType,
        names: { you: me.name || 'You', them: partner?.name || 'Your partner' },
        expectations,
        reflection,
        intimacy,
        ex2: { mine: me.ex2_answers, theirs: partner?.ex2_answers },
      }),

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
