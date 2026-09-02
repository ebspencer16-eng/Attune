/**
 * Results copy for Exercise 5: Conflict Patterns.
 *
 * DRAFT. Carolina's mockup marks the per-pattern tips as illustrative
 * placeholders, so everything here goes in the approval doc before it ships.
 *
 * ── THE RULE THIS COPY LIVES BY ───────────────────────────────────────────
 * Every other exercise says neither position is better. This one cannot, and
 * pretending otherwise would be dishonest: contempt is not a style. So the
 * copy does the opposite job. It names the pattern plainly, and then gives
 * something to do about it.
 *
 * Three things it never does:
 *   - Diagnose. "You are defensive" becomes "this showed up sometimes".
 *   - Compare partners. Nothing here says who is worse, because that is not a
 *     conversation anyone wins.
 *   - Praise silence. A Never is worth naming as a strength, not passed over.
 *
 * Every line is written to a rate, not to a person.
 */

/** Frequency labels as the customer reads them. Index is the stored value. */
export const FREQUENCY_LABELS = ['Never', 'Rarely', 'Sometimes', 'Often'];

/**
 * Per pattern, per frequency. The tip is the point of the line: something
 * specific enough to try tonight, not "work on communication".
 */
export const PATTERN_COPY = {
  criticism: {
    label: 'Criticism',
    // What the pattern is, in plain words, said once above the four bands.
    definition: 'Going after the person rather than the problem.',
    0: { note: 'This is not showing up for you. Worth naming to {partner} as something you already do well.' },
    1: { note: 'Rare, and you notice it. Keep naming the specific behavior instead of the trait: "when plans change last minute" instead of "you are careless."' },
    2: { note: 'Showing up enough to matter. The swap is small: describe the thing that happened, not the kind of person they are. One sentence is usually the difference.' },
    3: { note: 'This one is worth real attention. Before raising something, try writing the specific behavior down first. Character language tends to arrive when the actual complaint has not been named yet.' },
  },
  contempt: {
    label: 'Contempt',
    definition: 'Sarcasm, dismissiveness, eye-rolling. Talking down rather than across.',
    0: { note: 'Not showing up at all. This is the pattern that matters most, so this is genuinely worth knowing.' },
    1: { note: 'Rare. Sarcasm under pressure is common, and a quick check-in ("was that sharper than I meant?") keeps it from settling in.' },
    2: { note: 'Worth taking seriously, more than the others at the same rate. Contempt tends to grow quietly. Naming it out loud to {partner} once, outside an argument, does more than trying to catch it mid-conflict.' },
    3: { note: 'This is the one to work on first. Not because you are doing something unforgivable, but because it is the pattern that does the most damage over time and the one that responds best to being named.' },
  },
  defensiveness: {
    label: 'Defensiveness',
    definition: 'Meeting a concern with a counter-concern rather than hearing it.',
    0: { note: 'Not showing up. Taking a complaint without returning one is harder than it sounds.' },
    1: { note: 'Rare. You are already handling this well. Keep noticing what lets you stay open.' },
    2: { note: 'Showing up regularly. Before responding, try reflecting back what you heard first. Even one sentence changes the pace, and it costs nothing to be wrong about it.' },
    3: { note: 'Worth attention. Defensiveness usually means the complaint landed as an attack. Saying "give me a second, I want to hear that properly" buys the pause where the reflex would have gone.' },
  },
  stonewalling: {
    label: 'Stonewalling',
    definition: 'Shutting down or checking out instead of staying in the conversation.',
    0: { note: 'Not showing up. Staying present when things get tense is genuinely difficult.' },
    1: { note: 'Rare. When you feel the pull to check out, naming it ("I need five minutes") keeps it from feeling like an exit.' },
    2: { note: 'Showing up regularly. A stated pause protects the relationship more than a silent one. "I need twenty minutes, I am not leaving" is the whole move.' },
    3: { note: 'Worth attention, and usually a sign of being overwhelmed rather than uninterested. Agreeing a pause signal with {partner} in advance means shutting down does not have to be the only exit.' },
  },
};

/**
 * The snapshot line, from the two forced-choice openers.
 *
 * Keyed by whether the two partners differ. Both answers are legitimate, so
 * this is the one part of the exercise that keeps the usual gap framing.
 */
