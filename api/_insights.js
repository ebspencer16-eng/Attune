/**
 * The insight of the day: fifty of them, and where each comes from.
 *
 * ── WHY THIS IS NOT api/_research.js ──────────────────────────────────────
 * That file holds three findings, and they are not three of these. They were
 * written for public/purpose.html and are lifted from it word for word;
 * check-research.mjs holds the two to each other, because the page is static
 * and cannot import. Adding forty-seven more to that list would have made that
 * gate compare a page carrying three against a file listing fifty, and the
 * honest fix is two lists rather than one gate taught to ignore most of its
 * subject.
 *
 * So: the three on the page stay there, and are the first three here by id, so
 * a reader who sees one in the app and then reads the page meets the same
 * sentence. The other forty-seven are only ever seen in the product.
 *
 * ── WHO WROTE THESE ───────────────────────────────────────────────────────
 * Ellie writes everything a customer reads. She asked for these: "Build a list
 * of 50 insights of the day to rotate through, I will review these later when I
 * review the words list." So they are mine, written to her house style: short
 * declarative sentences, no em dashes, no hedging, and neither end of any
 * dimension better than the other.
 *
 * INSIGHTS-REVIEW.md is generated from this file, so the review document reads
 * the product rather than restating it.
 *
 * ── TWO KINDS, AND WHY THE DISTINCTION IS ENFORCED NOW ────────────────────
 * This file used to say, in a comment, that the sentences were the product's own
 * and the sources beside them were not quotations. The comment was right and the
 * product did not honour it: every surface drew the sentence with the source
 * underneath it, and shared it as the body followed by the attribution. A line
 * with a name under it reads as that person's line. So fifty sentences I wrote
 * were being attributed, on screen, to Gottman, Johnson and a dozen journals.
 *
 * Ellie: "The insight of the day today reads as SO AI. I would rather just use
 * direct quotes from these publications, can you organize those and cite them
 * accurately?" The tone was the half she could see. This was underneath it.
 *
 * So there are two kinds and they cannot be confused:
 *
 *   kind: 'ours'   the product's own sentence. `basis` records the work it is
 *                  drawn from, for review, and NEVER reaches a customer. Nothing
 *                  is attributed, because nobody said it but us.
 *
 *   kind: 'quote'  someone else's words, verbatim, with `author`, `work` and the
 *                  `url` they were read at. Only these carry a citation.
 *
 * check-insight-provenance.mjs enforces it, including that `basis` never leaves
 * the server.
 *
 * ── ON ADDING A QUOTE ─────────────────────────────────────────────────────
 * Check it against the source and record where. Two things make this harder than
 * it looks and both came up while adding the first three: the byline on a page
 * can be a current display name rather than the name the piece was published
 * under, and the date shown is often when the page was last touched rather than
 * when it was written. So `url` is what a reader can check, and no date is
 * claimed unless it is the real one.
 *
 * If a claim is wrong, the fix is to cut the entry rather than soften it.
 */

