/**
 * The four What Comes Next icons, drawn in the brand gradient.
 *
 * ── WHY THEY ARE DRAWN AND NOT A SYMBOL ───────────────────────────────────
 * Ellie: "I want the icons to be large and to be stylized outline drawings
 * with attune-branded gradient lines."
 *
 * An SF Symbol takes one tint colour. A gradient along the strokes needs
 * either a mask, which is a native dependency and therefore a new TestFlight
 * build rather than an update she can publish, or shapes whose outlines are
 * the gradient. These are the second: every stroke is a gradient rectangle
 * with the tile's own colour sitting inside it, so the line itself carries
 * the orange through purple to blue that the storycards use.
 *
 * ── WHERE THE COLOURS COME FROM ───────────────────────────────────────────
 * The stripe on the storycard opener, which the server sends with the
 * results payload and the website imports directly from
 * api/_lib/storycard-style.js. Not a fourth copy of three hex values.
 */

import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
/* expo-image, which is what every other generated mark in the app is drawn
   with. See HeartBubble. */
import { Image } from 'expo-image';

/** The gradient, left to right, under every stroke. */
type Stripe = readonly string[];

const DEFAULT_STRIPE = ['#E8673A', '#9B5DE5', '#1B5FE8'] as const;

function stops(stripe?: Stripe | null) {
  const s = stripe && stripe.length >= 2 ? stripe : DEFAULT_STRIPE;
  return [...s] as [string, string, ...string[]];
}

/**
 * One stroked shape: a gradient underneath, the ground punched out of the
 * middle, which leaves a line of gradient the thickness of `stroke`.
 */
function Outline({
  w, h, radius, stroke = 2, stripe, ground, style, children,
}: {
  w: number; h: number; radius: number; stroke?: number;
  stripe?: Stripe | null; ground: string;
  style?: object; children?: React.ReactNode;
}) {
  return (
    <View style={[{ width: w, height: h }, style]}>
      <LinearGradient
        colors={stops(stripe)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: w, height: h, borderRadius: radius }}
      />
      <View
        style={{
          position: 'absolute', left: stroke, top: stroke,
          width: w - stroke * 2, height: h - stroke * 2,
          borderRadius: Math.max(0, radius - stroke), backgroundColor: ground,
        }}
      />
      {children}
    </View>
  );
}

type GlyphProps = { size?: number; stripe?: Stripe | null; ground: string };

/**
 * A person with a thought bubble, and two people on a couch.
 *
 * ── WHY THESE ARE PICTURES ────────────────────────────────────────────────
 * They were built out of rounded rectangles and circles, because this project
 * has no SVG without a native dependency and a native dependency means a
 * TestFlight build rather than an update Ellie can publish. That works for a
 * book and for the logo's own bubble. It does not work for a person or for two
 * people on a couch: those are curves, and three attempts at the couple
 * produced four circles in a tub, then two torsos, then something passable and
 * still wrong.
 *
 * Ellie, with a picture of each: "I want this shape head and shoulders and I
 * want the cloud to not be flat on the bottom", and "Can we do something like
 * this?"
 *
 * So they are drawn as SVG and rendered to PNG by scripts/build-glyphs.mjs,
 * which is exactly how every other place the app draws the logo works. The
 * gradient is the brand's, baked in. check-glyph-assets.mjs fails the build if
 * a picture is missing or was drawn from a different version of the paths.
 *
 * They take `stripe` and `ground` so the four glyphs stay interchangeable at
 * the call site, and ignore both: the gradient is in the artwork and the
 * middle is transparent, so the tile tints through it.
 */
function Picture({ size, source, ratio }: {
  size: number;
  source: number;
  /** width over height, so a drawing that is not square is not letterboxed. */
  ratio: number;
}) {
  return (
    <Image
      source={source}
      style={{ width: size * ratio, height: size }}
      contentFit="contain"
      /* not markable: an icon. */
      accessible={false}
    />
  );
}

/** A person with a thought bubble: the things to consider. */
export function ThinkingPerson({ size = 64 }: GlyphProps) {
  return <Picture size={size} ratio={1} source={require('@/assets/images/attune-glyph-thinking.png')} />;
}

/** Two people sitting together: the discussions to have. */
export function CouchPair({ size = 64 }: GlyphProps) {
  return <Picture size={size} ratio={1} source={require('@/assets/images/attune-glyph-couch.png')} />;
}

/**
 * A conversation bubble with a heart in it: the phrases to try.
 *
 * ── IT IS THE LOGO'S OWN BUBBLE ───────────────────────────────────────────
 * Ellie: "Make the convo bubble with a heart the same shape as one of the ones
 * from the logo, not sure why you're having trouble with this one since those
 * already exist."
 *
 * She is right twice over. The mark is two conversation bubbles each with a
 * heart in it, so one of them IS this icon, and I drew a third version out of
 * rounded rectangles instead, which is the failure this codebase is organised
 * against. It took three passes to get a hand-drawn heart that read as a heart
 * while the finished one sat in public/favicon.svg the whole time.
 *
 * `attune-bubble-heart.png` is the mark's right bubble, cropped to its own
 * extent and with its white fill cleared so the tile tints through it, written
 * by scripts/build-mark-variants.mjs from the favicon. An Expo project cannot
 * render an SVG without a native dependency, which is why every other place
 * the app draws the mark draws a generated PNG too.
 *
 * It takes no stripe and no ground: the gradient is the brand's and is baked
 * into the artwork, which is the point of using the logo rather than a
 * drawing of it. The props stay in the signature so the four glyphs are
 * interchangeable at the call site.
 */
export function HeartBubble({ size = 64 }: GlyphProps) {
  /* The source is 52 by 61, so height leads and the width follows rather than
     the square box the drawn glyphs use. A square would letterbox it, and
     `contain` fits the canvas, not the artwork. */
  return (
    <Image
      source={require('@/assets/images/attune-bubble-heart.png')}
      style={{ width: size * (52 / 61), height: size }}
      contentFit="contain"
      /* not markable: an icon. */
      accessible={false}
    />
  );
}

/**
 * A book with three written lines: the relationship journal.
 *
 * ── IT IS A PICTURE NOW, LIKE THE OTHER THREE ─────────────────────────────
 * Ellie: "What comes next page on site should match app." The website draws
 * that page too now, and it could not draw this icon: it was built here out of
 * Views and a LinearGradient, which renders in React Native and nowhere else.
 *
 * Drawing it a second time in CSS for the website would be a second drawing of
 * one icon, which is what scripts/build-glyphs.mjs exists to stop. So the same
 * geometry moved into that builder, which renders it to a PNG, and both
 * surfaces show the same bytes. ThinkingPerson and CouchPair have worked this
 * way since they were drawn.
 *
 * `stripe` and `ground` are no longer read, because the gradient is baked into
 * the picture. That is already true of the other three.
 */
export function JournalBook({ size = 64 }: GlyphProps) {
  return <Picture size={size} ratio={1} source={require('@/assets/images/attune-glyph-journal.png')} />;
}
