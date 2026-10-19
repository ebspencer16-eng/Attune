/**
 * The gap the storycards are built on, and what counts as aligned there.
 *
 * ── THE BUG THIS EXISTS FOR ───────────────────────────────────────────────
 * Ellie: "Our scorecard 4 says our comms styles are 100% aligned. That's
 * incorrect, right?" It was.
 *
 * Every dimension in this product has two gaps:
 *
 *   SELF     the distance between what each person said about themselves
 *   BLENDED  the distance after each score is mixed with the partner's view
 *            of them
 *
 * Blending exists to type a couple: it is the right input for the couple map,
 * because how you are seen is part of the dynamic. It is the wrong input for
 * "how far apart are your answers", and it shrinks gaps more often than not,
 * because mixing two numbers usually moves each toward the other.
 *
 * "Systematically" is what this said, and it is an overclaim. Swept over every
 * combination of two people's answers and two people's views of each other,
 * the blended gap is narrower 58 per cent of the time and WIDER 28 per cent:
 * a partner's view can push somebody further from their partner rather than
 * toward them. In the ordinary case, where each reads the other within a
 * point, it is narrower 74 per cent and wider 14. A tendency, and more than
 * enough to produce the bug below.
 *
 * The website has always known this. Its storycard block says so in a comment:
 * "Share-card couple type uses the blend; the gap feedback below stays self."
 * Every figure on its cards comes from calcDimScores, which is self.
 *
 * api/_lib/highlight-cards.js used `results.gaps`, which is blended. So the
 * app's cards were computed from different numbers than the website's, and
 * because blending pulls the two together more often than not, the app's
 * alignment percentage was usually the higher of the two. "Always" is what
 * this said, and it is the same overclaim as the paragraph above: a narrower
 * gap puts more dimensions under the threshold, and the gap is not always
 * narrower. For a couple who see each other accurately, where blending
 * narrows four times in five, it reaches 100 while the sliders on the
 * previous card visibly do not touch.
 *
 * It was not only the percentage. The same sort decides which five dimensions
 * the slider card shows, which dimension is named "where you're most in tune",
 * which is named "where you diverge most", and which conversation the couple
 * are handed at the end. All four could differ between the two products.
 *
 * ── WHY THE THRESHOLD IS NOT ALIGNMENT_THRESHOLD ──────────────────────────
 * ALIGNMENT_THRESHOLD.gap is 1.5, and it answers a different question: whether
 * a couple is misaligned overall, which needs a wide gap on at least three
 * dimensions. This is a per-dimension yes or no on a card, and the website has
 * always drawn the line at 1. Kept at 1 deliberately rather than quietly
 * moved: changing it changes a number every existing customer has already
 * seen, and that is Ellie's call, not a side effect of fixing which scores it
 * reads.
 */

/** A gap of one point or less counts as aligned on the storycards. */
export const CARD_ALIGNED_GAP = 1;

/** The self-report gap for one dimension, or null when either side is absent. */
export function selfGap(a, b) {
  if (a == null || b == null) return null;
  return Math.abs(a - b);
}

/**
 * What share of the scored dimensions count as aligned, as a whole percent.
 *
 * A dimension nobody has a score for is not counted either way. The website
 * read a missing gap as zero, which is the same as calling it perfectly
 * aligned, so an unanswered dimension quietly raised the figure.
 */
export function commAlignmentPct(gaps) {
  const scored = gaps.filter((g) => g != null);
  if (!scored.length) return 0;
  return Math.round((scored.filter((g) => g <= CARD_ALIGNED_GAP).length / scored.length) * 100);
}
