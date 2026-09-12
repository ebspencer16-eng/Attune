/**
 * Comparing two people's Expectations answers.
 *
 * ── WHY THIS FILE ─────────────────────────────────────────────────────────
 * Three copies of this already existed and none could be reached by the app:
 * the website built it inside src/App.jsx, /api/admin-data built it again for
 * the aggregate charts, and the workbook generator built it a third time. The
 * app therefore showed nothing at all for the six Expectations sections, which
 * is every package, which is every customer.
 *
 * ── THE MIRROR ────────────────────────────────────────────────────────────
 * The one genuinely difficult thing here. These questions are asked in the
 * first person: who does the cooking is answered "Primarily mine" or
 * "Primarily my partner's". Two people who answer the same way have said the
 * opposite thing, and two who answer oppositely have agreed.
 *
 * So one side has to be flipped before it is read, in the key, which embeds
 * {userName} and {partnerName}, and in the value. Getting that backwards
 * inverts every result while looking entirely plausible, which is why it
 * belongs in one file with one test rather than in four.
 */

import {
  RESPONSIBILITY_CATEGORIES, EXPECTATIONS_CATEGORIES, LIFE_QUESTIONS, substName,
  LIFE_CATEGORY_LABEL,
} from '../_questions.js';
import { introFor } from './category-intros.js';
import { starterFor } from './expectation-starters.js';

/**
 * A responsibility key seen from the other side.
 *
 * Both name tokens swap at once, in a single pass. Replacing one and then the
 * other would turn both into the same name, which is why this is a replacer
 * function rather than two chained replaces through a placeholder.
 */
export function mirrorRespKey(key) {
  if (!key) return key;
  return String(key).replace(
    /\{userName\}|\{partnerName\}/g,
    (token) => (token === '{userName}' ? '{partnerName}' : '{userName}'));
}

/** The two life questions that name a side. Everything else is symmetric. */
export function mirrorLifeId(id) {
  if (id === 'lq_involve_user') return 'lq_involve_partner';
  if (id === 'lq_involve_partner') return 'lq_involve_user';
  return id;
}

/**
 * Which person an answer names, as a side rather than a word.
 *
 * Returns null for unanswered and 'na' for "doesn't apply", which are
 * different things: one is missing, and one is a real answer that no
 * comparison should count.
 */
function sideOf(value) {
  if (value == null || value === '') return null;
  if (value === 'Balanced' || value === 'Both of us') return 'both';
  if (value === "Doesn't apply" || value === "Doesn't apply to us") return 'na';
  if (value === 'Primarily mine') return 'self';
  if (value === "Primarily my partner's") return 'other';
  return null;
}

/** An answer as a name the reader will recognise. */
export function normRespValue(value, isSelf, youName, themName) {
  const side = sideOf(value);
  if (side === 'both') return 'Both of us';
  if (side === 'na') return "Doesn't apply";
  if (side === 'self') return isSelf ? youName : themName;
  if (side === 'other') return isSelf ? themName : youName;
  return value;
}

/**
 * Do two answers name the same person?
 *
 * Compared as absolute sides, never as strings. "Primarily mine" from both
 * partners is a disagreement, because each has claimed it. Comparing the
 * strings says they match, and that is the bug this exists to avoid.
 */
export function agrees(yourValue, theirValue) {
  // Unanswered is not a comparison. Everything else is.
  if (yourValue == null || yourValue === '') return null;
  if (theirValue == null || theirValue === '') return null;

  const you = sideOf(yourValue);
  const them = sideOf(theirValue);

  // ── "DOESN'T APPLY" IS AN ANSWER ────────────────────────────────────────
  // This used to return null whenever either side said it, which dropped the
  // row from the results entirely: out of the count, out of the percentage,
  // out of the list of things to talk about.
  //
  // The website has never done that. It compares the two answers as a reader
  // sees them, so "Doesn't apply" against "Primarily mine" is a difference and
  // "Doesn't apply" from both is agreement. The two products therefore told
  // the same couple different things, and the app was the optimistic one: the
  // disagreements it dropped pushed categories to 100 per cent aligned that
  // the website showed as gaps.
  //
  // Thirty-three of the possible answer pairs diverged, every one of them
  // involving this value. The website's reading is kept because it is the one
  // customers have been given and because it is right: one person saying a
  // responsibility does not apply while the other says it is theirs is a
  // mismatched expectation, which is the entire subject of this exercise.
  if (you === 'na' || them === 'na') return you === them;

  // A value neither side recognises falls back to comparing what was stored,
  // which is what the website's display comparison did. Better than dropping
  // an answer nobody has taught this function about.
  if (you == null || them == null) return yourValue === theirValue;

  if (you === 'both' || them === 'both') return you === them;
  const youMean = you === 'self' ? 'you' : 'them';
  const theyMean = them === 'self' ? 'them' : 'you';
  return youMean === theyMean;
}

