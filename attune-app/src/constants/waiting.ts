/**
 * What the product says while a couple is waiting, mirroring
 * api/_lib/waiting-copy.js.
 *
 * The app cannot import from api/, so the sentences are repeated here and
 * check-waiting-copy.mjs fails the build if the two stop matching. Same
 * arrangement as the annotation palette and the mark-placement numbers, and
 * for the same reason: sending six sentences on every payload to avoid a gate
 * would be worse than the gate.
 *
 * Every string is Ellie's, verbatim. Do not shorten one to fit a layout, and
 * do not interpolate a name or a section into one. If a screen needs something
 * these do not say, that is a copy request.
 */

export const WAITING = {
  BEFORE_PURCHASE: 'Create your account to get started. Results unlock when both of you complete exercises.',
  DASHBOARD: 'Results unlock once both of you complete your exercises.',
  EXERCISE_FOOTER: 'Your answers are saved, results will open once you both complete all exercises.',
  LOCKED_BY_YOU: 'Finish your exercises to open this.',
  LOCKED_BY_THEM: 'This section will unlock once your partner completes their exercises.',
} as const;

/** Settings says what the dashboard says. Ellie: "This can just be group 2." */
export const WAITING_SETTINGS = WAITING.DASHBOARD;

/** Your own exercises are unfinished, where a page would otherwise fill in. */
export const WAITING_NOT_FILLED_IN = WAITING.LOCKED_BY_YOU;
