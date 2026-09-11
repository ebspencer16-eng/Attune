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
  { key: 'amber',  name: 'Amber',  ink: '#B7791F', wash: '#FBEBC8' },
  { key: 'rose',   name: 'Rose',   ink: '#B5546E', wash: '#FBE0E7' },
  { key: 'violet', name: 'Violet', ink: '#7C5AC7', wash: '#EAE2FA' },
  { key: 'teal',   name: 'Teal',   ink: '#2C8A87', wash: '#D6EFEE' },
  { key: 'blue',   name: 'Blue',   ink: '#1B5FE8', wash: '#DEE8FD' },
];

export const DEFAULT_ANNOTATION_COLOR = 'amber';

/** One colour by key, never undefined, so a render cannot break on a bad key. */
export function annotationColor(key?: string | null): AnnotationColor {
  return ANNOTATION_COLORS.find((c) => c.key === key)
    || ANNOTATION_COLORS.find((c) => c.key === DEFAULT_ANNOTATION_COLOR)!;
}
