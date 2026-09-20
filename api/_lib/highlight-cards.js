/**
 * The highlight storycards, as data.
 *
 * ── WHY THIS IS DATA AND NOT MARKUP ───────────────────────────────────────
 * The website builds these as nine JSX cards with gradients, an SVG map and
 * animations, all inside src/App.jsx. None of that can cross to the app, and
 * the app cannot be given a summary panel instead: it would then be showing a
 * couple something the product never told them, and every word of it would
 * have been written for the app alone.
 *
 * So the words and the numbers are here, and each surface draws them. A card
 * carries what it says and what kind of thing it is; how a gradient looks on a
 * phone is the phone's business.
 *
 * ── THE ORDER IS THE PRODUCT ──────────────────────────────────────────────
 * These are read in sequence, once, before anyone sees a results page. The
 * order builds: who you are, what you look like together, how you each show
 * up, where you meet and where you do not, then one conversation to actually
 * have. Reordering them changes what the reader takes away.
 */

import { COUPLE_TYPES } from '../_couple-types.js';
import { overallExpectationsPct } from './expectations-alignment.js';
import { CALLOUT_TONES, RING_COLORS, statColor } from './storycard-style.js';
import { commAlignmentPct, selfGap } from './comm-alignment.js';
import { pronounForm } from './role-tokens.js';

/**
 * The one conversation, chosen by the widest communication gap.
 *
 * Keyed by dimension, matching the website exactly. The fallback is used when
 * no gap is wide enough to single one out, which is a real state and not an
 * error: two people who are close on everything still get a question.
 */
const CONVO_PROMPTS = {
  energy: 'When one of us needs time alone and the other wants to connect, how do we handle that?',
  expression: "Is there something you've been sitting with that you haven't found the right moment to bring up?",
  needs: "What's something you need from me that you usually don't ask for directly?",
  bids: "What's something small I do that makes you feel noticed?",
  conflict: "After a disagreement, what does 'okay again' actually feel like for you?",
  repair: 'What do you need from me in the hours after a hard conversation?',
  listening: 'When you bring something to me, do you want me to listen, or do you want me to respond and ask questions?',
  love: "What's something I do that makes you feel genuinely loved?",
  feedback: "Is there something I do that bothers you that you haven't found the right way to bring up?",
};
const CONVO_FALLBACK = "What do you each need that you haven't fully said out loud yet?";

/** The wide-gap threshold the website uses to pick the conversation. */
const CONVO_GAP = 1.5;

/**
 * Which dimensions the communication card shows.
 *
 * Five, spread across the range rather than the five closest, so the card
 * shows a relationship rather than a highlight reel. Same selection as the
 * website: the closest, the furthest, and three spaced between them.
 */
function peekDimensions(sortedByGap) {
  const n = sortedByGap.length;
  if (n <= 5) return sortedByGap;
  return [0, Math.round(n * 0.25), Math.round(n * 0.5), Math.round(n * 0.72), n - 1]
    .map((i) => sortedByGap[i]);
}

/**
 * The first card's two lines.
 *
 * Ellie: "on storycard 1 in the highlights experience, can we change 'This is
 * what you look like together.' to 'Use insights to learn and grow together'
 * no period after built from your independent answers either."
 *
 * Two lines and no full stops, so the break is in the string. Exported because
 * the website's storycard deck draws this card itself: it held its own copy of
 * this sentence, which is how the two of them had drifted before.
 */
export const OPENER_BODY = 'Built from your independent answers\nUse insights to learn and grow together';

