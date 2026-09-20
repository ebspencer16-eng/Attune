/**
 * The word of the day, and what it means.
 *
 * ── WHY THIS FILE ─────────────────────────────────────────────────────────
 * Ellie: "Maybe we could even do the dictionary definition tiles and include
 * the dictionary definition of a different word every day (intentional,
 * connection, growth, expectations, etc.)."
 *
 * One copy, served to the app through /api/home, for the same reason
 * api/_research.js exists: the words a customer reads live in one place, so
 * two surfaces cannot end up defining the same word slightly differently, and
 * so Ellie can edit them without going through an app build.
 *
 * ── THE COPY IS NOT MINE ──────────────────────────────────────────────────
 * Ellie writes everything a customer reads. She named four words and said
 * "etc.", so the four are here and the definitions are a first pass in her
 * house style: one sentence, present tense, no hedging. They are flagged in
 * TASKS.md as C3 and are hers to rewrite or replace, and the list is hers to
 * extend. Nothing else in the app reads a definition from anywhere but here.
 *
 * ── PART OF SPEECH ────────────────────────────────────────────────────────
 * The reference she sent is a dictionary entry: "noun" small above the word,
 * the word very large, the meaning under it. `part` is that line. It is not
 * decoration: it is what makes the tile read as a definition rather than as a
 * quote.
 */

export const WORDS = [
  {
    id: 'intentional',
    word: 'Intentional',
    part: 'adjective',
    definition: 'Done on purpose, and for a reason you could say out loud.',
  },
  {
    id: 'connection',
    word: 'Connection',
    part: 'noun',
    definition: 'The sense of being held in someone else’s mind when you are not in the room.',
  },
  {
    id: 'growth',
    word: 'Growth',
    part: 'noun',
    definition: 'Change you chose, rather than change that happened to you.',
  },
  {
    id: 'expectations',
    word: 'Expectations',
    part: 'noun',
    definition: 'What you are each quietly counting on, whether or not it has been said.',
  },
];

/**
 * One word, chosen by the day rather than at random.
 *
 * The same argument researchOfTheDay makes: random means a reader who opens
 * the app twice in a minute is shown two different words, which reads as
 * decoration. By the day it is one word for as long as the day lasts.
 *
 * Offset by one against the research finding, so the two tiles do not both
 * turn over on the same days and then both sit still for the same days.
 */
export function wordOfTheDay(now = new Date()) {
  const day = Math.floor(now.getTime() / 86400000);
  return WORDS[(day + 1) % WORDS.length];
}
