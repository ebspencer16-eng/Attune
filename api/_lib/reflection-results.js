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
 * The categories Side by Side groups its answers under, in order.
 *
 * ── WHY THIS IS A LIST AND NOT THE QUESTIONS' OWN ORDER ───────────────────
 * The questions carry five categories. This shows four. "Getting Started",
 * which is the opening memory question, has never appeared here: the list was
 * three categories, then four in 1736324, and Getting Started was in neither.
 *
 * So a_memory is an answer this product asks two people to write and then
 * displays nowhere. That may be deliberate and it is not mine to decide, so
 * the list keeps exactly what the website shows today and the omission is
 * written down rather than quietly fixed by deriving the order.
 *
 * It was typed inside src/App.jsx, twice, which is why the app's Side by Side
 * had no grouping at all: it listed every answer flat because the grouping
 * lived somewhere it could not read.
 */
export const STORY_CATEGORIES = [
  'Milestones', "How We're Doing", 'Looking Forward', 'What Matters',
];

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
  };
}
