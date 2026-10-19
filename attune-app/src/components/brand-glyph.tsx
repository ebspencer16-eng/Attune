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
 * A person with a thought bubble: the things to consider.
 *
 * ── THE SECOND DRAWING ────────────────────────────────────────────────────
 * Ellie, of the first three: "Try the icons again, keep the journal one, but
 * the others don't look great."
 *
 * The first person's shoulders ran off the bottom of the 64 box, so the bust
 * was clipped flat, and the three bubbles were the biggest thing in the
 * drawing. Everything sits inside the box now, the head is the largest round
 * shape, and the thought rises into the corner out of the way of it.
 */
export function ThinkingPerson({ size = 64, stripe, ground }: GlyphProps) {
  const u = size / 64;
  return (
    <View style={{ width: size, height: size }}>
      {/* The shoulders, drawn first so the head sits on top of them.
          They overlap: edge to edge the two read as a snowman, because each
          outline closes and you see two shapes rather than one person. */}
      <Outline w={34 * u} h={24 * u} radius={12 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 2 * u, top: 36 * u }} />
      {/* the head */}
      <Outline w={20 * u} h={20 * u} radius={10 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 9 * u, top: 20 * u }} />
      {/* the thought: two beads and the cloud they lead to */}
      <Outline w={5 * u} h={5 * u} radius={2.5 * u} stroke={1.5 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 31 * u, top: 28 * u }} />
      <Outline w={8 * u} h={8 * u} radius={4 * u} stroke={1.5 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 36 * u, top: 18 * u }} />
      <Outline w={24 * u} h={16 * u} radius={8 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 38 * u, top: 2 * u }} />
    </View>
  );
}

/**
 * Two people sitting together: the discussions to have.
 *
 * Painting order is the whole icon. Every shape is an outline with a
 * ground-coloured middle, so whatever is drawn later covers what is under it.
 * The first version drew the couch last and below the figures, which read as
 * two people standing behind a counter. The back goes down first, the two of
 * them on top of it, and the seat over their laps, which is what sitting
 * looks like.
 */
export function CouchPair({ size = 64, stripe, ground }: GlyphProps) {
  const u = size / 64;
  return (
    <View style={{ width: size, height: size }}>
      {/* the couch back, behind both of them */}
      <Outline w={50 * u} h={18 * u} radius={8 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 7 * u, top: 24 * u }} />
      {/* Two sets of shoulders, wider than they are tall. Round ones read as
          two more heads, which is what made the first version four circles in
          a tub rather than two people on a couch. */}
      <Outline w={20 * u} h={13 * u} radius={6 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 11 * u, top: 23 * u }} />
      <Outline w={20 * u} h={13 * u} radius={6 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 33 * u, top: 23 * u }} />
      {/* two heads, overlapping the shoulders they sit on */}
      <Outline w={12 * u} h={12 * u} radius={6 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 15 * u, top: 13 * u }} />
      <Outline w={12 * u} h={12 * u} radius={6 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 37 * u, top: 13 * u }} />
      {/* the seat, over both laps, and an arm at each end */}
      <Outline w={56 * u} h={13 * u} radius={5 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 4 * u, top: 38 * u }} />
      <Outline w={9 * u} h={17 * u} radius={4.5 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 1 * u, top: 34 * u }} />
      <Outline w={9 * u} h={17 * u} radius={4.5 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 54 * u, top: 34 * u }} />
      {/* two feet, which is what stops it reading as a bath */}
      <Outline w={4 * u} h={7 * u} radius={2 * u} stroke={1.5 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 9 * u, top: 50 * u }} />
      <Outline w={4 * u} h={7 * u} radius={2 * u} stroke={1.5 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 51 * u, top: 50 * u }} />
    </View>
  );
}

/** A conversation bubble with a heart in it: the phrases to try. */
export function HeartBubble({ size = 64, stripe, ground }: GlyphProps) {
  const u = size / 64;
  return (
    <View style={{ width: size, height: size }}>
      <Outline w={54 * u} h={38 * u} radius={15 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 5 * u, top: 4 * u }} />
      {/* the tail, a small square turned on its corner under the bubble */}
      <Outline w={13 * u} h={13 * u} radius={3 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 15 * u, top: 34 * u, transform: [{ rotate: '45deg' }] }} />
      <View style={{
        /* Up to 30, not 33: the tail's top corner reaches y 31.3 and the
           cover started below it, so a stub of the tail was showing inside
           the bubble as a small dash under the heart. */
        position: 'absolute', left: 14 * u, top: 30 * u, width: 18 * u, height: 10 * u,
        backgroundColor: ground,
      }} />
      {/**
        * The heart, filled rather than outlined.
        *
        * Drawn as an outline it came out as a small v: three stroked shapes
        * overlapping leave their cut-outs on top of each other, and what
        * survives is the bottom corner. A heart is small enough on this icon
        * that the line weight was most of it anyway, so it is solid gradient:
        * two lobes and a square turned on its corner, in the same stripe the
        * bubble is drawn in. Bigger than the first one, which was lost inside
        * a bubble twice its size.
        *
        * The three are placed by the construction rather than by eye: a
        * square of side S turned on its corner, and a circle of diameter S
        * centred on the midpoint of each of its two upper edges, which after
        * the turn are at (±0.354S, -0.354S) from the centre. Placed by eye it
        * came out with a lobe standing proud of the square on one side and a
        * notch on the other, which is what a heart drawn freehand in boxes
        * always does.
        *
        * S is 15 and the centre is (32, 23), a little above the middle of the
        * bubble so the point does not sit on the tail.
        */}
      <LinearGradient
        colors={stops(stripe)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute', left: 19.2 * u, top: 10.2 * u,
          width: 15 * u, height: 15 * u, borderRadius: 7.5 * u,
        }}
      />
      <LinearGradient
        colors={stops(stripe)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute', left: 29.8 * u, top: 10.2 * u,
          width: 15 * u, height: 15 * u, borderRadius: 7.5 * u,
        }}
      />
      <LinearGradient
        colors={stops(stripe)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute', left: 24.5 * u, top: 15.5 * u,
          width: 15 * u, height: 15 * u, borderRadius: 1 * u,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
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
