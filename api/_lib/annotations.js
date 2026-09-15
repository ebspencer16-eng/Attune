/**
 * What an annotation can be, and what colour it can be made in.
 *
 * ── WHY THIS IS SERVER-SIDE ───────────────────────────────────────────────
 * Ellie's spec: selecting text offers highlight, underline, tag, note and
 * share, and the first two open a colour picker.
 *
 * A colour picker on a client is a list of colours, and a list on a client is
 * a list that drifts from the one the other client has. This product already
 * has that bug in nine other places. So the palette is here, both surfaces
 * read it, and the endpoint validates against it: a colour that is not on this
 * list is not a colour this product offers, and storing one would render as
 * something nobody chose on the surface that does not know it.
 *
 * ── WHY HIGHLIGHT AND UNDERLINE SHARE A PALETTE ───────────────────────────
 * They are the same gesture with a different weight, and a reader who
 * highlights in amber and underlines in amber means the same thing twice. Two
 * palettes would invite the opposite reading.
 *
 * ── ON NAMES ──────────────────────────────────────────────────────────────
 * Each colour has one, because a colour swatch with no name is unusable to
 * anyone who cannot distinguish them, and because "your amber highlights" is
 * something a person can say. They are colour names rather than meanings:
 * assigning meaning ("important", "disagree") would be the product telling a
 * couple what their own marks are for.
 */

/** The three things a person can leave on a piece of text. */
export const ANNOTATION_KINDS = ['note', 'highlight', 'underline'];

/**
 * The colours a highlight or an underline can be made in.
 *
 * `ink` is what an underline is drawn in and what a highlight's text sits on;
 * `wash` is the highlight's fill. A highlight needs the pale one and an
 * underline needs the saturated one, so both are here rather than one being
 * computed from the other with an alpha that would differ between a browser
 * and a phone.
 */
export const ANNOTATION_COLORS = [
  { key: 'red',    name: 'Red',    ink: '#C0392B', wash: '#FADDD9' },
  { key: 'orange', name: 'Orange', ink: '#E8673A', wash: '#FBE2D8' },
  { key: 'yellow', name: 'Yellow', ink: '#B7791F', wash: '#FBEBC8' },
  { key: 'green',  name: 'Green',  ink: '#2E7D5B', wash: '#D8EEE3' },
  { key: 'blue',   name: 'Blue',   ink: '#1B5FE8', wash: '#DEE8FD' },
  { key: 'purple', name: 'Purple', ink: '#7C5AC7', wash: '#EAE2FA' },
  { key: 'pink',   name: 'Pink',   ink: '#B5546E', wash: '#FBE0E7' },
];

/**
 * What the old keys mean now.
 *
 * ── WHY THIS EXISTS RATHER THAN A MIGRATION ───────────────────────────────
 * Ellie: "Call colors Red Orange Yellow Green Blue Purple rather than the
 * names you have listed. Also include Pink as a color option."
 *
 * A mark stores its colour as a key, and marks made before that are in the
 * database with the old ones. Renaming without this would leave every existing
 * highlight drawing in the default colour, which is not the colour anyone
 * chose. Each old key maps to the new colour nearest the ink it was drawn in,
 * so an existing mark keeps looking like itself.
 *
 * It is a lookup rather than a rewrite of the rows because a rewrite is a
 * migration Ellie has to run, over data that is fine, to save a five-line map.
 */
const RETIRED_COLORS = {
  amber:  'yellow',
  rose:   'pink',
  violet: 'purple',
  teal:   'green',
};

/** The colour used when a highlight arrives with none, or with one we retired. */
export const DEFAULT_ANNOTATION_COLOR = 'yellow';

/** One colour by key, or the default. Never undefined, so a render cannot break. */
export function annotationColor(key) {
  const k = RETIRED_COLORS[key] || key;
  return ANNOTATION_COLORS.find((c) => c.key === k)
    || ANNOTATION_COLORS.find((c) => c.key === DEFAULT_ANNOTATION_COLOR);
}

/**
 * Is this a kind and colour the product actually offers?
 *
 * A plain note takes no colour. A highlight or underline requires one, because
 * a mark with no colour is a mark that cannot be drawn.
 */
export function isValidAnnotation(kind, color) {
  const k = kind || 'note';
  if (!ANNOTATION_KINDS.includes(k)) return false;
  if (k === 'note') return color == null;
  return ANNOTATION_COLORS.some((c) => c.key === color);
}