export const INSIGHTS = [
  /**
   * ── QUOTATIONS ────────────────────────────────────────────────────────────
   * Verbatim, each one read at the url beside it. These three are what Ellie
   * asked for and they are the whole set so far: every other entry below is the
   * product's own sentence and carries no attribution.
   *
   * No date is claimed on any of them. The Gottman Institute shows a date that
   * moves when a page is edited, so citing it would be citing the day I read it.
   */
  {
    kind: 'quote',
    id: 'q-magic-ratio',
    body: "That \u2018magic ratio\u2019 is 5 to 1. This means that for every negative interaction during conflict, a stable and happy marriage has five (or more) positive interactions.",
    author: 'Kyle Benson',
    work: 'The Gottman Institute',
    url: 'https://www.gottman.com/blog/the-magic-relationship-ratio-according-science/',
  },
  {
    kind: 'quote',
    id: 'q-bid',
    body: 'A bid is any attempt from one partner to another for attention, affirmation, affection, or any other positive connection.',
    author: 'Zach Brittle',
    work: 'The Gottman Institute',
    url: 'https://www.gottman.com/blog/turn-toward-instead-of-away/',
  },
  {
    kind: 'quote',
    id: 'q-startup',
    body: 'Their research revealed that discussions will end on the same note they begin.',
    author: 'Dr. Ellie Wilde',
    work: 'The Gottman Institute',
    url: 'https://www.gottman.com/blog/softening-startup/',
  },
  {
    kind: 'quote',
    id: 'q-stonewalling',
    body: 'Stonewalling occurs when the listener withdraws from the interaction, shuts down, and simply stops responding to their partner.',
    author: 'Dr. Ellie Wilde',
    work: 'The Gottman Institute',
    url: 'https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/',
  },
  {
    kind: 'quote',
    id: 'q-defensiveness',
    /* Also verbatim now. The previous sentence was stitched from a heading and
       a summary and appears nowhere on the page. */
    body: 'Defensiveness will only escalate the conflict if the critical spouse does not back down or apologize. This is because defensiveness is really a way of blaming your partner, and it won\u2019t allow for healthy conflict management.',
    author: 'Dr. Ellie Wilde',
    work: 'The Gottman Institute',
    url: 'https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/',
  },
  {
    kind: 'quote',
    id: 'q-contempt',
    /* Verbatim, checked against the page on 29 September 2026. It used to read
       "Contempt is the single greatest predictor of divorce", which is a fair
       summary of the research and is not a sentence anyone wrote. A paraphrase
       inside quotation marks under a named author is a claim about what that
       person said. */
    body: 'Contempt is the worst of the four horsemen. It is the number one predictor of divorce, but it can be defeated.',
    author: 'Dr. Ellie Wilde',
    work: 'The Gottman Institute',
    url: 'https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/',
  },

  /* ── TEN MORE, ADDED 29 SEPTEMBER 2026 ──────────────────────────────────
     Ellie: "I would rather just use direct quotes from these publications,
     can you organize those and cite them accurately?"

     Every one pulled from the page itself rather than recalled, and every one
     held to the page by check-quotes-verbatim.mjs, which was written because
     two of the first six turned out to be paraphrases wearing quotation marks.

     All from The Gottman Institute, which is not a preference. It is the only
     source behind these insights that publishes in full, for free, at a stable
     url. The books and the journal articles the rest are drawn from cannot be
     quoted this way because nothing could check the wording afterwards, and an
     unverifiable citation is the thing being fixed here. See TASKS.md: whether
     to quote more widely than one publisher is Ellie's call. */
  {
    kind: 'quote',
    id: 'q-conflict-is-normal',
    body: 'All relationships, even the most successful ones, have conflict.',
    author: 'The Gottman Institute',
    work: 'The Gottman Institute',
    url: 'https://www.gottman.com/blog/the-four-horsemen-the-antidotes/',
  },
  {
    kind: 'quote',
    id: 'q-how-managed',
    body: 'Fortunately, our research shows that it’s not the appearance of conflict, but rather how it’s managed that predicts the success or failure of a relationship.',
    author: 'The Gottman Institute',
    work: 'The Gottman Institute',
    url: 'https://www.gottman.com/blog/the-four-horsemen-the-antidotes/',
  },
  {
    kind: 'quote',
    id: 'q-manage-not-resolve',
    body: 'We say “manage” conflict rather than “resolve,” because relationship conflict is natural and has functional, positive aspects that provide opportunities for growth and understanding.',
    author: 'The Gottman Institute',
    work: 'The Gottman Institute',
    url: 'https://www.gottman.com/blog/the-four-horsemen-the-antidotes/',
  },
  {
    kind: 'quote',
    id: 'q-complaint-vs-criticism',
    body: 'A complaint focuses on a specific behavior, but criticism attacks a person’s very character.',
    author: 'The Gottman Institute',
    work: 'The Gottman Institute',
    url: 'https://www.gottman.com/blog/the-four-horsemen-the-antidotes/',
  },
  {
    kind: 'quote',
    id: 'q-defensiveness-defined',
    body: 'Defensiveness is defined as self-protection in the form of righteous indignation or innocent victimhood in attempt to ward off a perceived attack.',
    author: 'The Gottman Institute',
    work: 'The Gottman Institute',
    url: 'https://www.gottman.com/blog/the-four-horsemen-the-antidotes/',
  },
  {
    kind: 'quote',
    id: 'q-flooding',
    body: 'It usually happens when you’re feeling flooded or emotionally overwhelmed, so your reaction is to shut down, stop talking, and disengage.',
    author: 'The Gottman Institute',
    work: 'The Gottman Institute',
    url: 'https://www.gottman.com/blog/the-four-horsemen-the-antidotes/',
  },
  {
    kind: 'quote',
    id: 'q-sixty-nine',
    body: 'John Gottman’s research found that 69% of problems in a relationship are unsolvable.',
    author: 'Marni Feuerman',
    work: 'The Gottman Institute',
    url: 'https://www.gottman.com/blog/managing-vs-resolving-conflict-relationships-blueprints-success/',
  },
  {
    kind: 'quote',
    id: 'q-unsolvable',
    body: 'Trying to solve unsolvable problems is counterproductive, and no couple will ever completely eliminate them.',
    author: 'Marni Feuerman',
    work: 'The Gottman Institute',
    url: 'https://www.gottman.com/blog/managing-vs-resolving-conflict-relationships-blueprints-success/',
  },
  {
    kind: 'quote',
    id: 'q-discussing-them',
    body: 'However, discussing them is constructive and provides a positive opportunity for understanding and growth.',
    author: 'Marni Feuerman',
    work: 'The Gottman Institute',
    url: 'https://www.gottman.com/blog/managing-vs-resolving-conflict-relationships-blueprints-success/',
  },
  {
    kind: 'quote',
    id: 'q-in-dialogue',
    body: 'Being in dialogue, the preferred status, is when the couple has learned to accept their differences on that topic even though minor arguments arise occasionally.',
    author: 'Marni Feuerman',
    work: 'The Gottman Institute',
    url: 'https://www.gottman.com/blog/managing-vs-resolving-conflict-relationships-blueprints-success/',
  },

  // ── The three that also appear on public/purpose.html ────────────────────
  // Same ids as api/_research.js, and the same sentences. A reader who meets
  // one in the app and then reads the page should not find it reworded.
  {
    kind: 'ours',
    id: 'early-conversations',
    body: 'The things that feel too soon to bring up are usually exactly the right things to bring up. Couples who name expectations early stay closer, longer.',
    basis: 'Gottman & Silver, The Seven Principles',
  },
  {
    kind: 'ours',
    id: 'unsaid',
    body: "It's rarely incompatibility that creates friction. It's the assumptions each person carries privately (about roles, money, the future) that no one's named yet.",
    basis: 'Gottman et al., Journal of Marriage and Family',
  },
  {
    kind: 'ours',
    id: 'being-understood',
    body: 'More than attraction, more than compatibility, being genuinely known by your partner is what makes a relationship hold. Attune helps you get there.',
    basis: 'Johnson, Hold Me Tight',
  },

  // ── Conflict, and what actually predicts how it goes ─────────────────────
  { kind: 'ours', id: 'first-three-minutes', body: 'How a hard conversation starts predicts how it ends. The first three minutes carry most of the outcome.', basis: 'Gottman, The Seven Principles' },
  { kind: 'ours', id: 'repair-over-avoidance', body: 'Every couple argues. What separates the ones who last is how quickly they come back, not how rarely they leave.', basis: 'Gottman, The Marriage Clinic' },
  { kind: 'ours', id: 'perpetual-problems', body: 'Most of what you disagree about, you will still disagree about in ten years. The work is not solving it. The work is not letting it harden.', basis: 'Gottman, The Seven Principles' },
  { kind: 'ours', id: 'flooding', body: 'When your heart rate passes about a hundred, you stop being able to hear. A twenty minute break is not avoidance, it is what makes the rest of the conversation possible.', basis: 'Gottman & Levenson, Journal of Marriage and Family' },
  { kind: 'ours', id: 'complaint-not-criticism', body: 'A complaint is about a thing that happened. Criticism is about the person who did it. The same frustration lands completely differently depending on which one you reach for.', basis: 'Gottman, Why Marriages Succeed or Fail' },
  { kind: 'ours', id: 'contempt', body: 'Of everything that happens in an argument, contempt is the one that does lasting damage. Eye rolls count.', basis: 'Gottman, The Seven Principles' },
  { kind: 'ours', id: 'defensiveness', body: 'Defensiveness is a way of saying the problem is not mine. It almost never ends the argument and it usually extends it.', basis: 'Gottman, Why Marriages Succeed or Fail' },
  { kind: 'ours', id: 'withdraw-pursue', body: 'One of you moves toward the conflict and one moves away. Neither is the problem. The pattern between you is.', basis: 'Johnson, Hold Me Tight' },
  { kind: 'ours', id: 'repair-attempts', body: 'A joke mid-argument, a hand on an arm, a change of tone. These are repair attempts, and whether they get accepted matters more than whether they are graceful.', basis: 'Gottman, The Seven Principles' },
  { kind: 'ours', id: 'harsh-startup', body: 'Starting with "you always" gives your partner something to defend instead of something to answer.', basis: 'Gottman, The Seven Principles' },

  // ── What holds a relationship up day to day ──────────────────────────────
  { kind: 'ours', id: 'bids', body: 'Most connection is built in seconds, not evenings. A comment about the weather is often a bid for attention.', basis: 'Gottman, The Relationship Cure' },
  { kind: 'ours', id: 'turning-toward', body: 'Couples who stay together turn toward each other most of the time. It is not a grand gesture. It is answering when you are spoken to.', basis: 'Gottman, The Relationship Cure' },
  { kind: 'ours', id: 'five-to-one', body: 'In stable relationships there are about five good moments for every difficult one. The ratio matters more than the total.', basis: 'Gottman & Levenson, Journal of Marriage and Family' },
  { kind: 'ours', id: 'fondness', body: 'Couples who can still say what they admire about each other recover from bad weeks faster.', basis: 'Gottman, The Seven Principles' },
  { kind: 'ours', id: 'love-maps', body: 'Knowing the small current facts of your partner’s life, the name of their difficult colleague, what is worrying them this week, is a better predictor than knowing their history.', basis: 'Gottman, The Seven Principles' },
  { kind: 'ours', id: 'rituals', body: 'The small repeated things carry more weight than the rare big ones. A standing Sunday morning outlasts a good holiday.', basis: 'Doherty, The Intentional Family' },
  { kind: 'ours', id: 'gratitude-out-loud', body: 'Noticing something and saying it are different events. Only one of them reaches your partner.', basis: 'Algoe, Social and Personality Psychology Compass' },
  { kind: 'ours', id: 'capitalization', body: 'How you respond to your partner’s good news shapes the relationship more than how you respond to their bad news.', basis: 'Gable et al., Journal of Personality and Social Psychology' },
  { kind: 'ours', id: 'novelty', body: 'Doing something new together does more for how you feel about each other than doing something pleasant you have done before.', basis: 'Aron et al., Journal of Personality and Social Psychology' },

  // ── Attachment, needs and the shape underneath the argument ──────────────
  { kind: 'ours', id: 'underneath-the-fight', body: 'Most recurring arguments are not about the thing. They are about whether you matter to each other, asked in a way that is hard to hear.', basis: 'Johnson, Hold Me Tight' },
  { kind: 'ours', id: 'protest', body: 'What looks like anger is often a protest at feeling unreachable. It is a request wearing the wrong clothes.', basis: 'Johnson, Hold Me Tight' },
  { kind: 'ours', id: 'secure-base', body: 'People take more risks, not fewer, when they have someone steady to come back to.', basis: 'Feeney, Journal of Personality and Social Psychology' },
  { kind: 'ours', id: 'need-is-not-weakness', body: 'Depending on each other is not the opposite of being independent. It is what makes being independent possible.', basis: 'Johnson, Hold Me Tight' },
  { kind: 'ours', id: 'differentiation', body: 'Staying yourself inside a relationship is not distance. It is what gives you something to bring to it.', basis: 'Schnarch, Passionate Marriage' },

  // ── Expectations, fairness and the practical half ────────────────────────
  { kind: 'ours', id: 'unspoken-contracts', body: 'Every couple runs on agreements nobody wrote down. Most disappointment is one of them being broken by someone who did not know it existed.', basis: 'Gottman et al., Journal of Marriage and Family' },
  { kind: 'ours', id: 'perceived-fairness', body: 'What predicts contentment is not an even split. It is both people believing the split is fair.', basis: 'Carlson et al., Journal of Marriage and Family' },
  { kind: 'ours', id: 'mental-load', body: 'Remembering, planning and noticing are work, and they are the easiest work to be invisible.', basis: 'Daminger, American Sociological Review' },
  { kind: 'ours', id: 'money-talk', body: 'Couples who talk about money regularly disagree about it as often. They recover from the disagreements faster.', basis: 'Dew et al., Family Relations' },
  { kind: 'ours', id: 'scorekeeping', body: 'Keeping count works until the day your count and their count do not match, which is every day.', basis: 'Gottman, The Seven Principles' },
  { kind: 'ours', id: 'household-standards', body: 'Most arguments about tidiness are arguments about whose standard is the default. Naming the standard is half of it.', basis: 'Daminger, American Sociological Review' },

  // ── Change, growth and time ──────────────────────────────────────────────
  { kind: 'ours', id: 'influence', body: 'Being willing to be changed by your partner is one of the few things that reliably predicts how a relationship goes.', basis: 'Gottman, The Seven Principles' },
  { kind: 'ours', id: 'change-is-slow', body: 'People change in the direction they are already leaning. Pressure mostly changes how honest they are about it.', basis: 'Miller & Rollnick, Motivational Interviewing' },
  { kind: 'ours', id: 'assume-good-reason', body: 'The same behaviour reads completely differently depending on the reason you assume. The assumption is usually made before the behaviour.', basis: 'Bradbury & Fincham, Psychological Bulletin' },
  { kind: 'ours', id: 'negative-sentiment', body: 'Once you expect the worst reading, you start finding it. The evidence does not change.', basis: 'Weiss, Advances in Family Intervention' },
  { kind: 'ours', id: 'the-story-you-tell', body: 'How a couple tells the story of how they met says more about where they are now than about what happened.', basis: 'Buehlman, Gottman & Katz, Journal of Family Psychology' },
  { kind: 'ours', id: 'good-enough', body: 'A relationship does not need to be extraordinary to be worth staying in. Most of them are built out of ordinary weeks.', basis: 'Finkel, The All-or-Nothing Marriage' },

  // ── Intimacy, and what makes it possible ─────────────────────────────────
  { kind: 'ours', id: 'desire-differs', body: 'Wanting sex at different times and for different reasons is the usual case, not a mismatch to be fixed.', basis: 'Nagoski, Come As You Are' },
  { kind: 'ours', id: 'responsive-desire', body: 'For a lot of people desire follows closeness rather than starting it. Waiting to feel like it can mean waiting a long time.', basis: 'Basson, Journal of Sex and Marital Therapy' },
  { kind: 'ours', id: 'turning-down-well', body: 'How a no is given matters more than how often it is given.', basis: 'Metz & McCarthy, Enduring Desire' },
  { kind: 'ours', id: 'talking-about-it', body: 'Couples who can talk about sex report better sex. The talking is not a symptom of it going well, it is part of how it goes well.', basis: 'Mallory et al., Journal of Sex Research' },
  { kind: 'ours', id: 'non-sexual-touch', body: 'Ordinary touch that is not going anywhere makes the touch that is going somewhere easier to reach for.', basis: 'Jakubiak & Feeney, Personality and Social Psychology Review' },

  // ── Attention, time and the world outside ────────────────────────────────
  { kind: 'ours', id: 'phone-in-the-room', body: 'A phone face down on the table still changes the conversation happening over it.', basis: 'Przybylski & Weinstein, Journal of Social and Personal Relationships' },
  { kind: 'ours', id: 'stress-spillover', body: 'Most of what arrives in the evening was caused somewhere else. Saying so out loud takes it off your partner.', basis: 'Neff & Karney, Journal of Personality and Social Psychology' },
  { kind: 'ours', id: 'friendship-first', body: 'The couples who do best describe each other as friends before they describe each other as anything else.', basis: 'Gottman, The Seven Principles' },
  { kind: 'ours', id: 'shared-meaning', body: 'Beyond the logistics, couples build a private culture: what a holiday is for, what counts as a good week. Most of it is never discussed.', basis: 'Gottman, The Seven Principles' },
  { kind: 'ours', id: 'outside-people', body: 'A relationship asked to be everything tends to buckle. Other people are not competition for it.', basis: 'Finkel, The All-or-Nothing Marriage' },
];

