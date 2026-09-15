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

/**
 * The deep end of every at-a-glance gradient, and the one thing they share.
 *
 * Ellie: "I don't like the black bg, could we make all of these the attune
 * navy bg?" Four of the five started somewhere between #22285E and #3B2A6B,
 * which on a phone in a lit room reads as black. This is the navy the home
 * screen already opens on, so the app has one dark rather than five nearly.
 *
 * Physical Intimacy is the exception and keeps its own deep rose. Its
 * gradient runs rose into terracotta, and starting it navy makes a three-hue
 * gradient that belongs to no section. Say the word and it follows the others.
 */
const NAVY = '#1B2A5E';

/**
 * ── HOW DARK A STOP HAS TO BE ─────────────────────────────────────────────
 * Every one of these pages sets white type on the gradient. Ellie: "The
 * content is hard to read against these colors. How can we adjust the bgs to
 * make the content readable?"
 *
 * Measured rather than judged: the light end of four of the five grounds was
 * between 3.0 and 4.5 to 1 against white, and 4.5 is the readable ratio for
 * body text. So each stop is taken down toward black until it clears it,
 * which changes the colour as little as the requirement allows and leaves the
 * hue alone. check-ground-contrast.mjs measures every stop on every ground.
 */

/** Relative luminance, the sRGB definition. */
function luminance(hex) {
  const h = hex.replace('#', '').slice(0, 6);
  const parts = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2];
}

/** How white type reads on this colour, as a contrast ratio. */
export function contrastOnWhiteText(hex) {
  return 1.05 / (luminance(hex) + 0.05);
}

/** The same colour, taken toward black until white type clears `want`. */
export function readable(hex, want = READABLE) {
  const h = hex.replace('#', '').slice(0, 6);
  const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  for (let k = 100; k > 0; k -= 1) {
    const f = k / 100;
    const c = `#${rgb.map((v) => Math.round(v * f).toString(16).padStart(2, '0')).join('')}`;
    if (contrastOnWhiteText(c) >= want) return c;
  }
  return '#000000';
}

/** Body text on a coloured ground. The AA ratio, not a preference. */
export const READABLE = 4.6;

/**
 * ── WHY THESE FIVE ARE DIFFERENT COLOURS ──────────────────────────────────
 * Ellie: "expectations, rel relf, and conflict all look similar, can we get a
 * little more distinction for each of those pages?" All three ran navy into a
 * blue into a teal, because all three carry the same blue in the nav.
 *
 * They are five families now: Communication purple into the brand orange,
 * Expectations indigo into teal, Relationship Reflection green, Conflict blue
 * into a lighter blue, Physical Intimacy rose into terracotta. Reflection's
 * green is not invented: it is the colour that section already carries on What
 * Comes Next and in the app's own section palette.
 */

/** angle is CSS degrees; mid is the middle stop's position, in percent. */
const RAW = {
  'comm-overview': { angle: 150, mid: 55, stops: [NAVY, '#6C4BB0', '#C8522E'] },
  'exp-overview': { angle: 150, mid: 55, stops: [NAVY, '#4C56C0', '#1B8FA8'] },
  /** Every expectations conversation page, for a category with no colour. */
  'exp-detail': { angle: 145, mid: 55, stops: [NAVY, '#6F63D6', '#514AAE'] },
  'reflection-overview': { angle: 150, mid: 55, stops: [NAVY, '#2F7D62', '#10B981'] },
  'intimacy-overview': { angle: 150, mid: 55, stops: ['#5E2340', '#A34468', '#C8703E'] },
  /**
   * Ellie: "Conflict styles at a glance page needs some color." It ran navy
   * into a muted blue into a muted teal, which is reflection's old gradient
   * with the saturation taken out.
   */
  'conflict-overview': { angle: 150, mid: 55, stops: [NAVY, '#2F55C4', '#5B7FE8'] },
};

export const SECTION_GROUNDS = Object.fromEntries(
  Object.entries(RAW).map(([id, g]) => [id, { ...g, stops: g.stops.map((c) => readable(c)) }]),
);

/**
 * The Already aligned panel, on an expectations conversation page.
 *
 * ── WHY IT IS LIGHT, AND OPAQUE ───────────────────────────────────────────
 * Ellie: "Career and work is the only one that clashes and makes the already
 * aligned section hard to see."
 *
 * It was the section green at 7 per cent over whatever the page's ground is. A
 * translucent panel has no colour of its own; it borrows the one underneath.
 * Over the violet page it read green and over Career & Work's orange one it
 * read orange.
 *
 * The first fix was a deep green panel, and check-aligned-panel.mjs refused
 * it: Household's category colour is the same green, so on that one page the
 * panel would have been invisible in a new way. Which is the point of asking
 * the question of all six rather than of the one that was reported.
 *
 * So it is light. Every one of these pages is a dark gradient, so a pale panel
 * is legible on all six whatever their hue, and "you already agree about
 * these" is the calm half of the page anyway. Its type is ink rather than
 * white, for the same reason.
 */
export const ALIGNED_PANEL = {
  /** The tile. Pale green, opaque. */
  fill: '#EDF8F2',
  /** The heading bar over it, a shade deeper. */
  head: '#DCF0E6',
  /** The line around it and the rules between its rows. */
  border: 'rgba(16,185,129,0.45)',
  /** The heading, and the tick beside it. */
  accent: '#047857',
  /** Everything else inside it. */
  text: '#1E1610',
};

/**
 * The ground for one expectations conversation page, in its category's colour.
 *
 * Ellie: "Expectations detailed pages bgs should be gradients matching their
 * category color." All six drew the one violet, so the colour the category
 * carries everywhere else, on its tile, its pill and its bar, stopped at the
 * door of its own page.
 *
 * Built the way the intimacy dimension pages are built, which is the pattern
 * this codebase already had for exactly this: the tint at two alphas over the
 * shared deep end, so six pages are recognisably one section in six colours
 * rather than six unrelated grounds.
 */
export function groundForCategory(color) {
  if (!color) return SECTION_GROUNDS['exp-detail'].stops;
  /**
   * Opaque, and dark enough to read on.
   *
   * These were the colour at two alphas, which is fine over a dark page and
   * is not what either surface does: the app composites a gradient over cream,
   * so a category colour at 53 per cent became a pale wash with white type on
   * it. Ellie: "The content is hard to read against these colors."
   *
   * A deep version of the category's colour, then the readable version of it,
   * then the shared navy. The category is still recognisable and every stop
   * clears the body-text ratio.
   */
  return [readable(color, 9), readable(color), NAVY];
}

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