export const SNAPSHOT_PROSE = {
  differ: 'Neither style is the right one. This pairing means {a} may want to talk sooner than {b} is ready to. Naming that gap out loud tends to help more than pushing through it.',
  bothImmediate: 'You both want it addressed straight away. Nothing festers, which is a real advantage. The watch-out is that neither of you is the one who slows it down, so a hard conversation can escalate before either of you meant it to.',
  bothDelayed: 'You both need time before engaging. That keeps things from boiling over. The watch-out is that a conversation neither of you starts can go unhad for a long time. Agree who raises it, or when.',
};

/**
 * Action items, one per pattern, shown when that pattern is worth attention.
 *
 * The other sections build an action plan from the widest gap. This one cannot
 * use a gap, because these are rates rather than positions. So the action is
 * keyed to the pattern itself and only appears once the rate crosses into
 * "Sometimes", where the research signal starts.
 *
 * Each is a single concrete thing to do, phrased as an experiment rather than a
 * correction. "Try X for a week" is something a person can agree to; "stop
 * being defensive" is not.
 */
export const PATTERN_ACTIONS = {
  criticism: {
    title: 'Call out the behavior rather than your partner',
    body: 'For the next two weeks, say the specific thing that happened out loud first. "The dishes sat for three days" rather than "you never help". If you cannot name a specific thing, your complaint is likely about something else.',
  },
  contempt: {
    title: 'Acknowledge it once, outside an argument',
    body: 'Pay attention to micro-aggressions and tell {partner} you noticed it, but not mid-conflict and not as an apology. Contempt grows quietly, but loses most of its power when it has been named out loud by the person doing it, and almost none when the other person points it out first.',
  },
  defensiveness: {
    title: 'Reflect back before you respond',
    body: 'When {partner} raises something, say what you heard before you say anything else. You are not agreeing, only confirming that you are listening. This changes the pace of the discussion and can correct misunderstandings.',
  },
  stonewalling: {
    title: 'Agree on a pause signal in advance',
    body: 'Pick a phrase when things are calm that means "I need twenty minutes and then I will come back." A well-communicated pause protects the conversation, whereas a silent one reads as disengaging.',
  },
};

/** Shown on the glance page when no pattern crosses the line. */
export const NO_ACTION_NEEDED = {
  title: 'Nothing here needs work',
  body: 'None of the four patterns are showing up often for you. That is worth saying out loud to {partner}, because it is the kind of thing couples rarely tell each other.',
};

/**
 * Row labels for the snapshot.
 *
 * The chips alone were unreadable: two answers side by side with no indication
 * of which question each came from looked contradictory when it was not.
 * Speaking up early and needing a pause mid-argument are perfectly coherent
 * together, but only if you can see which is which.
 */
export const SNAPSHOT_ROWS = [
  { id: 'c1', label: 'When you notice something frustrating' },
  { id: 'c2', label: "When you're in an argument" },
  { id: 'c_topic', label: 'When the scope of the argument changes' },
];

/** Labels for the answers, shown as chips under each name. */
export const OPENING_CHIPS = {
  c1: { A: 'Speaks up right away', B: 'Takes time before bringing it up' },
  c2: { A: 'Wants to resolve in the moment', B: 'Needs a pause before continuing' },
  c_topic: { A: 'Stays with what is happening now', B: 'Notices the older pattern' },
};

/** Headings and framing, matching the mockup. */
export const CONFLICT_RESULTS_COPY = {
  eyebrow: 'Conflict patterns · results',
  snapshotTitle: 'Your conflict snapshot',
  patternsTitle: 'Your patterns',
  patternsPrivacy: 'Not visible to your partner. This is the one section that stays private, always.',
  patternsIntro: 'An in-depth look at pain points in your conflict management. Being aware of these areas is the first step toward growth in your communication under pressure.',
  repairTitle: 'What helps each of you reset',
  repairIntro: '',
  wroteTitle: 'What you each wrote',
  sharedBadge: 'Shared',
  privateBadge: 'Just for you',

  allClear: 'None of the four patterns are showing up often for you. That is worth knowing, and worth saying to {partner}.',
};

/** Resolve {partner}, {a} and {b} the way the rest of the product does. */
export function interpConflict(text, { partner, a, b } = {}) {
  if (!text) return text;
  return String(text)
    .replace(/\{partner\}/g, partner || 'your partner')
    .replace(/\{a\}/g, a || 'One of you')
    .replace(/\{b\}/g, b || 'the other');
}
