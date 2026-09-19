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

import { LINE_BOX, minLineHeight } from './font-metrics.js';

/**
 * The type scale, which is the thing the two surfaces kept disagreeing about.
 *
 * ── WHY IT IS HERE ────────────────────────────────────────────────────────
 * Ellie, three times over three months, most recently: "Highlights storycards
 * on app still don't match the ones on the website. Please match fonts, sizes,
 * formatting, colors, etc."
 *
 * She was right every time, and the reason is that the website styled each
 * card inline while the app had a six-token scale of its own. They were never
 * going to line up: the opener's names were 30 points in the app against
 * 41.6 to 60.8 pixels on the website, body copy was weight 400 against 300,
 * and the eyebrow was tracked 1.6 against 0.32em. Nothing was wrong in either
 * file; there were simply two of them.
 *
 * These numbers are the website's, unchanged. The website reads them now
 * instead of writing them inline, so nothing there moves, and the app reads
 * the same values so it finally matches.
 *
 * ── HOW A SIZE IS WRITTEN ─────────────────────────────────────────────────
 * [min, vw, max] in rem, rem, rem, which is the clamp() the website already
 * used. The website emits it as a clamp. The app evaluates it against the
 * card's own width, which is what vw meant here anyway: these cards are a
 * fixed 9:16 box, and sizing their text against the browser viewport was the
 * reason the same card rendered differently on a phone and a laptop.
 *
 * A number instead of a triple is a fixed size at every width.
 *
 * `alpha` is the white the text is drawn in, so neither surface writes an
 * rgba string of its own. `track` is em, `lh` is a multiplier.
 */
