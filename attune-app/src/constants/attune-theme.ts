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

import type { TextStyle } from 'react-native';

// ── Ground and ink ─────────────────────────────────────────────────────────
export const Palette = {
  cream: '#FFFDF9',
  warm: '#FBF8F3',
  stone: '#E8DDD0',
  ink: '#0E0B07',
  text: '#1E1610',
  muted: '#8C7A68',
  clay: '#C17F47',
  /**
   * ── THE SAME TWO HUES, DARK ENOUGH TO READ ────────────────────────────
   * Ellie: "Please make the font slightly darker or higher contrast
   * throughout so that it's easier to read."
   *
   * She is right, and it is measurable rather than a matter of taste. On the
   * cream ground `muted` is 3.9 to 1 and `clay` is 3.1 to 1. The readable
   * floor for body text is 4.5. These two are the same hues taken down until
   * they clear it: 5.1 and 4.4 on cream, 5.4 and 4.6 on white.
   *
   * They are additions rather than edits because `muted` and `clay` are the
   * website's colours, typed into src/App.jsx 117 and 24 times, and a colour
   * that means one thing on two surfaces has to change on both or on neither.
   * Which is O211: the app reads them as type, so the app moves first, and
   * whether the website follows is hers to say.
   *
   * Nothing draws with these directly. They are what the two text roles
   * below point at, which is why 179 places got darker from one edit.
   */
  mutedInk: '#7A6753',
  clayInk: '#A66534',
  orange: '#E8673A',
  indigo: '#1B5FE8',
  white: '#FFFFFF',
} as const;

/**
 * The home screen's blue ground, one definition.
 *
 * Two shades of the same blue, dark to light. It is monochrome on purpose: the
 * home screen ran a three-hue gradient once and it was the app inventing a
 * palette the site does not have.
 *
 * It used to say these were the results glance's colours too, and the results
 * glance used it. They were not: the website paints Communication purple into
 * the brand orange, and the app was painting it this blue, which belongs to
 * Conflict. Results grounds come from api/_lib/section-grounds.js by way of
 * the payload now, and nothing in results reads this.
 */
/* Softened once, alongside the orange: Ellie, of the Insights ground, "Can we
   do a slightly softer orange", and then of this one, "Can we soften the blue
   gradient on the homepage, just like we did for the orange on insights."
   Same move, the same amount: each stop a shade lighter and a shade less
   saturated. */
export const BlueGround = ['#2A3A6E', '#4A6CD4'] as const;

/**
 * The Insights tab's ground, which is the same idea in the brand orange.
 *
 * Ellie: "The home page is the attune blue, please try making the landing page
 * for insights the attune orange. Similar gradient as the home page has
 * please."
 *
 * Two shades of one hue, dark corner to light, exactly as BlueGround is. It is
 * here rather than in insights.tsx so the two grounds stay one decision: if the
 * home screen's blue is ever restyled, the thing to match is a line away.
 */
/* Softened once: Ellie, of the first version, "Can we do a slightly softer
   orange". #C2410C is a burnt orange and read as the loudest ground in the
   app. These are the same two positions a shade lighter and a shade less
   saturated. */
export const OrangeGround = ['#CB5A33', '#F09763'] as const;

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
 * Exercise status, matching the dashboard table on the web.
 *
 * Green reads as done, clay as underway, sand as not started. Deliberately the
 * same three the site uses, because a couple checks progress in both places and
 * two colour languages for one fact is how someone ends up unsure whether they
 * finished.
 */
export const StatusColor = {
  done: '#059669',
  inProgress: Palette.clay,
  waiting: '#D4C0A8',
  /** Partner column, which is reported rather than actionable. Dark enough
   *  to be read as well as to be recognised; it was 2.6 to 1. */
  waitingText: '#7F7059',
} as const;

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
    textMuted: Palette.mutedInk,
    background: Palette.warm,
    surface: Palette.white,
    border: Palette.stone,
    accent: Palette.orange,
    accentQuiet: Palette.clayInk,
    /** Glance screens invert onto a coloured ground. */
    onDark: Palette.white,
    /** 0.72 on a mid ground is under 4.5 to 1. This is over it. */
    onDarkMuted: 'rgba(255,255,255,0.84)',
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
/**
 * The two families the website uses, loaded from assets/fonts in the root
 * layout.
 *
 * ── WHY EACH WEIGHT IS ITS OWN FAMILY ─────────────────────────────────────
 * React Native on iOS does not synthesise weights from a single registered
 * face. Setting fontWeight '700' on a family that only has a regular face
 * either does nothing or fakes a bold badly, and which of those you get varies
 * by iOS version. So each weight is registered under its own name and the type
 * scale names the one it wants.
 *
 * fontWeight is still set alongside, because it is what a screen reader and a
 * text-only fallback read, and because it is correct.
 *
 * ── WHAT THIS REPLACED ────────────────────────────────────────────────────
 * `ui-serif` and `system-ui`: New York and San Francisco on iOS. Every screen
 * in the app was in a different typeface from the same screen on the website,
 * which is why the storycards never matched however many times their colours,
 * ratio, grounds and layout were corrected.
 */
