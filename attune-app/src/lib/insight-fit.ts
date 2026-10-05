/**
 * How big the insight of the day is set, and how many lines it gets.
 *
 * ── WHY IT IS ITS OWN FILE ────────────────────────────────────────────────
 * check-insight-fits used to lift four constants out of resources.tsx and
 * re-run the formula itself. That is a second copy of a rule, which is the
 * failure this codebase keeps paying for, and the copies had already started to
 * matter: the rule changed when the citation learned to shrink, and the gate
 * would have gone on proving the old one.
 *
 * So the arithmetic lives here, the screen calls it, and the gate imports the
 * same function. One copy, executed by both.
 *
 * What stays outside: how much room there is. That is measured from the running
 * layout on the phone and estimated from a screenshot in the gate, and they are
 * honestly different numbers. This file answers only the question that broke.
 */

/** Largest the quotation is ever set at. */
export const QUOTE_BASE = 18;
/** Line height as a multiple of the type size. */
export const QUOTE_LEADING = 1.5;
/** Smallest the quotation is ever set at. Below this it stops being readable. */
export const QUOTE_FLOOR = 12;

/**
 * ── THE CITATION SHRINKS WITH THE QUOTE ───────────────────────────────────
 * Ellie: "yesterday's quote looked odd since it was not larger than the
 * citation text. If we shrink the quote text, we need to also shrink the
 * citation so it's smaller. Maybe that gives us more space for the quote?"
 *
 * Both halves of that. The citation is a fixed fraction of whatever the quote
 * sets at, so it is always the smaller of the two, and because it is smaller it
 * takes less room, which is room the quote gets back. She is right that the one
 * buys the other.
 *
 * 0.72 is the ratio the tile already had at full size: 13 point small text
 * under an 18 point quotation. So nothing moves on a short insight, and a long
 * one keeps the same relationship instead of losing it.
 */
export const CITE_RATIO = 0.72;
/**
 * ── THE CITATION HAS A FLOOR, AND THE FLOOR SETS THE MAXIMUM ──────────────
 * Ellie: "We need to set a minimum bound for this so that the citation is
 * always readable. Working backwards from this, and using what we know about
 * the heights, we can set a max quote length."
 *
 * That is the right order and it runs this way: the citation never goes below
 * 11, which costs the quotation a fixed amount of room at every size, and what
 * is left is the longest quotation that can ever be set. check-insight-fits
 * computes that number from this one and prints it, and fails on any insight
 * over it, so the limit is a measurement rather than a guess written down.
 *
 * 9 was the old floor and it was reached: a 12 point quotation took a 9 point
 * citation, which is small print under small print.
 */
export const CITE_FLOOR = 11;
export const CITE_LEADING = 1.45;
/** What the budget sets aside for it. A book citation runs to two. */
export const CITE_LINES = 2;

/**
 * How wide a line is taken to be, per point of type.
 *
 * Playfair at this weight runs about half the point size per character.
 * Approximate, and only has to be close: adjustsFontSizeToFit is the backstop,
 * so being one size out costs a point of type rather than a cut quotation.
 */
export const CHAR_RATIO = 0.5;

export function citeSize(quote: number): number {
  return Math.max(CITE_FLOOR, Math.round(quote * CITE_RATIO));
}

/** The height the citation takes at a given quote size. */
export function citeHeight(quote: number): number {
  return Math.round(citeSize(quote) * CITE_LEADING) * CITE_LINES;
}

export type Fit = { size: number; lines: number; cite: number };

/**
 * ── SIZE, LINE COUNT AND CITATION ARE ONE QUESTION ────────────────────────
 * An earlier version chose the line count at the base size and then shrank the
 * type to reach it, and the gate found what is wrong with that: the leading
 * shrinks with the type, so a smaller size does not just fit more characters on
 * a line, it fits more LINES in the same room. Solving them separately made the
 * longest quotations unfittable at any size when in fact they fit comfortably
 * one step down.
 *
 * The citation is the same trap one step along. Its height depends on the
 * quote's size, and the quote's room depends on the citation's height, so
 * settling either one first is settling it on a number that is about to change.
 *
 * So each candidate size is asked the whole question at once, largest first:
 * at this size the citation is this tall, which leaves this much room, which
 * holds this many lines, and does the quotation fit in them. The first yes wins.
 *
 * @param room  Everything the insight block has, minus every fixed part of its
 *              furniture, and NOT minus the citation. The citation is this
 *              function's business because its height moves with the answer.
 */
export function quoteFit({ text, room, width }: {
  text: string; room: number; width: number;
}): Fit {
  for (let size = QUOTE_BASE; size >= QUOTE_FLOOR; size -= 1) {
    const left = room - citeHeight(size);
    const leading = Math.round(size * QUOTE_LEADING);
    const lines = Math.floor(left / leading);
    if (lines < 1) continue;
    const perLine = Math.max(12, Math.floor(width / (size * CHAR_RATIO)));
    if (Math.ceil(text.length / perLine) <= lines) return { size, lines, cite: citeSize(size) };
  }
  /* Nothing fit. The floor is the floor, and adjustsFontSizeToFit takes the
     quotation the rest of the way rather than cutting it. */
  const left = room - citeHeight(QUOTE_FLOOR);
  const leading = Math.round(QUOTE_FLOOR * QUOTE_LEADING);
  return {
    size: QUOTE_FLOOR,
    lines: Math.max(1, Math.floor(left / leading)),
    cite: citeSize(QUOTE_FLOOR),
  };
}
