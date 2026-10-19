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

/**
 * Several shapes drawn as ONE outline.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * `Outline` draws a gradient box with the ground punched out of it, which is
 * one closed shape. Put two of them side by side and you get two closed
 * shapes: a head and a body edge to edge read as a snowman, and four circles
 * on a couch read as four circles.
 *
 * A union is drawn in two passes instead. Every gradient shape goes down
 * first, then every ground-coloured inset on top of all of them. The insets
 * cover each other's internal strokes, so what survives is the boundary of the
 * whole group: a cloud rather than four bubbles, a seated person rather than a
 * head and a torso.
 *
 * Ellie asked for both: "Can the thought bubble be a cloud not just an oval",
 * and "Any way to make the icon for discussions to have look like two full
 * bodies rather than just a torso on the couch?"
 *
 * Groups are drawn in order and a later group covers an earlier one, which is
 * what puts the two people in front of the couch.
 */
type Part = {
  w: number; h: number; left: number; top: number;
  /** Defaults to a pill: half the shorter side. */
  radius?: number;
  /** Degrees, about the part's own centre. */
  rot?: number;
};

function Union({ parts, u, stroke = 2, stripe, ground }: {
  parts: readonly Part[];
  /** The glyph's unit, so a part is written in the same 64 grid as the rest. */
  u: number;
  stroke?: number;
  stripe?: Stripe | null;
  ground: string;
}) {
  const box = (p: Part, inset: number) => {
    const r = p.radius ?? Math.min(p.w, p.h) / 2;
    return {
      position: 'absolute' as const,
      left: (p.left + inset) * u,
      top: (p.top + inset) * u,
      width: (p.w - inset * 2) * u,
      height: (p.h - inset * 2) * u,
      borderRadius: Math.max(0, r - inset) * u,
      ...(p.rot ? { transform: [{ rotate: `${p.rot}deg` }] } : null),
    };
  };
  return (
    <>
      {parts.map((p, i) => (
        <LinearGradient
          key={`g${i}`}
          colors={stops(stripe)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={box(p, 0)}
        />
      ))}
      {parts.map((p, i) => (
        <View key={`i${i}`} style={[box(p, stroke), { backgroundColor: ground }]} />
      ))}
    </>
  );
}

type GlyphProps = { size?: number; stripe?: Stripe | null; ground: string };

/**
 * A person with a thought bubble: the things to consider.
 *
 * ── THE THIRD DRAWING ─────────────────────────────────────────────────────
 * First the shoulders ran off the bottom of the box, so the bust was clipped
 * flat. Then the head and shoulders met edge to edge, each outline closing, so
 * it read as a snowman. Both are fixed by drawing the person as one union
 * rather than as two shapes that touch.
 *
 * And the thought is a cloud. Ellie: "Can the thought bubble be a cloud not
 * just an oval." Four overlapping circles and a flat base, unioned, so the
 * internal edges disappear and what is left is a cloud's own outline.
 */
export function ThinkingPerson({ size = 64, stripe, ground }: GlyphProps) {
  const u = size / 64;
  return (
    <View style={{ width: size, height: size }}>
      {/* The thought, drawn first so the person covers it where they meet. */}
      <Union
        u={u} stroke={2} stripe={stripe} ground={ground}
        parts={[
          { w: 15, h: 15, left: 35, top: 6 },
          { w: 20, h: 20, left: 42, top: 1 },
          { w: 15, h: 15, left: 50, top: 7 },
          { w: 24, h: 11, left: 38, top: 12, radius: 5.5 },
        ]}
      />
      {/* The two beads that lead up to it. Separate on purpose: a thought
          bubble's beads are not joined to the cloud. */}
      <Union u={u} stroke={1.5} stripe={stripe} ground={ground}
        parts={[{ w: 5, h: 5, left: 29, top: 29 }]} />
      <Union u={u} stroke={1.5} stripe={stripe} ground={ground}
        parts={[{ w: 8, h: 8, left: 33, top: 21 }]} />
      {/* The person: head and shoulders as one outline. */}
      <Union
        u={u} stroke={2} stripe={stripe} ground={ground}
        parts={[
          { w: 20, h: 20, left: 7, top: 24 },
          { w: 32, h: 24, left: 1, top: 40, radius: 12 },
        ]}
      />
    </View>
  );
}

/**
 * Two people sitting together: the discussions to have.
 *
 * ── TWO WHOLE PEOPLE ──────────────────────────────────────────────────────
 * Ellie: "Any way to make the icon for discussions to have look like two full
 * bodies rather than just a torso on the couch?"
 *
 * Each person is a union of head, torso, thigh and shin, so they come out as
 * one seated silhouette rather than a stack of parts. The couch is its own
 * union and is drawn first, so the two of them sit in front of it: a later
 * group's ground fill covers the earlier group's lines where they overlap,
 * which is what in-front looks like.
 */
export function CouchPair({ size = 64, stripe, ground }: GlyphProps) {
  const u = size / 64;
  /** One seated figure, at an x offset. */
  const person = (x: number): Part[] => ([
    { w: 11, h: 11, left: x + 3, top: 10 },           // head
    { w: 15, h: 17, left: x + 1, top: 19, radius: 6 }, // torso
    { w: 17, h: 8, left: x, top: 33, radius: 4 },      // thigh, forward
    { w: 8, h: 14, left: x + 9, top: 37, radius: 4 },  // shin, down
  ]);
  return (
    <View style={{ width: size, height: size }}>
      {/* The couch: back, seat, two arms, two feet, as one outline. */}
      <Union
        u={u} stroke={2} stripe={stripe} ground={ground}
        parts={[
          { w: 48, h: 18, left: 8, top: 20, radius: 7 },
          { w: 58, h: 12, left: 3, top: 36, radius: 5 },
          { w: 9, h: 18, left: 1, top: 31, radius: 4.5 },
          { w: 9, h: 18, left: 54, top: 31, radius: 4.5 },
          { w: 4, h: 7, left: 8, top: 47, radius: 2 },
          { w: 4, h: 7, left: 52, top: 47, radius: 2 },
        ]}
      />
      <Union u={u} stroke={2} stripe={stripe} ground={ground} parts={person(11)} />
      <Union u={u} stroke={2} stripe={stripe} ground={ground} parts={person(34)} />
    </View>
  );
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

/** A book with a ribbon: the relationship journal. */
export function JournalBook({ size = 64, stripe, ground }: GlyphProps) {
  const u = size / 64;
  return (
    <View style={{ width: size, height: size }}>
      <Outline w={42 * u} h={52 * u} radius={6 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 11 * u, top: 6 * u }} />
      {/* the spine */}
      <Outline w={7 * u} h={52 * u} radius={3 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 11 * u, top: 6 * u }} />
      {/* three written lines */}
      {[20, 29, 38].map((top, i) => (
        <LinearGradient
          key={top}
          colors={stops(stripe)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: 'absolute', left: 24 * u, top: top * u,
            width: (i === 2 ? 14 : 22) * u, height: 2 * u, borderRadius: u,
          }}
        />
      ))}
    </View>
  );
}
