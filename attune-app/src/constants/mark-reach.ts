/**
 * Whether a page can account for every mark anchored to it.
 *
 * ── WHAT HAPPENED ─────────────────────────────────────────────────────────
 * Ellie: "Not seeing the icon on the internal processing page that marks where
 * my note is. That keeps happening, we need to make sure the icons don't
 * randomly vanish."
 *
 * A mark finds its words by substring: the margin marker is drawn by whichever
 * block of prose contains the text the mark was made on. That works, and it was
 * verified working on that exact page by making a mark and watching the marker
 * appear. What it cannot do is say anything when NO block contains the text,
 * and there are at least three ordinary ways for that to happen:
 *
 *   - the words are inside a collapsed section, so the block is not rendered
 *     at all. Internal Processing has one: "Side by side ... responses".
 *   - the copy changed. The mark stores a copy of the words; the words live in
 *     api/. An edit orphans every mark made on that sentence.
 *   - the words were never in a <Prose> to begin with.
 *
 * In all three the reader sees nothing, which reads as the icon vanishing.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * Rather than enumerate the ways a marker can go missing, the page proves it
 * has placed them all: every block reports which marks it drew, and anything
 * left over is unplaced. A page with an unplaced mark opens its collapsed
 * sections, which resolves the first case outright and is the right answer to
 * the other two as well: if we cannot find the mark, show everything there is.
 *
 * ── WHY ITS OWN FILE ──────────────────────────────────────────────────────
 * No imports, so a gate can run it. check-mark-reach.mjs strips the types with
 * esbuild and executes these two functions over fixtures, which is the only
 * kind of check worth having here: this is a rule about behaviour, and a
 * scanner that matched on a name would pass on code that had stopped working.
 */

/** The parts of a mark this rule needs. `text` is the words it was made on. */
export type Placeable = { id: string; text: string };

/**
 * Which of these marks belong to this block of prose.
 *
 * Substring, because a mark is stored as the words themselves and a block is a
 * paragraph that may hold several. Empty text holds nothing: a block that has
 * not been given its copy yet must not claim every mark on the page.
 */
export function marksIn<T extends Placeable>(text: string, marks: T[]): T[] {
  // `!!m.text` is the rule, not decoration: every string contains the empty
  // string, so a mark stored with no words would be claimed by every
  // paragraph on the page and drawn half a dozen times.
  return marks.filter((m) => !!m.text && text.includes(m.text));
}

/**
 * The marks no block on this page has claimed.
 *
 * `placed` is every id reported by a rendered block. Anything anchored to the
 * page and not in it is somewhere the reader cannot see.
 */
export function unplacedMarks<T extends Placeable>(
  marks: T[],
  placed: Iterable<string>,
): T[] {
  const seen = new Set(placed);
  return marks.filter((m) => !seen.has(m.id));
}
