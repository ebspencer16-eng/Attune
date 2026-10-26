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
 * for me." Fifty were written for her to read.
 *
 * She has now read them and sent back her own list. The first 49 here are
 * hers, word for word, and they replace the drafts of those words entirely.
 * Consent is gone: "Note, I deleted 'consent'. Didn't like it."
 *
 * Then: "Please produce 50 more, I want a list of 100 to start." The 51 after
 * hers are mine, and 51 rather than 50 because the deletion left a gap.
 *
 * ── WHAT HER EDITS CHANGED, WHICH IS THE BRIEF FOR THE REST ───────────────
 * She said why, in general terms: "I think you can get a feel for why I made
 * the changes I did throughout, they're minor but I feel like they make
 * content relatable and less AI-sounding."
 *
 * Read against the drafts, the edits make four moves, and the 51 follow them:
 *
 *   1. A plain word where there was a careful one. "Engaging in the room you
 *      are actually in", not a sentence about attention.
 *   2. A verb where there was an abstraction. "Owning your responsibilities",
 *      not "the state of being answerable".
 *   3. Shorter, and then a word shorter. "Saying the thing you would rather
 *      imply" is the whole of Vulnerability.
 *   4. Nothing that tells a couple which way to be. Withdrawal and Contempt
 *      are described, not warned against.
 *
 * WORDS-REVIEW.md is generated from this file, one row per word: it reads the
 * product rather than restating it, so a word edited here is edited there.
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

import { dayNumber } from './_lib/day-number.js';

