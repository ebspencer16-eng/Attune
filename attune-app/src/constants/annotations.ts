/**
 * The annotation palette and kinds, mirroring api/_lib/annotations.js.
 *
 * The app cannot import from api/, so these are named here and
 * check-annotation-palette.mjs fails the build if they stop matching. Same
 * arrangement as the mark-placement numbers in api/_lib/track-marks.js, and
 * for the same reason: sending five colours on every payload to avoid a gate
 * would be worse than the gate.
 *
 * A colour that differs between the two products means a highlight made on a
 * laptop is a different colour on a phone, which reads as a different mark.
 */

export type AnnotationKind = 'note' | 'highlight' | 'underline';

export const ANNOTATION_KINDS: AnnotationKind[] = ['note', 'highlight', 'underline'];

export type AnnotationColor = {
  key: string; name: string; ink: string; wash: string;
};

export const ANNOTATION_COLORS: AnnotationColor[] = [
  { key: 'red',    name: 'Red',    ink: '#C0392B', wash: '#FADDD9' },
  { key: 'orange', name: 'Orange', ink: '#E8673A', wash: '#FBE2D8' },
  { key: 'yellow', name: 'Yellow', ink: '#B7791F', wash: '#FBEBC8' },
  { key: 'green',  name: 'Green',  ink: '#2E7D5B', wash: '#D8EEE3' },
  { key: 'blue',   name: 'Blue',   ink: '#1B5FE8', wash: '#DEE8FD' },
  { key: 'purple', name: 'Purple', ink: '#7C5AC7', wash: '#EAE2FA' },
  { key: 'pink',   name: 'Pink',   ink: '#B5546E', wash: '#FBE0E7' },
];

/**
 * What the old keys mean now. Mirrors RETIRED_COLORS in
 * api/_lib/annotations.js: a mark made before the palette was renamed is in
 * the database under its old key, and without this every one of them would
 * draw in the default colour instead of the colour someone chose.
 */
const RETIRED_COLORS: Record<string, string> = {
  amber: 'yellow', rose: 'pink', violet: 'purple', teal: 'green',
};

export const DEFAULT_ANNOTATION_COLOR = 'yellow';

/** One colour by key, never undefined, so a render cannot break on a bad key. */
export function annotationColor(key?: string | null): AnnotationColor {
  const k = (key && RETIRED_COLORS[key]) || key;
  return ANNOTATION_COLORS.find((c) => c.key === k)
    || ANNOTATION_COLORS.find((c) => c.key === DEFAULT_ANNOTATION_COLOR)!;
}
