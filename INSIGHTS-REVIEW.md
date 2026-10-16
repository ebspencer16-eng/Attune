# Insight of the day, for review

Generated from `api/_insights.js` by `scripts/build-insights-review.mjs`. Do
not edit this file. Change an insight in `api/_insights.js` and run the
script, or tell me the change and I will make it.

**100 insights**, one a day, so the list comes round about every
14.3 weeks. 100 are quotations and 0 are ours.

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

The **Subject** column is the postcode you asked for. Every quotation carries a
writer, a publication and a subject, and the posting order is dealt from all
three: no two days running share any of them, and the list wraps, so the last
day does not collide with the first either. `check-insight-rotation.mjs` fails
the build on a repeat.

20 subjects, the largest being attachment with
11 of 100. 26 writers across
10 publications, the largest being The Gottman Institute
with 47. That last number is the one that matters: anything
holding more than half the list has to touch itself somewhere whatever the
order, so it is also the limit to keep an eye on when adding more.

| # | Quotation | Source | Subject | Checked |
|--|--|--|--|--|
| Q1 | In insecure relationships, we disguise our vulnerabilities so our partner never really sees us. | Dr. Sue Johnson, Hold Me Tight | attachment | [read it](https://www.google.com/books/edition/_/jPLaqKhumPQC?gbpv=1&bsq=In%20insecure%20relationships%2C%20we%20disguise%20our%20vulnerabilities%20so%20our%20partner%20never%20really%20sees%20us.) |
| Q2 | Curiosity comes out of a sense of safety; rigidity out of being vigilant to threats. | Dr. Sue Johnson, Hold Me Tight | attachment | [read it](https://www.google.com/books/edition/_/jPLaqKhumPQC?gbpv=1&bsq=Curiosity%20comes%20out%20of%20a%20sense%20of%20safety%3B%20rigidity%20out%20of%20being%20vigilant%20to%20threats.) |
| Q3 | If you know your loved one is there and will come when you call, you are more confident of your worth, your value. And the world is less intimidating when you have another to count on and know that you are not alone. | Dr. Sue Johnson, Hold Me Tight | attachment | [read it](https://www.google.com/books/edition/_/jPLaqKhumPQC?gbpv=1&bsq=If%20you%20know%20your%20loved%20one%20is%20there%20and%20will%20come%20when%20you%20call%2C%20you%20are%20more%20confident%20of%20your%20worth%2C%20your%20value.%20And%20t) |
| Q4 | If you have a responsive love partner, you have a secure base in the chaos. If you are emotionally alone, you are in free fall. Having someone you can rely on for connection and support makes healing from trauma easier. | Dr. Sue Johnson, Hold Me Tight | attachment | [read it](https://www.google.com/books/edition/_/jPLaqKhumPQC?gbpv=1&bsq=If%20you%20have%20a%20responsive%20love%20partner%2C%20you%20have%20a%20secure%20base%20in%20the%20chaos.%20If%20you%20are%20emotionally%20alone%2C%20you%20are%20in%20fre) |
| Q5 | When we feel safely linked to our partners, we more easily roll with the hurts they inevitably inflict, and we are less likely to be aggressively hostile when we get mad at them. | Dr. Sue Johnson, Hold Me Tight | attachment | [read it](https://www.google.com/books/edition/_/jPLaqKhumPQC?gbpv=1&bsq=When%20we%20feel%20safely%20linked%20to%20our%20partners%2C%20we%20more%20easily%20roll%20with%20the%20hurts%20they%20inevitably%20inflict%2C%20and%20we%20are%20less%20) |
| Q6 | Underneath all the distress, partners are asking each other: Can I count on you, depend on you? Are you there for me? Will you respond to me when I need, when I call? Do I matter to you? Am I valued and accepted by you? Do you need me, rely on me? | Dr. Sue Johnson, Hold Me Tight | attachment | [read it](https://www.google.com/books/edition/_/jPLaqKhumPQC?gbpv=1&bsq=Underneath%20all%20the%20distress%2C%20partners%20are%20asking%20each%20other%3A%20Can%20I%20count%20on%20you%2C%20depend%20on%20you%3F%20Are%20you%20there%20for%20me%3F%20Wi) |
| Q7 | Friendship fuels the flames of romance because it offers the best protection against feeling adversarial toward your spouse. | John Gottman and Nan Silver, The Seven Principles for Making Marriage Work | friendship | [read it](https://www.google.com/books/edition/_/8IWOxW1VEIYC?gbpv=1&bsq=Friendship%20fuels%20the%20flames%20of%20romance%20because%20it%20offers%20the%20best%20protection%20against%20feeling%20adversarial%20toward%20your%20spo) |
| Q8 | Human nature dictates that it is virtually impossible to accept advice from someone unless you feel that that person understands you. | John Gottman and Nan Silver, The Seven Principles for Making Marriage Work | honesty | [read it](https://www.google.com/books/edition/_/8IWOxW1VEIYC?gbpv=1&bsq=Human%20nature%20dictates%20that%20it%20is%20virtually%20impossible%20to%20accept%20advice%20from%20someone%20unless%20you%20feel%20that%20that%20person%20und) |
| Q9 | The point is that neuroses don’t have to ruin a marriage. If you can accommodate each other’s “crazy” side and handle it with caring, affection, and respect, your marriage can thrive. | John Gottman and Nan Silver, The Seven Principles for Making Marriage Work | repair | [read it](https://www.google.com/books/edition/_/ZZVoBAAAQBAJ?gbpv=1&bsq=The%20point%20is%20that%20neuroses%20don%E2%80%99t%20have%20to%20ruin%20a%20marriage.%20If%20you%20can%20accommodate%20each%20other%E2%80%99s%20%E2%80%9Ccrazy%E2%80%9D%20side%20and%20handle%20it) |
| Q10 | [An emotionally intelligent marriage has] a dynamic that keeps... negative thoughts and feelings about each other (which all couples have) from overwhelming their positive ones. | John Gottman and Nan Silver, The Seven Principles for Making Marriage Work | repair | [read it](https://www.google.com/books/edition/_/z-mLDQAAQBAJ?gbpv=1&bsq=negative%20thoughts%20and%20feelings%20about%20each%20other%20(which%20all%20couples%20have)%20from%20overwhelming%20their%20positive%20ones.) |
| Q11 | Active listening asks couples to perform Olympic-level emotional gymnastics even if their relationship can barely walk. | John Gottman and Nan Silver, The Seven Principles for Making Marriage Work | horsemen | [read it](https://www.google.com/books/edition/_/ZZVoBAAAQBAJ?gbpv=1&bsq=Active%20listening%20asks%20couples%20to%20perform%20Olympic-level%20emotional%20gymnastics%20even%20if%20their%20relationship%20can%20barely%20walk.) |
| Q12 | I’ve found 94 percent of the time that couples who put a positive spin on their marriage’s history are likely to have a happy future as well. When happy memories are distorted, it’s a sign that the marriage needs help. | John Gottman and Nan Silver, The Seven Principles for Making Marriage Work | practice | [read it](https://www.google.com/books/edition/_/8IWOxW1VEIYC?gbpv=1&bsq=I%E2%80%99ve%20found%2094%20percent%20of%20the%20time%20that%20couples%20who%20put%20a%20positive%20spin%20on%20their%20marriage%E2%80%99s%20history%20are%20likely%20to%20have%20a%20) |
| Q13 | Although happily married couples may feel driven to distraction at times by their partner’s personality flaws, they still feel that the person they married is worthy of honor and respect. | John Gottman and Nan Silver, The Seven Principles for Making Marriage Work | repair | [read it](https://www.google.com/books/edition/_/8IWOxW1VEIYC?gbpv=1&bsq=Although%20happily%20married%20couples%20may%20feel%20driven%20to%20distraction%20at%20times%20by%20their%20partner%E2%80%99s%20personality%20flaws%2C%20they%20stil) |
| Q14 | At the heart of the Seven Principles approach is the simple truth that happy marriages are based on a deep friendship. | John Gottman and Nan Silver, The Seven Principles for Making Marriage Work | friendship | [read it](https://www.google.com/books/edition/_/ZZVoBAAAQBAJ?gbpv=1&bsq=At%20the%20heart%20of%20the%20Seven%20Principles%20approach%20is%20the%20simple%20truth%20that%20happy%20marriages%20are%20based%20on%20a%20deep%20friendship.) |
| Q15 | Perfection is not the price of love. Practice is. We practice how to express our love and how to receive our partner’s love. Love is an action even more than a feeling. It requires intention and attention, a practice we call attunement. | John Gottman and others, Eight Dates | practice | [read it](https://www.google.com/books/edition/_/V3BMDwAAQBAJ?gbpv=1&bsq=Perfection%20is%20not%20the%20price%20of%20love.%20Practice%20is.%20We%20practice%20how%20to%20express%20our%20love%20and%20how%20to%20receive%20our%20partner%E2%80%99s%20l) |
| Q16 | When we fall in love we are often on our very best behavior. We lead with the healthiest side of ourselves. But as relationships progress, each person gets more real, more transparent, and therefore more vulnerable. | John Gottman and others, Eight Dates | honesty | [read it](https://www.google.com/books/edition/_/V3BMDwAAQBAJ?gbpv=1&bsq=When%20we%20fall%20in%20love%20we%20are%20often%20on%20our%20very%20best%20behavior.%20We%20lead%20with%20the%20healthiest%20side%20of%20ourselves.%20But%20as%20relat) |
| Q17 | There is no question that committing to a person can be a terrifying prospect. It means putting all our eggs in one basket. | John Gottman and others, Eight Dates | trust | [read it](https://www.google.com/books/edition/_/V3BMDwAAQBAJ?gbpv=1&bsq=There%20is%20no%20question%20that%20committing%20to%20a%20person%20can%20be%20a%20terrifying%20prospect.%20It%20means%20putting%20all%20our%20eggs%20in%20one%20bask) |
| Q18 | The more we can reach out to our partners, the more separate and independent we can be. | Dr. Sue Johnson, Hold Me Tight | attachment | [read it](https://www.google.com/books/edition/_/jPLaqKhumPQC?gbpv=1&bsq=The%20more%20we%20can%20reach%20out%20to%20our%20partners%2C%20the%20more%20separate%20and%20independent%20we%20can%20be.) |
| Q19 | Generally in love, sharing even negative emotions, provided they don't get out of hand, is more useful than emotional absence. | Dr. Sue Johnson, Hold Me Tight | honesty | [read it](https://www.google.com/books/edition/_/jPLaqKhumPQC?gbpv=1&bsq=Generally%20in%20love%2C%20sharing%20even%20negative%20emotions%2C%20provided%20they%20don't%20get%20out%20of%20hand%2C%20is%20more%20useful%20than%20emotional%20ab) |
| Q20 | The demise of marriages begins with a growing absence of responsive intimate interactions. The conflict comes later. | Dr. Sue Johnson, Hold Me Tight | attachment | [read it](https://www.google.com/books/edition/_/jPLaqKhumPQC?gbpv=1&bsq=The%20demise%20of%20marriages%20begins%20with%20a%20growing%20absence%20of%20responsive%20intimate%20interactions.%20The%20conflict%20comes%20later.) |
| Q21 | The foundation of contented, sustained relationships is the faith that your partner is there for you. | Dr. Sue Johnson, Love Sense | attachment | [read it](https://www.google.com/books/edition/_/go2Tw2_VvkEC?gbpv=1&bsq=The%20foundation%20of%20contented%2C%20sustained%20relationships%20is%20the%20faith%20that%20your%20partner%20is%20there%20for%20you.) |
| Q22 | Injuries may be forgiven, but they never disappear. Instead, in the best outcome, they become integrated into couples’ attachment stories as demonstrations of renewal and connection. | Dr. Sue Johnson, Hold Me Tight | repair | [read it](https://www.google.com/books/edition/_/jPLaqKhumPQC?gbpv=1&bsq=Injuries%20may%20be%20forgiven%2C%20but%20they%20never%20disappear.%20Instead%2C%20in%20the%20best%20outcome%2C%20they%20become%20integrated%20into%20couples%E2%80%99%20a) |
| Q23 | It always fascinates me that when a child cries we prioritize this signal. We respond. Our children don’t threaten us, and we accept that they are vulnerable and need us... But we have been taught not to see adults this way. | Dr. Sue Johnson, Hold Me Tight | attachment | [read it](https://www.google.com/books/edition/_/jPLaqKhumPQC?gbpv=1&bsq=It%20always%20fascinates%20me%20that%20when%20a%20child%20cries%20we%20prioritize%20this%20signal.%20We%20respond.%20Our%20children%20don%E2%80%99t%20threaten%20us%2C%20a) |
| Q24 | Life takes its toll on all relationships as careers, children, and crises can pull us away from each other. | John Gottman and others, Eight Dates | meaning | [read it](https://www.google.com/books/edition/_/V3BMDwAAQBAJ?gbpv=1&bsq=Life%20takes%20its%20toll%20on%20all%20relationships%20as%20careers%2C%20children%2C%20and%20crises%20can%20pull%20us%20away%20from%20each%20other.) |
| Q25 | When we make our relationship a priority by showing that it’s a priority, we build trust and demonstrate our loyalty far beyond any words we say in our wedding vows. | John Gottman and others, Eight Dates | trust | [read it](https://www.google.com/books/edition/_/V3BMDwAAQBAJ?gbpv=1&bsq=When%20we%20make%20our%20relationship%20a%20priority%20by%20showing%20that%20it%E2%80%99s%20a%20priority%2C%20we%20build%20trust%20and%20demonstrate%20our%20loyalty%20far) |
| Q26 | The more honest we are, the more we can discover that our partner really loves us for who we are, and not the idealized version of us that shows up when we first begin to date. | John Gottman and others, Eight Dates | honesty | [read it](https://www.google.com/books/edition/_/V3BMDwAAQBAJ?gbpv=1&bsq=The%20more%20honest%20we%20are%2C%20the%20more%20we%20can%20discover%20that%20our%20partner%20really%20loves%20us%20for%20who%20we%20are%2C%20and%20not%20the%20idealized%20) |
| Q27 | The quality of our closest relationships, more than any other factor, determines our physical health, resistance to disease, and longevity. Satisfying close relationships also improve various dimensions of each partner’s mental health. | John Gottman and others, Eight Dates | attachment | [read it](https://www.google.com/books/edition/_/V3BMDwAAQBAJ?gbpv=1&bsq=The%20quality%20of%20our%20closest%20relationships%2C%20more%20than%20any%20other%20factor%2C%20determines%20our%20physical%20health%2C%20resistance%20to%20dise) |
| Q28 | For every negative interaction during conflict, a stable and happy marriage has five (or more) positive interactions. | Kyle Benson, The Gottman Institute | perpetual | [read it](https://www.gottman.com/blog/the-magic-relationship-ratio-according-science/) |
| Q29 | A bid is any attempt from one partner to another for attention, affirmation, affection, or any other positive connection. | Zach Brittle, The Gottman Institute | turning-toward | [read it](https://www.gottman.com/blog/turn-toward-instead-of-away/) |
| Q30 | Research revealed that discussions will end on the same note they begin. | Dr. Ellie Wilde, The Gottman Institute | conflict | [read it](https://www.gottman.com/blog/softening-startup/) |
| Q31 | Stonewalling occurs when the listener withdraws from the interaction, shuts down, and simply stops responding to their partner. | Dr. Ellie Wilde, The Gottman Institute | horsemen | [read it](https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/) |
| Q32 | Defensiveness will only escalate the conflict if the critical spouse does not back down or apologize. This is because defensiveness is really a way of blaming your partner, and it won’t allow for healthy conflict management. | Dr. Ellie Wilde, The Gottman Institute | horsemen | [read it](https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/) |
| Q33 | Contempt... is the number one predictor of divorce, but it can be defeated. | Dr. Ellie Wilde, The Gottman Institute | horsemen | [read it](https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/) |
| Q34 | Knowing the little things about your partner’s life creates a strong foundation for your friendship and intimacy. | Dr. Ellie Wilde, The Gottman Institute | friendship | [read it](https://www.gottman.com/blog/the-sound-relationship-house-build-love-maps/) |
| Q35 | Couples who have detailed love maps of each other’s worlds are far better prepared to cope with stressful events and conflict. | Dr. Ellie Wilde, The Gottman Institute | friendship | [read it](https://www.gottman.com/blog/the-sound-relationship-house-build-love-maps/) |
| Q36 | All relationships, even the most successful ones, have conflict. | The Gottman Institute, The Gottman Institute | conflict | [read it](https://www.gottman.com/blog/the-four-horsemen-the-antidotes/) |
| Q37 | Fortunately, our research shows that it’s not the appearance of conflict, but rather how it’s managed that predicts the success or failure of a relationship. | The Gottman Institute, The Gottman Institute | conflict | [read it](https://www.gottman.com/blog/the-four-horsemen-the-antidotes/) |
| Q38 | We say “manage” conflict rather than “resolve,” because relationship conflict is natural and has functional, positive aspects that provide opportunities for growth and understanding. | The Gottman Institute, The Gottman Institute | conflict | [read it](https://www.gottman.com/blog/the-four-horsemen-the-antidotes/) |
| Q39 | A complaint focuses on a specific behavior, but criticism attacks a person’s very character. | The Gottman Institute, The Gottman Institute | horsemen | [read it](https://www.gottman.com/blog/the-four-horsemen-the-antidotes/) |
| Q40 | Defensiveness is defined as self-protection in the form of righteous indignation or innocent victimhood in attempt to ward off a perceived attack. | The Gottman Institute, The Gottman Institute | horsemen | [read it](https://www.gottman.com/blog/the-four-horsemen-the-antidotes/) |
| Q41 | Trying to solve unsolvable problems is counterproductive, and no couple will ever completely eliminate them. However, discussing them is constructive and provides a positive opportunity for understanding and growth. | Marni Feuerman, The Gottman Institute | perpetual | [read it](https://www.gottman.com/blog/managing-vs-resolving-conflict-relationships-blueprints-success/) |
| Q42 | Being in dialogue, the preferred status, is when the couple has learned to accept their differences on that topic even though minor arguments arise occasionally. | Marni Feuerman, The Gottman Institute | perpetual | [read it](https://www.gottman.com/blog/managing-vs-resolving-conflict-relationships-blueprints-success/) |
| Q43 | Happy couples turn towards their partners approximately 20 times more than couples in distress during everyday, non-conflict discussions. | Dr. Ellie Wilde, The Gottman Institute | turning-toward | [read it](https://www.gottman.com/blog/an-introduction-to-emotional-bids-and-trust/) |
| Q44 | When you bid for your partner’s attention, affection, or support, their response generates an outcome. | Dr. Ellie Wilde, The Gottman Institute | turning-toward | [read it](https://www.gottman.com/blog/an-introduction-to-emotional-bids-and-trust/) |
| Q45 | Bids [for connection] can be verbal or nonverbal and include asking for anything from physical affection to help with a project. | The Gottman Institute, The Gottman Institute | turning-toward | [read it](https://www.gottman.com/blog/3-ways-to-make-a-better-bid-for-connection/) |
| Q46 | If a bid [for connection] is difficult to decipher, it may not elicit the response you want, because your partner does not understand what you’re asking for. | The Gottman Institute, The Gottman Institute | turning-toward | [read it](https://www.gottman.com/blog/3-ways-to-make-a-better-bid-for-connection/) |
| Q47 | Nonverbal bids [for connection] are still bids and deserve recognition. | The Gottman Institute, The Gottman Institute | turning-toward | [read it](https://www.gottman.com/blog/3-ways-to-make-a-better-bid-for-connection/) |
| Q48 | Saying what you mean and meaning what you say allows your partner to know they can trust your words. | Brittini Carter, The Gottman Institute | trust | [read it](https://www.gottman.com/blog/4-tips-to-build-everyday-trust-in-relationships/) |
| Q49 | Infidelity is the betrayal our society focuses on, but it is actually the subtle, unnoticed betrayals that truly ruin relationships. | Kyle Benson, The Gottman Institute | trust | [read it](https://www.gottman.com/blog/3-betrayals-ruin-relationships-arent-infidelity/) |
| Q50 | When partners do not choose each other day after day, trust and commitment erode away. | Kyle Benson, The Gottman Institute | trust | [read it](https://www.gottman.com/blog/3-betrayals-ruin-relationships-arent-infidelity/) |
| Q51 | Anything that violates a committed relationship’s contract of mutual trust, respect, and protection can be disastrous. | Kyle Benson, The Gottman Institute | trust | [read it](https://www.gottman.com/blog/3-betrayals-ruin-relationships-arent-infidelity/) |
| Q52 | Disagreements are an inevitable component of all relationships. | Gillian Florence Sanger, The Gottman Institute | conflict | [read it](https://www.gottman.com/blog/4-mindful-listening-principles-to-better-navigate-conflict/) |
| Q53 | No two people are identical in thought and belief patterns, regardless of how similar they might be. | Gillian Florence Sanger, The Gottman Institute | conflict | [read it](https://www.gottman.com/blog/4-mindful-listening-principles-to-better-navigate-conflict/) |
| Q54 | Even in the strongest relationships, conflicting needs and opinions arise from time to time. | Gillian Florence Sanger, The Gottman Institute | conflict | [read it](https://www.gottman.com/blog/4-mindful-listening-principles-to-better-navigate-conflict/) |
| Q55 | When you have irresolvable problems in your marriage (everyone does!), you can either hold that against your partner or accept what you cannot change. | Maureen Werrbach, The Gottman Institute | perpetual | [read it](https://www.gottman.com/blog/3-ways-to-keep-your-relationship-in-the-positive-perspective/) |
| Q56 | When you accept your partner, you also accept their influence when discussing problems. | Maureen Werrbach, The Gottman Institute | perpetual | [read it](https://www.gottman.com/blog/3-ways-to-keep-your-relationship-in-the-positive-perspective/) |
| Q57 | All couples fight, but not every couple knows how to do it in a healthy way. | Jennifer Scott, The Gottman Institute | conflict | [read it](https://www.gottman.com/blog/4-conflict-styles-that-hurt-your-relationship/) |
| Q58 | Successful relationships aren’t conflict-free; they’re simply better at managing arguments and repairing when something has gone wrong. | The Gottman Institute, The Gottman Institute | conflict | [read it](https://www.gottman.com/blog/everything-turns-into-an-argument/) |
| Q59 | Unhealthy conflict is characterized by the presence of criticism, defensiveness and a lack of understanding. | The Gottman Institute, The Gottman Institute | horsemen | [read it](https://www.gottman.com/blog/everything-turns-into-an-argument/) |
| Q60 | Sometimes couples are in a state of negative sentiment override where they assume the worst about each other’s intentions. | Dana McNeil, The Gottman Institute | perpetual | [read it](https://www.gottman.com/blog/the-gifts-of-showing-your-gratitude-for-each-other/) |
| Q61 | Showing and expressing gratitude can be that one small step to putting the relationship back on course. | Dana McNeil, The Gottman Institute | gratitude | [read it](https://www.gottman.com/blog/the-gifts-of-showing-your-gratitude-for-each-other/) |
| Q62 | Sharing fondness and admiration can also sound like letting your partner know you are proud of them and admire who they are. | Dana McNeil, The Gottman Institute | gratitude | [read it](https://www.gottman.com/blog/the-gifts-of-showing-your-gratitude-for-each-other/) |
| Q63 | Gratitude will gain momentum in your relationship over time and with a regular commitment to noticing and articulating the things that you are grateful for about your partner. | Dana McNeil, The Gottman Institute | gratitude | [read it](https://www.gottman.com/blog/the-gifts-of-showing-your-gratitude-for-each-other/) |
| Q64 | What people often forget is that the wedding itself is a symbol of something much greater: a marriage. | Liz Higgins, The Gottman Institute | meaning | [read it](https://www.gottman.com/blog/debunking-5-myths-about-premarital-conflict/) |
| Q65 | Although grand gestures are nice, the particles of your day-to-day interactions maintain positive feelings and regard for the ones you love. | Satira Streeter, The Gottman Institute | turning-toward | [read it](https://www.gottman.com/blog/bid-busters-ways-you-unintentionally-turn-away-from-connection/) |
| Q66 | The absence of bids [for connection] leads to emotional disengagement, loneliness, and in many cases either break-up or unhappiness. | Satira Streeter, The Gottman Institute | turning-toward | [read it](https://www.gottman.com/blog/bid-busters-ways-you-unintentionally-turn-away-from-connection/) |
| Q67 | I promise you, there is, and always will be, more that you don’t know about your partner than you do. | Zach Brittle, LMHC, The Gottman Institute | friendship | [read it](https://www.gottman.com/blog/build-love-maps/) |
| Q68 | When you choose to spend your life with someone, you hand them a map to your inner world. | Zach Brittle, LMHC, The Gottman Institute | friendship | [read it](https://www.gottman.com/blog/build-love-maps/) |
| Q69 | Couples in long-term relationships must turn the seemingly small and mundane into opportunities to attune to one another. | Liz Higgins, The Gottman Institute | meaning | [read it](https://www.gottman.com/blog/5-simple-ways-strengthen-friendship-marriage/) |
| Q70 | You don’t have to have the same interests as your partner, but you can absolutely enjoy time spent together by engaging in one of their (or your) interests. | Liz Higgins, The Gottman Institute | friendship | [read it](https://www.gottman.com/blog/5-simple-ways-strengthen-friendship-marriage/) |
| Q71 | Daily experiences like doing the dishes, folding laundry, watching TV, or cooking together can be opportunities for a deeper connection to occur. | Liz Higgins, The Gottman Institute | turning-toward | [read it](https://www.gottman.com/blog/5-simple-ways-strengthen-friendship-marriage/) |
| Q72 | One of the best ways to create shared meaning is to talk about each other’s dreams, which are often deeply connected to your pasts. | Dr. Ellie Wilde, The Gottman Institute | meaning | [read it](https://www.gottman.com/blog/create-shared-meaning-examining-rituals/) |
| Q73 | [One] way to create shared meaning is to create traditions and rituals for your life together as a couple. | Dr. Ellie Wilde, The Gottman Institute | meaning | [read it](https://www.gottman.com/blog/create-shared-meaning-examining-rituals/) |
| Q74 | The more shared meaning you can find, the deeper, richer, and more rewarding your relationship will be. | Dr. Ellie Wilde, The Gottman Institute | meaning | [read it](https://www.gottman.com/blog/create-shared-meaning-examining-rituals/) |
| Q75 | Those ties protect people from life’s discontents, help to delay mental and physical decline, and are better predictors of long and happy lives than social class, IQ, or even genes. | Liz Mineo, Harvard Gazette | belonging | [read it](https://news.harvard.edu/gazette/story/2017/04/over-nearly-80-years-harvard-study-has-been-showing-how-to-live-a-healthy-and-happy-life/) |
| Q76 | Several studies found that people’s level of satisfaction with their relationships at age 50 was a better predictor of physical health than their cholesterol levels were. | Liz Mineo, Harvard Gazette | belonging | [read it](https://news.harvard.edu/gazette/story/2017/04/over-nearly-80-years-harvard-study-has-been-showing-how-to-live-a-healthy-and-happy-life/) |
| Q77 | The researchers also found that marital satisfaction has a protective effect on people's mental health. | Liz Mineo, Harvard Gazette | care | [read it](https://news.harvard.edu/gazette/story/2017/04/over-nearly-80-years-harvard-study-has-been-showing-how-to-live-a-healthy-and-happy-life/) |
| Q78 | Taking care of your body is important, but tending to your relationships is a form of self-care too. | Robert Waldinger, Harvard Gazette | care | [read it](https://news.harvard.edu/gazette/story/2017/04/over-nearly-80-years-harvard-study-has-been-showing-how-to-live-a-healthy-and-happy-life/) |
| Q79 | Researchers have argued that kindness is like a muscle that needs to be strengthened through repeated use. | Juliana Breines, Greater Good Magazine | kindness | [read it](https://greatergood.berkeley.edu/article/item/three_strategies_for_bringing_more_kindness_into_your_life) |
| Q80 | It’s important to give yourself the option to say no, and to give others the same option when requesting help. | Juliana Breines, Greater Good Magazine | kindness | [read it](https://greatergood.berkeley.edu/article/item/three_strategies_for_bringing_more_kindness_into_your_life) |
| Q81 | Intentionally practicing kindness in our everyday lives, even on days when we’re not in a particularly generous mood, can go a long way toward turning kindness into a habit. | Juliana Breines, Greater Good Magazine | kindness | [read it](https://greatergood.berkeley.edu/article/item/three_strategies_for_bringing_more_kindness_into_your_life) |
| Q82 | Making someone you’re arguing with feel that you’re listening can calm the troubled waters, allowing both parties to get safely to the opposite shore. | Julia Minson, Greater Good Magazine | listening | [read it](https://greatergood.berkeley.edu/article/item/four_steps_to_help_people_feel_listened_to) |
| Q83 | Rather than trying to change how you think of or feel about your counterpart, our work suggests that you should focus on changing your own behavior. | Julia Minson, Greater Good Magazine | listening | [read it](https://greatergood.berkeley.edu/article/item/four_steps_to_help_people_feel_listened_to) |
| Q84 | Rather than jumping in to your own argument, devote a few seconds to restating the other person’s position to demonstrate that you did indeed hear and understand it. | Julia Minson, Greater Good Magazine | listening | [read it](https://greatergood.berkeley.edu/article/item/four_steps_to_help_people_feel_listened_to) |
| Q85 | Sometimes, friendship is about helping just because your friend is in need and you care about their well-being. | Jessica D. Ayers and Athena Aktipis, Greater Good Magazine | friendship | [read it](https://greatergood.berkeley.edu/article/item/how_our_friends_act_like_social_insurance) |
| Q86 | Keeping track of what a friend does for you isn’t what friendships are about. | Jessica D. Ayers and Athena Aktipis, Greater Good Magazine | friendship | [read it](https://greatergood.berkeley.edu/article/item/how_our_friends_act_like_social_insurance) |
| Q87 | The results suggest that our acts of kindness and generosity, online or offline, can have meaningful ripple effects in our communities. | Jill Suttie, Greater Good Magazine | generosity | [read it](https://greatergood.berkeley.edu/article/item/how_kindness_spreads_in_a_community) |
| Q88 | This suggests people are prosocial by nature, waiting for inspiration to act. | Jill Suttie, Greater Good Magazine | generosity | [read it](https://greatergood.berkeley.edu/article/item/how_kindness_spreads_in_a_community) |
| Q89 | That means that when people model kind and helpful behavior, it has a healthy impact on spreading goodness in a community. | Jill Suttie, Greater Good Magazine | generosity | [read it](https://greatergood.berkeley.edu/article/item/how_kindness_spreads_in_a_community) |
| Q90 | The complexity of love has much to do with how people experience it differently and how it can change over time. | Gery Karantzas, The Conversation | love | [read it](https://theconversation.com/what-is-love-139212) |
| Q91 | It’s reductions in companionate love, moreso than passionate love, that can negatively affect the longevity of a romantic relationship. | Gery Karantzas, The Conversation | love | [read it](https://theconversation.com/what-is-love-139212) |
| Q92 | Love is an emotion that keeps people bonded and committed to one another. | Gery Karantzas, The Conversation | love | [read it](https://theconversation.com/what-is-love-139212) |
| Q93 | Impossibly high standards can make an excellent relationship seem average. | Gary W. Lewandowski Jr., The Conversation | expectations | [read it](https://theconversation.com/your-relationship-may-be-better-than-you-think-find-the-knot-111152) |
| Q94 | Relationship science suggests that the problem is that people tend to overemphasize the negative and underappreciate the positive when looking at their romantic partners. | Gary W. Lewandowski Jr., The Conversation | expectations | [read it](https://theconversation.com/your-relationship-may-be-better-than-you-think-find-the-knot-111152) |
| Q95 | Rather than be thankful for the relative calm, people manufacture problems where none previously existed. | Gary W. Lewandowski Jr., The Conversation | expectations | [read it](https://theconversation.com/your-relationship-may-be-better-than-you-think-find-the-knot-111152) |
| Q96 | Listening in conflict does not require agreement; it requires a willingness to understand. | Guy Itzchakov, Psychology Today | understanding | [read it](https://www.psychologytoday.com/us/blog/the-listening-lens/202604/why-feeling-heard-can-make-or-break-a-relationship) |
| Q97 | Quick advice often backfires because it solves the problem before addressing the person. | Guy Itzchakov, Psychology Today | understanding | [read it](https://www.psychologytoday.com/us/blog/the-listening-lens/202604/why-feeling-heard-can-make-or-break-a-relationship) |
| Q98 | Feeling heard can reduce defensiveness and make difficult conversations feel emotionally safer. | Guy Itzchakov, Psychology Today | understanding | [read it](https://www.psychologytoday.com/us/blog/the-listening-lens/202604/why-feeling-heard-can-make-or-break-a-relationship) |
| Q99 | Enduring connection in marriage results more from the intentional efforts of the spouses than it does from spontaneous love and emotional spark. | Adam M. Galovan and others, Institute for Family Studies | practice | [read it](https://ifstudies.org/blog/flourishing-marriages-are-made-not-found) |
| Q100 | Flourishing marriages include deeper elements such as personal virtues, life meaning and purpose, a sense of belonging, growth and improvement, and a couple identity that includes a sense of togetherness and permanence. | Adam M. Galovan and others, Institute for Family Studies | belonging | [read it](https://ifstudies.org/blog/flourishing-marriages-are-made-not-found) |

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

