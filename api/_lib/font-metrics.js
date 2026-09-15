/**
 * How tall a line of each of our two faces actually is.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie, on the In Practice reader: "Titles / heroes cut off on the top."
 *
 * React Native does not grow a line box to fit a glyph. Give a Text a
 * lineHeight smaller than the font's own line box and it clips, from the top,
 * where the ascenders are. The app's hero was 30 point type in a 34 point box,
 * which is 1.13 of its size, and Playfair Display declares a line box of 1.41.
 * So every hero in the app has been losing its top edge, and the effect is
 * worst on a display face with tall ascenders, which is exactly what a hero
 * is set in.
 *
 * ── WHERE THE NUMBERS COME FROM ───────────────────────────────────────────
 * The font files themselves, not a guess: usWinAscent plus usWinDescent over
 * unitsPerEm, from the OS/2 table of each face in attune-app/assets/fonts.
 * That pair is what iOS lays out with, and it is the larger of the two
 * definitions a font carries, so it is the one that has to fit.
 *
 * check-font-line-boxes.mjs reads the files on every build and fails if these
 * numbers stop matching them, or if any type style is set tighter than its
 * face allows. Swap a font and it will say so.
 */

/** Line box as a multiple of the font size, by family. */
export const LINE_BOX = {
  /** Playfair Display Bold: 1410/1000. */
  display: 1.41,
  /** DM Sans, every weight: 1322/1000. */
  body: 1.33,
};

/** The smallest line height a size may be set in, for a family. */
export function minLineHeight(family, fontSize) {
  const ratio = LINE_BOX[family] || LINE_BOX.body;
  return Math.ceil(fontSize * ratio);
}
