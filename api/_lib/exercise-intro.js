/**
 * The screen that opens an exercise, for both surfaces.
 *
 * ── WHY IT IS A MODULE ────────────────────────────────────────────────────
 * Ellie: "Can we build a starting page for each exercise? Do these exist on
 * the web? ... Need the flow to match exactly for web and app."
 *
 * They do exist on the web, all five of them, written inline in src/App.jsx,
 * which is why the app has none: there was nothing to read. An exercise that
 * opens with its name and what it is for on one surface and drops you straight
 * into question one on the other is two products.
 *
 * So the words live here and both surfaces render them. The app had no version
 * of this copy to drift from; the website's is the version customers have
 * read, so the website's is what this holds.
 *
 * ── WHAT IS DELIBERATELY NOT HERE ─────────────────────────────────────────
 * The website varies two of these intros by package: the anniversary and
 * revisited readings of Expectations say something different about what the
 * exercise covers. Those branches are still in src/App.jsx and are not sent to
 * the app, because the app cannot yet tell those two cases apart. It is
 * written down rather than quietly dropped: TASKS.md carries it.
 *
 * ── ON THE NUMBERS ────────────────────────────────────────────────────────
 * "Exercise 01 of 02" is the website's own framing from when there were two.
 * The eyebrow here names the exercise instead, because a couple who bought
 * Conflict Patterns is not doing exercise five of two.
 */

import { CONFLICT_INTRO } from '../_conflict-questions.js';

/**
 * @param {string} key      an exercise key from api/_exercises.js
 * @param {object} names    { you, partner } for the lines that name someone
 * @returns {{title: string, body: string[], note: string|null, cta: string}|null}
 */
export function exerciseIntro(key, { partner = 'your partner' } = {}) {
  const RESEARCH = 'Built on relationship research and shaped with licensed therapists.';

  switch (key) {
    case 'ex1':
      return {
        title: 'First, how you communicate.',
        body: [
          'This is the communication exercise. It looks at how you connect, handle conflict, and show up day to day. Both take about 15 minutes. Answer honestly.',
          'You answer every question twice: once about yourself, and once the way you think your partner would answer it.',
        ],
        note: RESEARCH,
        cta: 'Begin exercise',
      };

    case 'ex2':
      return {
        title: 'What you expect.',
        body: [
          'Relationship frustrations frequently trace back to an unmet expectation, whether conscious or not.',
          'Two parts. First, life and values questions: children, finances, where you live, how you handle conflict and repair. Then, who you expect to handle what across household, financial, career, extended family, and emotional responsibilities. You will also share who did each of these in your childhood home. That context helps explain why you each carry the expectations you do.',
        ],
        note: RESEARCH,
        cta: 'Begin exercise',
      };

    case 'ex3':
      return {
        title: 'The moments that make a relationship are worth naming.',
        body: [
          'A mix of scale questions, short reflections, and a few rankings. Nothing to study for. Just answer.',
          `When ${partner} finishes, you will see where your stories overlap and where you each saw something the other did not.`,
        ],
        note: RESEARCH,
        cta: 'Begin exercise',
      };

    case 'intimacy':
      return {
        title: 'What you each expect.',
        body: [
          'Physical intimacy is one of the biggest things couples assume they are aligned on, and one of the least talked about. This is a private set of questions about what you each expect.',
          'You answer on your own. Neither of you sees the other’s answers until you have both finished. There are no right answers, and no answer here is better than another.',
          'This is an expectations tool, not therapy. If anything here brings up something heavier, that is worth talking through with someone qualified.',
        ],
        note: RESEARCH,
        cta: 'Begin exercise',
      };

    case 'conflict':
      return {
        title: 'Conflict patterns',
        body: [
          CONFLICT_INTRO,
          `Twelve questions, about ten minutes. Two ask you to write a sentence. You answer on your own, and one section stays private to you that ${partner} never sees.`,
        ],
        note: RESEARCH,
        cta: 'Begin exercise',
      };

    default:
      return null;
  }
}