/**
 * One insight, chosen by the day rather than at random.
 *
 * Random means someone who opens the app twice in a minute is shown two
 * different findings, which reads as decoration. By the day it is one finding
 * for as long as the day lasts, and the rotation is fifty days.
 */
/**
 * The insight a customer sees today.
 *
 * ── WHY IT DOES NOT RETURN THE ENTRY ──────────────────────────────────────
 * It used to, and `basis` would have gone with it. That field records which work
 * one of our own sentences is drawn from, and it is for review: putting it on
 * screen under a sentence we wrote is exactly the misattribution this file was
 * restructured to stop.
 *
 * So the payload is built here rather than spread, and `source` is the only
 * attribution field on it: a real citation for a quotation, and empty for our
 * own sentence, because our own sentence has no one to cite.
 */
/**
 * What the insight is called on both surfaces.
 *
 * It was a constant in the app's resources.tsx and nowhere else, which was fine
 * while the app was the only surface showing one. The dashboard shows it now,
 * so a label typed in two places is two labels waiting to disagree.
 */
export const INSIGHT_EYEBROW = 'Insight of the day';

/** "Author, Work" for a page; "Author, Work (edition), p. N" for a book. */
function citation(pick) {
  const who = pick.author === pick.work ? pick.work : `${pick.author}, ${pick.work}`;
  const edition = String(pick.edition || '').trim();
  const page = String(pick.page || '').trim();
  if (!edition || !page) return who;
  return `${who} (${edition}), p. ${page}`;
}

