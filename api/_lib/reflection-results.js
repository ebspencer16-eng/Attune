/**
 * Relationship Reflection results, for the four sections that show them.
 *
 * The questions moved to api/_anniversary-questions.js so this could exist at
 * all: they used to live inside src/App.jsx, which meant the app had four
 * Reflection sections and no way to fill any of them.
 *
 * ── WHAT THIS SECTION IS ──────────────────────────────────────────────────
 * Unlike everything else in results, most of Reflection is free text. Two
 * people wrote about the same relationship in their own words, and the product
 * of the section is reading what the other one wrote. So the text is passed
 * through untouched: not summarised, not scored, not characterised. The only
 * judgement made about it is whether it is an answer at all.
 */

import {
  ANNIVERSARY_QUESTIONS, GLANCE_TEXT, admiredNoun, isNonAnswer,
} from '../_anniversary-questions.js';
import { promptFor } from './reflection-prompts.js';
// The label over the question under each pair. It is the same two words the
// intimacy pages print, and it is defined once, there. Importing it across
// sections is deliberate: two constants reading 'Talk about it' is two things
// to rename.
import { TALK_ABOUT_IT } from '../_intimacy-results-prose.js';

/** Scale answers are stored as the option index. */
const scaleValue = (v) => (typeof v === 'number' && v >= 0 ? v : null);

/**
 * The categories Side by Side groups its answers under, in the order the
 * questions are asked.
 *
 * ── WHY "GETTING STARTED" IS BACK ─────────────────────────────────────────
 * It was never here. The list was three categories, then four in 1736324, and
 * Getting Started was in neither, so a_memory, "Something small that happened
 * recently that made me smile about us", was a question this product asked two
 * people to answer and then showed to neither of them.
 *
 * Ellie asked for it to be displayed. It goes first, because that is where the
 * exercise asks it and because it is the gentlest thing on the page: a good
 * opening for a section where the rest is harder.
 *
 * Derived from the questions rather than typed, so the day a category is added
 * this follows instead of quietly dropping it the way it dropped this one.
 */
/**
 * What each reflection page is called, and the line under it.
 *
 * Both surfaces read these. The app used to invent its own heading for the
 * ratings page, "How You Each Rated", so someone arriving there was told a
 * different thing depending on the screen.
 *
 * Ellie renamed the ratings page: "how you each rated" was the nav's word for
 * it and did not say what the page shows, which is each person's view of the
 * relationship as a whole, side by side.
 *
 * `eyebrow` is the section name above the heading, which all three share.
 */
export const REFLECTION_PAGES = {
  eyebrow: 'Relationship Reflection',
  ratings: {
    title: 'How you each view the relationship',
    /**
     * The line under the heading is gone. Ellie: "On app and site, how you
     * each rated, remove the description line." The page shows the questions
     * and both answers; a sentence explaining that it does was the page
     * describing itself.
     */
  },
  /**
   * The ranking, and the line under it that says how to read the connectors.
   * Both were written inside src/App.jsx, so the app had no heading for this
   * section and nothing explaining what the lines mean.
   */
  priorities: {
    title: 'What matters most this year',
    note: 'Each line links the same priority on both lists. The flatter the line, the closer you ranked it.',
  },
  story: {
    title: 'Side by Side',
    sub: 'Everything you each wrote, unedited, next to each other. Read them together.',
  },
  // `plan` was the retired action plan page's heading, its eyebrow and its
  // all-aligned line. The page is gone from both surfaces and nothing read
  // these, so they were three pieces of copy on a copy-review surface that no
  // customer could reach. Removed rather than kept "in case": the plan itself
  // lives on the at-a-glance page and has its own words there.
};

export const STORY_CATEGORIES = (() => {
  const seen = [];
  for (const q of ANNIVERSARY_QUESTIONS) {
    if (q.type === 'scale') continue;
    if (q.category && !seen.includes(q.category)) seen.push(q.category);
  }
  return seen;
})();

/**
 * The at-a-glance page: what it is called, and the line under it.
 *
 * ── WHY THIS IS HERE AND NOT ON EITHER SURFACE ────────────────────────────
 * It was inside src/App.jsx, which the app cannot import, so the app wrote its
 * own opening: the section's name and no line at all. Two products introducing
 * the same page differently, which is the shape this repo's worst bugs take.
 *
 * a0 is "the overall feel of the relationship right now", and it is the one
 * rating this line is about. It is deliberately not drawn in the panel below
 * it: it is said here, in words, rather than drawn again as a fourth bar.
 *
 * Exported as well as used below, because the website has the raw answers and
 * builds this page without going through the payload.
 */
