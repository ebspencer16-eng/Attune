# Insight of the day, for review

Generated from `api/_insights.js` by `scripts/build-insights-review.mjs`. Do
not edit this file. Change an insight in `api/_insights.js` and run the
script, or tell me the change and I will make it.

**55 insights**, one a day, so the list comes round about every
7.9 weeks. 6 are quotations and 49 are ours.

## What changed, and why you are seeing two tables

You: "The insight of the day today reads as SO AI. I would rather just use direct
quotes from these publications, can you organize those and cite them accurately?"

The tone was the half you could see. Underneath it was something worse. Every one
of these sentences is mine, and the product drew each one with a source
underneath it and shared it as the sentence followed by the attribution. A line
with a name under it reads as that person's line, so fifty sentences I wrote were
being attributed on screen to Gottman, Johnson and a dozen journals.

That is fixed at the root rather than in the wording. There are two kinds now and
the product cannot confuse them:

- **Quotations** carry the exact words, the author, the publication and a link to
  where I read them. Only these are shown with a citation.
- **Ours** are the product's own sentences and are shown with no attribution at
  all, because nobody said them but us. The work each is drawn from is recorded
  for you, in the third column below, and it never reaches a customer.

`check-insight-provenance.mjs` fails the build if those two are mixed.

## On whether we are allowed to quote

Yes, with limits, and the limits are the ordinary ones: keep the extract short,
name the author and where it was published, do not reproduce a substantial part
of anything, and do not imply the author endorses Attune. That is normal practice
and it is what the table below does. I am not a lawyer and this is the same
category of thing your lawyer is already reviewing, so it is worth one line of
their time.

What I will not do is produce fifty of them quickly. Each one has to be checked
against the source, and two traps turned up in the first three: the byline on a
page can be a current display name rather than the name a piece was published
under, and the date shown is usually when the page was last edited rather than
when it was written. So no date is claimed on any of these, and the link is there
so you can check the wording yourself.

## What to tell me

- **Cut it.** The claim is wrong, or it is not the tone you want.
- **Keep it, reword it.** Send me yours and I will swap it in.
- **Turn this one into a quote.** Name the book and I will find the wording and
  cite it, or tell you I could not verify it.

## Quotations