export function insightOfTheDay(now = new Date()) {
  const day = Math.floor(now.getTime() / 86400000);
  const pick = INSIGHTS[day % INSIGHTS.length];
  /**
   * ── A QUOTATION LOOKS LIKE ONE ──────────────────────────────────────────
   * Ellie: "I want the format to be direct quotes in quotation marks, with the
   * citation below."
   *
   * So the marks are put on here rather than by each surface. Two screens draw
   * this and a third shares it as text, and three places deciding how to punctuate
   * a quotation is three places to get it wrong. Curly marks, because the body
   * itself contains straight ones in places and the two should not collide.
   *
   * Our own sentences are not quotations and take no marks and no citation.
   */
  const quoted = pick.kind === 'quote' ? `\u201c${pick.body}\u201d` : pick.body;
  return {
    id: pick.id,
    body: quoted,
    kind: pick.kind,
    /* Sent so the app reads the same label rather than keeping its own. */
    label: INSIGHT_EYEBROW,
    /**
     * The citation under a quotation.
     *
     * An institute that publishes unsigned is its own author, and "The Gottman
     * Institute, The Gottman Institute" is what naming both gives you. When the
     * two are the same the citation is the one name.
     *
     * A quotation from a book carries its edition and the page it is on, because
     * that is the only way a reader, or Ellie, or Carolina, can check it: nothing
     * automated can open a book. A quotation from a page carries neither and is
     * checked by check-quotes-verbatim instead.
     */
    source: pick.kind === 'quote' ? citation(pick) : '',
    url: pick.kind === 'quote' ? pick.url : '',
  };
}
