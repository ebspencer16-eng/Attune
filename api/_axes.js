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
 * The poles are written so neither reads as the better one. That is the rule
 * for every dimension in this product, and it is easiest to break here, where
 * one end of each axis is the one people assume they are supposed to be.
 */

export const AXES = [
  {
    id: 'engage',
    label: 'Engage / Withdraw',
    color: '#9B5DE5',
    desc: 'How you respond when something is hard or unresolved.',
    poles: [
      'Engage: moves toward resolution, addresses quickly',
      'Withdraw: needs space first, processes privately',
    ],
  },
  {
    id: 'open',
    label: 'Open / Guarded',
    color: '#1B5FE8',
    desc: "How freely you express what's going on inside.",
    poles: [
      "Open: partner usually knows how you're feeling",
      'Guarded: processes internally, expressive when ready',
    ],
  },
];
