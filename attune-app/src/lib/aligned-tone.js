/**
 * What colour an alignment percentage is drawn in.
 *
 * Green when two people are close, amber in the middle, orange when they are
 * far apart. The same three wherever a percentage appears, which is the whole
 * point of it and was not true.
 *
 * ── WHY ITS OWN FILE, AND WHY .js ─────────────────────────────────────────
 * There were three copies. A function called `alignedTone` in the app's
 * results.tsx, whose own comment said "the same three the expectations
 * categories use on their own bars, so a percentage means the same thing
 * wherever it appears"; an inline ternary fourteen hundred lines further down
 * the SAME FILE doing it again; and a third on the website, for the intimacy
 * dimension bars.
 *
 * All three agreed, which is the state every colour in this codebase has been
 * in just before it stopped agreeing. The website cannot import a .tsx, and it
 * cannot import the app's theme either, because a .ts import out of attune-app
 * is what broke the Vercel deploy for two commits. Plain JavaScript asks no
 * tsconfig, which is why insight-fit.js and card-tints.js are .js too.
 *
 * NOT the same thing as statColor in api/_lib/storycard-style.js, which steps
 * green, blue, orange at 70 and 50 for a large figure printed on a storycard.
 * That is a different palette for a different surface and its own note says so.
 */

/** Where the colour changes, highest first. */
export const ALIGNED_TONE_STOPS = [
  { from: 80, color: '#10b981' },
  { from: 50, color: '#F5B841' },
];

/** Below every stop. */
export const ALIGNED_TONE_LOW = '#E8673A';

/** @param {number} pct 0 to 100 @returns {string} */
export function alignedTone(pct) {
  const stop = ALIGNED_TONE_STOPS.find((s) => pct >= s.from);
  return stop ? stop.color : ALIGNED_TONE_LOW;
}
