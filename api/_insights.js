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
 * ── THERE IS ONLY ONE KIND NOW ────────────────────────────────────────────
 * There used to be two. The other was the product's own sentence, carrying a
 * `basis` that recorded the work it was drawn from and never reached a customer.
 * Ellie: "I want every insight to be quotes, I want to retire all AI-generated
 * sentences." So all forty-nine are gone and `kind` is always 'quote'. The field
 * stays rather than being dropped, because it is what check-insight-provenance
 * reads to know an entry needs a citation, and because bringing our own
 * sentences back should be a decision rather than an omission.
 *
 * ── WHAT A QUOTATION CARRIES ──────────────────────────────────────────────
 * `author` and `work`, always. Then one of two ways for the wording to be
 * checked, and never neither:
 *
 *   `url`        a page that can be fetched and searched, which is how the
 *                Gottman Institute entries are held.
 *
 *   `volumeId`   a Google Books volume, plus the `edition` a reader sees. The
 *                check asks Google whether that exact sentence is in that exact
 *                volume, which is a search of the publisher's own scan.
 *
 * ── ON ADDING A QUOTE ─────────────────────────────────────────────────────
 * Never from memory. Two of the first six were paraphrases wearing quotation
 * marks, and one of those sat under a researcher's name, which is a claim about
 * what that person said.
 *
 * The way in is a candidate from anywhere, including somewhere unreliable, put
 * through the verifier. A Goodreads transcription that Google confirms against
 * the scan is a quotation; one it cannot find is not, whatever it says
 * underneath. That is how candidates were discarded here, one of them
 * attributed to the wrong author entirely and one existing only in a Spanish
 * translation.
 *
 * Two smaller traps, both met while adding the first three: a byline on a page
 * can be a current display name rather than the name the piece was published
 * under, and a date shown is often when the page was last touched.
 *
 * If a claim is wrong, the fix is to cut the entry rather than soften it.
 */

import { dayNumber } from './_lib/day-number.js';

