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

export const INSIGHTS = [
  /* ── THE 49 SENTENCES WE WROTE ARE GONE ─────────────────────────────────
     Ellie: "I want every insight to be quotes, I want to retire all
     AI-generated sentences. I would rather quote from books than sites
     anyways."

     They were fair readings of the research and they were ours, and the
     objection was never that they were wrong. It was that a sentence nobody
     published, sitting where a reader expects a finding, is the product
     speaking in a voice it has not earned. They are in git if one of them is
     ever wanted as our own line somewhere that suits it.

     What replaced them is 31 passages from four books, each verified against
     Google's scan of the book rather than against a transcription of it. The
     pipeline is worth writing down because it is the only honest one available
     here: candidates come from Goodreads, which is typed in by readers and
     frequently wrong, and every candidate is then checked against the real
     text. An unreliable source and an authoritative verifier give a reliable
     answer; either one alone does not. Candidates were thrown out by that
     check, including one attributed to the wrong author and one that exists
     only in a Spanish translation.

     One more came out after the fact, and not because it was misquoted. Four
     passages cited Created for Connection, which the volume record shows is
     subtitled "The Hold Me Tight Guide for Christian Couples". It is an
     adaptation of a book already quoted here, so nothing was lost by dropping
     it, and quoting a faith-specific guide is a decision about what this
     product is rather than a sourcing detail. Ellie chooses that, not the
     harvester. Verifying a quotation says it is real; it does not say it
     belongs. */

  {
    kind: 'quote',
    id: 'q-insecure-relationships-disguise',
    body: 'In insecure relationships, we disguise our vulnerabilities so our partner never really sees us.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-curiosity-comes-sense',
    body: 'Curiosity comes out of a sense of safety; rigidity out of being vigilant to threats.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-know-loved-there',
    body: 'If you know your loved one is there and will come when you call, you are more confident of your worth, your value. And the world is less intimidating when you have another to count on and know that you are not alone.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-responsive-love-partner',
    body: 'If you have a responsive love partner, you have a secure base in the chaos. If you are emotionally alone, you are in free fall. Having someone you can rely on for connection and support makes healing from trauma easier.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-feel-safely-linked',
    body: 'When we feel safely linked to our partners, we more easily roll with the hurts they inevitably inflict, and we are less likely to be aggressively hostile when we get mad at them.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-underneath-distress-partners',
    body: 'Underneath all the distress, partners are asking each other: Can I count on you, depend on you? Are you there for me? Will you respond to me when I need, when I call? Do I matter to you? Am I valued and accepted by you? Do you need me, rely on me?',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-demand-withdraw-pattern',
    body: 'The demand-withdraw pattern is not just a bad habit, it reflects a deeper underlying reality: such couples are starving emotionally. They are losing the source of their emotional sustenance. They feel deprived. And they are desperate to regain that nurturance.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-friendship-fuels-flames',
    body: 'Friendship fuels the flames of romance because it offers the best protection against feeling adversarial toward your spouse.',
    author: 'John Gottman and Nan Silver',
    work: 'The Seven Principles for Making Marriage Work',
    edition: 'Harmony 2015',
    volumeId: '8IWOxW1VEIYC',
  },
  {
    kind: 'quote',
    id: 'q-human-nature-dictates',
    body: 'Human nature dictates that it is virtually impossible to accept advice from someone unless you feel that that person understands you.',
    author: 'John Gottman and Nan Silver',
    work: 'The Seven Principles for Making Marriage Work',
    edition: 'Harmony 2015',
    volumeId: '8IWOxW1VEIYC',
  },
  {
    kind: 'quote',
    id: 'q-point-neuroses-ruin',
    body: 'The point is that neuroses don’t have to ruin a marriage. If you can accommodate each other’s “crazy” side and handle it with caring, affection, and respect, your marriage can thrive.',
    author: 'John Gottman and Nan Silver',
    work: 'The Seven Principles for Making Marriage Work',
    edition: 'Harmony 2015',
    volumeId: 'ZZVoBAAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-some-people-leave',
    body: 'Some people leave a marriage literally, by divorcing. Others do so by leading parallel lives together.',
    author: 'John Gottman and Nan Silver',
    work: 'The Seven Principles for Making Marriage Work',
    edition: 'Harmony 2015',
    volumeId: '8IWOxW1VEIYC',
  },
  {
    kind: 'quote',
    id: 'q-lives-upon-dynamic',
    body: 'But in their day-to-day lives, they have hit upon a dynamic that keeps their negative thoughts and feelings about each other (which all couples have) from overwhelming their positive ones. They have what I call an emotionally intelligent marriage.',
    author: 'John Gottman and Nan Silver',
    work: 'The Seven Principles for Making Marriage Work',
    edition: 'Harmony 2015',
    volumeId: 'z-mLDQAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-active-listening-asks',
    body: 'Active listening asks couples to perform Olympic-level emotional gymnastics even if their relationship can barely walk.',
    author: 'John Gottman and Nan Silver',
    work: 'The Seven Principles for Making Marriage Work',
    edition: 'Harmony 2015',
    volumeId: 'ZZVoBAAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-found-percent-time',
    body: 'I’ve found 94 percent of the time that couples who put a positive spin on their marriage’s history are likely to have a happy future as well. When happy memories are distorted, it’s a sign that the marriage needs help.',
    author: 'John Gottman and Nan Silver',
    work: 'The Seven Principles for Making Marriage Work',
    edition: 'Harmony 2015',
    volumeId: '8IWOxW1VEIYC',
  },
  {
    kind: 'quote',
    id: 'q-although-happily-married',
    body: 'Although happily married couples may feel driven to distraction at times by their partner’s personality flaws, they still feel that the person they married is worthy of honor and respect.',
    author: 'John Gottman and Nan Silver',
    work: 'The Seven Principles for Making Marriage Work',
    edition: 'Harmony 2015',
    volumeId: '8IWOxW1VEIYC',
  },
  {
    kind: 'quote',
    id: 'q-heart-seven-principles',
    body: 'At the heart of the Seven Principles approach is the simple truth that happy marriages are based on a deep friendship.',
    author: 'John Gottman and Nan Silver',
    work: 'The Seven Principles for Making Marriage Work',
    edition: 'Harmony 2015',
    volumeId: 'ZZVoBAAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-perfection-price-love',
    body: 'Perfection is not the price of love. Practice is. We practice how to express our love and how to receive our partner’s love. Love is an action even more than a feeling. It requires intention and attention, a practice we call attunement.',
    author: 'John Gottman and others',
    work: 'Eight Dates',
    edition: 'Workman Publishing Company 2019',
    volumeId: 'V3BMDwAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-fall-love-often',
    body: 'When we fall in love we are often on our very best behavior. We lead with the healthiest side of ourselves. But as relationships progress, each person gets more real, more transparent, and therefore more vulnerable.',
    author: 'John Gottman and others',
    work: 'Eight Dates',
    edition: 'Workman Publishing Company 2019',
    volumeId: 'V3BMDwAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-there-question-committing',
    body: 'There is no question that committing to a person can be a terrifying prospect. It means putting all our eggs in one basket.',
    author: 'John Gottman and others',
    work: 'Eight Dates',
    edition: 'Workman Publishing Company 2019',
    volumeId: 'V3BMDwAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-reach-partners-separate',
    body: 'The more we can reach out to our partners, the more separate and independent we can be.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
      {
    kind: 'quote',
    id: 'q-better-worse-twenty',
    body: 'For better or worse, in the twenty-first century, a love relationship has become the central emotional relationship in most people’s lives. One reason is that we are increasingly living in social isolation.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
    {
    kind: 'quote',
    id: 'q-generally-love-sharing',
    body: 'Generally in love, sharing even negative emotions, provided they don\'t get out of hand, is more useful than emotional absence.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-demise-marriages-begins',
    body: 'The demise of marriages begins with a growing absence of responsive intimate interactions. The conflict comes later.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-foundation-contented-sustained',
    body: 'The foundation of contented, sustained relationships is the faith that your partner is there for you.',
    author: 'Dr. Sue Johnson',
    work: 'Love Sense',
    edition: 'Little, Brown Spark 2013',
    volumeId: 'go2Tw2_VvkEC',
  },
  {
    kind: 'quote',
    id: 'q-injuries-forgiven-never',
    body: 'Injuries may be forgiven, but they never disappear. Instead, in the best outcome, they become integrated into couples’ attachment stories as demonstrations of renewal and connection.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
    {
    kind: 'quote',
    id: 'q-always-fascinates-child',
    body: 'It always fascinates me that when a child cries we prioritize this signal. We respond. Our children don’t threaten us, and we accept that they are vulnerable and need us. We see them in an attachment frame. But we have been taught not to see adults this way.',
    author: 'Dr. Sue Johnson',
    work: 'Hold Me Tight',
    edition: 'Little, Brown Spark 2008',
    volumeId: 'jPLaqKhumPQC',
  },
  {
    kind: 'quote',
    id: 'q-life-takes-toll',
    body: 'Life takes its toll on all relationships as careers, children, and crises can pull us away from each other.',
    author: 'John Gottman and others',
    work: 'Eight Dates',
    edition: 'Workman Publishing Company 2019',
    volumeId: 'V3BMDwAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-make-relationship-priority',
    body: 'When we make our relationship a priority by showing that it’s a priority, we build trust and demonstrate our loyalty far beyond any words we say in our wedding vows.',
    author: 'John Gottman and others',
    work: 'Eight Dates',
    edition: 'Workman Publishing Company 2019',
    volumeId: 'V3BMDwAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-things-aren-going',
    body: 'If things aren’t going well in their relationship, they voice their concerns to their partner instead of complaining about their partner to someone else.',
    author: 'John Gottman and others',
    work: 'Eight Dates',
    edition: 'Workman Publishing Company 2019',
    volumeId: 'V3BMDwAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-honest-discover-partner',
    body: 'The more honest we are, the more we can discover that our partner really loves us for who we are, and not the idealized version of us that shows up when we first begin to date.',
    author: 'John Gottman and others',
    work: 'Eight Dates',
    edition: 'Workman Publishing Company 2019',
    volumeId: 'V3BMDwAAQBAJ',
  },
  {
    kind: 'quote',
    id: 'q-quality-closest-relationships',
    body: 'The quality of our closest relationships, more than any other factor, determines our physical health, resistance to disease, and longevity. Satisfying close relationships also improve various dimensions of each partner’s mental health.',
    author: 'John Gottman and others',
    work: 'Eight Dates',
    edition: 'Workman Publishing Company 2019',
    volumeId: 'V3BMDwAAQBAJ',
  },

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
  {
    kind: 'quote',
    id: 'q-love-maps',
    body: 'The principle of building Love Maps is simply this: knowing the little things about your partner’s life creates a strong foundation for your friendship and intimacy.',
    author: 'Dr. Ellie Wilde',
    work: 'The Gottman Institute',
    url: 'https://www.gottman.com/blog/the-sound-relationship-house-build-love-maps/',
  },
  {
    kind: 'quote',
    id: 'q-love-maps-stress',
    body: 'Couples who have detailed love maps of each other’s worlds are far better prepared to cope with stressful events and conflict.',
    author: 'Dr. Ellie Wilde',
    work: 'The Gottman Institute',
    url: 'https://www.gottman.com/blog/the-sound-relationship-house-build-love-maps/',
  },
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
 * ── THE ROTATION DEALS FROM DIFFERENT BOOKS ───────────────────────────────
 * The order in the list is the order they were harvested, which is book by
 * book, and the rotation walks it one a day. That meant ten consecutive days of
 * Hold Me Tight followed by eleven of Seven Principles, which reads as the
 * product having one source rather than eleven.
 *
 * So the list is dealt out round robin by work: one from each book in turn,
 * then round again. Computed once at module load and not stored, so it is the
 * same order everywhere without anything to keep in step, and the day still
 * decides which entry rather than anything per-device or random.
 */
const ROTATION = (() => {
  const byWork = new Map();
  for (const i of INSIGHTS) {
    const k = i.work || i.author || '';
    if (!byWork.has(k)) byWork.set(k, []);
    byWork.get(k).push(i);
  }
  const piles = [...byWork.values()];
  const out = [];
  for (let n = 0; out.length < INSIGHTS.length; n += 1) {
    for (const pile of piles) if (pile[n]) out.push(pile[n]);
  }
  return out;
})();

export function insightOfTheDay(now = new Date()) {
  const day = Math.floor(now.getTime() / 86400000);
  const pick = ROTATION[day % ROTATION.length];
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