| # | Quotation | Source | Checked |
|--|--|--|--|
| Q1 | That ‘magic ratio’ is 5 to 1. This means that for every negative interaction during conflict, a stable and happy marriage has five (or more) positive interactions. | Kyle Benson, The Gottman Institute | [read it](https://www.gottman.com/blog/the-magic-relationship-ratio-according-science/) |
| Q2 | A bid is any attempt from one partner to another for attention, affirmation, affection, or any other positive connection. | Zach Brittle, The Gottman Institute | [read it](https://www.gottman.com/blog/turn-toward-instead-of-away/) |
| Q3 | Their research revealed that discussions will end on the same note they begin. | Dr. Ellie Wilde, The Gottman Institute | [read it](https://www.gottman.com/blog/softening-startup/) |
| Q4 | Stonewalling occurs when the listener withdraws from the interaction, shuts down, and simply stops responding to their partner. | Dr. Ellie Wilde, The Gottman Institute | [read it](https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/) |
| Q5 | The third horseman is defensiveness, and it is typically a response to criticism. | Dr. Ellie Wilde, The Gottman Institute | [read it](https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/) |
| Q6 | Contempt is the single greatest predictor of divorce. | Dr. Ellie Wilde, The Gottman Institute | [read it](https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/) |

## Ours

The third column is where the sentence comes from. **It is not shown to anyone**,
and it is here so you can tell whether the sentence is a fair summary of the work
beside it.

The ones marked **\*** are also published on the Our Purpose page, word for word
and with the same ids, so someone who meets one in the app and then reads the page
does not find it reworded. Changing one means changing the page too, and
`check-research.mjs` will say so.

| # | Insight | Drawn from |
|--|--|--|
| 1 * | The things that feel too soon to bring up are usually exactly the right things to bring up. Couples who name expectations early stay closer, longer. | Gottman & Silver, The Seven Principles |
| 2 * | It's rarely incompatibility that creates friction. It's the assumptions each person carries privately (about roles, money, the future) that no one's named yet. | Gottman et al., Journal of Marriage and Family |
| 3 * | More than attraction, more than compatibility, being genuinely known by your partner is what makes a relationship hold. Attune helps you get there. | Johnson, Hold Me Tight |
| 4 | How a hard conversation starts predicts how it ends. The first three minutes carry most of the outcome. | Gottman, The Seven Principles |
| 5 | Every couple argues. What separates the ones who last is how quickly they come back, not how rarely they leave. | Gottman, The Marriage Clinic |
| 6 | Most of what you disagree about, you will still disagree about in ten years. The work is not solving it. The work is not letting it harden. | Gottman, The Seven Principles |
| 7 | When your heart rate passes about a hundred, you stop being able to hear. A twenty minute break is not avoidance, it is what makes the rest of the conversation possible. | Gottman & Levenson, Journal of Marriage and Family |
| 8 | A complaint is about a thing that happened. Criticism is about the person who did it. The same frustration lands completely differently depending on which one you reach for. | Gottman, Why Marriages Succeed or Fail |
| 9 | Of everything that happens in an argument, contempt is the one that does lasting damage. Eye rolls count. | Gottman, The Seven Principles |
| 10 | Defensiveness is a way of saying the problem is not mine. It almost never ends the argument and it usually extends it. | Gottman, Why Marriages Succeed or Fail |
| 11 | One of you moves toward the conflict and one moves away. Neither is the problem. The pattern between you is. | Johnson, Hold Me Tight |
| 12 | A joke mid-argument, a hand on an arm, a change of tone. These are repair attempts, and whether they get accepted matters more than whether they are graceful. | Gottman, The Seven Principles |
| 13 | Starting with "you always" gives your partner something to defend instead of something to answer. | Gottman, The Seven Principles |
| 14 | Most connection is built in seconds, not evenings. A comment about the weather is often a bid for attention. | Gottman, The Relationship Cure |
| 15 | Couples who stay together turn toward each other most of the time. It is not a grand gesture. It is answering when you are spoken to. | Gottman, The Relationship Cure |
| 16 | In stable relationships there are about five good moments for every difficult one. The ratio matters more than the total. | Gottman & Levenson, Journal of Marriage and Family |
| 17 | Couples who can still say what they admire about each other recover from bad weeks faster. | Gottman, The Seven Principles |
| 18 | Knowing the small current facts of your partner’s life, the name of their difficult colleague, what is worrying them this week, is a better predictor than knowing their history. | Gottman, The Seven Principles |
| 19 | The small repeated things carry more weight than the rare big ones. A standing Sunday morning outlasts a good holiday. | Doherty, The Intentional Family |
| 20 | Noticing something and saying it are different events. Only one of them reaches your partner. | Algoe, Social and Personality Psychology Compass |
| 21 | How you respond to your partner’s good news shapes the relationship more than how you respond to their bad news. | Gable et al., Journal of Personality and Social Psychology |
| 22 | Doing something new together does more for how you feel about each other than doing something pleasant you have done before. | Aron et al., Journal of Personality and Social Psychology |
| 23 | Most recurring arguments are not about the thing. They are about whether you matter to each other, asked in a way that is hard to hear. | Johnson, Hold Me Tight |
| 24 | What looks like anger is often a protest at feeling unreachable. It is a request wearing the wrong clothes. | Johnson, Hold Me Tight |
| 25 | People take more risks, not fewer, when they have someone steady to come back to. | Feeney, Journal of Personality and Social Psychology |
| 26 | Depending on each other is not the opposite of being independent. It is what makes being independent possible. | Johnson, Hold Me Tight |
| 27 | Staying yourself inside a relationship is not distance. It is what gives you something to bring to it. | Schnarch, Passionate Marriage |
| 28 | Every couple runs on agreements nobody wrote down. Most disappointment is one of them being broken by someone who did not know it existed. | Gottman et al., Journal of Marriage and Family |
| 29 | What predicts contentment is not an even split. It is both people believing the split is fair. | Carlson et al., Journal of Marriage and Family |
| 30 | Remembering, planning and noticing are work, and they are the easiest work to be invisible. | Daminger, American Sociological Review |
| 31 | Couples who talk about money regularly disagree about it as often. They recover from the disagreements faster. | Dew et al., Family Relations |
| 32 | Keeping count works until the day your count and their count do not match, which is every day. | Gottman, The Seven Principles |
| 33 | Most arguments about tidiness are arguments about whose standard is the default. Naming the standard is half of it. | Daminger, American Sociological Review |
| 34 | Being willing to be changed by your partner is one of the few things that reliably predicts how a relationship goes. | Gottman, The Seven Principles |
| 35 | People change in the direction they are already leaning. Pressure mostly changes how honest they are about it. | Miller & Rollnick, Motivational Interviewing |
| 36 | The same behaviour reads completely differently depending on the reason you assume. The assumption is usually made before the behaviour. | Bradbury & Fincham, Psychological Bulletin |
| 37 | Once you expect the worst reading, you start finding it. The evidence does not change. | Weiss, Advances in Family Intervention |
| 38 | How a couple tells the story of how they met says more about where they are now than about what happened. | Buehlman, Gottman & Katz, Journal of Family Psychology |
| 39 | A relationship does not need to be extraordinary to be worth staying in. Most of them are built out of ordinary weeks. | Finkel, The All-or-Nothing Marriage |
| 40 | Wanting sex at different times and for different reasons is the usual case, not a mismatch to be fixed. | Nagoski, Come As You Are |
| 41 | For a lot of people desire follows closeness rather than starting it. Waiting to feel like it can mean waiting a long time. | Basson, Journal of Sex and Marital Therapy |
| 42 | How a no is given matters more than how often it is given. | Metz & McCarthy, Enduring Desire |
| 43 | Couples who can talk about sex report better sex. The talking is not a symptom of it going well, it is part of how it goes well. | Mallory et al., Journal of Sex Research |
| 44 | Ordinary touch that is not going anywhere makes the touch that is going somewhere easier to reach for. | Jakubiak & Feeney, Personality and Social Psychology Review |
| 45 | A phone face down on the table still changes the conversation happening over it. | Przybylski & Weinstein, Journal of Social and Personal Relationships |
| 46 | Most of what arrives in the evening was caused somewhere else. Saying so out loud takes it off your partner. | Neff & Karney, Journal of Personality and Social Psychology |
| 47 | The couples who do best describe each other as friends before they describe each other as anything else. | Gottman, The Seven Principles |
| 48 | Beyond the logistics, couples build a private culture: what a holiday is for, what counts as a good week. Most of it is never discussed. | Gottman, The Seven Principles |
| 49 | A relationship asked to be everything tends to buckle. Other people are not competition for it. | Finkel, The All-or-Nothing Marriage |
