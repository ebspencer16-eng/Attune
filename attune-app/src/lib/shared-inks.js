/**
 * Two colours the website and the app both draw, in one place.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Both were a hex typed into src/App.jsx and the same hex typed into an app
 * screen. They agreed, which is exactly why nobody had looked: "values that
 * agree today are the ones nothing watches." The same shape produced a section
 * with two names, two sections with two colours, and the two people's colours
 * restated in the app with nothing holding them to the website's.
 *
 * Found by sweeping every UPPER_SNAKE constant declared on more than one
 * surface: 24 of them, 14 agreeing exactly. Most of the 24 are a name used for
 * two different things, or an environment variable that is legitimately
 * different per surface. These two are one value, drawn twice.
 *
 * ── WHY ITS OWN FILE, AND WHY .js ─────────────────────────────────────────
 * The same reason as aligned-tone.js, card-tints.js, insight-fit.js and
 * quick-tiles.js next door: vite runs a .ts through esbuild, which looks for
 * the nearest tsconfig and finds attune-app's, which extends
 * expo/tsconfig.base, which the website's own `npm ci` does not install. That
 * exact import broke the Vercel deploy for two commits and the only symptom
 * was that Ellie's fixes were not on the site. Plain JavaScript asks no
 * tsconfig.
 */

/** The ink the home screen's quick-link icons are drawn in. */
export const QUICK_INK = '#8F8071';

/** The ground behind a featured In Practice tile. */
export const TILE_GREY = '#EFECE7';