export const Fonts = {
  display: 'PlayfairDisplay',
  body: 'DMSans',
  bodyLight: 'DMSansLight',
  bodyMedium: 'DMSansMedium',
  bodySemiBold: 'DMSansSemiBold',
  bodyBold: 'DMSansBold',
  /**
   * ── ITALIC IS A FAMILY HERE ───────────────────────────────────────────
   * Not `fontStyle: 'italic'`. iOS synthesises nothing for a registered
   * family: asking a named font to slant draws the upright face and reports
   * no error, which is why every italic in this app was silently upright
   * until these two files were bundled. Anything that wants italic names one
   * of these instead.
   *
   * Playfair is still Bold-only and still cannot be italic. That one is a
   * missing file, not a missing flag, and the same fix would work.
   */
  bodyItalic: 'DMSansItalic',
  bodyBoldItalic: 'DMSansBoldItalic',
  /**
   * Playfair's italic, which is its Bold Italic: the display face is only ever
   * drawn at Bold here, so a Regular Italic would be a second weight nothing
   * asks for. Named for the same reason the DM Sans italics are: `fontStyle`
   * does nothing to a registered family.
   */
  displayItalic: 'PlayfairDisplayItalic',
} as const;

/**
 * Type for a TextInput, rather than a Text.
 *
 * iOS clips the text of a focused TextInput when the style carries lineHeight:
 * the bottom of every character is cut off while typing and snaps back to
 * normal the moment the field loses focus. It looks like a font problem and it
 * is a layout one.
 *
 * So inputs take the same family, size and weight, and no lineHeight. Height
 * comes from padding, which is what an input should be sized by anyway.
 */
export function inputType(t: {
  fontFamily: string; fontSize: number; fontWeight: string;
}): Pick<TextStyle, 'fontFamily' | 'fontSize' | 'fontWeight'> {
  return {
    fontFamily: t.fontFamily,
    fontSize: t.fontSize,
    fontWeight: t.fontWeight as TextStyle['fontWeight'],
  };
}

/**
 * ── EVERY LINE BOX FITS ITS FACE ──────────────────────────────────────────
 * Ellie, on the In Practice reader: "Titles / heroes cut off on the top."
 *
 * React Native clips rather than overflowing: set a lineHeight smaller than
 * the font's own line box and the top of the line goes, which is where a
 * display face keeps its ascenders. The hero was 30 point type in a 34 point
 * box, 1.13 of its size, and Playfair Display declares 1.41. So every hero in
 * the app has been losing its top edge, worst on the screens that set one.
 *
 * The ratios are the fonts' own, read out of the files: 1.41 for Playfair
 * Display and 1.33 for DM Sans. check-font-line-boxes.mjs reads them again on
 * every build and fails if any of these is set tighter than its face allows,
 * so swapping a font cannot quietly start clipping.
 */
export const Type = {
  /**
   * ── THE LINE A TAB OPENS WITH ─────────────────────────────────────────
   * Ellie, with five reference apps: "I want clean, engaging, branded
   * interfaces." Every one of them opens on a headline two or three times the
   * size of the body and lets it own the top of the screen. Ours opened at
   * thirty, which is a heading rather than a headline.
   *
   * 54 over 38 is 1.42, a hair above Playfair Bold's own line box of 1.41.
   * Tighter than that clips the face, which is why these are not set as
   * tight as the grotesques in her references: a high-contrast serif carries
   * its leading with it. check-font-line-boxes.mjs holds every role here to
   * the number in the font file.
   */
  display: { fontFamily: Fonts.display, fontSize: 38, lineHeight: 54, fontWeight: '700' },
  hero: { fontFamily: Fonts.display, fontSize: 30, lineHeight: 43, fontWeight: '700' },
  title: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 32, fontWeight: '700' },
  cardTitle: { fontFamily: Fonts.bodyBold, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  body: { fontFamily: Fonts.body, fontSize: 15, lineHeight: 24, fontWeight: '400' },
  small: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 19, fontWeight: '400' },
  /** Section labels: uppercase, tracked, small. */
  eyebrow: {
    fontFamily: Fonts.bodyBold, fontSize: 10, lineHeight: 14,
    fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase',
  },
} as const;

// ── Spacing ────────────────────────────────────────────────────────────────
// A four-point scale. Named rather than numbered so a screen reads as intent.
export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
} as const;

export const Radius = { sm: 8, md: 12, lg: 14, xl: 18, pill: 999, card: 26 } as const;

/**
 * A card that sits ON a ground rather than in a list.
 *
 * Every one of Ellie's reference apps does the same thing: a soft coloured
 * ground, and white cards floating on it with a generous radius and a shadow
 * soft enough that you read it as depth rather than as a border. A hairline
 * would be the other language, and it is the one the app had.
 *
 * One constant rather than four copies, because these four screens are meant
 * to look like one product and the way they stop is by being tuned
 * separately.
 */
/**
 * Where a tab's first block starts, under the lockup.
 *
 * Ellie: "Please bump the resources tiles down to be top aligned with the
 * growth noun dictionary definition tile on the notes page." Two tabs lining
 * up across a tab switch is the kind of thing that is true on the day it is
 * set and false a week later, because it is two numbers in two files. One
 * number, read by both.
 *
 * And then: "Please move the resource tiles down so there's more of a buffer
 * at the top of the learn page. There's white space below the 4 in practice
 * featured articles so we can push everything down and it'll be fine."
 *
 * Which found that Learn was never reading this. The constant was added for
 * exactly this alignment and it went on the shelf page, the one behind a
 * section arrow, while the Learn tab itself kept a paddingTop of Spacing.sm.
 * So the two tabs were forty points apart the whole time, and the note above
 * saying they line up from one number was describing a page nobody opens.
 *
 * The Learn tab reads it now, which is both halves of what she asked: the
 * tiles move down, and they land where the Notes tab's word tile already is.
 */
export const TabTopInset = 60;

export const Lift = {
  shadowColor: '#2A1B10',
  shadowOpacity: 0.10,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 4,
} as const;

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
