/**
 * When a couple's results open.
 *
 * ── WHY THIS FILE ─────────────────────────────────────────────────────────
 * The rule was written three times, and the three did not agree:
 *
 *   api/home.js      both partners through the CORE exercises (Communication,
 *                    Expectations). Add-ons ignored entirely.
 *   api/results.js   both partners through Communication. That is all.
 *   src/App.jsx      my Communication and Expectations, a partner who has
 *                    finished those two, plus intimacy when the couple owns
 *                    it. Conflict Patterns and Reflection ignored.
 *
 * So a couple who owned Conflict Patterns and had not finished it saw their
 * whole results experience anyway, with only the conflict section locked.
 * Ellie found it as "even though his conflict is missing, we can access our
 * results". Three answers to one question is how that happens: nothing was
 * broken, the three copies just drifted, and each looked right on its own.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * Results open when both partners have finished every exercise the couple
 * OWNS. Not the core two, not a hand-named subset. Owned, because a couple
 * cannot finish an exercise they did not buy, and every one they did buy feeds
 * something a results page says.
 *
 * Ownership is read from the package capabilities, so adding an exercise to
 * api/_exercises.js extends this with no edit here. That is the point: the
 * previous version named ex1 and ex2 by hand, and Conflict Patterns was added
 * to the product without anyone thinking to widen a gate they did not know
 * existed in three places.
 *
 * ── WHAT THIS DELIBERATELY DOES NOT DECIDE ────────────────────────────────
 * Demo mode. `?demo=` shows a fixture couple who are complete by construction,
 * and that escape hatch belongs to the caller, not to the rule. Nor does it
 * decide what a waiting person sees instead: api/results.js still returns a
 * self-only read so someone can see their own answers back while waiting.
 */

import { EXERCISES, isExerciseDone } from '../_exercises.js';

/** Does this couple own this exercise? A null capability means everyone does. */
export function ownsExercise(exercise, pkg) {
  return !exercise.capability || !!pkg?.[exercise.capability];
}

/**
 * Completion for every exercise, from a profile row.
 *
 * Server callers hold raw columns; this turns them into the shape the gate
 * wants without each endpoint restating which column belongs to which
 * exercise.
 */
export function doneFromProfile(profile) {
  return Object.fromEntries(
    EXERCISES.map((e) => [e.key, isExerciseDone(e, profile?.[e.column])]));
}

/**
 * @param {object} args
 * @param {object} args.pkg          capability flags: hasAnniversary, hasIntimacy, hasConflict
 * @param {Record<string,boolean>} args.mine    key -> finished, this person
 * @param {Record<string,boolean>} args.theirs  key -> finished, their partner
 * @param {boolean} args.partnerLinked
 * @returns {{ ready: boolean, reason: string|null, waitingOn: Array<{key:string,label:string,who:'you'|'partner'|'both'}> }}
 */
export function resultsGate({ pkg, mine, theirs, partnerLinked }) {
  if (!partnerLinked) {
    return { ready: false, reason: 'no_partner_linked', waitingOn: [] };
  }

  const waitingOn = [];
  for (const e of EXERCISES) {
    if (!ownsExercise(e, pkg)) continue;
    const you = !!mine?.[e.key];
    const them = !!theirs?.[e.key];
    if (you && them) continue;
    waitingOn.push({
      key: e.key,
      label: e.label,
      who: !you && !them ? 'both' : (!you ? 'you' : 'partner'),
    });
  }

  if (!waitingOn.length) return { ready: true, reason: null, waitingOn: [] };

  // Reasons kept as they were, because the app and the website already branch
  // on these four strings. Widening the rule should not break a caller that
  // only wanted to know who to name in the waiting copy.
  const anyYou = waitingOn.some((w) => w.who === 'you' || w.who === 'both');
  const anyThem = waitingOn.some((w) => w.who === 'partner' || w.who === 'both');
  const reason = anyYou && anyThem ? 'neither_complete'
    : anyYou ? 'you_incomplete'
    : 'partner_incomplete';

  return { ready: false, reason, waitingOn };
}
