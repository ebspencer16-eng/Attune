/**
 * How aligned two people's expectations are, as a percentage.
 *
 * ── WHY THIS FILE ─────────────────────────────────────────────────────────
 * This number is on the highlight card, the workbook snapshot and the
 * expectations pages, and it was computed in two places that said so out loud.
 * src/App.jsx carried a copy with the comment "Mirrored intentionally rather
 * than imported across the api/src boundary so the build stays simple. If
 * logic changes, update both copies."
 *
 * That comment is the bug report. A number a customer reads, derived twice,
 * with a note asking whoever changes one to remember the other.
 *
 * The scoring already lived on the server in _workbook-content.js. Only the
 * composition, which items make up which domain, was stuck in the website
 * bundle. It is here now and both surfaces call this.
 *
 * ── THE SHAPE OF THE SCORE ────────────────────────────────────────────────
 * Each item scores in [0,1] by how close the two answers are. A domain is the
 * mean of its items. The overall is the mean of the five domains, each
 * weighted equally regardless of how many items it holds, so Household with
 * seven items does not outweigh Emotional Labor with two.
 */

import { RESPONSIBILITY_CATEGORIES } from '../_questions.js';
import { scoreLifeQuestionPair, LIFE_QUESTION_OPTIONS, EXP_DOMAINS } from '../_workbook-content.js';
import { mirrorRespKey, mirrorLifeId } from './expectations.js';

/**
 * Score one responsibility pair, from each partner's own point of view.
 *
 * ── WHY NOT _workbook-content.js's scoreResponsibilityPair ────────────────
 * Because it gets the relative answers backwards, and this module used it for
 * a day.
 *
 * The career-set answers are stored relative to whoever gave them: "Primarily
 * mine" means the person answering. Two partners who both answer that way have
 * claimed the same job and disagree. scoreResponsibilityPair maps that string
 * to the same rank for both sides, so it scores the disagreement as a perfect
 * match, and scores a genuine agreement as a total mismatch.
 *
 *   both "Primarily mine"      correct 0.0    that scorer 1.0
 *   opposite answers           correct 1.0    that scorer 0.0
 *
 * This is the same mirror that api/_lib/expectations.js documents at length.
 * The website has always had it right; this is its implementation, moved out
 * of src/App.jsx rather than reinvented.
 *
 * _workbook-content.js is deliberately left alone. It is the workbook's
 * scorer, and changing it changes generated documents. See SECURITY.md.
 */
export function scoreResponsibilityPairSided(userValue, partnerValue, userName, partnerName) {
  // Normalise to an ABSOLUTE rank: 0 = the user, 1 = both, 2 = the partner.
  // isUser is what makes "mine" mean different people on the two sides.
  const rankFor = (v, isUser) => {
    if (v == null || v === '') return { r: null, o: null };
    if (v === 'Primarily mine') return { r: isUser ? 0 : 2, o: false };
    if (v === 'Balanced') return { r: 1, o: false };
    if (v === "Primarily my partner's") return { r: isUser ? 2 : 0, o: false };
    if (v === "Doesn't apply") return { r: null, o: true };
    if (v === userName) return { r: 0, o: false };
    if (v === 'Both of us') return { r: 1, o: false };
    if (v === partnerName) return { r: 2, o: false };
    if (v === "Doesn't apply to us") return { r: null, o: true };
    return { r: null, o: null };
  };
  const a = rankFor(userValue, true);
  const b = rankFor(partnerValue, false);
  if (a.r === null && a.o === null) return null;
  if (b.r === null && b.o === null) return null;
  if (a.o && b.o) return 1.0;
  if (a.o || b.o) return 0.0;
  return (2 - Math.abs(a.r - b.r)) / 2;
}

export { scoreLifeQuestionPair };

/**
 * Which items make up each domain.
 *
 * The domains are not the question categories: Money pulls two financial
 * items, one career item and three life questions. Written as positions into
 * the category's item list, which is how the website has always done it.
 */
const DOMAIN_ITEMS = {
  household: { resp: [['household', 0], ['household', 1], ['household', 2], ['household', 3], ['household', 4], ['household', 5], ['household', 6]], life: [] },
  emotional: { resp: [['emotional', 0], ['emotional', 1]], life: [] },
  extended_family: { resp: [['extended_family', 0], ['extended_family', 2], ['extended_family', 1], ['extended_family', 3]], life: [] },
  money: {
    resp: [['financial', 0], ['financial', 1], ['career', 1]],
    life: ['lq_finances', 'lq_money_lean', 'lq_money_risk'],
  },
  life: {
    resp: [],
    life: ['lq_children', 'lq_family_conf', 'lq_location', 'lq_social', 'lq_routine', 'lq_faith', 'lq_values'],
  },
};

/** Every item score in one domain, skipping anything either side left blank. */
function domainScores(domainKey, mine, theirs, youName, themName) {
  const spec = DOMAIN_ITEMS[domainKey];
  if (!spec) return [];
  const out = [];

  for (const [catId, index] of spec.resp) {
    const cat = RESPONSIBILITY_CATEGORIES.find((c) => c.id === catId);
    const item = cat?.items?.[index];
    if (item === undefined) continue;
    const key = `${catId}__${item}`;
    const s = scoreResponsibilityPairSided(
      mine?.responsibilities?.[key],
      theirs?.responsibilities?.[mirrorRespKey(key)],
      youName, themName);
    if (s != null) out.push(s);
  }

  for (const id of spec.life) {
    const s = scoreLifeQuestionPair(
      mine?.life?.[id],
      theirs?.life?.[mirrorLifeId(id)],
      LIFE_QUESTION_OPTIONS[id]);
    if (s != null) out.push(s);
  }

  return out;
}

/** One domain, as a whole percentage. Zero when neither answered anything. */
export function domainAlignmentPct(domainKey, { mine, theirs, youName, themName }) {
  const scores = domainScores(domainKey, mine, theirs, youName, themName);
  if (!scores.length) return 0;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
}

/** The headline number: the mean of the five domains, equally weighted. */
export function overallExpectationsPct({ mine, theirs, youName, themName }) {
  const pcts = EXP_DOMAINS.map((d) => domainAlignmentPct(d.key, { mine, theirs, youName, themName }));
  return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
}

/** Every domain, named, for anything that shows the breakdown. */
export function expectationsByDomain({ mine, theirs, youName, themName }) {
  return EXP_DOMAINS.map((d) => ({
    key: d.key,
    label: d.label,
    pct: domainAlignmentPct(d.key, { mine, theirs, youName, themName }),
  }));
}