/**
 * Every answered pair, in the order the results screens present them.
 *
 * `mine` belongs to whoever is reading. Rows where either side has not
 * answered are dropped rather than shown blank: an expectation only one person
 * has stated is not a comparison.
 */
export function expectationsRows({ mine, theirs, youName = 'You', themName = 'Your partner' }) {
  const you = youName || 'You';
  const them = themName || 'Your partner';

  const respRows = RESPONSIBILITY_CATEGORIES.flatMap((cat, categoryIndex) =>
    cat.items.map((item) => {
      const key = cat.id + '__' + item;
      const rawYours = mine?.responsibilities?.[key];
      const rawTheirs = theirs?.responsibilities?.[mirrorRespKey(key)];
      const aligned = agrees(rawYours, rawTheirs);
      if (aligned === null) return null;
      return {
        key,
        kind: 'responsibility',
        category: cat.label,
        categoryId: cat.id,
        categoryIndex,
        item: substName(item, you, them),
        you: normRespValue(rawYours, true, you, them),
        them: normRespValue(rawTheirs, false, you, them),
        aligned,
      };
    }).filter(Boolean));

  const lifeRows = LIFE_QUESTIONS.map((q) => {
    const rawYours = mine?.life?.[q.id];
    const rawTheirs = theirs?.life?.[mirrorLifeId(q.id)];
    if (!rawYours || !rawTheirs) return null;
    return {
      key: q.id,
      kind: 'life',
      category: q.category,
      categoryId: null,
      categoryIndex: null,
      item: substName(q.text, you, them),
      prompt: q.core || null,
      you: rawYours,
      them: rawTheirs,
      // Life questions are not directional: both answer about the same thing,
      // so the strings compare directly.
      aligned: rawYours === rawTheirs,
    };
  }).filter(Boolean);

  return [...respRows, ...lifeRows];
}

/**
 * Re-exported from api/_questions.js, where it sits beside the category list
 * that uses it. Kept here because both surfaces already import it from this
 * module.
 */
export { LIFE_CATEGORY_LABEL };


/** The overview numbers, and one bucket per conversation screen. */
export function expectationsSummary({ mine, theirs, youName, themName, coupleTypeId = null }) {
  const rows = expectationsRows({ mine, theirs, youName, themName });
  const answered = rows.length;
  const aligned = rows.filter((r) => r.aligned).length;

  /**
   * All six, in nav order, including Life & Values.
   *
   * This mapped RESPONSIBILITY_CATEGORIES, so the payload carried five
   * categories while the website's nav offered six. The app, whose nav is this
   * payload, was never offered Life & Values at all: the answers were on the
   * response as `life` with no page to read them on.
   *
   * A life row has no categoryIndex, because it is not in a responsibility
   * category. It is selected by kind instead.
   */
  const categories = EXPECTATIONS_CATEGORIES.map((cat, i) => {
    const inCat = cat.kind === 'life'
      ? rows.filter((r) => r.kind === 'life')
      : rows.filter((r) => r.categoryIndex === i);
    return {
      // The id the app navigates to and notes anchor against.
      section: 'exp-convo-' + i,
      label: cat.label,
      // The category's own id, and the paragraph the website opens its page
      // with. The app had neither, so its category pages opened straight into
      // a list of rows.
      categoryId: cat.id,
      // The paragraph the page opens with. When the couple's type is known
      // this is the one written for that pairing, which is what the website
      // prints; the category's general introduction is the fallback. The app
      // only ever had the fallback because the table was inline in
      // src/App.jsx. See api/_lib/expectation-starters.js.
      intro: starterFor(cat.id, coupleTypeId, introFor(cat.id)),
      /** True when the paragraph is written for this pairing rather than
       *  general, so the page can name both people above it the way the
       *  website does. */
      introIsForPair: starterFor(cat.id, coupleTypeId, null) != null,
      rows: inCat,
      answered: inCat.length,
      aligned: inCat.filter((r) => r.aligned).length,
      differences: inCat.filter((r) => !r.aligned).length,
    };
  });

  return {
    answered,
    aligned,
    differences: answered - aligned,
    alignedPct: answered ? Math.round((aligned / answered) * 100) : null,
    categories,
    // `life` used to be sent here as its own array, from the days when the
    // category list was the five responsibility categories and Life & Values
    // had nowhere to go. The list is all six now, so those same rows are
    // categories[5].rows, and sending them twice is what put two Life & Values
    // dropdowns on the app's Expectations page.
  };
}