export const INSIGHTS = [
  /* ── HER REVIEW, 2026-10-15 ───────────────────────────────────────────────
     She read all 100 in INSIGHTS-REVIEW.md, kept 74, and edited 14 of those.
     The edits are hers and are in verbatim: an ellipsis where she cut the
     middle of a sentence, square brackets where she needed a word the original
     only implies, and the opening clause dropped from four of them. Both are
     ordinary quotation practice and check-quotes-verbatim now understands them
     rather than reading them as misquotation.

     One was not an edit. Q88 reached me as "nWhen you choose to spend your
     life with someone", which is an escaped newline that survived the paste,
     so it is in as "When". If that was deliberate, say so and it goes back.

     Q12 is hers twice over. She cut "their" from the middle of the sentence
     with nothing marking the cut, which is the one thing this file's check
     does not allow, so it shipped for a day with the word restored and the
     question put to her. Her answer: "Use an ellipsis please." So the cut is
     marked and the words are hers, which is the right way round.

     What she asked for next is in TASKS.md as C6: 26 more from sources we have
     not used, on love, kindness, understanding and peacemaking rather than
     conflict, and no two days running from one source or one subject.

     `topic` is the second half of that. The rotation below deals by work and by
     topic together, so neither repeats on consecutive days. */
  {
    kind: 'quote',
    id: 'q-insecure-relationships-disguise',
    body: 'In insecure relationships, we disguise our vulnerabilities so our partner never really sees us.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    topic: 'attachment',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-curiosity-comes-sense',
    body: 'Curiosity comes out of a sense of safety; rigidity out of being vigilant to threats.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    topic: 'attachment',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-know-loved-there',
    body: 'If you know your loved one is there and will come when you call, you are more confident of your worth, your value. And the world is less intimidating when you have another to count on and know that you are not alone.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    topic: 'attachment',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-responsive-love-partner',
    body: 'If you have a responsive love partner, you have a secure base in the chaos. If you are emotionally alone, you are in free fall. Having someone you can rely on for connection and support makes healing from trauma easier.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    topic: 'attachment',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-feel-safely-linked',
    body: 'When we feel safely linked to our partners, we more easily roll with the hurts they inevitably inflict, and we are less likely to be aggressively hostile when we get mad at them.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    topic: 'attachment',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-underneath-distress-partners',
    body: 'Underneath all the distress, partners are asking each other: Can I count on you, depend on you? Are you there for me? Will you respond to me when I need, when I call? Do I matter to you? Am I valued and accepted by you? Do you need me, rely on me?',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    topic: 'attachment',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-friendship-fuels-flames',
    body: 'Friendship fuels the flames of romance because it offers the best protection against feeling adversarial toward your spouse.',
    author: 'John Gottman and Nan Silver',
    work: 'The Seven Principles for Making Marriage Work',
    topic: 'friendship',
    edition: 'Harmony 2015',
    volumeId: '8IWOxW1VEIYC',
  },
  {
    kind: 'quote',
    id: 'q-human-nature-dictates',
    body: 'Human nature dictates that it is virtually impossible to accept advice from someone unless you feel that that person understands you.',
    author: 'John Gottman and Nan Silver',
    work: 'The Seven Principles for Making Marriage Work',
    topic: 'honesty',
    edition: 'Harmony 2015',
    volumeId: '8IWOxW1VEIYC',
  },
  {
    kind: 'quote',
    id: 'q-point-neuroses-ruin',
    body: 'The point is that neuroses don’t have to ruin a marriage. If you can accommodate each other’s “crazy” side and handle it with caring, affection, and respect, your marriage can thrive.',
    author: 'John Gottman and Nan Silver',
    work: 'The Seven Principles for Making Marriage Work',
    topic: 'repair',
    edition: 'Harmony 2015',
    volumeId: 'ZZVoBAAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-lives-upon-dynamic',
    body: '[An emotionally intelligent marriage has] a dynamic that keeps... negative thoughts and feelings about each other (which all couples have) from overwhelming their positive ones.',
    author: 'John Gottman and Nan Silver',
    work: 'The Seven Principles for Making Marriage Work',
    topic: 'repair',
    edition: 'Harmony 2015',
    volumeId: 'z-mLDQAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-active-listening-asks',
    body: 'Active listening asks couples to perform Olympic-level emotional gymnastics even if their relationship can barely walk.',
    author: 'John Gottman and Nan Silver',
    work: 'The Seven Principles for Making Marriage Work',
    topic: 'horsemen',
    edition: 'Harmony 2015',
    volumeId: 'ZZVoBAAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-found-percent-time',
    body: 'I’ve found 94 percent of the time that couples who put a positive spin on their marriage’s history are likely to have a happy future as well. When happy memories are distorted, it’s a sign that the marriage needs help.',
    author: 'John Gottman and Nan Silver',
    work: 'The Seven Principles for Making Marriage Work',
    topic: 'practice',
    edition: 'Harmony 2015',
    volumeId: '8IWOxW1VEIYC',
  },
  {
    kind: 'quote',
    id: 'q-although-happily-married',
    body: 'Although happily married couples may feel driven to distraction at times by their partner’s personality flaws, they still feel that the person they married is worthy of honor and respect.',
    author: 'John Gottman and Nan Silver',
    work: 'The Seven Principles for Making Marriage Work',
    topic: 'repair',
    edition: 'Harmony 2015',
    volumeId: '8IWOxW1VEIYC',
  },
  {
    kind: 'quote',
    id: 'q-heart-seven-principles',
    body: 'At the heart of the Seven Principles approach is the simple truth that happy marriages are based on a deep friendship.',
    author: 'John Gottman and Nan Silver',
    work: 'The Seven Principles for Making Marriage Work',
    topic: 'friendship',
    edition: 'Harmony 2015',
    volumeId: 'ZZVoBAAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-perfection-price-love',
    body: 'Perfection is not the price of love. Practice is. We practice how to express our love and how to receive our partner’s love. Love is an action even more than a feeling. It requires intention and attention, a practice we call attunement.',
    author: 'John Gottman and others',
    work: 'Eight Dates',
    topic: 'practice',
    edition: 'Workman Publishing Company 2019',
    volumeId: 'V3BMDwAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-fall-love-often',
    body: 'When we fall in love we are often on our very best behavior. We lead with the healthiest side of ourselves. But as relationships progress, each person gets more real, more transparent, and therefore more vulnerable.',
    author: 'John Gottman and others',
    work: 'Eight Dates',
    topic: 'honesty',
    edition: 'Workman Publishing Company 2019',
    volumeId: 'V3BMDwAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-there-question-committing',
    body: 'There is no question that committing to a person can be a terrifying prospect. It means putting all our eggs in one basket.',
    author: 'John Gottman and others',
    work: 'Eight Dates',
    topic: 'trust',
    edition: 'Workman Publishing Company 2019',
    volumeId: 'V3BMDwAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-reach-partners-separate',
    body: 'The more we can reach out to our partners, the more separate and independent we can be.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    topic: 'attachment',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-generally-love-sharing',
    body: 'Generally in love, sharing even negative emotions, provided they don\'t get out of hand, is more useful than emotional absence.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    topic: 'honesty',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-demise-marriages-begins',
    body: 'The demise of marriages begins with a growing absence of responsive intimate interactions. The conflict comes later.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    topic: 'attachment',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-foundation-contented-sustained',
    body: 'The foundation of contented, sustained relationships is the faith that your partner is there for you.',
    author: 'Dr. Sue Johnson',
    work: 'Love Sense',
    topic: 'attachment',
    edition: 'Little, Brown Spark 2013',
    volumeId: 'go2Tw2_VvkEC',
  },
  {
    kind: 'quote',
    id: 'q-injuries-forgiven-never',
    body: 'Injuries may be forgiven, but they never disappear. Instead, in the best outcome, they become integrated into couples’ attachment stories as demonstrations of renewal and connection.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    topic: 'repair',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-always-fascinates-child',
    body: 'It always fascinates me that when a child cries we prioritize this signal. We respond. Our children don’t threaten us, and we accept that they are vulnerable and need us... But we have been taught not to see adults this way.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    topic: 'attachment',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-life-takes-toll',
    body: 'Life takes its toll on all relationships as careers, children, and crises can pull us away from each other.',
    author: 'John Gottman and others',
    work: 'Eight Dates',
    topic: 'meaning',
    edition: 'Workman Publishing Company 2019',
    volumeId: 'V3BMDwAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-make-relationship-priority',
    body: 'When we make our relationship a priority by showing that it’s a priority, we build trust and demonstrate our loyalty far beyond any words we say in our wedding vows.',
    author: 'John Gottman and others',
    work: 'Eight Dates',
    topic: 'trust',
    edition: 'Workman Publishing Company 2019',
    volumeId: 'V3BMDwAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-honest-discover-partner',
    body: 'The more honest we are, the more we can discover that our partner really loves us for who we are, and not the idealized version of us that shows up when we first begin to date.',
    author: 'John Gottman and others',
    work: 'Eight Dates',
    topic: 'honesty',
    edition: 'Workman Publishing Company 2019',
    volumeId: 'V3BMDwAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-quality-closest-relationships',
    body: 'The quality of our closest relationships, more than any other factor, determines our physical health, resistance to disease, and longevity. Satisfying close relationships also improve various dimensions of each partner’s mental health.',
    author: 'John Gottman and others',
    work: 'Eight Dates',
    topic: 'attachment',
    edition: 'Workman Publishing Company 2019',
    volumeId: 'V3BMDwAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-magic-ratio',
    body: 'For every negative interaction during conflict, a stable and happy marriage has five (or more) positive interactions.',
    author: 'Kyle Benson',
    work: 'The Gottman Institute',
    topic: 'perpetual',
    url: 'https://www.gottman.com/blog/the-magic-relationship-ratio-according-science/',
  },
  {
    kind: 'quote',
    id: 'q-bid',
    body: 'A bid is any attempt from one partner to another for attention, affirmation, affection, or any other positive connection.',
    author: 'Zach Brittle',
    work: 'The Gottman Institute',
    topic: 'turning-toward',
    url: 'https://www.gottman.com/blog/turn-toward-instead-of-away/',
  },
  {
    kind: 'quote',
    id: 'q-startup',
    body: 'Research revealed that discussions will end on the same note they begin.',
    author: 'Dr. Ellie Wilde',
    work: 'The Gottman Institute',
    topic: 'conflict',
    url: 'https://www.gottman.com/blog/softening-startup/',
  },
  {
    kind: 'quote',
    id: 'q-stonewalling',
    body: 'Stonewalling occurs when the listener withdraws from the interaction, shuts down, and simply stops responding to their partner.',
    author: 'Dr. Ellie Wilde',
    work: 'The Gottman Institute',
    topic: 'horsemen',
    url: 'https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/',
  },
  {
    kind: 'quote',
    id: 'q-defensiveness',
    body: 'Defensiveness will only escalate the conflict if the critical spouse does not back down or apologize. This is because defensiveness is really a way of blaming your partner, and it won’t allow for healthy conflict management.',
    author: 'Dr. Ellie Wilde',
    work: 'The Gottman Institute',
    topic: 'horsemen',
    url: 'https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/',
  },
  {
    kind: 'quote',
    id: 'q-contempt',
    body: 'Contempt... is the number one predictor of divorce, but it can be defeated.',
    author: 'Dr. Ellie Wilde',
    work: 'The Gottman Institute',
    topic: 'horsemen',
    url: 'https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/',
  },
  {
    kind: 'quote',
    id: 'q-love-maps',
    body: 'Knowing the little things about your partner’s life creates a strong foundation for your friendship and intimacy.',
    author: 'Dr. Ellie Wilde',
    work: 'The Gottman Institute',
    topic: 'friendship',
    url: 'https://www.gottman.com/blog/the-sound-relationship-house-build-love-maps/',
  },
  {
    kind: 'quote',
    id: 'q-love-maps-stress',
    body: 'Couples who have detailed love maps of each other’s worlds are far better prepared to cope with stressful events and conflict.',
    author: 'Dr. Ellie Wilde',
    work: 'The Gottman Institute',
    topic: 'friendship',
    url: 'https://www.gottman.com/blog/the-sound-relationship-house-build-love-maps/',
  },
  {
    kind: 'quote',
    id: 'q-conflict-is-normal',
    body: 'All relationships, even the most successful ones, have conflict.',
    author: 'The Gottman Institute',
    work: 'The Gottman Institute',
    topic: 'conflict',
    url: 'https://www.gottman.com/blog/the-four-horsemen-the-antidotes/',
  },
  {
    kind: 'quote',
    id: 'q-how-managed',
    body: 'Fortunately, our research shows that it’s not the appearance of conflict, but rather how it’s managed that predicts the success or failure of a relationship.',
    author: 'The Gottman Institute',
    work: 'The Gottman Institute',
    topic: 'conflict',
    url: 'https://www.gottman.com/blog/the-four-horsemen-the-antidotes/',
  },
  {
    kind: 'quote',
    id: 'q-manage-not-resolve',
    body: 'We say “manage” conflict rather than “resolve,” because relationship conflict is natural and has functional, positive aspects that provide opportunities for growth and understanding.',
    author: 'The Gottman Institute',
    work: 'The Gottman Institute',
    topic: 'conflict',
    url: 'https://www.gottman.com/blog/the-four-horsemen-the-antidotes/',
  },
  {
    kind: 'quote',
    id: 'q-complaint-vs-criticism',
    body: 'A complaint focuses on a specific behavior, but criticism attacks a person’s very character.',
    author: 'The Gottman Institute',
    work: 'The Gottman Institute',
    topic: 'horsemen',
    url: 'https://www.gottman.com/blog/the-four-horsemen-the-antidotes/',
  },
  {
    kind: 'quote',
    id: 'q-defensiveness-defined',
    body: 'Defensiveness is defined as self-protection in the form of righteous indignation or innocent victimhood in attempt to ward off a perceived attack.',
    author: 'The Gottman Institute',
    work: 'The Gottman Institute',
    topic: 'horsemen',
    url: 'https://www.gottman.com/blog/the-four-horsemen-the-antidotes/',
  },
  {
    kind: 'quote',
    id: 'q-unsolvable',
    body: 'Trying to solve unsolvable problems is counterproductive, and no couple will ever completely eliminate them. However, discussing them is constructive and provides a positive opportunity for understanding and growth.',
    author: 'Marni Feuerman',
    work: 'The Gottman Institute',
    topic: 'perpetual',
    url: 'https://www.gottman.com/blog/managing-vs-resolving-conflict-relationships-blueprints-success/',
  },
  {
    kind: 'quote',
    id: 'q-in-dialogue',
    body: 'Being in dialogue, the preferred status, is when the couple has learned to accept their differences on that topic even though minor arguments arise occasionally.',
    author: 'Marni Feuerman',
    work: 'The Gottman Institute',
    topic: 'perpetual',
    url: 'https://www.gottman.com/blog/managing-vs-resolving-conflict-relationships-blueprints-success/',
  },
  {
    kind: 'quote',
    id: 'q-happy-couples-turn-towards-their-partners',
    body: 'Happy couples turn towards their partners approximately 20 times more than couples in distress during everyday, non-conflict discussions.',
    author: 'Dr. Ellie Wilde',
    work: 'The Gottman Institute',
    topic: 'turning-toward',
    url: 'https://www.gottman.com/blog/an-introduction-to-emotional-bids-and-trust/',
  },
  {
    kind: 'quote',
    id: 'q-when-you-bid-for-your-partner',
    body: 'When you bid for your partner’s attention, affection, or support, their response generates an outcome.',
    author: 'Dr. Ellie Wilde',
    work: 'The Gottman Institute',
    topic: 'turning-toward',
    url: 'https://www.gottman.com/blog/an-introduction-to-emotional-bids-and-trust/',
  },
  {
    kind: 'quote',
    id: 'q-bids-can-be-verbal-or-nonverbal',
    body: 'Bids [for connection] can be verbal or nonverbal and include asking for anything from physical affection to help with a project.',
    author: 'The Gottman Institute',
    work: 'The Gottman Institute',
    topic: 'turning-toward',
    url: 'https://www.gottman.com/blog/3-ways-to-make-a-better-bid-for-connection/',
  },
  {
    kind: 'quote',
    id: 'q-if-a-bid-is-difficult-to',
    body: 'If a bid [for connection] is difficult to decipher, it may not elicit the response you want, because your partner does not understand what you’re asking for.',
    author: 'The Gottman Institute',
    work: 'The Gottman Institute',
    topic: 'turning-toward',
    url: 'https://www.gottman.com/blog/3-ways-to-make-a-better-bid-for-connection/',
  },
  {
    kind: 'quote',
    id: 'q-nonverbal-bids-are-still-bids-and',
    body: 'Nonverbal bids [for connection] are still bids and deserve recognition.',
    author: 'The Gottman Institute',
    work: 'The Gottman Institute',
    topic: 'turning-toward',
    url: 'https://www.gottman.com/blog/3-ways-to-make-a-better-bid-for-connection/',
  },
  {
    kind: 'quote',
    id: 'q-saying-what-you-mean-and-meaning',
    body: 'Saying what you mean and meaning what you say allows your partner to know they can trust your words.',
    author: 'Brittini Carter',
    work: 'The Gottman Institute',
    topic: 'trust',
    url: 'https://www.gottman.com/blog/4-tips-to-build-everyday-trust-in-relationships/',
  },
  {
    kind: 'quote',
    id: 'q-infidelity-is-the-betrayal-our-society',
    body: 'Infidelity is the betrayal our society focuses on, but it is actually the subtle, unnoticed betrayals that truly ruin relationships.',
    author: 'Kyle Benson',
    work: 'The Gottman Institute',
    topic: 'trust',
    url: 'https://www.gottman.com/blog/3-betrayals-ruin-relationships-arent-infidelity/',
  },
  {
    kind: 'quote',
    id: 'q-when-partners-do-not-choose-each',
    body: 'When partners do not choose each other day after day, trust and commitment erode away.',
    author: 'Kyle Benson',
    work: 'The Gottman Institute',
    topic: 'trust',
    url: 'https://www.gottman.com/blog/3-betrayals-ruin-relationships-arent-infidelity/',
  },
  {
    kind: 'quote',
    id: 'q-anything-that-violates-a-committed-relationship',
    body: 'Anything that violates a committed relationship’s contract of mutual trust, respect, and protection can be disastrous.',
    author: 'Kyle Benson',
    work: 'The Gottman Institute',
    topic: 'trust',
    url: 'https://www.gottman.com/blog/3-betrayals-ruin-relationships-arent-infidelity/',
  },
  {
    kind: 'quote',
    id: 'q-disagreements-are-an-inevitable-component-of',
    body: 'Disagreements are an inevitable component of all relationships.',
    author: 'Gillian Florence Sanger',
    work: 'The Gottman Institute',
    topic: 'conflict',
    url: 'https://www.gottman.com/blog/4-mindful-listening-principles-to-better-navigate-conflict/',
  },
  {
    kind: 'quote',
    id: 'q-no-two-people-are-identical-in',
    body: 'No two people are identical in thought and belief patterns, regardless of how similar they might be.',
    author: 'Gillian Florence Sanger',
    work: 'The Gottman Institute',
    topic: 'conflict',
    url: 'https://www.gottman.com/blog/4-mindful-listening-principles-to-better-navigate-conflict/',
  },
  {
    kind: 'quote',
    id: 'q-even-in-the-strongest-relationships-conflicting',
    body: 'Even in the strongest relationships, conflicting needs and opinions arise from time to time.',
    author: 'Gillian Florence Sanger',
    work: 'The Gottman Institute',
    topic: 'conflict',
    url: 'https://www.gottman.com/blog/4-mindful-listening-principles-to-better-navigate-conflict/',
  },
  {
    kind: 'quote',
    id: 'q-when-you-have-irresolvable-problems-in',
    body: 'When you have irresolvable problems in your marriage (everyone does!), you can either hold that against your partner or accept what you cannot change.',
    author: 'Maureen Werrbach',
    work: 'The Gottman Institute',
    topic: 'perpetual',
    url: 'https://www.gottman.com/blog/3-ways-to-keep-your-relationship-in-the-positive-perspective/',
  },
  {
    kind: 'quote',
    id: 'q-when-you-accept-your-partner-you',
    body: 'When you accept your partner, you also accept their influence when discussing problems.',
    author: 'Maureen Werrbach',
    work: 'The Gottman Institute',
    topic: 'perpetual',
    url: 'https://www.gottman.com/blog/3-ways-to-keep-your-relationship-in-the-positive-perspective/',
  },
  {
    kind: 'quote',
    id: 'q-all-couples-fight-but-not-every',
    body: 'All couples fight, but not every couple knows how to do it in a healthy way.',
    author: 'Jennifer Scott',
    work: 'The Gottman Institute',
    topic: 'conflict',
    url: 'https://www.gottman.com/blog/4-conflict-styles-that-hurt-your-relationship/',
  },
  {
    kind: 'quote',
    id: 'q-successful-relationships-aren-t-conflict-free',
    body: 'Successful relationships aren’t conflict-free; they’re simply better at managing arguments and repairing when something has gone wrong.',
    author: 'The Gottman Institute',
    work: 'The Gottman Institute',
    topic: 'conflict',
    url: 'https://www.gottman.com/blog/everything-turns-into-an-argument/',
  },
  {
    kind: 'quote',
    id: 'q-unhealthy-conflict-is-characterized-by-the',
    body: 'Unhealthy conflict is characterized by the presence of criticism, defensiveness and a lack of understanding.',
    author: 'The Gottman Institute',
    work: 'The Gottman Institute',
    topic: 'horsemen',
    url: 'https://www.gottman.com/blog/everything-turns-into-an-argument/',
  },
  {
    kind: 'quote',
    id: 'q-sometimes-couples-are-in-a-state',
    body: 'Sometimes couples are in a state of negative sentiment override where they assume the worst about each other’s intentions.',
    author: 'Dana McNeil',
    work: 'The Gottman Institute',
    topic: 'perpetual',
    url: 'https://www.gottman.com/blog/the-gifts-of-showing-your-gratitude-for-each-other/',
  },
  {
    kind: 'quote',
    id: 'q-showing-and-expressing-gratitude-can-be',
    body: 'Showing and expressing gratitude can be that one small step to putting the relationship back on course.',
    author: 'Dana McNeil',
    work: 'The Gottman Institute',
    topic: 'gratitude',
    url: 'https://www.gottman.com/blog/the-gifts-of-showing-your-gratitude-for-each-other/',
  },
  {
    kind: 'quote',
    id: 'q-sharing-fondness-and-admiration-can-also',
    body: 'Sharing fondness and admiration can also sound like letting your partner know you are proud of them and admire who they are.',
    author: 'Dana McNeil',
    work: 'The Gottman Institute',
    topic: 'gratitude',
    url: 'https://www.gottman.com/blog/the-gifts-of-showing-your-gratitude-for-each-other/',
  },
  {
    kind: 'quote',
    id: 'q-gratitude-will-gain-momentum-in-your',
    body: 'Gratitude will gain momentum in your relationship over time and with a regular commitment to noticing and articulating the things that you are grateful for about your partner.',
    author: 'Dana McNeil',
    work: 'The Gottman Institute',
    topic: 'gratitude',
    url: 'https://www.gottman.com/blog/the-gifts-of-showing-your-gratitude-for-each-other/',
  },
  {
    kind: 'quote',
    id: 'q-what-people-often-forget-is-that',
    body: 'What people often forget is that the wedding itself is a symbol of something much greater: a marriage.',
    author: 'Liz Higgins',
    work: 'The Gottman Institute',
    topic: 'meaning',
    url: 'https://www.gottman.com/blog/debunking-5-myths-about-premarital-conflict/',
  },
  {
    kind: 'quote',
    id: 'q-although-grand-gestures-are-nice-the',
    body: 'Although grand gestures are nice, the particles of your day-to-day interactions maintain positive feelings and regard for the ones you love.',
    author: 'Satira Streeter',
    work: 'The Gottman Institute',
    topic: 'turning-toward',
    url: 'https://www.gottman.com/blog/bid-busters-ways-you-unintentionally-turn-away-from-connection/',
  },
  {
    kind: 'quote',
    id: 'q-the-absence-of-bids-leads-to',
    body: 'The absence of bids [for connection] leads to emotional disengagement, loneliness, and in many cases either break-up or unhappiness.',
    author: 'Satira Streeter',
    work: 'The Gottman Institute',
    topic: 'turning-toward',
    url: 'https://www.gottman.com/blog/bid-busters-ways-you-unintentionally-turn-away-from-connection/',
  },
  {
    kind: 'quote',
    id: 'q-i-promise-you-there-is-and',
    body: 'I promise you, there is, and always will be, more that you don’t know about your partner than you do.',
    author: 'Zach Brittle, LMHC',
    work: 'The Gottman Institute',
    topic: 'friendship',
    url: 'https://www.gottman.com/blog/build-love-maps/',
  },
  {
    kind: 'quote',
    id: 'q-think-of-it-this-way-when',
    body: 'When you choose to spend your life with someone, you hand them a map to your inner world.',
    author: 'Zach Brittle, LMHC',
    work: 'The Gottman Institute',
    topic: 'friendship',
    url: 'https://www.gottman.com/blog/build-love-maps/',
  },
  {
    kind: 'quote',
    id: 'q-couples-in-long-term-relationships-must',
    body: 'Couples in long-term relationships must turn the seemingly small and mundane into opportunities to attune to one another.',
    author: 'Liz Higgins',
    work: 'The Gottman Institute',
    topic: 'meaning',
    url: 'https://www.gottman.com/blog/5-simple-ways-strengthen-friendship-marriage/',
  },
  {
    kind: 'quote',
    id: 'q-you-don-t-have-to-have',
    body: 'You don’t have to have the same interests as your partner, but you can absolutely enjoy time spent together by engaging in one of their (or your) interests.',
    author: 'Liz Higgins',
    work: 'The Gottman Institute',
    topic: 'friendship',
    url: 'https://www.gottman.com/blog/5-simple-ways-strengthen-friendship-marriage/',
  },
  {
    kind: 'quote',
    id: 'q-daily-experiences-like-doing-the-dishes',
    body: 'Daily experiences like doing the dishes, folding laundry, watching TV, or cooking together can be opportunities for a deeper connection to occur.',
    author: 'Liz Higgins',
    work: 'The Gottman Institute',
    topic: 'turning-toward',
    url: 'https://www.gottman.com/blog/5-simple-ways-strengthen-friendship-marriage/',
  },
  {
    kind: 'quote',
    id: 'q-one-of-the-best-ways-to',
    body: 'One of the best ways to create shared meaning is to talk about each other’s dreams, which are often deeply connected to your pasts.',
    author: 'Dr. Ellie Wilde',
    work: 'The Gottman Institute',
    topic: 'meaning',
    url: 'https://www.gottman.com/blog/create-shared-meaning-examining-rituals/',
  },
  {
    kind: 'quote',
    id: 'q-another-way-to-create-shared-meaning',
    body: '[One] way to create shared meaning is to create traditions and rituals for your life together as a couple.',
    author: 'Dr. Ellie Wilde',
    work: 'The Gottman Institute',
    topic: 'meaning',
    url: 'https://www.gottman.com/blog/create-shared-meaning-examining-rituals/',
  },
  {
    kind: 'quote',
    id: 'q-the-more-shared-meaning-you-can',
    body: 'The more shared meaning you can find, the deeper, richer, and more rewarding your relationship will be.',
    author: 'Dr. Ellie Wilde',
    work: 'The Gottman Institute',
    topic: 'meaning',
    url: 'https://www.gottman.com/blog/create-shared-meaning-examining-rituals/',
  },

  /* ── THE 26 SHE ASKED FOR, FROM FIVE PUBLICATIONS WE HAD NOT USED ───────
     Ellie: "I worry about only having a handful of sources. When you build the
     remaining insights to get us back to 100, please find sources we haven't
     used yet, I want a wide variety. I don't only want insights about conflict,
     I want good, general quotes about love, kindness, understanding,
     peacemaking, etc."

     Harvard Gazette, Greater Good Magazine, The Conversation, Psychology Today
     and the Institute for Family Studies. Ten writers, none of whom was in the
     list before, and subjects the list had none of: kindness, listening,
     generosity, love itself, what we expect of a partner, and belonging.

     Every one was taken off the page it cites rather than from memory, with the
     page's own text stripped of its markup the same way check-quotes-verbatim
     strips it, so what is stored here is what that check will find. Candidates
     that could not be matched exactly were dropped rather than tidied.

     Two are quotations OF someone inside an article rather than BY the writer
     of it. Robert Waldinger runs the Harvard study and the Gazette is where he
     said this; the citation names the person whose words they are and the place
     they were published, which is what a reader needs to check either.

     Books stayed out of this round on purpose, and that is not a judgement
     about books. Verifying one needs GOOGLE_BOOKS_KEY, which lives in Vercel,
     and the Vercel build does not run that check: a book quotation added here
     would be unverified by anything until somebody ran the check by hand with
     the key. Everything below is checked on every run, for ever.
  */
  {
    kind: 'quote',
    id: 'q-ties-protect-discontents',
    body: 'Those ties protect people from life’s discontents, help to delay mental and physical decline, and are better predictors of long and happy lives than social class, IQ, or even genes.',
    author: 'Liz Mineo',
    work: 'Harvard Gazette',
    topic: 'belonging',
    url: 'https://news.harvard.edu/gazette/story/2017/04/over-nearly-80-years-harvard-study-has-been-showing-how-to-live-a-healthy-and-happy-life/',
  },
  {
    kind: 'quote',
    id: 'q-satisfaction-fifty-cholesterol',
    body: 'Several studies found that people’s level of satisfaction with their relationships at age 50 was a better predictor of physical health than their cholesterol levels were.',
    author: 'Liz Mineo',
    work: 'Harvard Gazette',
    topic: 'belonging',
    url: 'https://news.harvard.edu/gazette/story/2017/04/over-nearly-80-years-harvard-study-has-been-showing-how-to-live-a-healthy-and-happy-life/',
  },
  {
    kind: 'quote',
    id: 'q-tending-relationships-self-care',
    body: 'Taking care of your body is important, but tending to your relationships is a form of self-care too.',
    author: 'Robert Waldinger',
    work: 'Harvard Gazette',
    topic: 'care',
    url: 'https://news.harvard.edu/gazette/story/2017/04/over-nearly-80-years-harvard-study-has-been-showing-how-to-live-a-healthy-and-happy-life/',
  },
  {
    kind: 'quote',
    id: 'q-kindness-into-a-habit',
    body: 'Intentionally practicing kindness in our everyday lives, even on days when we’re not in a particularly generous mood, can go a long way toward turning kindness into a habit.',
    author: 'Juliana Breines',
    work: 'Greater Good Magazine',
    topic: 'kindness',
    url: 'https://greatergood.berkeley.edu/article/item/three_strategies_for_bringing_more_kindness_into_your_life',
  },
  {
    kind: 'quote',
    id: 'q-calm-the-troubled-waters',
    body: 'Making someone you’re arguing with feel that you’re listening can calm the troubled waters, allowing both parties to get safely to the opposite shore.',
    author: 'Julia Minson',
    work: 'Greater Good Magazine',
    topic: 'listening',
    url: 'https://greatergood.berkeley.edu/article/item/four_steps_to_help_people_feel_listened_to',
  },
  {
    kind: 'quote',
    id: 'q-change-your-own-behavior',
    body: 'Rather than trying to change how you think of or feel about your counterpart, our work suggests that you should focus on changing your own behavior.',
    author: 'Julia Minson',
    work: 'Greater Good Magazine',
    topic: 'listening',
    url: 'https://greatergood.berkeley.edu/article/item/four_steps_to_help_people_feel_listened_to',
  },
  {
    kind: 'quote',
    id: 'q-restate-the-other-position',
    body: 'Rather than jumping in to your own argument, devote a few seconds to restating the other person’s position to demonstrate that you did indeed hear and understand it.',
    author: 'Julia Minson',
    work: 'Greater Good Magazine',
    topic: 'listening',
    url: 'https://greatergood.berkeley.edu/article/item/four_steps_to_help_people_feel_listened_to',
  },
  {
    kind: 'quote',
    id: 'q-complexity-of-love',
    body: 'The complexity of love has much to do with how people experience it differently and how it can change over time.',
    author: 'Gery Karantzas',
    work: 'The Conversation',
    topic: 'love',
    url: 'https://theconversation.com/what-is-love-139212',
  },
  {
    kind: 'quote',
    id: 'q-overemphasize-the-negative',
    body: 'Relationship science suggests that the problem is that people tend to overemphasize the negative and underappreciate the positive when looking at their romantic partners.',
    author: 'Gary W. Lewandowski Jr.',
    work: 'The Conversation',
    topic: 'expectations',
    url: 'https://theconversation.com/your-relationship-may-be-better-than-you-think-find-the-knot-111152',
  },
  {
    kind: 'quote',
    id: 'q-listening-not-agreement',
    body: 'Listening in conflict does not require agreement; it requires a willingness to understand.',
    author: 'Guy Itzchakov',
    work: 'Psychology Today',
    topic: 'understanding',
    url: 'https://www.psychologytoday.com/us/blog/the-listening-lens/202604/why-feeling-heard-can-make-or-break-a-relationship',
  },
  {
    kind: 'quote',
    id: 'q-quick-advice-backfires',
    body: 'Quick advice often backfires because it solves the problem before addressing the person.',
    author: 'Guy Itzchakov',
    work: 'Psychology Today',
    topic: 'understanding',
    url: 'https://www.psychologytoday.com/us/blog/the-listening-lens/202604/why-feeling-heard-can-make-or-break-a-relationship',
  },
  {
    kind: 'quote',
    id: 'q-feeling-heard-reduces-defensiveness',
    body: 'Feeling heard can reduce defensiveness and make difficult conversations feel emotionally safer.',
    author: 'Guy Itzchakov',
    work: 'Psychology Today',
    topic: 'understanding',
    url: 'https://www.psychologytoday.com/us/blog/the-listening-lens/202604/why-feeling-heard-can-make-or-break-a-relationship',
  },
  {
    kind: 'quote',
    id: 'q-flourishing-deeper-elements',
    body: 'Flourishing marriages include deeper elements such as personal virtues, life meaning and purpose, a sense of belonging, growth and improvement, and a couple identity that includes a sense of togetherness and permanence.',
    author: 'Adam M. Galovan and others',
    work: 'Institute for Family Studies',
    topic: 'belonging',
    url: 'https://ifstudies.org/blog/flourishing-marriages-are-made-not-found',
  },

  /* ── THE 50 FROM BOOKS ──────────────────────────────────────────────────
     Ellie: "Done, please build the new list and add 50 more from books. Keep
     the web citations for now and I will delete if I want when I review."

     Her Google Books key is what made this possible. Before it, a book
     quotation could not be checked by anything on this machine and the gate
     reported all 27 as unchecked; it now verifies every one against Google's
     scan of the volume it cites, and so does each of these.

     ── HOW THEY WERE FOUND, AND THE RATE ──────────────────────────────────
     The pipeline this file already describes: a candidate from anywhere,
     including somewhere unreliable, put through the scan. 139 candidates were
     offered and 63 were found in the book they claimed; 76 were not, and those
     are gone rather than softened. Several were sentences that circulate widely
     under an author's name and are nobody's actual words.

     Where the candidate came from changed the rate, which is worth recording:
     ones remembered and typed out verified at about 45 per cent, and ones
     lifted off a page that quotes the book at length verified at 75. The second
     kind is cheaper even counting the fetch.

     Of the 63, thirteen were dropped by judgement rather than by the check: two
     duplicates, one carrying the initials NVC, two that open "Both are" and
     "But this" and so read as a fragment on a card with nothing before it, and
     the rest too instructional or too odd standing alone. 50 are here.

     ── ONE BOOK, ONE EDITION ──────────────────────────────────────────────
     check-insight-provenance caught six works cited under more than one
     edition, because the verifier records whichever edition Google happened to
     surface for each phrase and that differs between calls. A reader meeting
     one book under two bylines cannot tell which is right, so each work carries
     the edition most of its quotations matched. The claim being made is that
     these words are in this book by this author, which is what the check tests;
     the volume id is a pointer for a person.

     Two of the 150 came back from Google as a 503 on the run that added them
     and are reported unchecked rather than passed, which is the rule this file
     already holds for a page it cannot reach. Both verify on a retry.

     ── WHAT IS NOT HERE ───────────────────────────────────────────────────
     Nothing from Created for Connection, for the reason recorded above. And
     nothing whose wording I could not match exactly: a quotation that needs a
     paraphrase to fit is a quotation this product does not make. */
  {
    kind: 'quote',
    id: 'q-to-truly-love-we-must-learn',
    body: 'To truly love we must learn to mix various ingredients: care, affection, recognition, respect, commitment, and trust, as well as honest and open communication.',
    author: 'bell hooks',
    work: 'All About Love',
    topic: 'love',
    edition: 'Harper Collins 2001',
    volumeId: 'MYim_gaQC2gC',
  },
  {
    kind: 'quote',
    id: 'q-respect-is-not-fear-and-awe',
    body: 'Respect is not fear and awe; it denotes, in accordance with the root of the word, the ability to see a person as he is, to be aware of his unique individuality.',
    author: 'Erich Fromm',
    work: 'The Art of Loving',
    topic: 'respect',
    edition: 'Open Road Media 2013',
    volumeId: 'pM8MzzntBRcC',
  },
  {
    kind: 'quote',
    id: 'q-love-rests-on-two-pillars-surrender',
    body: 'Love rests on two pillars: surrender and autonomy. Our need for togetherness exists alongside our need for separateness.',
    author: 'Esther Perel',
    work: 'Mating in Captivity',
    topic: 'autonomy',
    edition: 'Harper Collins 2007',
    volumeId: 'Veaw6UQsczUC',
  },
  {
    kind: 'quote',
    id: 'q-our-anger-may-be-a-sign',
    body: 'Our anger may be a sign that we are being hurt, that our rights are being violated, that our needs or wants are not being adequately met.',
    author: 'Harriet Lerner',
    work: 'The Dance of Anger',
    topic: 'anger',
    edition: 'Harper Collins 2014',
    volumeId: 'hU-zAAAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-vulnerability-is-the-birthplace-of-love',
    body: 'Vulnerability is the birthplace of love, belonging, joy, courage, empathy, and creativity.',
    author: 'Brené Brown',
    work: 'Daring Greatly',
    topic: 'vulnerability',
    edition: 'Penguin UK 2013',
    volumeId: '3rF7vvXa_yIC',
  },
  {
    kind: 'quote',
    id: 'q-vulnerability-sounds-like-truth-and-feels',
    body: 'Vulnerability sounds like truth and feels like courage.',
    author: 'Brené Brown',
    work: 'Daring Greatly',
    topic: 'vulnerability',
    edition: 'Penguin UK 2013',
    volumeId: '3rF7vvXa_yIC',
  },
  {
    kind: 'quote',
    id: 'q-a-couple-bubble-is-an-agreement',
    body: 'A couple bubble is an agreement to put the relationship before anything and everything else.',
    author: 'Stan Tatkin',
    work: 'Wired for Love',
    topic: 'commitment',
    edition: 'New Harbinger Publications 2024',
    volumeId: 'q_3SEAAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-empathy-is-a-respectful-understanding-of',
    body: 'Empathy is a respectful understanding of what others are experiencing.',
    author: 'Marshall B. Rosenberg',
    work: 'Nonviolent Communication',
    topic: 'empathy',
    edition: 'PuddleDancer Press 2015',
    volumeId: 'A3qACgAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-judgments-criticisms-diagnoses-and-interpret',
    body: 'Judgments, criticisms, diagnoses, and interpretations of others are all alienated expressions of our own needs and values.',
    author: 'Marshall B. Rosenberg',
    work: 'Nonviolent Communication',
    topic: 'empathy',
    edition: 'PuddleDancer Press 2015',
    volumeId: 'A3qACgAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-when-we-focus-on-clarifying-what',
    body: 'When we focus on clarifying what is being observed, felt, and needed rather than on diagnosing and judging, we discover the depth of our own compassion.',
    author: 'Marshall B. Rosenberg',
    work: 'Nonviolent Communication',
    topic: 'empathy',
    edition: 'PuddleDancer Press 2015',
    volumeId: 'A3qACgAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-love-is-something-you-do-for',
    body: 'Love is something you do for someone else, not something you do for yourself.',
    author: 'Gary Chapman',
    work: 'The 5 Love Languages',
    topic: 'love',
    edition: 'Moody Publishers 2010',
    volumeId: 'aB96HL4pmLYC',
  },
  {
    kind: 'quote',
    id: 'q-the-desire-to-love-is-not',
    body: 'The desire to love is not itself love. Love is as love does. Love is an act of will.',
    author: 'M. Scott Peck',
    work: 'The Road Less Traveled',
    topic: 'practice',
    edition: 'Simon and Schuster 2012',
    volumeId: '7cB2FHw950EC',
  },
  {
    kind: 'quote',
    id: 'q-the-principal-form-that-the-work',
    body: 'The principal form that the work of love takes is attention.',
    author: 'M. Scott Peck',
    work: 'The Road Less Traveled',
    topic: 'attention',
    edition: 'Simon and Schuster 2012',
    volumeId: '7cB2FHw950EC',
  },
  {
    kind: 'quote',
    id: 'q-when-we-love-someone-our-love',
    body: 'When we love someone our love becomes demonstrable or real only through our exertion.',
    author: 'M. Scott Peck',
    work: 'The Road Less Traveled',
    topic: 'practice',
    edition: 'Simon and Schuster 2012',
    volumeId: '7cB2FHw950EC',
  },
  {
    kind: 'quote',
    id: 'q-love-is-a-skill-not-just',
    body: 'Love is a skill, not just an enthusiasm.',
    author: 'Alain de Botton',
    work: 'The Course of Love',
    topic: 'practice',
    edition: 'Simon and Schuster 2016',
    volumeId: 'DV1ODAAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-good-relationships-keep-us-healthier-and',
    body: 'Good relationships keep us healthier and happier. Period.',
    author: 'Robert Waldinger and Marc Schulz',
    work: 'The Good Life',
    topic: 'belonging',
    edition: 'Simon and Schuster 2025',
    volumeId: 'Iy43EQAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-the-nature-of-life-is-change',
    body: 'The nature of life is change and the nature of people is to resist change.',
    author: 'Lori Gottlieb',
    work: 'Maybe You Should Talk to Someone',
    topic: 'growth',
    edition: 'Harper 2019',
    volumeId: 'ATKQDwAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-a-bid-can-be-a-question',
    body: 'A bid can be a question, a gesture, a look, a touch, any single expression that says I want to feel connected to you.',
    author: 'John Gottman',
    work: 'The Relationship Cure',
    topic: 'turning-toward',
    edition: 'Crown 2001',
    volumeId: 'BovWAAAAMAAJ',
  },
  {
    kind: 'quote',
    id: 'q-at-the-core-of-every-successful',
    body: 'At the core of every successful conversation lies the free flow of relevant information.',
    author: 'Kerry Patterson and others',
    work: 'Crucial Conversations',
    topic: 'honesty',
    edition: 'McGraw-Hill Professional 2011',
    volumeId: 'iT6gYW2kQNYC',
  },
  {
    kind: 'quote',
    id: 'q-empathy-requires-emptying-our-mind-and',
    body: 'Empathy requires emptying our mind and listening to others with our whole being.',
    author: 'Marshall B. Rosenberg',
    work: 'Nonviolent Communication',
    topic: 'listening',
    edition: 'PuddleDancer Press 2015',
    volumeId: 'A3qACgAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-expressing-our-vulnerability-can-help-resolv',
    body: 'Expressing our vulnerability can help resolve conflicts.',
    author: 'Marshall B. Rosenberg',
    work: 'Nonviolent Communication',
    topic: 'vulnerability',
    edition: 'PuddleDancer Press 2015',
    volumeId: 'A3qACgAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-love-is-not-effortless-to-the',
    body: 'Love is not effortless. To the contrary, love is effortful.',
    author: 'M. Scott Peck',
    work: 'The Road Less Traveled',
    topic: 'practice',
    edition: 'Simon and Schuster 2012',
    volumeId: '7cB2FHw950EC',
  },
  {
    kind: 'quote',
    id: 'q-true-listening-total-concentration-on-the',
    body: 'True listening, total concentration on the other, is always a manifestation of love.',
    author: 'M. Scott Peck',
    work: 'The Road Less Traveled',
    topic: 'listening',
    edition: 'Simon and Schuster 2012',
    volumeId: '7cB2FHw950EC',
  },
  {
    kind: 'quote',
    id: 'q-trust-is-built-in-very-small',
    body: 'Trust is built in very small moments.',
    author: 'Brené Brown',
    work: 'Daring Greatly',
    topic: 'trust',
    edition: 'Penguin UK 2013',
    volumeId: '3rF7vvXa_yIC',
  },
  {
    kind: 'quote',
    id: 'q-nothing-you-can-do-will-make',
    body: 'Nothing you can do will make your partner feel loved if you are not speaking their primary love language.',
    author: 'Gary Chapman',
    work: 'The 5 Love Languages',
    topic: 'love',
    edition: 'Moody Publishers 2010',
    volumeId: 'aB96HL4pmLYC',
  },
  {
    kind: 'quote',
    id: 'q-attunement-is-attention-that-goes-beyond',
    body: 'Attunement is attention that goes beyond momentary empathy to a full, sustained presence that facilitates rapport.',
    author: 'Daniel Goleman',
    work: 'Social Intelligence',
    topic: 'attention',
    edition: 'Bantam 2006',
    volumeId: 'mEKCDGXHVmMC',
  },
  {
    kind: 'quote',
    id: 'q-when-we-feed-and-support-our',
    body: 'When we feed and support our own happiness, we are nourishing our ability to love.',
    author: 'Thich Nhat Hanh',
    work: 'How to Love',
    topic: 'kindness',
    edition: 'Parallax Press 2014',
    volumeId: 'xhpXBgAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-training-is-needed-in-order-to',
    body: 'Training is needed in order to love properly; and to be able to give happiness and joy, you must practice deep looking directed toward the person you love.',
    author: 'Thich Nhat Hanh',
    work: 'True Love',
    topic: 'understanding',
    edition: 'Shambhala Publications 2004',
    volumeId: 'u7H0897YMxAC',
  },
  {
    kind: 'quote',
    id: 'q-because-if-you-do-not-understand',
    body: 'Because if you do not understand this person, you cannot love properly.',
    author: 'Thich Nhat Hanh',
    work: 'True Love',
    topic: 'understanding',
    edition: 'Shambhala Publications 2004',
    volumeId: 'u7H0897YMxAC',
  },
  {
    kind: 'quote',
    id: 'q-love-and-will-are-interdependent-and',
    body: 'Love and will are interdependent and belong together.',
    author: 'Rollo May',
    work: 'Love and Will',
    topic: 'love',
    edition: 'W. W. Norton & Company 1969',
    volumeId: 'JzMjnCFTzVEC',
  },
  {
    kind: 'quote',
    id: 'q-work-is-love-made-visible',
    body: 'Work is love made visible.',
    author: 'Kahlil Gibran',
    work: 'The Prophet',
    topic: 'kindness',
    edition: 'Wordsworth Editions 1997',
    volumeId: 'n5BlBsFbGOQC',
  },
  {
    kind: 'quote',
    id: 'q-for-one-human-being-to-love',
    body: 'For one human being to love another: that is perhaps the most difficult of all our tasks, the ultimate, the last test and proof, the work for which all other work is but preparation.',
    author: 'Rainer Maria Rilke',
    work: 'Letters to a Young Poet',
    topic: 'love',
    edition: 'W. W. Norton & Company 2023',
    volumeId: 'S8WhEAAAQBAJ',
  },
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

/**
 * The text of a shared insight.
 *
 * ── WHY IT IS HERE AND NOT WRITTEN OUT TWICE ──────────────────────────────
 * The app builds this in attune-app/src/api/client.ts, because an Expo project
 * cannot import from api/. That is the wall this repo keeps hitting, and the
 * answer is the same as everywhere else: the rule lives in one place, the other
 * side keeps a copy, and a gate runs both and compares the answers.
 * check-insight-share.mjs does that.
 *
 * The blank line matters. It is what separates the quotation from the person
 * who said it when the text lands in a message, and the two surfaces disagreeing
 * about it would show up as one of them attributing a quotation on the same
 * line as the quotation.
 */
export function insightShareText(r) {
  const cite = String(r?.source || '').trim();
  return cite ? `${r.body}\n\n${cite}` : r.body;
}

/** "Author, Work" for a page; "Author, Work (publisher year)" for a book. */
function citation(pick) {
  const who = pick.author === pick.work ? pick.work : `${pick.author}, ${pick.work}`;
  const edition = String(pick.edition || '').trim();
  return edition ? `${who} (${edition})` : who;
}

/**
 * ── THE ROTATION DEALS A DIFFERENT WRITER AND A DIFFERENT SUBJECT ─────────
 * The order in the list is the order they were harvested, which is writer by
 * writer, and the rotation walks it one a day. That meant ten consecutive days
 * of Hold Me Tight followed by eleven of Seven Principles, which reads as the
 * product having one source rather than eleven.
 *
 * Dealing round robin by work fixed that half. Ellie asked for the rest: "I
 * want to make sure we aren't using quotes from the same source or about the
 * same topic day after day. Please postcode these in a way to organize posting
 * order and ensure variety."
 *
 * So every entry carries a `topic`, and the deal takes the writer and the
 * subject into account together: no two consecutive days share either.
 *
 * ── WHAT THE DEAL CANNOT DO YET, AND WHY SHE IS RIGHT ─────────────────────
 * It cannot also keep the publication apart, and the arithmetic says so: 47 of
 * these 74 are from the Gottman Institute, by thirteen different writers. A
 * value held by more than half a list cannot be dealt without two of them
 * touching, whatever the algorithm. So the deal avoids a repeated publication
 * where it can and the gate measures how often it cannot, rather than claiming
 * a promise it is unable to keep.
 *
 * That number is the argument for the 26 she asked for next. At 100 entries,
 * 47 is just under half and the publication becomes dealable too.
 *
 * Greedy, and deterministic: at each step it takes the candidate from the
 * writer with the most left to place, which is what stops a large pile being
 * stranded at the end with nothing legal to follow it. There is no randomness
 * and nothing is stored, so every device and every surface deals the same hand,
 * and the day still decides which entry.
 *
 * check-insight-rotation.mjs asks insightOfTheDay for each day of the cycle
 * rather than reading this array, because the array is not what a reader meets:
 * a gate aimed at the half that is already right is this repo's most expensive
 * habit.
 */
const ROTATION = (() => {
  const piles = new Map();
  for (const i of INSIGHTS) {
    const k = i.author || i.work || '';
    if (!piles.has(k)) piles.set(k, []);
    piles.get(k).push(i);
  }
  const left = [...piles.entries()].map(([who, items]) => ({ who, items }));
  const out = [];
  while (out.length < INSIGHTS.length) {
    const prev = out[out.length - 1];
    /**
     * The most-constrained thing goes first, and the publication is the most
     * constrained thing here.
     *
     * Ordering by the writer's pile alone split the Gottman Institute into
     * thirteen small piles, so the deal under-used it early and was left with
     * nothing but Gottman at the end: two days in a hundred followed another
     * from the same publication. Ordering by how many of a PUBLICATION are
     * left, and then by the writer's pile, places those 47 evenly and the
     * answer comes out clean.
     *
     * Ties keep the order the piles were built in, which is the order of the
     * list, so the hand is the same everywhere.
     */
    const remainingByWork = new Map();
    for (const p of left) {
      for (const i of p.items) {
        remainingByWork.set(i.work, (remainingByWork.get(i.work) || 0) + 1);
      }
    }
    const order = [...left].filter((p) => p.items.length)
      .sort((x, y) => (remainingByWork.get(y.items[0].work) || 0) - (remainingByWork.get(x.items[0].work) || 0)
        || y.items.length - x.items.length);
    /* Two standards. The first also keeps the publication apart, which is not
       always possible; the second is the promise the gate holds. */
    const ok = (p, i, alsoWork) => !prev || (
      p.who !== (prev.author || prev.work)
      && p.items[i].topic !== prev.topic
      && (!alsoWork || p.items[i].work !== prev.work));
    let took = null;
    for (const alsoWork of [true, false]) {
      for (const p of order) {
        const i = p.items.findIndex((_, n) => ok(p, n, alsoWork));
        if (i !== -1) { took = p.items.splice(i, 1)[0]; break; }
      }
      if (took) break;
    }
    /* Nothing legal at all. Take the largest pile rather than loop for ever:
       a repeat is better than a hang, and a repeat nobody is told about is
       what the gate exists to prevent. */
    if (!took) took = order[0].items.shift();
    out.push(took);
  }
  return out;
})();

export function insightOfTheDay(now = new Date()) {
  /* The reader's calendar day, not the epoch's. This counted in UTC and turned
     the insight over at 5pm Pacific; see api/_lib/day-number.js. `now` may be
     a Date, a day key, or the day number the server works out from the offset
     the reader's device sends. */
  const day = typeof now === 'number' ? now : dayNumber(now);
  /* Wrapped both ways: a day read from the reader's calendar can be negative
     at the very start of the epoch, and `-1 % n` is -1 in JavaScript. */
  const n = ROTATION.length;
  const pick = ROTATION[(((day % n) + n) % n)];
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
    /* Empty rather than undefined for a book, which has no page to link to. A
       surface tests this to decide whether to offer a link, and `undefined`
       serialises away entirely, so the two kinds have to differ by value rather
       than by whether the key exists. */
    url: (pick.kind === 'quote' && pick.url) ? pick.url : '',
  };
}
