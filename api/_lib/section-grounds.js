/**
 * The coloured ground each results page sits on.
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
 * The gradients were typed on both surfaces: a CSS string in src/App.jsx and
 * an array of hex stops in the app. Five pages, ten copies, nothing checking
 * that they agreed. Four pairs did agree. The fifth did not, and had not for
 * as long as the app has had a Communication page: the website draws it in
 * #3B2A6B to #6C4BB0 to #C8522E, purple into the brand orange, and the app
 * drew it in Conflict's two-stop blue. The section Ellie has spent the most
 * time on was the one section wearing another section's colour.
 *
 * That is the failure CLAUDE.md opens with, in its most literal form. So the
 * stops live here. The website builds its CSS string from them, and the app
 * receives them on the results nav, next to the accent colour it already takes
 * from the same place.
 *
 * ── WHAT IS AND IS NOT HERE ───────────────────────────────────────────────
 * The pages that carry a fixed gradient. Not the ones whose ground is derived
 * from something else: a Communication detail page is tinted from its domain's
 * colour and an intimacy dimension page from its own, and both already come
 * from one function each (COMM_DOMAINS, groundForDimension). Not the pages
 * that are cream on both surfaces, which is most of the detail pages.
 *
 * `mid` is where the middle stop sits, which the CSS says and the app's
 * gradient does not: expo-linear-gradient spaces stops evenly unless it is
 * given locations, so the app passes them.
 */

/** angle is CSS degrees; mid is the middle stop's position, in percent. */
export const SECTION_GROUNDS = {
  'comm-overview': { angle: 150, mid: 55, stops: ['#3B2A6B', '#6C4BB0', '#C8522E'] },
  'exp-overview': { angle: 150, mid: 55, stops: ['#2E2A6B', '#4C56C0', '#1B8FA8'] },
  /** Every expectations conversation page. The website calls this EXP_BG. */
  'exp-detail': { angle: 145, mid: 55, stops: ['#443D8C', '#6F63D6', '#514AAE'] },
  'reflection-overview': { angle: 150, mid: 55, stops: ['#22285E', '#3E63C8', '#10A5B8'] },
  'intimacy-overview': { angle: 150, mid: 55, stops: ['#4A1B33', '#A34468', '#C8703E'] },
  'conflict-overview': { angle: 150, mid: 55, stops: ['#1B2A5E', '#2F55C4', '#1B8FB8'] },
};

/** The stops, for a surface that builds its own gradient. */
export function groundFor(id) {
  return SECTION_GROUNDS[id]?.stops || null;
}

/** Where each stop sits, 0 to 1, for expo-linear-gradient. */
export function groundLocations(id) {
  const g = SECTION_GROUNDS[id];
  if (!g) return null;
  return [0, g.mid / 100, 1];
}

/** The CSS the website paints. */
export function gradientCss(id) {
  const g = SECTION_GROUNDS[id];
  if (!g) return null;
  const [from, mid, to] = g.stops;
  return `linear-gradient(${g.angle}deg, ${from}, ${mid} ${g.mid}%, ${to})`;
}