export const CARD_TYPE = {
  /** The label above everything: YOUR RESULTS, THE NUMBER, and so on. */
  eyebrow:   { size: 0.55, family: 'body', weight: 700, track: 0.32, alpha: 0.40, upper: true },
  /** The couple's names on the opener. The biggest thing on any card. */
  names:     { size: [2.6, 7, 3.8], family: 'display', weight: 700, track: -0.03, lh: 0.92, alpha: 1 },
  /** The ampersand between them. */
  amp:       { size: [1.82, 4.9, 2.66], family: 'display', weight: 700, lh: 0.92, alpha: 0.45 },
  /** A card's headline. */
  title:     { size: [1.45, 4.8, 1.9], family: 'display', weight: 700, track: -0.02, lh: 1.12, alpha: 1 },
  /** The couple-type card's headline, which sits above a map and runs longer. */
  titleSm:   { size: [1.3, 4.4, 1.65], family: 'display', weight: 700, track: -0.015, lh: 1.15, alpha: 1 },
  /** The big figure on a stat card. */
  stat:      { size: [3.75, 13, 5.25], family: 'display', weight: 700, track: -0.04, lh: 0.9, alpha: 1 },
  /** The bigger figure, on the card that is only a figure. */
  statBig:   { size: [4.5, 14, 7], family: 'display', weight: 700, track: -0.05, lh: 0.85, alpha: 1 },
  /** The sentence under a headline. Light, and the app had it at regular. */
  body:      { size: 0.88, family: 'body', weight: 300, lh: 1.7, alpha: 0.60 },
  /** The same, one step down, where a card has more to say. */
  bodySm:    { size: 0.78, family: 'body', weight: 300, lh: 1.6, alpha: 0.60 },
  /** A line that names something rather than explaining it. */
  lead:      { size: 0.94, family: 'body', weight: 400, alpha: 0.85 },
  /** A call-out tile's label. */
  calloutLabel: { size: 0.50, family: 'body', weight: 700, track: 0.18, alpha: 1, upper: true },
  /** A call-out tile's value. */
  calloutValue: { size: 1.25, family: 'display', weight: 700, alpha: 1 },
  /** The wordmark, bottom left. */
  /* Measured off the website, not guessed from the app: 0.75rem, white, and
     the app had it at 0.875rem in a 0.55 white. A wordmark is the one thing on
     a screenshot that says where it came from, so a difference here is the
     difference between two products. */
  /* The initial inside a mark on the dimensions card. Small, bold, and white
     on the person's own colour. It is a size like any other, so it comes from
     here: the app had it written into the component, which is how the two
     surfaces stopped agreeing about everything else on these cards. */
  mark:      { size: 0.5, family: 'body', weight: 700, lh: 1, alpha: 1 },
  wordmark:  { size: 0.75, family: 'display', weight: 700, alpha: 1 },
  /** The address, bottom right. */
  /* Also measured: 0.52rem, regular weight, tracked 0.12em, lowercase. The
     app had it bold at 0.5 tracked 0.075. */
  siteLabel: { size: 0.52, family: 'body', weight: 400, track: 0.12, alpha: 0.35, lower: true },
  /** The button at the end of the last card. */
  cta:       { size: 0.85, family: 'body', weight: 700, track: 0.05, alpha: 1 },
  /** A sentence that introduces a figure. Card 3. */
  leadLg:    { size: 0.92, family: 'body', weight: 400, lh: 1.45, alpha: 0.72 },
  /** What a figure means, under it. Card 3. */
  statLabel: { size: 1.05, family: 'body', weight: 500, alpha: 0.72 },
  /** The same, one step down, on the cards that are only a figure. */
  statLabelSm: { size: 1, family: 'body', weight: 500, alpha: 0.8 },
  /** The eyebrow on the figure cards, a size up from the call-out label. */
  eyebrowMd: { size: 0.55, family: 'body', weight: 700, track: 0.28, alpha: 0.45, upper: true },
  /** The intimacy card's eyebrow, which takes that card's own colour. */
  eyebrowTint: { size: 0.52, family: 'body', weight: 700, track: 0.28, alpha: 0.85, upper: true },
  /** The middle figure size, used by the intimacy card. */
  statMid:   { size: [3.5, 12, 5.5], family: 'display', weight: 700, track: -0.04, lh: 1, alpha: 1 },
  /** Body copy on the cards that carry a paragraph. */
  bodyMd:    { size: 0.82, family: 'body', weight: 300, lh: 1.65, alpha: 0.6 },
  /** Body copy where the card is already busy. */
  bodyLg:    { size: 0.85, family: 'body', weight: 300, lh: 1.65, alpha: 0.55 },
  /** A label above a list, tracked wider than the call-out's. */
  listLabel: { size: 0.55, family: 'body', weight: 700, track: 0.16, lh: 1.6, alpha: 0.5, upper: true },
  /** A quoted line, set in the display face at reading size. */
  quote:     { size: [1.1, 3.2, 1.3], family: 'display', weight: 400, lh: 1.55, alpha: 1 },
  /** The largest headline, on the last card. */
  titleLg:   { size: [1.6, 4.4, 2.15], family: 'display', weight: 700, lh: 1.2, alpha: 1 },
  /** The headline on the two-up cards. */
  titleMd:   { size: [1.5, 5, 2], family: 'display', weight: 700, lh: 1.15, alpha: 1 },
  /** A small caption under a headline. */
  caption:   { size: 0.72, family: 'body', weight: 400, alpha: 0.6 },
  /** The second line on the sendoff, quieter than the button. */
  ctaAlt:    { size: 0.78, family: 'body', weight: 600, track: 0.04, alpha: 0.75 },
  /** Tap to begin, and the like. */
  footer:    { size: 0.52, family: 'body', weight: 700, track: 0.22, alpha: 0.28, upper: true },
};

/** The reference width these sizes were drawn at: the website's card. */
export const CARD_REF_WIDTH = 390;

/** The gradient rule under the opener's names. Orange to indigo, 40 by 2. */
export const RULE_GRADIENT = ['#E8673A', '#1B5FE8'];
export const RULE_SIZE = { width: 40, height: 2 };

