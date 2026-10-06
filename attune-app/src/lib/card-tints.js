/**
 * The four shelf tints an In Practice card is grounded in.
 *
 * ── WHY THIS IS ITS OWN FILE, AND WHY IT IS .js ───────────────────────────
 * Ellie: "I want the site's in practice to look exactly like the app's. That
 * means the same visuals, coloring, etc."
 *
 * The app grounds each article card in a tint picked by the shelf's position in
 * the server's own list, from SectionColor in attune-theme.ts. The website
 * cannot read that: it is TypeScript, and vite runs a .ts through esbuild,
 * which looks for the nearest tsconfig and finds attune-app's, which extends
 * expo/tsconfig.base, which the website's own `npm ci` does not install. That
 * exact import broke the Vercel deploy for two commits and the only symptom was
 * that Ellie's fixes were not on the site.
 *
 * Plain JavaScript asks no tsconfig, which is the same reason insight-fit.js is
 * .js. So the four values live here and both surfaces import them, rather than
 * the website carrying a second list of four hex codes that would agree for a
 * while.
 *
 * ── WHERE THEY CAME FROM ──────────────────────────────────────────────────
 * SectionColor's communication, expectations, reflection and intimacy, in that
 * order. They are not re-exported FROM it because that is the .ts this file
 * exists to avoid, so check-card-tints holds the two lists to each other.
 *
 * `1f` is the alpha the card ground is drawn at: a tint, not the colour. Four
 * shelves across twelve pieces come out as four families, which is what the
 * shelves are, and a flat grey for every one reads as a picture that failed to
 * load.
 */
export const CARD_TINTS = ['#E8673A', '#1B5FE8', '#10B981', '#B5546E'];

/** The alpha a card's ground is drawn at, as a hex suffix. */
export const CARD_TINT_ALPHA = '1f';

/**
 * The ground for one article: its own hero colour, or its shelf's tint.
 *
 * @param {string|null|undefined} heroColor  what the admin set, if anything
 * @param {number} shelfIndex  the shelf's position in the server's list
 */
export function cardGround(heroColor, shelfIndex) {
  if (heroColor) return heroColor;
  const i = Math.max(0, shelfIndex) % CARD_TINTS.length;
  return `${CARD_TINTS[i]}${CARD_TINT_ALPHA}`;
}
