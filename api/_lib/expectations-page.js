/**
 * The words on the Expectations responsibilities pages.
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
 * Ellie: "Hate the setup of this exercise. It needs to be the same as the
 * mobile web experience."
 *
 * The two surfaces were not asking the same thing. The website asks a whole
 * category on one page, with a "growing up" row and a "future home" row for
 * each responsibility, and skips the growing-up row for Extended Family,
 * because those are each partner's own family and there is no shared childhood
 * to compare. The app asked every category with both rows and a heading it had
 * written itself.
 *
 * All of that copy was typed into src/App.jsx, where the app cannot reach it,
 * which is the failure this codebase is organised against. It is here now and
 * both surfaces read it: the website imports it, and /api/questions sends it to
 * the app with the rest of the exercise.
 */

/**
 * Categories that ask only about now.
 *
 * Extended Family is the one. The growing-up column asks who handled something
 * in the home you were raised in; for "how much time we spend with my family"
 * that question does not mean anything, because the family in the question is
 * the same family.
 */
export const NO_CHILDHOOD_CATEGORIES = ['extended_family'];

/** Whether this category asks the growing-up row at all. */
export function asksChildhood(catId) {
  return !NO_CHILDHOOD_CATEGORIES.includes(catId);
}

/** The heading over the growing-up row. */
export const GROWING_UP_LABEL = 'Growing up';

/**
 * The heading over the row that asks about now.
 *
 * A couple already married is not answering about a future home, so the
 * anniversary variant says so.
 */
export function futureLabel({ anniversary = false } = {}) {
  return anniversary ? 'In our home' : 'In our future home';
}

/** The line under the category name, saying what to do on the page. */
export function categoryIntro(catId, { anniversary = false } = {}) {
  if (!asksChildhood(catId)) {
    return 'How the two of you handle this now. No growing-up question here, these are your own families.';
  }
  return 'For each responsibility, select who handled it growing up, and who you expect to handle it '
    + (anniversary ? 'in your home.' : 'in your future home.');
}

/**
 * What is asked after someone answers "Both".
 *
 * Both rarely means exactly half, and which way it leans is the part worth
 * knowing, so the answer is not finished until this is answered too. The second
 * line is the same prompt once it is the thing holding the page up.
 */
export const BOTH_DETAIL_LABEL = 'A bit more specifically:';
export const BOTH_DETAIL_REQUIRED_LABEL = 'A bit more specificity required to continue:';

/** Which relationship statuses get the anniversary wording. */
export const ANNIVERSARY_STATUSES = ['married', 'remarried'];
export function isAnniversaryStatus(status) {
  return ANNIVERSARY_STATUSES.includes(String(status || '').toLowerCase());
}
