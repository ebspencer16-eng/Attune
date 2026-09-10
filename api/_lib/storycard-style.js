/**
 * How a storycard is presented, in one place.
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
 * The two surfaces drew the same nine cards with the same words and did not
 * look like the same product. The aspect ratio, the stripe across the opener,
 * the ground under the couple-type card and the two lines that make a
 * screenshot say where it came from were each written twice, by hand, with
 * nothing checking they agreed. They did not, three times, and each time it
 * was found by a person looking at two screens.
 *
 * A gate could have caught that, and a gate is the wrong tool: these are
 * values, and values can simply be shared. The website imports this module.
 * /api/results sends it to the app on the highlights payload. Neither surface
 * holds its own copy of a colour or a ratio, so neither can drift.
 *
 * What this cannot cover is structure: where progress sits, whether there are
 * previous and next controls, whether a card animates in. Those are markers in
 * api/_lib/section-blocks.js, checked by check-section-blocks.mjs.
 */

/** Portrait. A story is 9:16 and a card that is a different shape on every
 *  phone cannot be screenshotted into one. */
export const CARD_RATIO = 9 / 16;

/** The opener's top edge, left to right. */
export const STRIPE = ['#E8673A', '#9B5DE5', '#1B5FE8'];

/** Bottom left and bottom right of every card. Without these a screenshot is
 *  an anonymous quote on a dark background. */
export const WORDMARK = 'Attune';
export const SITE_LABEL = 'attune-relationships.com';

/** The default grounds, by the tone a card asks for. */
export const TONES = {
  night: ['#0E0B1E', '#1A1040', '#0E0B1E'],
  type: ['#3B2A6B', '#241A5E', '#14102E'],
  'deep-blue': ['#0A1226', '#16233F', '#0A1226'],
  green: ['#07130F', '#0E2A1D', '#07130F'],
  blue: ['#060D1A', '#0D2545', '#060D1A'],
  violet: ['#0F0C29', '#241A5E', '#0F0C29'],
  rose: ['#2A0F1A', '#4A1C30', '#2A0F1A'],
  indigo: ['#120D2E', '#2A1A5E', '#120D2E'],
};

/**
 * The couple-type card's ground, built from the couple's own colour so every
 * type gets a different card. The app used one fixed purple for everyone and
 * spent the colour on the type name, which is where it was least visible.
 */
export function typeGround(accent) {
  if (!accent) return TONES.type;
  return [`${accent}CC`, `${accent}66`, '#14102E'];
}

/**
 * The two call-outs on the communication card.
 *
 * Green for where a couple is closest, orange for where they are furthest.
 * On this card the colour IS the meaning: the two tiles carry a dimension
 * name each and nothing else distinguishes "you agree here" from "you do
 * not". The app drew both in the same grey, so the card said a couple had two
 * notable dimensions and declined to say which was which.
 *
 * Not a judgement about the dimensions themselves. Neither end of any
 * dimension is better than the other; this is about the size of the gap,
 * which is the one thing on this card that does have a direction.
 */
export const CALLOUT_TONES = {
  tune: { color: '#34D399', tint: 'rgba(16,185,129,0.14)', border: 'rgba(16,185,129,0.28)' },
  diverge: { color: '#FF8C5A', tint: 'rgba(232,103,58,0.14)', border: 'rgba(232,103,58,0.28)' },
};

/** The two expectations donuts. Life & values, then Responsibilities. */
export const RING_COLORS = { life: '#9B5DE5', responsibilities: '#1B5FE8' };

/**
 * What colour a big alignment percentage is printed in.
 *
 * The website has always stepped it: green from 70, blue from 50, orange
 * below. The app printed every figure the same colour, so the number carried
 * no reading at a glance and two very different results looked alike.
 *
 * A function rather than a table because the thresholds are the rule.
 */
export function statColor(pct) {
  if (pct >= 70) return '#34D399';
  if (pct >= 50) return '#60A5FA';
  return '#FF8C5A';
}

/** Everything the app needs, in one object, for the payload. */
export const STORYCARD_STYLE = {
  ratio: CARD_RATIO,
  stripe: STRIPE,
  wordmark: WORDMARK,
  siteLabel: SITE_LABEL,
  tones: TONES,
};