export const WORDS = [
  {
    id: 'intentional',
    word: 'Intentional',
    part: 'adjective',
    definition: 'Done on purpose, for a reason you could say out loud.',
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
    definition: 'What you do after things go wrong, which matters more than what went wrong.',
  },
  {
    id: 'rupture',
    word: 'Rupture',
    part: 'noun',
    definition: 'The moment something goes wrong, which is ordinary and is not the end of anything.',
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
    definition: 'A small move toward someone that asks to be met with attention of some form.',
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
    definition: 'Being who you were yesterday even if today is harder.',
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
    definition: 'Focusing on the sentence you are being told, rather than the one you are about to say.',
  },
  {
    id: 'compromise',
    word: 'Compromise',
    part: 'noun',
    definition: 'A path neither of you would have gone down alone but chose so that you could go together.',
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
    definition: 'Saying out loud the things that you would otherwise only notice.',
  },
  {
    id: 'presence',
    word: 'Presence',
    part: 'noun',
    definition: 'Engaging in the room you are actually in.',
  },
  {
    id: 'honesty',
    word: 'Honesty',
    part: 'noun',
    definition: 'Telling your partner things you know, believe, or feel rather than making them guess.',
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
    definition: 'Owning your responsibilities before anyone asks you to.',
  },
  {
    id: 'reassurance',
    word: 'Reassurance',
    part: 'noun',
    definition: 'Answering a question your partner has not yet managed to ask.',
  },
  {
    id: 'affection',
    word: 'Affection',
    part: 'noun',
    definition: 'The ordinary contact that shows you are still here.',
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
    definition: 'Being your own person inside of a shared experience or venture.',
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
    definition: 'The point where the argument stops being about the original thing.',
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
    definition: 'Saying the feeling makes sense, even if you don\'t agree.',
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
    definition: 'Going first, even when you don\'t know the answer.',
  },
  {
    id: 'resentment',
    word: 'Resentment',
    part: 'noun',
    definition: 'The bill for everything you have not said.',
  },
  {
    id: 'contempt',
    word: 'Contempt',
    part: 'noun',
    definition: 'Disagreement with a low opinion or judgement attached.',
  },
  {
    id: 'defensiveness',
    word: 'Defensiveness',
    part: 'noun',
    definition: 'Responding to the accusation instead of the person.',
  },
  {
    id: 'appreciation',
    word: 'Appreciation',
    part: 'noun',
    definition: 'Noticing out loud, on a day when nothing is wrong.',
  },
  {
    id: 'compatibility',
    word: 'Compatibility',
    part: 'noun',
    definition: 'Less about being alike and more about how you handle being different.',
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
    definition: 'Giving someone the reaction to behavior that you would want for your own.',
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
    definition: 'Willingness to be wrong in front of the person you respect.',
  },
  {
    id: 'steadiness',
    word: 'Steadiness',
    part: 'noun',
    definition: 'Being predictable in the ways that your partner depends on.',
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
    definition: 'Giving someone the benefit of the doubt and showing it through your actions.',
  },
  {
    id: 'admiration',
    word: 'Admiration',
    part: 'noun',
    definition: 'Thinking well of someone and acknowledging it.',
  },
  {
    id: 'apology',
    word: 'Apology',
    part: 'noun',
    definition: 'Naming what you did, without the word but.',
  },
  {
    id: 'attention',
    word: 'Attention',
    part: 'noun',
    definition: 'The thing everybody says they want more of and nobody can fake.',
  },
  {
    id: 'avoidance',
    word: 'Avoidance',
    part: 'noun',
    definition: 'Choosing the easier hour and paying for it later.',
  },
  {
    id: 'belonging',
    word: 'Belonging',
    part: 'noun',
    definition: 'Knowing you do not have to earn your place with someone.',
  },
  {
    id: 'blame',
    word: 'Blame',
    part: 'noun',
    definition: 'Deciding who is at fault instead of deciding what to do.',
  },
  {
    id: 'candor',
    word: 'Candor',
    part: 'noun',
    definition: 'Saying the true thing kindly, while it is still useful.',
  },
  {
    id: 'capacity',
    word: 'Capacity',
    part: 'noun',
    definition: 'How much you have left, which is not how much you care.',
  },
  {
    id: 'clarity',
    word: 'Clarity',
    part: 'noun',
    definition: 'Saying it plainly enough that there is nothing left to interpret.',
  },
  {
    id: 'closeness',
    word: 'Closeness',
    part: 'noun',
    definition: 'Being near someone because you both chose it today.',
  },
  {
    id: 'comfort',
    word: 'Comfort',
    part: 'noun',
    definition: 'Being with someone and performing nothing.',
  },
  {
    id: 'compassion',
    word: 'Compassion',
    part: 'noun',
    definition: 'Caring about a struggle you did not cause and cannot fix.',
  },
  {
    id: 'complaint',
    word: 'Complaint',
    part: 'noun',
    definition: 'Something you want changed, said about the thing rather than the person.',
  },
  {
    id: 'consistency',
    word: 'Consistency',
    part: 'noun',
    definition: 'Doing it again on a Tuesday when nobody is watching.',
  },
  {
    id: 'courage',
    word: 'Courage',
    part: 'noun',
    definition: 'Starting the sentence you have rehearsed all week.',
  },
  {
    id: 'criticism',
    word: 'Criticism',
    part: 'noun',
    definition: 'A complaint that went after the person instead.',
  },
  {
    id: 'devotion',
    word: 'Devotion',
    part: 'noun',
    definition: 'Choosing someone long after the choosing stopped being exciting.',
  },
  {
    id: 'disappointment',
    word: 'Disappointment',
    part: 'noun',
    definition: 'The gap between what you pictured and what arrived.',
  },
  {
    id: 'discretion',
    word: 'Discretion',
    part: 'noun',
    definition: 'Deciding what belongs to the two of you, and keeping it there.',
  },
  {
    id: 'distance',
    word: 'Distance',
    part: 'noun',
    definition: 'Space neither of you asked for.',
  },
  {
    id: 'effort',
    word: 'Effort',
    part: 'noun',
    definition: 'What love looks like on an ordinary week.',
  },
  {
    id: 'encouragement',
    word: 'Encouragement',
    part: 'noun',
    definition: 'Supporting someone before the outcome is known.',
  },
  {
    id: 'flexibility',
    word: 'Flexibility',
    part: 'noun',
    definition: 'Changing the plan without changing how you feel about the person.',
  },
  {
    id: 'flooding',
    word: 'Flooding',
    part: 'noun',
    definition: 'The point where your body ends the conversation for you.',
  },
  {
    id: 'friendship',
    word: 'Friendship',
    part: 'noun',
    definition: 'The part of a relationship that outlasts everything else.',
  },
  {
    id: 'gentleness',
    word: 'Gentleness',
    part: 'noun',
    definition: 'Handling someone the way they would handle something breakable.',
  },
  {
    id: 'grief',
    word: 'Grief',
    part: 'noun',
    definition: 'Loving something that is not here any more.',
  },
  {
    id: 'humor',
    word: 'Humor',
    part: 'noun',
    definition: 'Finding the same thing funny at the same moment.',
  },
  {
    id: 'identity',
    word: 'Identity',
    part: 'noun',
    definition: 'Who you are when nobody is describing you.',
  },
  {
    id: 'insecurity',
    word: 'Insecurity',
    part: 'noun',
    definition: 'A question about yourself that you aim at someone else.',
  },
  {
    id: 'integrity',
    word: 'Integrity',
    part: 'noun',
    definition: 'Being the same person no matter the situation you are in.',
  },
  {
    id: 'jealousy',
    word: 'Jealousy',
    part: 'noun',
    definition: 'Fear wearing an accusation.',
  },
  {
    id: 'kindness',
    word: 'Kindness',
    part: 'noun',
    definition: 'The small version of love, used daily.',
  },
  {
    id: 'longing',
    word: 'Longing',
    part: 'noun',
    definition: 'Missing someone who is sitting next to you.',
  },
  {
    id: 'loyalty',
    word: 'Loyalty',
    part: 'noun',
    definition: 'Speaking about someone the same way whether or not they are there.',
  },
  {
    id: 'maintenance',
    word: 'Maintenance',
    part: 'noun',
    definition: 'The unglamorous work that keeps the relationship possible.',
  },
  {
    id: 'misunderstanding',
    word: 'Misunderstanding',
    part: 'noun',
    definition: 'Two people being reasonable about different things.',
  },
  {
    id: 'mutuality',
    word: 'Mutuality',
    part: 'noun',
    definition: 'Both of you reaching for each other, even if you reach in different ways.',
  },
  {
    id: 'negotiation',
    word: 'Negotiation',
    part: 'noun',
    definition: 'Finding out what you each actually need, before deciding anything.',
  },
  {
    id: 'openness',
    word: 'Openness',
    part: 'noun',
    definition: 'Letting a conversation change your mind.',
  },
  {
    id: 'pace',
    word: 'Pace',
    part: 'noun',
    definition: 'The speed one of you is comfortable with, which is rarely the same speed.',
  },
  {
    id: 'perspective',
    word: 'Perspective',
    part: 'noun',
    definition: 'Your partner’s version, considered for long enough to be understood.',
  },
  {
    id: 'playfulness',
    word: 'Playfulness',
    part: 'noun',
    definition: 'Not being serious about something that does not need it.',
  },
  {
    id: 'privacy',
    word: 'Privacy',
    part: 'noun',
    definition: 'What is yours to tell, which is fine as long as that expectation is set.',
  },
  {
    id: 'reciprocity',
    word: 'Reciprocity',
    part: 'noun',
    definition: 'Keeping no score, and noticing anyway.',
  },
  {
    id: 'resilience',
    word: 'Resilience',
    part: 'noun',
    definition: 'Getting back to each other faster than last time.',
  },
  {
    id: 'respect',
    word: 'Respect',
    part: 'noun',
    definition: 'Treating someone’s reasons as real before you agree with them.',
  },
  {
    id: 'safety',
    word: 'Safety',
    part: 'noun',
    definition: 'Being able to say the hard thing and still be here afterward.',
  },
  {
    id: 'stonewalling',
    word: 'Stonewalling',
    part: 'noun',
    definition: 'Going quiet and calling it calm.',
  },
  {
    id: 'timing',
    word: 'Timing',
    part: 'noun',
    definition: 'The difference between the right sentence and the wrong moment.',
  },
  {
    id: 'tone',
    word: 'Tone',
    part: 'noun',
    definition: 'What your partner hears before the words arrive.',
  },
];

