/**
 * How two people's marks are placed on a track.
 *
 * ── WHY THESE ARE HERE ────────────────────────────────────────────────────
 * Every scale in the results puts two dots on one line. When the two land in
 * nearly the same place they have to be separated or they print on top of each
 * other, and the page then says two people answered identically when they did
 * not.
 *
 * The rule is four numbers, and they were written out twice: once in
 * src/App.jsx and once in attune-app/src/components/results.tsx, whose comment
 * says "every number here is the website's, because the placement rule is the
 * whole point of the chart and two products cannot round it differently".
 * That was true and it was maintained by hand.
 *
 * The website imports these. The app cannot import from api/, so it keeps
 * named constants and check-track-marks.mjs fails the build if they stop
 * matching this file. That is the documented fallback: derive where you can,
 * and gate where you genuinely cannot.
 *
 * ── WHY THE STAGGER IS 7 ──────────────────────────────────────────────────
 * It was 11, which on a 22 point dot puts the two exactly edge to edge: 22
 * points of centre separation for a 22 point dot. They read as two unrelated
 * marks that happen to be stacked.
 *
 * Ellie: "when the dots offset they're slightly too far apart. Can we bring
 * them tighter together? it's fine if their white outlines overlap, I'd prefer
 * that." At 7 they overlap by 8 points, which reads as one pair rather than
 * two marks, and the white outlines make the front one legible over the back.
 */

/** Two marks within this many percent of the track count as close. */
export const CLOSE_PCT = 8;

/** How far each of a close pair moves from the line, in points. */
export const STAGGER = 7;

/** The same rule on the side-by-side rows, which carry up to four marks. */
export const SBS_NEAR = 7;

/** How far a mark steps when its row is already taken. */
export const SBS_STEP = 9;

/**
 * The top of the scale the storycards place a mark against.
 *
 * ── WHY THIS IS HERE AND NOT A DIVISION IN TWO FILES ──────────────────────
 * The dimensions storycard puts each person's score on a track. The website
 * divides by 5 and the app divided by 4 after subtracting 1, so the same
 * answer sat in two different places on what is meant to be the same card.
 * Nobody would have caught that by reading either file: both look like a
 * reasonable way to map a 1 to 5 answer onto a line.
 *
 * Five, because that is what the website has always drawn and the website is
 * the card people have seen. It is deliberately not the results pages' own
 * mapping, which starts the track at the lowest answer rather than at zero;
 * that is a different chart with axis labels either end.
 */
export const CARD_SCALE_MAX = 5;
