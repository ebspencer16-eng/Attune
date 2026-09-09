/**
 * The four individual types, as the couple map draws them.
 *
 * ── WHY THIS FILE ─────────────────────────────────────────────────────────
 * The name, colour and fill of each quadrant lived only in INDIVIDUAL_TYPES
 * in src/App.jsx, so the map could only ever be drawn by the website. The app
 * had the two positions but no way to label or colour the quadrants without a
 * second copy of this table, and a second copy of a colour table is how one
 * surface ends up with a different purple.
 *
 * Only the display facts are here. The prose (wired, desc, typeDesc) stays in
 * src/App.jsx because nothing else reads it.
 *
 * Axes, for anyone placing something on this map: open runs 0 guarded to 1
 * open, engage runs 0 withdraw to 1 engage. So W is top-left, X top-right,
 * Y bottom-left, Z bottom-right.
 */

export const INDIVIDUAL_TYPE_DISPLAY = {
  W: { code: 'W', name: 'The Initiator', color: '#E8673A', fill: '#FFF4F0' },
  X: { code: 'X', name: 'The Anchor',    color: '#1B5FE8', fill: '#EFF1FF' },
  Y: { code: 'Y', name: 'The Feeler',    color: '#7C3AED', fill: '#F5F0FF' },
  Z: { code: 'Z', name: 'The Protector', color: '#6B7280', fill: '#F4F5F6' },
};

/** The map's quadrants, in the order they are drawn: top-left to bottom-right. */
export const MAP_QUADRANTS = ['W', 'X', 'Y', 'Z'];