/**
 * One word, chosen by the day rather than at random.
 *
 * The same argument insightOfTheDay makes: random means a reader who opens
 * the app twice in a minute is shown two different words, which reads as
 * decoration. By the day it is one word for as long as the day lasts.
 *
 * It named researchOfTheDay until that function was deleted. A comment citing
 * a function nobody can go and read is a dead end for whoever follows it.
 *
 * Offset by one against the research finding, so the two tiles do not both
 * turn over on the same days and then both sit still for the same days.
 *
 * `now` may be a Date, read as the reader's own calendar day, or the day key
 * the app sends. It counted days from the epoch in UTC until 2026-10-12, which
 * turned the word over at 5pm Pacific: see api/_lib/day-number.js.
 */
/**
 * What the tile and the storycard call this.
 *
 * Sent with the word rather than typed into the app, the same way
 * INSIGHT_EYEBROW is: Ellie asked for the word to open "a storycard like the
 * insight of the day", and two surfaces naming the same thing is how a label
 * ends up saying two things.
 */
export const WORD_EYEBROW = 'Word of the day';

export function wordOfTheDay(now = new Date()) {
  const day = typeof now === 'number' ? now : dayNumber(now);
  /* Wrapped both ways. A day number can be negative once the day is read from
     the reader's own calendar rather than from the epoch: a Date at the very
     start of 1970 is 1969 for anyone west of Greenwich, and `-1 % n` is -1 in
     JavaScript, which indexes nothing. */
  const n = WORDS.length;
  const pick = WORDS[(((day + 1) % n) + n) % n];
  return { ...pick, label: WORD_EYEBROW };
}