/** The padding inside a card, in rem, at the reference width. */
export const CARD_PADDING = 2.5;

/** The two faces, as each surface names them. */
export const DISPLAY_FONT = "'Playfair Display', Georgia, serif";
export const BODY_FONT = "'DM Sans', sans-serif";

/**
 * The app ships one file per weight rather than one variable face, so a weight
 * is a different font name there. Getting this wrong is not subtle: DM Sans at
 * weight 300 with no Light file loaded renders as regular, which is the body
 * copy difference that made the cards look heavier than the website's.
 */
const NATIVE_FACES = { 300: 'DMSansLight', 400: 'DMSans', 500: 'DMSansMedium', 600: 'DMSansSemiBold', 700: 'DMSansBold' };
export function nativeFont(t) {
  if (t.family === 'display') return 'PlayfairDisplay';
  return NATIVE_FACES[t.weight] || 'DMSans';
}

/**
 * A second argument on either function shifts one value without restating the
 * rest: `cardTypeCss('bodySm', { alpha: 0.5 })` is the same role a shade
 * quieter. Two cards differ from their role by a hair, and writing the whole
 * style again to change an alpha is how the drift started.
 */

/**
 * One role as CSS, for the website.
 *
 * Returns the same clamp() and the same rgba the cards were written with, so
 * adopting this changes nothing on screen.
 */
export function cardTypeCss(role, over) {
  const t = over ? { ...CARD_TYPE[role], ...over } : CARD_TYPE[role];
  if (!t) return {};
  /**
   * Sized against the card, not the browser window.
   *
   * These were clamp(min, Nvw, max), and vw is a share of the viewport. A card
   * is a fixed 9:16 box, so the same card came out at 60.8px on a laptop and
   * 41.6px on a phone, and the downloaded image did not match what was on
   * screen. The app had no window to measure and used the card, which is why
   * it matched the website only at phone width.
   *
   * `cqw` is a share of the container, which is the card. Ellie's call: "size
   * against the card on both, so a card looks the same everywhere." The
   * container is named on the card element itself.
   */
  const size = Array.isArray(t.size)
    ? `clamp(${t.size[0]}rem, ${t.size[1]}cqw, ${t.size[2]}rem)`
    : `${t.size}rem`;
  return {
    fontFamily: t.family === 'display' ? DISPLAY_FONT : BODY_FONT,
    fontSize: size,
    fontWeight: t.weight,
    ...(t.track != null ? { letterSpacing: `${t.track}em` } : {}),
    ...(t.lh != null ? { lineHeight: t.lh } : {}),
    ...(t.upper ? { textTransform: 'uppercase' } : {}),
    ...(t.lower ? { textTransform: 'lowercase' } : {}),
    color: t.alpha >= 1 ? 'white' : `rgba(255,255,255,${t.alpha})`,
  };
}

/**
 * One role as numbers, for the app.
 *
 * `cardWidth` stands in for the viewport, because on these cards it always
 * did: the text is sized against the box it sits in, not against the screen
 * around it.
 */
