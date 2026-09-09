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

export function highlightCards({
  dimensions = [], coupleTypeId, names, expectations, reflection, intimacy, ex2,
}) {
  const you = names?.you || 'You';
  const them = names?.them || 'Your partner';
  const type = COUPLE_TYPES.find((t) => t.id === coupleTypeId) || null;

  const scored = dimensions.filter((d) => d.gap != null);
  const byGap = [...scored].sort((a, b) => a.gap - b.gap);
  const closest = byGap[0] || null;
  const widest = byGap[byGap.length - 1] || null;

  // The website's rule, not the alignment threshold: a gap of one point or
  // less counts as aligned on this card.
  const commAlignPct = scored.length
    ? Math.round((scored.filter((d) => d.gap <= 1).length / scored.length) * 100)
    : 0;

  const cards = [];

  cards.push({
    id: 'opener', kind: 'opener', tone: 'night',
    eyebrow: 'Your results',
    names: { you, them },
    body: 'Built from your independent answers. This is what you look like together.',
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
      callouts: [
        { label: "Where you're most in tune", value: closest?.label || null },
        { label: 'Where you diverge most', value: widest?.label || null },
      ],
      body: 'Explore your results to see what each of these means, with guidance built for the two of you.',
    });
  }

  if (expectations && ex2?.mine && ex2?.theirs) {
    const overall = overallExpectationsPct({
      mine: ex2.mine, theirs: ex2.theirs, youName: you, themName: them,
    });
    const lifeRows = expectations.life || [];
    const respRows = expectations.categories.flatMap((cat) => cat.rows);
    const pct = (rows) => (rows.length
      ? Math.round((rows.filter((r) => r.aligned).length / rows.length) * 100) : 0);

    cards.push({
      id: 'expectations', kind: 'stat-rings', tone: 'blue',
      eyebrow: 'Expectations',
      stat: `${overall}%`,
      statLabel: 'aligned overall',
      rings: [
        { label: 'Life & values', pct: pct(lifeRows) },
        { label: 'Responsibilities', pct: pct(respRows) },
      ],
    });
  }

  if (reflection?.admired?.you || reflection?.admired?.them) {
    cards.push({
      id: 'reflection', kind: 'admired', tone: 'violet',
      title: 'What you admire in each other',
      rows: [
        { name: you, admired: reflection.admired.them },
        { name: them, admired: reflection.admired.you },
      ].filter((r) => r.admired),
    });
  }

  // The intimacy card: the dimension they are closest on if there is one,
  // otherwise the one they are furthest apart on. Never both, and never a
  // number, because this card is read over someone's shoulder on a sofa.
  const intimacyPick = intimacy?.dimensions?.length
    ? ([...intimacy.dimensions].filter((d) => d.state === 'aligned')[0]
      || [...intimacy.dimensions].filter((d) => d.distancePct != null)
        .sort((a, b) => (b.distancePct ?? 0) - (a.distancePct ?? 0))[0])
    : null;
  if (intimacyPick) {
    cards.push({
      id: 'intimacy', kind: 'named-dimension', tone: 'rose',
      eyebrow: 'Physical Intimacy',
      title: intimacyPick.state === 'aligned'
        ? 'Where you already agree'
        : 'Worth talking about',
      value: intimacyPick.label,
      body: intimacyPick.prompt || null,
    });
  }

  const convoDim = widest && widest.gap > CONVO_GAP ? widest.key : null;
  cards.push({
    id: 'conversation', kind: 'quote', tone: 'indigo',
    lead: "As you explore your results, you'll learn more about your unique dynamic and unlock guidance tailored to the two of you.",
    eyebrow: `One conversation worth having for ${you} & ${them}`,
    quote: (convoDim && CONVO_PROMPTS[convoDim]) || CONVO_FALLBACK,
  });

  cards.push({
    id: 'sendoff', kind: 'sendoff', tone: 'night',
    title: 'We hope you continue to grow together throughout your Attune experience.',
    body: 'Your full results are ready whenever you are.',
    cta: 'Explore your full results',
  });

  return cards;
}
