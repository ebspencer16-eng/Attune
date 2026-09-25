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
 * ── THE SOURCES ARE REAL AND THE SENTENCES ARE NOT QUOTES ─────────────────
 * Every source named here is a real book or a real body of work, and the line
 * above it is the product's own sentence about what that work says. None of
 * them is presented as a quotation, and none should be turned into one without
 * checking the wording against the source. That distinction matters more here
 * than anywhere else in the product: a citation that drifts attributes a claim
 * to someone who did not quite make it.
 *
 * If a claim is wrong, the fix is to cut the entry rather than soften it.
 */

export const INSIGHTS = [
  // ── The three that also appear on public/purpose.html ────────────────────
  // Same ids as api/_research.js, and the same sentences. A reader who meets
  // one in the app and then reads the page should not find it reworded.
  {
    id: 'early-conversations',
    body: 'The things that feel too soon to bring up are usually exactly the right things to bring up. Couples who name expectations early stay closer, longer.',
    source: 'Gottman & Silver, The Seven Principles',
  },
  {
    id: 'unsaid',
    body: "It's rarely incompatibility that creates friction. It's the assumptions each person carries privately (about roles, money, the future) that no one's named yet.",
    source: 'Gottman et al., Journal of Marriage and Family',
  },
  {
    id: 'being-understood',
    body: 'More than attraction, more than compatibility, being genuinely known by your partner is what makes a relationship hold. Attune helps you get there.',
    source: 'Johnson, Hold Me Tight',
  },

  // ── Conflict, and what actually predicts how it goes ─────────────────────
  { id: 'first-three-minutes', body: 'How a hard conversation starts predicts how it ends. The first three minutes carry most of the outcome.', source: 'Gottman, The Seven Principles' },
  { id: 'repair-over-avoidance', body: 'Every couple argues. What separates the ones who last is how quickly they come back, not how rarely they leave.', source: 'Gottman, The Marriage Clinic' },
  { id: 'perpetual-problems', body: 'Most of what you disagree about, you will still disagree about in ten years. The work is not solving it. The work is not letting it harden.', source: 'Gottman, The Seven Principles' },
  { id: 'flooding', body: 'When your heart rate passes about a hundred, you stop being able to hear. A twenty minute break is not avoidance, it is what makes the rest of the conversation possible.', source: 'Gottman & Levenson, Journal of Marriage and Family' },
  { id: 'complaint-not-criticism', body: 'A complaint is about a thing that happened. Criticism is about the person who did it. The same frustration lands completely differently depending on which one you reach for.', source: 'Gottman, Why Marriages Succeed or Fail' },
  { id: 'contempt', body: 'Of everything that happens in an argument, contempt is the one that does lasting damage. Eye rolls count.', source: 'Gottman, The Seven Principles' },
  { id: 'defensiveness', body: 'Defensiveness is a way of saying the problem is not mine. It almost never ends the argument and it usually extends it.', source: 'Gottman, Why Marriages Succeed or Fail' },
  { id: 'withdraw-pursue', body: 'One of you moves toward the conflict and one moves away. Neither is the problem. The pattern between you is.', source: 'Johnson, Hold Me Tight' },
  { id: 'repair-attempts', body: 'A joke mid-argument, a hand on an arm, a change of tone. These are repair attempts, and whether they get accepted matters more than whether they are graceful.', source: 'Gottman, The Seven Principles' },
  { id: 'harsh-startup', body: 'Starting with "you always" gives your partner something to defend instead of something to answer.', source: 'Gottman, The Seven Principles' },

  // ── What holds a relationship up day to day ──────────────────────────────
  { id: 'bids', body: 'Most connection is built in seconds, not evenings. A comment about the weather is often a bid for attention.', source: 'Gottman, The Relationship Cure' },
  { id: 'turning-toward', body: 'Couples who stay together turn toward each other most of the time. It is not a grand gesture. It is answering when you are spoken to.', source: 'Gottman, The Relationship Cure' },
  { id: 'five-to-one', body: 'In stable relationships there are about five good moments for every difficult one. The ratio matters more than the total.', source: 'Gottman & Levenson, Journal of Marriage and Family' },
  { id: 'fondness', body: 'Couples who can still say what they admire about each other recover from bad weeks faster.', source: 'Gottman, The Seven Principles' },
  { id: 'love-maps', body: 'Knowing the small current facts of your partner’s life, the name of their difficult colleague, what is worrying them this week, is a better predictor than knowing their history.', source: 'Gottman, The Seven Principles' },
  { id: 'rituals', body: 'The small repeated things carry more weight than the rare big ones. A standing Sunday morning outlasts a good holiday.', source: 'Doherty, The Intentional Family' },
  { id: 'gratitude-out-loud', body: 'Noticing something and saying it are different events. Only one of them reaches your partner.', source: 'Algoe, Social and Personality Psychology Compass' },
  { id: 'capitalization', body: 'How you respond to your partner’s good news shapes the relationship more than how you respond to their bad news.', source: 'Gable et al., Journal of Personality and Social Psychology' },
  { id: 'novelty', body: 'Doing something new together does more for how you feel about each other than doing something pleasant you have done before.', source: 'Aron et al., Journal of Personality and Social Psychology' },

  // ── Attachment, needs and the shape underneath the argument ──────────────
  { id: 'underneath-the-fight', body: 'Most recurring arguments are not about the thing. They are about whether you matter to each other, asked in a way that is hard to hear.', source: 'Johnson, Hold Me Tight' },
  { id: 'protest', body: 'What looks like anger is often a protest at feeling unreachable. It is a request wearing the wrong clothes.', source: 'Johnson, Hold Me Tight' },
  { id: 'accessibility', body: 'Three questions sit under most of it: can I reach you, will you respond, do I matter to you.', source: 'Johnson, Hold Me Tight' },
  { id: 'secure-base', body: 'People take more risks, not fewer, when they have someone steady to come back to.', source: 'Feeney, Journal of Personality and Social Psychology' },
  { id: 'need-is-not-weakness', body: 'Depending on each other is not the opposite of being independent. It is what makes being independent possible.', source: 'Johnson, Hold Me Tight' },
  { id: 'differentiation', body: 'Staying yourself inside a relationship is not distance. It is what gives you something to bring to it.', source: 'Schnarch, Passionate Marriage' },

  // ── Expectations, fairness and the practical half ────────────────────────
  { id: 'unspoken-contracts', body: 'Every couple runs on agreements nobody wrote down. Most disappointment is one of them being broken by someone who did not know it existed.', source: 'Gottman et al., Journal of Marriage and Family' },
  { id: 'perceived-fairness', body: 'What predicts contentment is not an even split. It is both people believing the split is fair.', source: 'Carlson et al., Journal of Marriage and Family' },
  { id: 'mental-load', body: 'Remembering, planning and noticing are work, and they are the easiest work to be invisible.', source: 'Daminger, American Sociological Review' },
  { id: 'money-talk', body: 'Couples who talk about money regularly disagree about it as often. They recover from the disagreements faster.', source: 'Dew et al., Family Relations' },
  { id: 'scorekeeping', body: 'Keeping count works until the day your count and their count do not match, which is every day.', source: 'Gottman, The Seven Principles' },
  { id: 'household-standards', body: 'Most arguments about tidiness are arguments about whose standard is the default. Naming the standard is half of it.', source: 'Daminger, American Sociological Review' },

  // ── Change, growth and time ──────────────────────────────────────────────
  { id: 'influence', body: 'Being willing to be changed by your partner is one of the few things that reliably predicts how a relationship goes.', source: 'Gottman, The Seven Principles' },
  { id: 'change-is-slow', body: 'People change in the direction they are already leaning. Pressure mostly changes how honest they are about it.', source: 'Miller & Rollnick, Motivational Interviewing' },
  { id: 'assume-good-reason', body: 'The same behaviour reads completely differently depending on the reason you assume. The assumption is usually made before the behaviour.', source: 'Bradbury & Fincham, Psychological Bulletin' },
  { id: 'negative-sentiment', body: 'Once you expect the worst reading, you start finding it. The evidence does not change.', source: 'Weiss, Advances in Family Intervention' },
  { id: 'the-story-you-tell', body: 'How a couple tells the story of how they met says more about where they are now than about what happened.', source: 'Buehlman, Gottman & Katz, Journal of Family Psychology' },
  { id: 'good-enough', body: 'A relationship does not need to be extraordinary to be worth staying in. Most of them are built out of ordinary weeks.', source: 'Finkel, The All-or-Nothing Marriage' },

  // ── Intimacy, and what makes it possible ─────────────────────────────────
  { id: 'desire-differs', body: 'Wanting sex at different times and for different reasons is the usual case, not a mismatch to be fixed.', source: 'Nagoski, Come As You Are' },
  { id: 'responsive-desire', body: 'For a lot of people desire follows closeness rather than starting it. Waiting to feel like it can mean waiting a long time.', source: 'Basson, Journal of Sex and Marital Therapy' },
  { id: 'turning-down-well', body: 'How a no is given matters more than how often it is given.', source: 'Metz & McCarthy, Enduring Desire' },
  { id: 'talking-about-it', body: 'Couples who can talk about sex report better sex. The talking is not a symptom of it going well, it is part of how it goes well.', source: 'Mallory et al., Journal of Sex Research' },
  { id: 'non-sexual-touch', body: 'Ordinary touch that is not going anywhere makes the touch that is going somewhere easier to reach for.', source: 'Jakubiak & Feeney, Personality and Social Psychology Review' },

  // ── Attention, time and the world outside ────────────────────────────────
  { id: 'phone-in-the-room', body: 'A phone face down on the table still changes the conversation happening over it.', source: 'Przybylski & Weinstein, Journal of Social and Personal Relationships' },
  { id: 'stress-spillover', body: 'Most of what arrives in the evening was caused somewhere else. Saying so out loud takes it off your partner.', source: 'Neff & Karney, Journal of Personality and Social Psychology' },
  { id: 'friendship-first', body: 'The couples who do best describe each other as friends before they describe each other as anything else.', source: 'Gottman, The Seven Principles' },
  { id: 'shared-meaning', body: 'Beyond the logistics, couples build a private culture: what a holiday is for, what counts as a good week. Most of it is never discussed.', source: 'Gottman, The Seven Principles' },
  { id: 'outside-people', body: 'A relationship asked to be everything tends to buckle. Other people are not competition for it.', source: 'Finkel, The All-or-Nothing Marriage' },
];

/**
 * One insight, chosen by the day rather than at random.
 *
 * Random means someone who opens the app twice in a minute is shown two
 * different findings, which reads as decoration. By the day it is one finding
 * for as long as the day lasts, and the rotation is fifty days.
 */
export function insightOfTheDay(now = new Date()) {
  const day = Math.floor(now.getTime() / 86400000);
  return INSIGHTS[day % INSIGHTS.length];
}
