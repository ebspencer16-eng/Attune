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
 * ── WHO WROTE THESE ───────────────────────────────────────────────────────
 * Ellie writes everything a customer reads. She named four words and said
 * "etc.", and then, of the gap: "Build 50 words to start, build a review doc
 * for me." So the fifty are mine, written to her house style: one sentence,
 * present tense, no hedging, no em dashes, and no definition that tells a
 * couple which way to be.
 *
 * They are a first draft she has not read yet. WORDS-REVIEW.md is generated
 * from this file, one row per word, for exactly that: it reads the product
 * rather than restating it, so a word edited here is edited there.
 *
 * ── THEY ARE NOT DICTIONARY DEFINITIONS ───────────────────────────────────
 * Deliberately. "Growth: change you chose, rather than change that happened to
 * you" is not what a dictionary says and is what this product means. A row of
 * real dictionary entries would be a vocabulary tile on a relationship app,
 * which is a different and duller thing.
 *
 * Nothing else in the app reads a definition from anywhere but here.
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
  {
    id: 'repair',
    word: 'Repair',
    part: 'noun',
    definition: 'What you do after it goes wrong, which counts for more than what went wrong.',
  },
  {
    id: 'rupture',
    word: 'Rupture',
    part: 'noun',
    definition: 'The moment it goes wrong, which is ordinary and is not the end of anything.',
  },
  {
    id: 'attunement',
    word: 'Attunement',
    part: 'noun',
    definition: 'Noticing what your partner needs before they have to ask for it twice.',
  },
  {
    id: 'bid',
    word: 'Bid',
    part: 'noun',
    definition: 'A small move toward someone that asks to be met.',
  },
  {
    id: 'boundary',
    word: 'Boundary',
    part: 'noun',
    definition: 'A line you hold for yourself, not a rule you set for someone else.',
  },
  {
    id: 'curiosity',
    word: 'Curiosity',
    part: 'noun',
    definition: 'Asking to find out, rather than asking to make a point.',
  },
  {
    id: 'reliability',
    word: 'Reliability',
    part: 'noun',
    definition: 'Being who you were yesterday on a day when it is harder.',
  },
  {
    id: 'vulnerability',
    word: 'Vulnerability',
    part: 'noun',
    definition: 'Saying the thing you would rather imply.',
  },
  {
    id: 'trust',
    word: 'Trust',
    part: 'noun',
    definition: 'Expecting to be handled carefully by someone close enough to hurt you.',
  },
  {
    id: 'listening',
    word: 'Listening',
    part: 'noun',
    definition: 'Staying inside the sentence you are being told, rather than the one you are about to say.',
  },
  {
    id: 'compromise',
    word: 'Compromise',
    part: 'noun',
    definition: 'An answer neither of you would have written alone.',
  },
  {
    id: 'assumption',
    word: 'Assumption',
    part: 'noun',
    definition: 'Something you decided was true without checking.',
  },
  {
    id: 'gratitude',
    word: 'Gratitude',
    part: 'noun',
    definition: 'Saying out loud what you would otherwise only notice.',
  },
  {
    id: 'presence',
    word: 'Presence',
    part: 'noun',
    definition: 'Being in the room you are actually in.',
  },
  {
    id: 'honesty',
    word: 'Honesty',
    part: 'noun',
    definition: 'Telling your partner the thing you already know.',
  },
  {
    id: 'forgiveness',
    word: 'Forgiveness',
    part: 'noun',
    definition: 'Deciding to stop charging someone for something they have already paid for.',
  },
  {
    id: 'accountability',
    word: 'Accountability',
    part: 'noun',
    definition: 'Owning your half before anyone asks you to.',
  },
  {
    id: 'reassurance',
    word: 'Reassurance',
    part: 'noun',
    definition: 'Answering a question your partner has not managed to ask.',
  },
  {
    id: 'affection',
    word: 'Affection',
    part: 'noun',
    definition: 'The ordinary contact that says you are still here.',
  },
  {
    id: 'ritual',
    word: 'Ritual',
    part: 'noun',
    definition: 'A small thing you do on purpose, often enough that it means something.',
  },
  {
    id: 'commitment',
    word: 'Commitment',
    part: 'noun',
    definition: 'Choosing the same person again on a day you have reasons not to.',
  },
  {
    id: 'autonomy',
    word: 'Autonomy',
    part: 'noun',
    definition: 'Being your own person inside something shared.',
  },
  {
    id: 'interdependence',
    word: 'Interdependence',
    part: 'noun',
    definition: 'Needing each other on purpose rather than by accident.',
  },
  {
    id: 'conflict',
    word: 'Conflict',
    part: 'noun',
    definition: 'Two people wanting different things, which is not the same as two people being against each other.',
  },
  {
    id: 'withdrawal',
    word: 'Withdrawal',
    part: 'noun',
    definition: 'Leaving the conversation while staying in the room.',
  },
  {
    id: 'escalation',
    word: 'Escalation',
    part: 'noun',
    definition: 'The point where the argument stops being about the thing.',
  },
  {
    id: 'softening',
    word: 'Softening',
    part: 'noun',
    definition: 'Lowering your voice first, when neither of you wants to.',
  },
  {
    id: 'empathy',
    word: 'Empathy',
    part: 'noun',
    definition: 'Understanding the feeling without needing it to be reasonable.',
  },
  {
    id: 'validation',
    word: 'Validation',
    part: 'noun',
    definition: 'Saying the feeling makes sense, which is not the same as agreeing.',
  },
  {
    id: 'intimacy',
    word: 'Intimacy',
    part: 'noun',
    definition: 'Being known, which takes longer than being close.',
  },
  {
    id: 'desire',
    word: 'Desire',
    part: 'noun',
    definition: 'Wanting your partner in a way you would say out loud.',
  },
  {
    id: 'initiation',
    word: 'Initiation',
    part: 'noun',
    definition: 'Going first, without knowing the answer.',
  },
  {
    id: 'consent',
    word: 'Consent',
    part: 'noun',
    definition: 'A yes that could have been a no.',
  },
  {
    id: 'resentment',
    word: 'Resentment',
    part: 'noun',
    definition: 'The bill for everything you did not say.',
  },
  {
    id: 'contempt',
    word: 'Contempt',
    part: 'noun',
    definition: 'Disagreement with a low opinion attached.',
  },
  {
    id: 'defensiveness',
    word: 'Defensiveness',
    part: 'noun',
    definition: 'Answering the accusation instead of the person.',
  },
  {
    id: 'appreciation',
    word: 'Appreciation',
    part: 'noun',
    definition: 'Noticing out loud, on a day nothing is wrong.',
  },
  {
    id: 'compatibility',
    word: 'Compatibility',
    part: 'noun',
    definition: 'Less about being alike than about how you handle being different.',
  },
  {
    id: 'partnership',
    word: 'Partnership',
    part: 'noun',
    definition: 'Two people carrying something neither could carry alone.',
  },
  {
    id: 'fairness',
    word: 'Fairness',
    part: 'noun',
    definition: 'A split you would both still choose if you swapped sides.',
  },
  {
    id: 'grace',
    word: 'Grace',
    part: 'noun',
    definition: 'Giving someone the reading of their behaviour you would want for your own.',
  },
  {
    id: 'restraint',
    word: 'Restraint',
    part: 'noun',
    definition: 'The sentence you had ready and did not use.',
  },
  {
    id: 'humility',
    word: 'Humility',
    part: 'noun',
    definition: 'Being willing to be wrong in front of the person you live with.',
  },
  {
    id: 'steadiness',
    word: 'Steadiness',
    part: 'noun',
    definition: 'Being predictable in the ways that matter.',
  },
  {
    id: 'patience',
    word: 'Patience',
    part: 'noun',
    definition: 'Letting something take the time it takes.',
  },
  {
    id: 'generosity',
    word: 'Generosity',
    part: 'noun',
    definition: 'Assuming the better reason first.',
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
