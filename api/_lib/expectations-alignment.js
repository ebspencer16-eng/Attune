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
import {
  scoreResponsibilityPair, scoreLifeQuestionPair, LIFE_QUESTION_OPTIONS, EXP_DOMAINS,
} from '../_workbook-content.js';
import { mirrorRespKey, mirrorLifeId } from './expectations.js';

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
    const s = scoreResponsibilityPair(
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
