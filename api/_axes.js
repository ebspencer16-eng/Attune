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

export const AXES = [
  {
    id: 'engage',
    label: 'Engage / Withdraw',
    color: '#9B5DE5',
    desc: 'How you respond when something is hard or unresolved.',
  },
  {
    id: 'open',
    label: 'Open / Guarded',
    color: '#1B5FE8',
    desc: "How freely you express what's going on inside.",
  },
];

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
export const MAP_CAPTION = [
  'Where you each sit on this map is calculated from your responses. Scores for Conflict, Repair, and Stress determine placement on the Engage/Withdraw axis, and Expression, Feedback, and Needs scores determine placement on the Open/Guarded axis.',
  'Two people who think they know their type will almost always land somewhere different than expected.',
];
