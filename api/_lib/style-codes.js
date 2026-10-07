/**
 * The individual style code: its axes, how one is read, and all of them.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * The code was four axes once. It is six now, and three places still believed
 * four, each in a different way, and not one of them failed:
 *
 *   src/App.jsx's getStyleCode returns six letters, and its own header comment
 *   described the fourth axis as C/A while the code returns R/L.
 *
 *   api/track-type.js validated an incoming code against /^[EIXGFSC]{4}$/:
 *   four characters, from an alphabet that contains none of R, L, D, H, Q or T.
 *   A code that failed was skipped rather than refused, so every style code
 *   the product has ever produced was dropped without a word.
 *
 *   api/get-feedback.js generated the sixteen four-letter combinations of
 *   E/I, X/G, F/S and C/A and asked the store for a count under each, so the
 *   admin's style distribution read zero for all sixteen.
 *
 * Between them, a thing the product computes for every person was written
 * nowhere and read as nothing, and the chart said so in a way that looks
 * exactly like having no customers.
 *
 * So the axes are here. The website reads a code through styleCodeFor, the
 * endpoint validates with STYLE_CODE_PATTERN, and the admin enumerates
 * ALL_STYLE_CODES. check-style-codes holds all three to this file.
 */

/**
 * The six axes, in the order they appear in a code.
 *
 * `dims` is averaged when there is more than one. Four axes ask whether the
 * average is ABOVE neutral; the two marked `flip` ask whether it is BELOW, and
 * that difference is not cosmetic. An exact 3 answers no to both questions, so
 * on a normal axis neutral takes `below` and on a flipped one it takes `above`.
 *
 * Getting that wrong is how the first version of this file differed from the
 * website's own getStyleCode on 7,104 of 20,000 score sets: a dimension sitting
 * exactly on neutral is about one draw in five, and two axes are flipped.
 */
export const STYLE_AXES = [
  { dims: ['energy'], above: 'E', below: 'I', meaning: 'Outward / Inward' },
  { dims: ['expression', 'feedback'], above: 'X', below: 'G', meaning: 'Expressive / Guarded' },
  { dims: ['conflict'], above: 'S', below: 'F', flip: true, meaning: 'Fast-engage / Space-first' },
  { dims: ['listening'], above: 'R', below: 'L', meaning: 'Responsive / Reflective' },
  { dims: ['needs'], above: 'D', below: 'H', meaning: 'Direct / Hint' },
  { dims: ['repair'], above: 'T', below: 'Q', flip: true, meaning: 'Quick-gesture / Talk-through' },
];

/**
 * What each axis's popularity counter is called in the store.
 *
 * The first dimension of the axis, which is what track-type.js already used
 * for the four it knew about: energy, expression, conflict, listening. Named
 * here so the endpoint that writes them and the admin that reads them back
 * cannot disagree, which they did about how many there were.
 */
export const AXIS_COUNTER_NAMES = STYLE_AXES.map((a) => a.dims[0]);

/** Every letter a code can contain, for validating one that arrives. */
export const STYLE_LETTERS = STYLE_AXES.flatMap((a) => [a.above, a.below]);

/** What a code has to look like: six letters, each from its own axis. */
export const STYLE_CODE_PATTERN = new RegExp(`^${STYLE_AXES.map((a) => `[${a.above}${a.below}]`).join('')}$`);

/** This person's code, from their dimension scores. */
export function styleCodeFor(scores) {
  return STYLE_AXES.map((axis) => {
    const sum = axis.dims.reduce((t, d) => t + (scores?.[d] ?? 3), 0);
    const avg = sum / axis.dims.length;
    /* A flipped axis asks whether the score is below neutral, so an exact 3
       answers no and takes `above`. check-style-codes runs this against the
       website's own reading over twenty thousand score sets and at the
       boundary itself, because that is where the two parted. */
    return axis.flip
      ? (avg < 3.0 ? axis.below : axis.above)
      : (avg > 3.0 ? axis.above : axis.below);
  }).join('');
}

/**
 * Every code the axes can produce, for a chart that wants a row per code.
 *
 * Sixty-four of them, where the admin asked for sixteen. Generated rather than
 * listed, so a seventh axis cannot leave this behind the way the fourth did.
 */
export const ALL_STYLE_CODES = (() => {
  let codes = [''];
  for (const axis of STYLE_AXES) {
    codes = codes.flatMap((c) => [c + axis.above, c + axis.below]);
  }
  return codes;
})();
