/**
 * What the product says while a couple is waiting on something.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * "This opens when you have both finished" was written out by hand in 22
 * places across the website and the app. A couple moving between the
 * dashboard, an exercise footer, a locked section and Settings was told the
 * same thing four ways in four minutes, which reads as four different states
 * rather than one.
 *
 * Six situations, not 22. Ellie wrote one line for each.
 *
 * ── WHOSE WORDS ────────────────────────────────────────────────────────────
 * Every string here is Ellie's, verbatim. Nothing in this file may be edited
 * to fit a layout, shortened to fit a button, or interpolated with a name or a
 * section. If a surface needs something these do not say, that is a copy
 * request, not a code change.
 *
 * check-waiting-copy.mjs fails the build if either surface types one of these
 * sentences inline instead of reading it here.
 */

/**
 * BEFORE_PURCHASE — the marketing pages, before an account exists.
 * DASHBOARD       — signed in, exercises not done.
 * EXERCISE_FOOTER — your half is finished, on the exercise itself.
 * LOCKED_BY_YOU   — a results section you have not finished.
 * LOCKED_BY_THEM  — a results section your partner has not finished.
 * SETTINGS        — the account screen. Ellie: "This can just be group 2."
 */
export const WAITING = {
  BEFORE_PURCHASE: 'Create your account to get started. Results unlock when both of you complete exercises.',
  DASHBOARD: 'Results unlock once both of you complete your exercises.',
  EXERCISE_FOOTER: 'Your answers are saved, results will open once you both complete all exercises.',
  LOCKED_BY_YOU: 'Finish your exercises to open this.',
  LOCKED_BY_THEM: 'This section will unlock once your partner completes their exercises.',
};

/** Settings says what the dashboard says. */
WAITING.SETTINGS = WAITING.DASHBOARD;

/**
 * Your own exercises are unfinished, said where a page would otherwise fill in.
 *
 * Ellie, of "This fills in as you finish the exercises in your package": "The
 * second listed line can be group 4, right?" So it is group 4, and there is no
 * seventh line.
 */
WAITING.NOT_FILLED_IN = WAITING.LOCKED_BY_YOU;

/** Every sentence, for the gate to search for. */
export const WAITING_SENTENCES = [...new Set(Object.values(WAITING))];
