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
  ANNIVERSARY_QUESTIONS, admiredNoun, isNonAnswer,
} from '../_anniversary-questions.js';
import { promptFor } from './reflection-prompts.js';

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
 * The heading and the line under it, for each Reflection page.
 *
 * ── WHY THESE ARE HERE ────────────────────────────────────────────────────
 * They were typed inside src/App.jsx, so the app could not read them and did
 * not show them. Two consequences, both visible to a reader holding both:
 *
 * The ratings page is called "What you view the relationship as a whole" on
 * the website and was called "How You Each Rated" in the app. Not a shortened
 * version of the same heading, a different one, invented in the app because
 * the real one was somewhere it could not reach.
 *
 * And every one of these pages opens with a line saying what it is. The app
 * showed a bare heading and went straight into the content, so a reader
 * arrived at a page of dots with nothing telling them what the dots are.
 *
 * `eyebrow` is the section name above the heading, which all three share.
 */
export const REFLECTION_PAGES = {
  eyebrow: 'Relationship Reflection',
  ratings: {
    title: 'What you view the relationship as a whole',
    sub: 'Every question with a fixed answer, shown together. The distance between the two dots is the whole point.',
  },
  story: {
    title: 'Side by Side',
    sub: 'Everything you each wrote, unedited, next to each other. Read them together.',
  },
  plan: {
    title: 'Conversations worth having.',
    eyebrowOwn: 'Reflection Action Plan',
    aligned: "You're well-aligned across your reflections. Keep building on this foundation.",
  },
};

export const STORY_CATEGORIES = (() => {
  const seen = [];
  for (const q of ANNIVERSARY_QUESTIONS) {
    if (q.type === 'scale') continue;
    if (q.category && !seen.includes(q.category)) seen.push(q.category);
  }
  return seen;
})();

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
        low: q.scaleLabels[0],
        high: q.scaleLabels[steps],
        you: { index: a, label: q.scaleLabels[a], pct: steps ? (a / steps) * 100 : 0 },
        them: { index: b, label: q.scaleLabels[b], pct: steps ? (b / steps) * 100 : 0 },
        gapSteps: Math.abs(a - b),
      };
    })
    .filter(Boolean);

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

  const widest = ratings.length
    ? ratings.reduce((m, r) => (r.gapSteps > m.gapSteps ? r : m), ratings[0])
    : null;

  return {
    names: { you, them },
    ratings,
    admired,
    priorities,
    written,
    /** The rating they are furthest apart on, for the overview and the plan. */
    widest: widest && widest.gapSteps > 0 ? widest : null,
    /** How many of the written questions both people answered. */
    writtenCount: written.length,
    /** The headings Side by Side groups under, in order. */
    storyCategories: STORY_CATEGORIES,
    /** Each page's heading and the line under it, so the app shows both. */
    pages: REFLECTION_PAGES,
  };
}
