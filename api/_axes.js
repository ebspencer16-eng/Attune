/**
 * The two axes the couple map is drawn on, described.
 *
 * ── WHY THIS FILE ─────────────────────────────────────────────────────────
 * The map shows two dots in a square. Without these four sentences it is a
 * picture, not a finding: a reader can see that they are in different corners
 * and has no idea what the corners mean.
 *
 * The website prints them inside the map tile. The app printed nothing, because
 * the copy was inline in src/App.jsx and had never been anywhere an app could
 * read it. Both surfaces read this now.
 *
 * Each axis is one sentence. There used to be a second half: two pole lines
 * per axis with up and down arrows, spelling out what Engage looked like
 * versus Withdraw. Ellie cut them from both surfaces. The axis label already
 * names both ends, and a list of what each end looks like reads as a pair of
 * descriptions to see yourself in, which is the opposite of what a continuum
 * is for.
 *
 * If they ever come back, they come back here, once, and both surfaces get
 * them. That is why this file exists: the copy was inline in src/App.jsx and
 * the app had nothing, because there was nowhere an app could read it from.
 */

/**
 * ── THE POLE NAMES LIVE HERE TOO ──────────────────────────────────────────
 * The four words drawn on the edges of the map: ENGAGE at the top, WITHDRAW
 * at the foot, OPEN on the left, GUARDED on the right. They were typed into
 * the website's SVG and typed again into the app's map component, which is
 * two copies of a rule with nothing holding them together, and the labels on
 * the two maps were therefore free to disagree.
 *
 * `helpAt` is the pole that carries the question mark. Ellie: "Put a light
 * grey question mark icon in a circle next to Open and Withdraw that pop up
 * with the description of that axis. Remove axis descriptions from below the
 * chart." One marker per axis, at the pole she named, and `desc` is what it
 * opens. Which is also why `desc` is still one sentence per axis: it is now
 * read in a small panel beside a chart rather than in a column under it.
 *
 * `high` is the end a coordinate of 1 sits at. The map puts Engage at the top
 * and Open on the left, so both renderers invert for the screen; that
 * arithmetic stays with the renderer, and only the words are here.
 */
export const AXES = [
  {
    id: 'engage',
    label: 'Engage / Withdraw',
    color: '#9B5DE5',
    desc: 'How you respond when something is hard or unresolved.',
    poles: { high: 'Engage', low: 'Withdraw' },
    helpAt: 'low',
  },
  {
    id: 'open',
    label: 'Open / Guarded',
    color: '#1B5FE8',
    desc: "How freely you express what's going on inside.",
    poles: { high: 'Open', low: 'Guarded' },
    helpAt: 'high',
  },
];

/** The axis the map's vertical edge is, and the one its horizontal edge is. */
export const ENGAGE_AXIS = AXES[0];
export const OPEN_AXIS = AXES[1];

/** The word at one end of an axis, and whether that end carries the help. */
export function pole(axis, end) {
  return { label: axis.poles[end], help: axis.helpAt === end ? axis : null };
}

/**
 * The small print under the map.
 *
 * Ellie's copy, and hers to change. The website has printed it since the map
 * existed; the app printed nothing, for the same reason the axis copy was
 * missing before this file: it was inline in src/App.jsx.
 *
 * It earns its place by answering the question the map provokes. Two dots in a
 * square invite "why am I there", and the second line pre-empts the reaction
 * that follows, which is that the reader expected to be somewhere else.
 *
 * Two paragraphs, not one string with a break in it, so each surface sets its
 * own spacing.
 */
/**
 * Ellie: "replace the two paragraphs under the couple map on the couple type
 * page with one line: 'Placement calculated based on 10 dimension scores.'"
 *
 * Still a list rather than a string, because both surfaces iterate it and a
 * second line is a line she may want back.
 */
export const MAP_CAPTION = [
  'Placement calculated based on 10 dimension scores.',
];
