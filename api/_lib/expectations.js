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
import { bandFor, closenessPct, isAligned, meanPct } from './alignment.js';
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
  if (!v || v === 'N/A' || v === "Didn't apply" || v === 'na') return null;
  return v;
}

/**
 * ── A SLOT, TURNED BACK INTO THE READER'S OWN WORD ───────────────────────
 * An answer used to BE the column heading, so a results page showed "Adult 1"
 * to anyone whose childhood was not one of eight shapes, and renaming a
 * heading orphaned every answer stored under the old word.
 *
 * It is a slot now, and the word is looked up per person from the two adults
 * they named. Both shapes are read here, because every answer stored before
 * this is a word: anything that is not a known slot is taken as the word
 * itself, which is exactly what it used to mean.
 *
 * `adults` is `{ a, b, solo }` from that person's own answers.
 */
export function childhoodWord(value, adults) {
  const v = String(value ?? '').trim();
  if (!v) return null;
  const who = adults || {};
  if (v === 'a') return who.a || 'One of them';
  if (v === 'b') return who.b || 'The other';
  if (v === 'both') return 'Both';
  if (v === 'na') return null;
  /* The one-adult path answers whether it happened at all. */
  if (v === 'yes') return 'Yes';
  if (v === 'sometimes') return 'Sometimes';
  if (v === 'no') return 'No';
  /* Legacy: the word itself. */
  return childhoodValue(v);
}

/**
 * What each of them grew up with, including what "Both" turned out to mean.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "Expectations experienced column only shows 'both' where expects
 * shows 'genuinely' and 'usually'."
 *
 * Both columns ask the same follow-up. Answering Both to who did the cooking
 * now opens "A bit more specifically" and stores it in `bothDetail`; answering
 * Both to who did it in the house you grew up in opens the same question and
 * stores it in `childhoodBothDetail`. The Expects column has read its
 * refinement since Ellie asked for it. Nothing has ever read this one.
 *
 * So the question was asked of every customer, was required before the item
 * counted as answered, and the answer went nowhere. Written by both exercise
 * surfaces, read by `api/_lib/exercise-progress.js` only to count it as
 * answered, and drawn by neither results page.
 *
 * ── WHY IT IS NOT respDisplay ─────────────────────────────────────────────
 * The value is 'Both' here and 'Both of us' there, and the refinement names
 * the two adults in the house that person grew up in rather than the two
 * people in the couple. Same shape, different vocabulary, so the fall-back
 * word is different and sharing the function would mean teaching it which
 * column it is in.
 */
