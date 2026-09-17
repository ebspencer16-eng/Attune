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
 * ── ONE WORD ON THE BUTTON ───────────────────────────────────────────────
 * Ellie: "Use start throughout." It said Start on two of the website's pages,
 * Begin on one, Begin exercise on another, and Begin exercise on all five of
 * the app's. The word is here once and both surfaces render it.
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
  /**
   * ── THE FOOTNOTE IS GONE ────────────────────────────────────────────────
   * Ellie: "on each page, remove 'Built on relationship research and shaped
   * with licensed therapists.' We can add something like this later."
   *
   * It is `note: null` rather than a deleted field, because both surfaces
   * render the note when there is one and a later line goes back in one place.
   */
  switch (key) {
    case 'ex1':
      return {
        title: 'First, how you communicate.',
        body: [
          'This is the communication styles exercise. It looks at how you each process internally, how you connect as a couple, and how you communicate when things get hard.',
        ],
        note: null,
        cta: 'Start',
      };

    case 'ex2':
      return {
        title: 'What you each expect',
        body: [
          'Frustration in relationships often traces back to unmet expectations, whether conscious or not. This exercise consists of two parts. First, life and values, and second, responsibilities.',
        ],
        note: null,
        cta: 'Start',
      };

    case 'ex3':
      return {
        title: 'How you each feel about your relationship',
        body: [
          'Reflecting on your relationship throughout this exercise can be as meaningful as you make it, and can shape the steps you take next.',
        ],
        note: null,
        cta: 'Start',
      };

    case 'intimacy':
      return {
        title: 'Understanding your sex life',
        body: [
          'Physical intimacy is one of the biggest things couples assume they are aligned on, and one of the least talked about. These private questions help you identify areas to discuss with each other.',
          // Ellie, asked whether this should go with the copy it used to sit
          // under: "Keep it as a separate paragraph below mine."
          'This is an expectations tool, not therapy. If anything here brings up something heavier, that is worth talking through with someone qualified.',
        ],
        note: null,
        cta: 'Start',
      };

    case 'conflict':
      return {
        // CONFLICT_INTRO is this exercise's opening sentence wherever it is
        // shown, so the page reads it rather than holding a second copy.
        title: 'Conflict patterns',
        body: [CONFLICT_INTRO],
        note: null,
        cta: 'Start',
      };

    default:
      return null;
  }
}