export function cardTypeNative(role, cardWidth = CARD_REF_WIDTH, over) {
  const t = over ? { ...CARD_TYPE[role], ...over } : CARD_TYPE[role];
  if (!t) return {};
  const px = Array.isArray(t.size)
    ? Math.min(Math.max(t.size[0] * 16, (t.size[1] / 100) * cardWidth), t.size[2] * 16)
    : t.size * 16;
  const fontSize = Math.round(px * 10) / 10;
  return {
    fontFamily: nativeFont(t),
    fontSize,
    fontWeight: String(t.weight),
    ...(t.track != null ? { letterSpacing: Math.round(t.track * fontSize * 10) / 10 } : {}),
    /**
     * ── WHY THE LINE BOX NEVER GOES BELOW THE FONT SIZE ───────────────────
     * Ellie: "The % sign on storycard 4 is cut off on top", and "the 80% text
     * on storycard 5 is cut off on top."
     *
     * Both figures are set tight on purpose: `stat` is 0.9 of its size and
     * `statBig` 0.85, which on the web is leading and looks right, because a
     * browser lets a glyph overflow its line box. React Native does not. It
     * clips, from the top, so the two cards built around a number were the two
     * cards missing the top of it.
     *
     * The tight leading stays for the website, which is where it works. Native
     * gets a floor, and the floor is the font's own line box rather than a
     * number that looked like enough: 1.06 was the first answer here and
     * Playfair Display declares 1.41, so the heroes were still losing their
     * top edge. See api/_lib/font-metrics.js.
     */
    ...(t.lh != null
      ? { lineHeight: Math.max(Math.ceil(fontSize * t.lh), minLineHeight(t.family, fontSize)) }
      : {}),
    ...(t.upper ? { textTransform: 'uppercase' } : {}),
    ...(t.lower ? { textTransform: 'lowercase' } : {}),
    color: t.alpha >= 1 ? '#FFFFFF' : `rgba(255,255,255,${t.alpha})`,
  };
}

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
/**
 * Which colour each person is, wherever two people are drawn together.
 *
 * Ellie, comparing two screenshots: the placement dots on the communication
 * card were the brand indigo on the website and a lighter blue in the app, so
 * the same partner was two different colours depending on which screen she was
 * holding. The website has always used the orange and the indigo, the two ends
 * of the mark; the app had picked a tint.
 *
 * `you` is whoever is reading. This is not about gender or about who signed up
 * first; it is the reader and the other person, in that order.
 */
export const PERSON_COLORS = { you: '#E8673A', them: '#1B5FE8' };

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
  // The type scale goes over the wire like the colours do, so the app sizes
  // its text from the same numbers the website is drawn with rather than from
  // a scale of its own. That was the whole of what made the two look like
  // different products.
  type: CARD_TYPE,
  typeRefWidth: CARD_REF_WIDTH,
  /**
   * ── THE FLOOR TRAVELS WITH THE SCALE ────────────────────────────────────
   * Ellie: "Percentages are cut off on some storycards." Again, and the
   * reason was not the number.
   *
   * `stat` is set at 0.9 of its own size and `statBig` at 0.85, which is
   * leading on the web and a clip on a phone. cardTypeNative floors that at
   * the face's own line box, and check-card-type-clipping proved it does.
   * Both were true. The app never called cardTypeNative: it has its own copy
   * of the arithmetic, because an Expo project cannot import from api/, and
   * that copy had no floor. So the gate passed on the function nothing on the
   * phone was running, and 90% lost the top of its % sign.
   *
   * The ratios go over the wire with the scale now, so the app applies the
   * same floor from the same numbers rather than hardcoding 1.41.
   */
  lineBox: LINE_BOX,
  rule: { gradient: RULE_GRADIENT, ...RULE_SIZE },
  people: PERSON_COLORS,
  padding: CARD_PADDING,
};

/**
 * How wide the couple map is on its card, as a fraction of the card.
 *
 * Ellie: "Can we make the map on storycard 2 larger?" It was 184 points on the
 * website and 168 in the app, both written into their own renderers, so the
 * card that is built around the map drew it at two sizes and neither was the
 * one she wanted.
 *
 * A fraction rather than a number of points, because the app's cards are as
 * wide as the phone and the website's are not.
 *
 * 0.56 was the first answer, then 0.68, and Ellie asked for more again. This
 * is 0.72, and the ceiling is 0.75: the card's own padding is 40 points a side,
 * so on the narrowest phone the app supports a map past three quarters of the
 * card is wider than the column it sits in. check-card-map-size.mjs holds both
 * that and the height the type under it needs.
 */
export const CARD_MAP_PCT = 0.72;