export function highlightCards({
  dimensions = [], coupleTypeId, names, expectations, reflection, intimacy, ex2,
  /** Each partner's pronouns, for the one card that needs a possessive. */
  pronouns = null,
}) {
  const you = names?.you || 'You';
  const them = names?.them || 'Your partner';
  const type = COUPLE_TYPES.find((t) => t.id === coupleTypeId) || null;

  /**
   * Self gaps, not the blended ones on `d.gap`.
   *
   * `d.gap` is the distance after each score is mixed with the partner's view
   * of them. That is the right input for typing a couple and the wrong one for
   * "how far apart are your answers": mixing two numbers moves each toward the
   * other, so blended gaps are always the narrower pair.
   *
   * This read `d.gap`, and the website has always read self. So the two
   * products computed every figure on these cards from different numbers, and
   * the app's alignment percentage was always the higher of the two. Ellie's
   * read 100% while the sliders on the card before it did not touch.
   *
   * The sort is used four more times below: which five dimensions the slider
   * card shows, which dimension is "most in tune", which is "diverge most",
   * and which conversation closes the reel. All four could differ between the
   * two products, for the same reason.
   *
   * See api/_lib/comm-alignment.js.
   */
  const scored = dimensions
    .map((d) => ({ ...d, gap: selfGap(d.a, d.b) }))
    .filter((d) => d.gap != null);
  const byGap = [...scored].sort((a, b) => a.gap - b.gap);
  const closest = byGap[0] || null;
  const widest = byGap[byGap.length - 1] || null;

  const commAlignPct = commAlignmentPct(scored.map((d) => d.gap));

  const cards = [];

  cards.push({
    id: 'opener', kind: 'opener', tone: 'night',
    eyebrow: 'Your results',
    names: { you, them },
    body: OPENER_BODY,
    footer: 'Tap to begin',
  });

  cards.push({
    id: 'couple-type', kind: 'couple-type', tone: 'type',
    accent: type?.color || null,
    title: 'Your unique relationship environment',
    typeName: type?.name || null,
    typeLabel: 'Your couple type',
    body: 'Explore your full results to learn what this looks like for the two of you.',
  });

  const peek = peekDimensions(byGap);
  if (peek.length) {
    cards.push({
      id: 'comm-sliders', kind: 'dimensions', tone: 'deep-blue',
      title: 'How you each show up in the relationship',
      /**
       * The two names, because the marks on this card carry an initial each,
       * and when both initials are the same they carry a legend instead. The
       * app had neither and drew two anonymous dots.
       */
      names: { you, them },
      dimensions: peek.map((d) => ({
        key: d.key, label: d.label, left: d.left, right: d.right, a: d.a, b: d.b,
      })),
    });
  }

  if (scored.length) {
    cards.push({
      id: 'comm-align', kind: 'stat-pair', tone: 'green',
      lead: `${you} and ${them}'s communication styles are`,
      stat: `${commAlignPct}%`,
      statLabel: 'aligned',
      // The colours come with the call-outs, from storycard-style.js, because
      // on this card the colour is the meaning: two tiles carrying a dimension
      // name each, and nothing else saying which is the close one.
      /**
       * ── ELLIE'S WORDS FOR THE TWO CALL-OUTS ───────────────────────────
       * "then it should say one strength: [dimension] and where you have
       * different approaches: [dimension], and remove the line starting with
       * explore your results."
       */
      callouts: [
        { label: 'One strength', value: closest?.label || null, ...CALLOUT_TONES.tune },
        { label: 'Where you have different approaches', value: widest?.label || null, ...CALLOUT_TONES.diverge },
      ],
    });
  }

  if (expectations && ex2?.mine && ex2?.theirs) {
    const overall = overallExpectationsPct({
      mine: ex2.mine, theirs: ex2.theirs, youName: you, themName: them,
    });
    /**
     * ── THE TWO RINGS, AND WHY THEY READ THE ROWS ─────────────────────────
     * This was `expectations.life`, a field the summary used to send and does
     * not any more: Life & Values became the sixth category, so its rows moved
     * into `categories` and the separate array was dropped. Nothing here
     * changed, so `|| []` took over and the Life & Values ring read 0% for
     * every couple, while Responsibilities silently counted the life rows too.
     *
     * Ellie has reported this figure twice. It is the same shape both times: a
     * rule about which rows are which, restated somewhere that did not hear
     * about a change. So it reads the rows' own `kind` now, which is the field
     * that decides it everywhere else, and check-expectations-rings.mjs runs
     * both numbers against answers built to make them differ.
     */
    const allRows = expectations.categories.flatMap((cat) => cat.rows);
    const lifeRows = allRows.filter((r) => r.kind === 'life');
    const respRows = allRows.filter((r) => r.kind !== 'life');
    const pct = (rows) => (rows.length
      ? Math.round((rows.filter((r) => r.aligned).length / rows.length) * 100) : 0);

    cards.push({
      id: 'expectations', kind: 'stat-rings', tone: 'blue',
      eyebrow: 'Expectations',
      stat: `${overall}%`,
      // Stepped by the same thresholds the website steps it by. The app
      // printed every figure in one colour, so 82% and 34% looked alike.
      statColor: statColor(overall),
      statLabel: 'aligned overall',
      rings: [
        { label: 'Life & values', pct: pct(lifeRows), color: RING_COLORS.life },
        { label: 'Responsibilities', pct: pct(respRows), color: RING_COLORS.responsibilities },
      ],
    });
  }

  if (reflection?.admired?.you || reflection?.admired?.them) {
    /**
     * ── THE ADMIRED CARD, AS A DIAGONAL ───────────────────────────────────
     * Ellie: "Diagonal divide from bottom left to top right of the screen, top
     * left is the attune orange gradient and bottom right is the attune navy
     * gradient. Top left says ellie is most admired for her steadiness. Bottom
     * right says preston is most admired for his patience."
     *
     * The sentence is built here rather than in the renderer because it needs
     * a possessive, and a possessive needs a pronoun. `pronounForm` falls back
     * to they/them, which is the form that is never wrong about a person.
     * Building it in the app would mean a second copy of that rule.
     */
    cards.push({
      id: 'reflection', kind: 'admired', tone: 'violet',
      /**
       * The pronouns do not ride along. They are what builds the sentence, not
       * something a card draws, and check-storycard-fields is right to refuse
       * a field the app never reads: a value on a card that nothing shows is a
       * card that reads differently on the two products.
       */
      rows: [
        { name: you, admired: reflection.admired.them, pn: pronouns?.you || null },
        { name: them, admired: reflection.admired.you, pn: pronouns?.them || null },
      ]
        .filter((r) => r.admired)
        .map((r) => ({
          name: r.name,
          admired: r.admired,
          line: `${r.name} is most admired for ${pronounForm(r.pn, 'pos')} ${String(r.admired).toLowerCase()}`,
        })),
    });
  }

  /*
   * ── THE PHYSICAL INTIMACY CARD IS GONE ────────────────────────────────
   * Ellie: "Remove the physical intimacy storycard." These cards are made to
   * be shown to someone over a shoulder, and that is the argument for taking
   * it out rather than for having had it: the section is read, not shared.
   */

  const convoDim = widest && widest.gap > CONVO_GAP ? widest.key : null;
  cards.push({
    id: 'conversation', kind: 'quote', tone: 'indigo',
    /* Ellie: "Remove 'as you explore your results' paragraph from storycard
       8." The card is a question to ask each other; a paragraph above it about
       what else the results contain is the product talking over it. */
    eyebrow: `One conversation worth having for ${you} & ${them}`,
    quote: (convoDim && CONVO_PROMPTS[convoDim]) || CONVO_FALLBACK,
  });

  /**
   * ── THE LAST CARD IS ONE THING ────────────────────────────────────────
   * Ellie: "full page should be the attune gradient orange to blue, large
   * button in the middle that says explore your full results."
   *
   * The two sentences that were here are gone with the redesign. The button's
   * words are hers and are the only copy left on it.
   */
  cards.push({
    id: 'sendoff', kind: 'sendoff', tone: 'night',
    cta: 'Explore your full results',
  });

  return cards;
}
