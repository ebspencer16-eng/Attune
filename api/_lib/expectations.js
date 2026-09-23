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

/**
 * A childhood answer, or nothing.
 *
 * The website prints an em dash for an unanswered one and for the two values
 * that mean it did not come up. Sending null instead lets each surface decide
 * how to say "nothing here", which on a phone is not always a dash.
 */
export function childhoodValue(value) {
  const v = String(value ?? '').trim();
  if (!v || v === 'N/A' || v === "Didn't apply") return null;
  return v;
}

/**
 * What a results page shows for one answer.
 *
 * ── WHY "BOTH OF US" IS NOT IT ────────────────────────────────────────────
 * Ellie: "I don't like seeing both of us." It is the longest value in a narrow
 * column and it is the least informative one: the exercise asks a follow-up
 * every time someone picks it, precisely because both rarely means half.
 *
 * So the refinement is the answer wherever there is one, and "Both" is the
 * fallback for the rows answered before that follow-up existed. Every results
 * surface reads this rather than deciding for itself.
 */
export function respDisplay(value, detail) {
  if (detail) return detail;
  if (value === 'Both of us') return 'Both';
  return value;
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
/**
 * The refinement someone gave after answering "Both of us", if they did.
 *
 * Read through sideOf rather than by comparing the string to "Both of us":
 * the stored value is whatever the exercise wrote, and this file already has
 * one place that decides which side an answer names.
 */
function bothDetailFor(answers, key) {
  if (!answers || !key) return null;
  if (sideOf(answers?.responsibilities?.[key]) !== 'both') return null;
  return answers?.bothDetail?.[key] || null;
}

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
        categoryIndex,
        /**
         * ── AND THE CATEGORY'S OWN NAME FOR ITSELF ──────────────────────
         * categoryIndex is a position in RESPONSIBILITY_CATEGORIES. The page
         * that shows these rows picks them out of EXPECTATIONS_CATEGORIES,
         * which is a different list, and the two agreed only because the five
         * responsibilities happened to sit first in the same order in both.
         *
         * Ellie: "Please move life and values to be the first expectations
         * page in the results flow." That is one line in the second list, and
         * it would have made every category page show another category's
         * rows, silently, with nothing to see in a diff.
         *
         * An id cannot drift out of step with itself.
         */
        categoryId: cat.id,
        item: substName(item, you, them),
        /**
         * The answer as the results show it.
         *
         * "Both of us" never reaches a page now: where the exercise asked what
         * Both meant, that answer is the one shown, and respDisplay is the one
         * place that decides. It used to be sent as a value plus a refinement
         * underneath, which put the least informative word in the column and
         * the informative one in small print below it.
         */
        you: respDisplay(normRespValue(rawYours, true, you, them), bothDetailFor(mine, key)),
        them: respDisplay(normRespValue(rawTheirs, false, you, them), bothDetailFor(theirs, mirrorRespKey(key))),
        /**
         * What each of them grew up with.
         *
         * The exercise asks it beside every responsibility and the website
         * prints it: its conversations table has an Expects and an Experienced
         * column for each person. The app had two of those four, because these
         * answers were never on the payload. Ellie: "web shows convos to have
         * with more columns. App needs to show that as well."
         *
         * Not mirrored. "Primarily mine" is a claim about who does it now and
         * has to be flipped to compare; this is a claim about the house each
         * of them grew up in, which is theirs either way.
         */
        youExperienced: childhoodValue(mine?.childhood?.[key]),
        themExperienced: childhoodValue(theirs?.childhood?.[key]),
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
  const categories = EXPECTATIONS_CATEGORIES.map((cat) => {
    const inCat = cat.kind === 'life'
      ? rows.filter((r) => r.kind === 'life')
      : rows.filter((r) => r.categoryId === cat.id);
    return {
      /**
       * The id the app navigates to and notes anchor against.
       *
       * From the category rather than from where it sits in the list. It used
       * to be the loop's index, so the order of the pages and the identity of
       * a page were the same number: reordering them renamed all six, and a
       * mark anchored to exp-convo-3 would have been left pointing at whatever
       * moved into third place. See EXPECTATIONS_CATEGORIES, where the number
       * is pinned to the category so the order can change and the anchors
       * cannot.
       */
      section: cat.section,
      label: cat.label,
      // The category's own colour, so the app draws the same tile the website
      // does rather than painting all six in one section colour.
      color: cat.color || null,
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
    categories,
    // `life` used to be sent here as its own array, from the days when the
    // category list was the five responsibility categories and Life & Values
    // had nowhere to go. The list is all six now, so those same rows are
    // categories[5].rows, and sending them twice is what put two Life & Values
    // dropdowns on the app's Expectations page.
  };
}
