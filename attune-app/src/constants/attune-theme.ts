/**
 * Attune design tokens.
 *
 * Ported from the web rather than reinvented, so the app and the site read as
 * one product. The hex values here are the same ones in public/offerings.html
 * and src/App.jsx; if a colour changes there it changes here in the same
 * commit.
 *
 * Nothing outside this file hardcodes a hex value. That rule is what keeps a
 * palette from drifting into fourteen slightly different oranges, which is the
 * usual fate of a design system nobody enforces.
 */

// ── Ground and ink ─────────────────────────────────────────────────────────
export const Palette = {
  cream: '#FFFDF9',
  warm: '#FBF8F3',
  stone: '#E8DDD0',
  ink: '#0E0B07',
  text: '#1E1610',
  muted: '#8C7A68',
  clay: '#C17F47',
  orange: '#E8673A',
  indigo: '#1B5FE8',
  white: '#FFFFFF',
} as const;

/**
 * Section accents. Used consistently and never decoratively: a colour on this
 * app means "this belongs to that section", so borrowing one for emphasis
 * breaks the only signal it carries.
 */
export const SectionColor = {
  communication: '#E8673A',
  expectations: '#1B5FE8',
  reflection: '#10B981',
  intimacy: '#B5546E',
  conflict: '#1B5FE8',
} as const;

/**
 * Accent per exercise and per purchasable thing.
 *
 * A colour is design, not a rule the server owns, so this stays app-side. What
 * it deliberately is NOT is a list of what exists: the keys are looked up, and
 * anything absent falls back to a neutral. Add an exercise server-side and it
 * appears here in the right place wearing the fallback colour, rather than
 * vanishing because the app had never heard of it.
 *
 * That is the difference between a lookup and a list. A stale lookup shows the
 * wrong colour. A stale list shows nothing at all.
 */
export const AccentFor: Record<string, string> = {
  // Exercises, by registry key.
  ex1: SectionColor.communication,
  ex2: SectionColor.expectations,
  ex3: SectionColor.reflection,
  intimacy: SectionColor.intimacy,
  conflict: SectionColor.conflict,
  // Purchasable things, by catalogue key.
  reflection: SectionColor.reflection,
  budget: SectionColor.expectations,
  checklist: Palette.clay,
  workbook: Palette.orange,
};

/** The neutral an unknown key wears until someone gives it a colour. */
export const AccentFallback = Palette.clay;

/**
 * The four conflict-pattern frequency bands, green through red.
 * Mirrors BAND_COLORS in api/_conflict-results-prose.js.
 */
export const BandColor = ['#2E7D5B', '#D4A017', '#E07A1F', '#C2410C'] as const;

// ── Semantic roles ─────────────────────────────────────────────────────────
// Screens reference these, not the palette, so a role can be repointed without
// touching every screen.
export const Colors = {
  light: {
    text: Palette.text,
    textStrong: Palette.ink,
    textMuted: Palette.muted,
    background: Palette.warm,
    surface: Palette.white,
    border: Palette.stone,
    accent: Palette.orange,
    accentQuiet: Palette.clay,
    /** Glance screens invert onto a coloured ground. */
    onDark: Palette.white,
    onDarkMuted: 'rgba(255,255,255,0.72)',
  },
  dark: {
    text: '#F3EDE4',
    textStrong: Palette.white,
    textMuted: 'rgba(243,237,228,0.62)',
    background: '#16120D',
    surface: '#221C15',
    border: '#3A3128',
    accent: Palette.orange,
    accentQuiet: Palette.clay,
    onDark: Palette.white,
    onDarkMuted: 'rgba(255,255,255,0.72)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// ── Type ───────────────────────────────────────────────────────────────────
// Display is Playfair on the web. Until the font file is bundled the app uses
// the system serif, which is close enough in weight not to look wrong and
// avoids shipping a font before anyone has seen a screen.
export const Fonts = {
  display: 'ui-serif',
  body: 'system-ui',
} as const;

export const Type = {
  hero: { fontFamily: Fonts.display, fontSize: 30, lineHeight: 34, fontWeight: '700' },
  title: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 27, fontWeight: '700' },
  cardTitle: { fontFamily: Fonts.body, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  body: { fontFamily: Fonts.body, fontSize: 15, lineHeight: 24, fontWeight: '400' },
  small: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 19, fontWeight: '400' },
  /** Section labels: uppercase, tracked, small. */
  eyebrow: {
    fontFamily: Fonts.body, fontSize: 10, lineHeight: 14,
    fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase',
  },
} as const;

// ── Spacing ────────────────────────────────────────────────────────────────
// A four-point scale. Named rather than numbered so a screen reads as intent.
export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
} as const;

export const Radius = { sm: 8, md: 12, lg: 14, xl: 18, pill: 999 } as const;

export const MaxContentWidth = 640;
export const BottomTabInset = 84;

/**
 * Cards are a border and a radius, not a shadow.
 *
 * This product is read by two people about their relationship, often side by
 * side. Heavy elevation and drop shadows make a screen feel like an interface
 * to operate; a flat card with a hairline border reads as a page to sit with.
 */
export const card = (c: typeof Colors.light) => ({
  backgroundColor: c.surface,
  borderColor: c.border,
  borderWidth: 1,
  borderRadius: Radius.lg,
  padding: Spacing.lg,
});
