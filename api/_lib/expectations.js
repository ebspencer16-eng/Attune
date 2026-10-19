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
  if (!v || v === 'N/A' || v === "Didn't apply") return null;
  return v;
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
export function childhoodDisplay(value, detail) {
  const v = childhoodValue(value);
  if (v == null) return null;
  const refined = String(detail ?? '').trim();
  if (refined) return refined;
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
 * Where an answer sits on the five-point scale between the two of them.
 *
 * ── WHY A SCALE AND NOT A SIDE ────────────────────────────────────────────
 * Ellie: "I don't think it should be all-or-nothing aligned, I want to include
 * degrees (preston and I were basically aligned on this one so it's a good
 * example)." The example was Emotional Labour, where she answered "Both of us"
 * and refined it to "Usually Ellie, sometimes Preston" while Preston answered
 * "Ellie". Neighbours, scored as a flat miss.
 *
 * `sideOf` above answers a three-way question: you, both, or them. The scale
 * is five points, because the exercise asks a follow-up every time someone
 * answers Both and the follow-up is exactly which way it leans:
 *
 *   0    you                      the name, or "Primarily mine" from you
 *   0.5  both, leaning to you     "Usually <you>, sometimes <them>"
 *   1    both, evenly             "Genuinely 50/50", or Both with no detail
 *   1.5  both, leaning to them    "Usually <them>, sometimes <you>"
 *   2    them                     the name, or "Primarily my partner's"
 *
 * That follow-up has been asked since the exercise shipped, is required
 * before an item counts as answered, and was read by nothing that scored.
 * It is on the page: respDisplay prints it in place of "Both of us". So the
 * product has been showing her the refinement and comparing as though she had
 * not given it.
 *
 * ── THE TWO KINDS OF VALUE, AGAIN ─────────────────────────────────────────
 * A name is absolute: "Ellie" means Ellie whoever stored it, so it needs no
 * mirroring. "Primarily mine" is relative and means a different person on each
 * side, which is why `isYours` exists and why getting it backwards inverts
 * every row while looking entirely plausible. Same trap as everything else in
 * this file.
 *
 * The detail strings are absolute for the same reason: they are built with
 * live names, so "Usually Ellie, sometimes Preston" says Ellie whichever of
 * them picked it. Parsed by the name it puts first rather than by matching the
 * whole sentence, because the sentence is assembled in api/questions.js and a
 * punctuation change there must not quietly stop this reading it.
 */
export const DETAIL_EVEN = 'Genuinely 50/50';

/** Which of the two a "Usually X, sometimes Y" refinement leans toward. */
function detailLean(detail, youName, themName) {
  const text = String(detail ?? '').trim();
  if (!text) return null;
  if (text === DETAIL_EVEN) return 'even';
  const m = /^Usually\s+(.+?),\s*sometimes\b/i.exec(text);
  if (!m) return null;
  const named = m[1].trim();
  if (youName && named === youName) return 'you';
  if (themName && named === themName) return 'them';
  return null;
}

/**
 * The position, or 'na' for an answer that says the question does not apply,
 * or null for one nothing here recognises.
 *
 * "Doesn't apply" stays off the scale rather than being parked at the middle.
 * It is a real answer and the website has always compared it as one: against
 * a position it is a difference, against the same answer it is agreement. A
 * middle rank would make it half-agree with everything.
 */
function positionOf(value, detail, isYours, youName, themName) {
  if (value == null || value === '') return null;
  const at = (pos) => ({ pos, specific: true });
  if (value === "Doesn't apply" || value === "Doesn't apply to us") return { pos: 'na', specific: true };
  if (value === 'Primarily mine') return at(isYours ? 0 : 2);
  if (value === "Primarily my partner's") return at(isYours ? 2 : 0);
  if (value === 'Both of us' || value === 'Balanced') {
    const lean = detailLean(detail, youName, themName);
    if (lean === 'you') return at(0.5);
    if (lean === 'them') return at(1.5);
    if (lean === 'even') return at(1);
    /**
     * Both, with nothing more said about it.
     *
     * The middle is where it sits, and `specific: false` is the part that
     * matters. The follow-up is required before an item counts as answered
     * today, so a row with no detail was stored before the follow-up existed.
     * Reading that as "they said exactly half" would invent a quarter-point
     * gap against a partner who did say which way it leans, and would do it
     * for every Both row the couple ever answered.
     *
     * What a reader sees in those two columns is "Usually Ellie, sometimes
     * Preston" beside "Both". That is one of them being more precise, not the
     * two of them disagreeing, and respDistance reads it that way.
     */
    return { pos: 1, specific: false };
  }
  if (youName && value === youName) return at(0);
  if (themName && value === themName) return at(2);
  return null;
}

/** Anywhere in the middle of the scale: both of them, however it leans. */
const isShared = (pos) => typeof pos === 'number' && pos >= 0.5 && pos <= 1.5;

/**
 * How far apart two responsibility answers are, normalised to 0..1.
 *
 * Null when either side has not answered, which is not a distance of zero.
 * api/_lib/alignment.js turns this into the percentage on the bar and into the
 * band; nothing else is allowed to decide what a distance means.
 */
export function respDistance({ yourValue, theirValue, yourDetail, theirDetail, youName, themName }) {
  const a = positionOf(yourValue, yourDetail, true, youName, themName);
  const b = positionOf(theirValue, theirDetail, false, youName, themName);
  if (a === null || b === null) {
    /* One value nothing recognises, which happens for an answer stored before
       an option was renamed. Fall back to comparing what is stored, the way
       `agrees` does, so the row is still a comparison rather than vanishing. */
    if (yourValue == null || yourValue === '' || theirValue == null || theirValue === '') return null;
    if (a === null && b === null) return yourValue === theirValue ? 0 : 1;
    return 1;
  }
  if (a.pos === 'na' || b.pos === 'na') return a.pos === b.pos ? 0 : 1;
  /* One of them said Both and said no more. See positionOf: that is a row from
     before the follow-up existed, and it agrees with any Both. */
  if ((!a.specific || !b.specific) && isShared(a.pos) && isShared(b.pos)) return 0;
  return Math.abs(a.pos - b.pos) / 2;
}

/**
 * How far apart two life-question answers are, normalised to 0..1.
 *
 * The options are an ordered list, so the distance is the index gap over the
 * widest possible one. Three or four of these questions are categorical rather
 * than linear, which api/_workbook-content.js says out loud beside
 * LIFE_QUESTION_OPTIONS: for those the number is an approximation. It is the
 * same approximation the percentage on the highlight card has always used, so
 * this changes where it is computed and not what it says.
 */
export function lifeDistance(yourValue, theirValue, options) {
  if (yourValue == null || yourValue === '' || theirValue == null || theirValue === '') return null;
  const opts = Array.isArray(options) ? options : null;
  if (!opts || opts.length < 2) return yourValue === theirValue ? 0 : 1;
  const a = opts.indexOf(yourValue);
  const b = opts.indexOf(theirValue);
  if (a === -1 || b === -1) return yourValue === theirValue ? 0 : 1;
  return Math.abs(a - b) / (opts.length - 1);
}

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
        youExperienced: childhoodDisplay(
          mine?.childhood?.[key], mine?.childhoodBothDetail?.[key]),
        themExperienced: childhoodDisplay(
          theirs?.childhood?.[key], theirs?.childhoodBothDetail?.[key]),
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
      prompt: q.core || null,
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
