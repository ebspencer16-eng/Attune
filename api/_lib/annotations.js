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
  { key: 'amber',  name: 'Amber',  ink: '#B7791F', wash: '#FBEBC8' },
  { key: 'rose',   name: 'Rose',   ink: '#B5546E', wash: '#FBE0E7' },
  { key: 'violet', name: 'Violet', ink: '#7C5AC7', wash: '#EAE2FA' },
  { key: 'teal',   name: 'Teal',   ink: '#2C8A87', wash: '#D6EFEE' },
  { key: 'blue',   name: 'Blue',   ink: '#1B5FE8', wash: '#DEE8FD' },
];

/** The colour used when a highlight arrives with none, or with one we retired. */
export const DEFAULT_ANNOTATION_COLOR = 'amber';

/** One colour by key, or the default. Never undefined, so a render cannot break. */
export function annotationColor(key) {
  return ANNOTATION_COLORS.find((c) => c.key === key)
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
