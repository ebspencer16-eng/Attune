/**
 * The four archetype answer sets the demo results are built from.
 *
 * ── WHY THEY MOVED OUT OF src/App.jsx ─────────────────────────────────────
 * O480 asks for a check that runs the website's composition and the server's
 * over one couple and diffs the result. The blocker was said to be that the
 * website's demo answers lived inside App(), and moving Sarah and James into
 * api/_lib/demo-couple.js was said to remove it.
 *
 * It did not, and the reason is worth writing down because it cost a wrong
 * measurement. On the demo path the website does not type Sarah and James at
 * all. It builds both partners out of these four archetypes, picked by the
 * `type` parameter and defaulting to WY, and Sarah and James supply the names
 * and the other exercises. So a comparison against a server payload computed
 * from Sarah's and James's answers is a comparison of two different couples:
 * it reported 25 of 29 sentences missing from the website, which was true and
 * meant nothing.
 *
 * Whatever the check drives the website with, it has to score the same inputs.
 * That is only possible if both sides can read these, so here they are.
 *
 * ── WHAT THEY ARE ─────────────────────────────────────────────────────────
 * Not a person's answers. Each archetype answers every question at one end of
 * its axis, so W is engage plus open at full strength, and the four of them
 * span the type space. That is what makes them useful for exercising all ten
 * pairings and what makes them unlike any real couple.
 *
 * Keyed to the current DIM_KEYS question ids. A question renamed there and not
 * here silently stops contributing to the demo's scores, which is the failure
 * this file's neighbours are all about; check-scoring-mirror holds the lists
 * themselves.
 */

const _ENGAGE = { cf1: 1, cf2: 1, cf3: 1, st1: 5, rp2: 1, rp3: 1, rp6: 1, en4: 5, en6: 5, ls1: 5, ls3: 5 };
const _WITHDRAW = { cf1: 5, cf2: 5, cf3: 5, st1: 1, rp2: 5, rp3: 5, rp6: 5, en4: 1, en6: 1, ls1: 1, ls3: 1 };
const _OPEN = { ex6: 5, ex7: 5, ex8: 5, rs1: 1, rs3: 1, fb5: 5, fb2: 5, nd1: 1, nd5: 1, bd1: 5, bd3: 5, bd4: 5, lv1: 1, lv2: 1 };
const _GUARDED = { ex6: 1, ex7: 1, ex8: 1, rs1: 5, rs3: 5, fb5: 1, fb2: 1, nd1: 5, nd5: 5, bd1: 1, bd3: 1, bd4: 1, lv1: 5, lv2: 5 };

export const ARCHETYPE_EX1 = {
  W: { ..._ENGAGE, ..._OPEN }, // Initiator: engage + open
  X: { ..._ENGAGE, ..._GUARDED }, // Anchor:    engage + guarded
  Y: { ..._WITHDRAW, ..._OPEN }, // Feeler:    withdraw + open
  Z: { ..._WITHDRAW, ..._GUARDED }, // Protector: withdraw + guarded
};

/**
 * Give an archetype a partner-view of the other one.
 *
 * The real Exercise 1 asks every question twice, once about yourself and once
 * about your partner, and the scoring blends the two. A demo built from bare
 * archetypes would exercise only half of that, so each person's read of the
 * other is modelled as a muted version of the other's real answers, compressed
 * toward the centre. Stored as pv_<qid>, which is the shape the real exercise
 * writes.
 *
 * The 0.6 is the muting. It is not tuned against anything; it exists so the
 * blend does something visible rather than reproducing the self-report.
 */
export function demoWithPartnerView(selfArch, otherArch) {
  if (!selfArch || !otherArch) return selfArch;
  const out = { ...selfArch };
  for (const [qid, val] of Object.entries(otherArch)) {
    if (val != null && !Number.isNaN(Number(val))) out[`pv_${qid}`] = 3 + (Number(val) - 3) * 0.6;
  }
  return out;
}

/**
 * The type a demo link asks for, normalised the way the website normalises it.
 *
 * Two letters from WXYZ, in the canonical order, defaulting to WY. Both halves
 * matter to a caller driving the site: `?type=ZW` and `?type=WZ` are the same
 * couple, and a link with nothing usable in it is WY rather than an error.
 */
export const DEMO_TYPE_ORDER = 'WXYZ';
export const DEMO_TYPE_DEFAULT = 'WY';

/**
 * The ten pairings, which is every unordered pair of the four archetypes.
 * Derived rather than listed: the hand-written version of this in src/App.jsx
 * is the kind of list that goes stale the moment a fifth type appears.
 */
export const DEMO_COUPLE_TYPES = [...DEMO_TYPE_ORDER].flatMap(
  (a, i) => [...DEMO_TYPE_ORDER].slice(i).map((b) => a + b),
);

export function normaliseDemoType(raw) {
  const clean = String(raw || '').toUpperCase().replace(/[^WXYZ]/g, '');
  if (clean.length !== 2) return DEMO_TYPE_DEFAULT;
  const sorted = [...clean].sort((a, b) => DEMO_TYPE_ORDER.indexOf(a) - DEMO_TYPE_ORDER.indexOf(b)).join('');
  /* A pairing the prose was never written for falls back rather than rendering
     a page with no couple type on it. */
  return DEMO_COUPLE_TYPES.includes(sorted) ? sorted : DEMO_TYPE_DEFAULT;
}

/** The pair of answer sets the website builds for a demo of this type. */
export function demoCoupleFor(type) {
  const t = normaliseDemoType(type);
  const mine = ARCHETYPE_EX1[t[0]];
  const theirs = ARCHETYPE_EX1[t[1]];
  return {
    type: t,
    mine: demoWithPartnerView(mine, theirs),
    theirs: demoWithPartnerView(theirs, mine),
  };
}