export function reflectionOverview() {
  /**
   * The line under the heading is gone. Ellie: "the description line ('You're
   * both feeling really good. A shared read on where you are') should be
   * removed." It was a sentence saying what the four ratings below it already
   * say, in an order the reader did not choose.
   *
   * The headline is gone with it: the page is titled from PAGE_TITLES now,
   * like every other at-a-glance page, rather than leading with two names.
   */
  return {
    ratingsLabel: 'How you feel right now',
    planLabel: 'Your action plan',
  };
}

export function reflectionResults({ mine, theirs, youName = 'You', themName = 'Your partner' }) {
  if (!mine || !theirs) return null;
  const you = youName || 'You';
  const them = themName || 'Your partner';

  /**
   * How you each rated: the scales, side by side.
   *
   * The gap is reported as a number of steps rather than as a colour. A
   * two-step difference on "how connected do I feel" is the most useful thing
   * on the page and it is not a failing grade.
   */
  const ratings = ANNIVERSARY_QUESTIONS
    .filter((q) => q.type === 'scale')
    .map((q) => {
      const a = scaleValue(mine[q.id]);
      const b = scaleValue(theirs[q.id]);
      if (a == null || b == null) return null;
      const steps = q.scaleLabels.length - 1;
      return {
        key: q.id,
        question: q.text,
        /**
         * The name this rating goes by on the at-a-glance page, which prints
         * four of them in a column and cannot carry a sentence each. The
         * website had these three typed inline, so the app printed the whole
         * question where the website printed two words.
         */
        short: GLANCE_TEXT[q.id] || q.text.split('?')[0],
        /**
         * How many points this scale has.
         *
         * The at-a-glance page draws one block per point rather than a mark on
         * a track, and it cannot count them from a percentage. Every scale has
         * five today; sending the number rather than assuming it means a
         * six-point question does not silently lose a block.
         */
        steps: q.scaleLabels.length,
        low: q.scaleLabels[0],
        high: q.scaleLabels[steps],
        you: { index: a, label: q.scaleLabels[a], pct: steps ? (a / steps) * 100 : 0 },
        them: { index: b, label: q.scaleLabels[b], pct: steps ? (b / steps) * 100 : 0 },
        gapSteps: Math.abs(a - b),
      };
    })
    .filter(Boolean);

  /**
   * The at-a-glance page: what it is called, and the line under it.
   *
   * ── WHY THIS IS HERE AND NOT ON EITHER SURFACE ────────────────────────
   * It was inside src/App.jsx, which the app cannot import, so the app wrote
   * its own opening: the section's name and no line at all. Two products
   * introducing the same page differently, which is the exact shape this
   * repo's worst bugs take.
   *
   * a0 is "the overall feel of the relationship right now", and it is the one
   * rating this line is about. It is deliberately not in the panel below:
   * it is said here, in words, rather than drawn again as a fourth bar.
   */
  const overview = reflectionOverview();

  /** The one pick question, as a quality rather than an adjective. */
  const admired = {
    you: mine.a8 ? admiredNoun(mine.a8) : null,
    them: theirs.a8 ? admiredNoun(theirs.a8) : null,
  };

  /** The ranking, as two ordered lists. */
  const priorities = {
    you: Array.isArray(mine.a_priority) ? mine.a_priority : null,
    them: Array.isArray(theirs.a_priority) ? theirs.a_priority : null,
  };

  /**
   * Side by side: every free-text question both people answered.
   *
   * A question only one person answered is dropped. Showing one column filled
   * and one empty reads as the other person having refused, when usually they
   * simply had nothing that day.
   */
  const written = ANNIVERSARY_QUESTIONS
    .filter((q) => q.type === 'text')
    .map((q) => {
      const a = mine[q.id];
      const b = theirs[q.id];
      if (isNonAnswer(a) || isNonAnswer(b)) return null;
      return {
        key: q.id, question: q.text, category: q.category,
        you: String(a).trim(), them: String(b).trim(),
        // The question to sit with, which is the half of Side by Side that
        // does the work. The app showed the two answers and nothing else,
        // because this was inline in src/App.jsx.
        prompt: promptFor(q.id),
      };
    })
    .filter(Boolean);

  return {
    names: { you, them },
    /** The at-a-glance page's heading, its line, and its two section labels. */
    overview,
    ratings,
    admired,
    priorities,
    written,
    /*
     * The rating they are furthest apart on was sent here and drawn by
     * neither surface: the overview shows every rating with both marks on it,
     * which says the same thing without singling one out. Computed above and
     * no longer sent, the way Ellie asked for the other six.
     */
    /** How many of the written questions both people answered. */
    /** The headings Side by Side groups under, in order. */
    storyCategories: STORY_CATEGORIES,
    /** The label above the question under each pair on Side by Side. */
    promptLabel: TALK_ABOUT_IT,
    /** Each page's heading and the line under it, so the app shows both. */
    pages: REFLECTION_PAGES,
  };
}