export function childhoodDisplay(value, detail, adults) {
  const v = childhoodWord(value, adults);
  if (v == null) return null;
  const refined = String(detail ?? '').trim();
  /* From 22 to 28 October the website stored this follow-up as "Usually
     [object Object], sometimes [object Object]": it glued the column objects
     into the sentence instead of their labels. Both of its buttons read the
     same, so which one somebody meant is not recoverable. The plain answer is
     what they told us for certain, so that is what shows. */
  if (refined && !refined.includes('[object Object]')) return refined;
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
 * The five-point distance rule lives in ./resp-distance.js, which has no
 * imports of its own so the workbook's container can read it without taking
 * this file's four dependencies with it. Re-exported so every caller of
 * api/_lib/expectations.js is unchanged.
 */
export {
  DETAIL_EVEN, respDistance, lifeDistance,
} from './resp-distance.js';
import { respDistance, lifeDistance } from './resp-distance.js';

/**
 * `agrees` was here.
 *
 * It answered the same question as a boolean, over three positions, from the
 * side an answer named. Every caller measures a distance now and reads the top
 * of that scale as agreement, because the exercise offers five positions and a
 * three-position rule could not see the follow-up it asks after "Both of us".
 * See respDistance above and api/_lib/alignment.js.
 *
 * Deleted rather than left exported: a definition nothing calls reads like a
 * feature, and the one it would read like here is a second opinion about
 * whether two people agree.
 */

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
      const yourDetail = bothDetailFor(mine, key);
      const theirDetail = bothDetailFor(theirs, mirrorRespKey(key));
      /**
       * How far apart, before whether. `aligned` is the top of that scale
       * rather than a second opinion about it, which is the whole of W63: the
       * boolean and the degree used to be worked out by two different rules
       * and only the boolean reached a bar.
       */
      const distance = respDistance({
        yourValue: rawYours, theirValue: rawTheirs,
        yourDetail, theirDetail, youName: you, themName: them,
      });
      if (distance === null) return null;
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
        you: respDisplay(normRespValue(rawYours, true, you, them), yourDetail),
        them: respDisplay(normRespValue(rawTheirs, false, you, them), theirDetail),
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
        /* Each person's slot is resolved with THEIR OWN two adults: the
           same stored 'a' means a different word in each of the two houses,
           which is the whole reason the answer stopped being the word. */
        youExperienced: childhoodDisplay(
          mine?.childhood?.[key], mine?.childhoodBothDetail?.[key], mine?.childhoodAdults),
        themExperienced: childhoodDisplay(
          theirs?.childhood?.[key], theirs?.childhoodBothDetail?.[key], theirs?.childhoodAdults),
        /** How close, 0 to 100, and which of the three things we say. Both
         *  from api/_lib/alignment.js, which is the only thing allowed to
         *  turn a distance into a judgement. */
        closeness: closenessPct(distance),
        band: bandFor(distance),
        aligned: isAligned(distance),
      };
    }).filter(Boolean));

  const lifeRows = LIFE_QUESTIONS.map((q) => {
    const rawYours = mine?.life?.[q.id];
    const rawTheirs = theirs?.life?.[mirrorLifeId(q.id)];
    if (!rawYours || !rawTheirs) return null;
    const lifeDist = lifeDistance(rawYours, rawTheirs, q.options);
    return {
      key: q.id,
      kind: 'life',
      category: q.category,
      categoryId: null,
      categoryIndex: null,
      item: substName(q.text, you, them),
      /* Names filled like `item` above it. Two life questions name a person
         in their core sentence, and this went out with {userName} and
         {partnerName} still in it. Nothing draws it yet, which is the only
         reason nobody has seen them. */
      prompt: q.core ? substName(q.core, you, them) : null,
      you: rawYours,
      them: rawTheirs,
      /**
       * Life questions are not directional: both answer about the same thing.
       * The options are an ordered list, so two neighbouring answers are a
       * near miss rather than a flat one, which is the same change the
       * responsibilities got and for the same reason.
       */
      closeness: closenessPct(lifeDist),
      band: bandFor(lifeDist),
      aligned: isAligned(lifeDist),
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
      /**
       * ── THE CONVERSATIONS, AS A LIST RATHER THAN A FILTER ─────────────
       * The rows in this category the two of them answered differently, which
       * is what "Conversations to have" draws and what `differences` counts.
       *
       * It was `rows.filter((r) => !r.aligned)` written out in six places: the
       * app's drawer, the app's bucket page, the website's category block, the
       * website's overall gap list, and this count twice. Six copies of one
       * rule, which is the failure this codebase is organised against, and it
       * started to matter the moment What Comes Next needed the same list:
       * Ellie asked for its Discussions to have rows to hold "the same rows as
       * the expectations overview page", and a seventh filter would have been
       * the one that drifted.
       *
       * The full rows, not a thinned copy, so every reader can take what it
       * needs and nothing has to go back to `rows` to find the rest of a
       * conversation.
       */
      conversations: inCat.filter((r) => !r.aligned),
      differences: inCat.filter((r) => !r.aligned).length,
      /**
       * ── THE NUMBER ON THE BAR ───────────────────────────────────────
       * Ellie: "I don't think it should be all-or-nothing aligned, I want to
       * include degrees."
       *
       * It was `cat.aligned / cat.answered`, worked out on the phone and
       * again on the website, so a category where every row was a near miss
       * drew an empty bar and one where every row was opposite drew the same
       * empty bar. This is the mean closeness of the rows instead, which is
       * the figure the degrees were asked for, and it is computed once here
       * rather than twice from two counts.
       *
       * Null when nothing in the category can be compared, so a surface has
       * to decide what to draw rather than being handed a confident zero.
       */
      closeness: meanPct(inCat.map((r) => r.closeness)),
    };
  });

  return {
    answered,
    aligned,
    /** Every row's closeness averaged, for anything that wants one figure for
     *  the whole exercise. The same function the categories use. */
    closeness: meanPct(rows.map((r) => r.closeness)),
    /**
     * ── THE TOP-LEVEL `differences` IS GONE ──────────────────────────────
     * Ellie: "Remove 'already aligned:20 worth discussing:12' line from top of
     * expectations overview page."
     *
     * That line was the only thing on either surface that drew this number.
     * The per-category `differences` above is still read, by What Comes Next,
     * which is why it stays.
     *
     * A field nothing draws is the thing check-app-draws-payload exists to
     * find, and it found this one the same afternoon the line was deleted.
     * Sending a number to two surfaces that neither of them shows is how a
     * payload becomes a place to look for answers that are not there.
     */
    categories,
    // `life` used to be sent here as its own array, from the days when the
    // category list was the five responsibility categories and Life & Values
    // had nowhere to go. The list is all six now, so those same rows are
    // categories[5].rows, and sending them twice is what put two Life & Values
    // dropdowns on the app's Expectations page.
  };
}
