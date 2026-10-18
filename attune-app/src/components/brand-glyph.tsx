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

/** A person with a thought bubble: the things to consider. */
export function ThinkingPerson({ size = 64, stripe, ground }: GlyphProps) {
  const u = size / 64;
  return (
    <View style={{ width: size, height: size }}>
      {/* the head */}
      <Outline w={18 * u} h={18 * u} radius={9 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 6 * u, top: 26 * u }} />
      {/* the shoulders */}
      <Outline w={34 * u} h={22 * u} radius={16 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: -2 * u, top: 46 * u }} />
      {/* the thought, three bubbles rising to the right */}
      <Outline w={6 * u} h={6 * u} radius={3 * u} stroke={1.5 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 24 * u, top: 24 * u }} />
      <Outline w={9 * u} h={9 * u} radius={4.5 * u} stroke={1.5 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 30 * u, top: 14 * u }} />
      <Outline w={24 * u} h={18 * u} radius={9 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 38 * u, top: 2 * u }} />
    </View>
  );
}

/** Two people sitting together: the discussions to have. */
export function CouchPair({ size = 64, stripe, ground }: GlyphProps) {
  const u = size / 64;
  return (
    <View style={{ width: size, height: size }}>
      {/**
        * Painting order is the whole icon.
        *
        * Every shape here is an outline with a ground-coloured middle, so
        * whatever is drawn later covers what is under it. The first version
        * drew the couch last and below the figures, which read as two people
        * standing behind a counter. The back goes down first, the two of them
        * on top of it, and the seat over their feet, which is what sitting
        * looks like.
        */}
      {/* the couch back, behind both of them */}
      <Outline w={54 * u} h={26 * u} radius={10 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 5 * u, top: 22 * u }} />
      {/* two heads */}
      <Outline w={13 * u} h={13 * u} radius={6.5 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 14 * u, top: 10 * u }} />
      <Outline w={13 * u} h={13 * u} radius={6.5 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 37 * u, top: 10 * u }} />
      {/* two bodies, leaning together */}
      <Outline w={20 * u} h={18 * u} radius={9 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 10 * u, top: 24 * u }} />
      <Outline w={20 * u} h={18 * u} radius={9 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 34 * u, top: 24 * u }} />
      {/* the seat, over the foot of both bodies, and an arm at each end */}
      <Outline w={56 * u} h={13 * u} radius={5 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 4 * u, top: 40 * u }} />
      <Outline w={9 * u} h={16 * u} radius={4.5 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 2 * u, top: 34 * u }} />
      <Outline w={9 * u} h={16 * u} radius={4.5 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 53 * u, top: 34 * u }} />
    </View>
  );
}

/** A conversation bubble with a heart in it: the phrases to try. */
export function HeartBubble({ size = 64, stripe, ground }: GlyphProps) {
  const u = size / 64;
  return (
    <View style={{ width: size, height: size }}>
      <Outline w={56 * u} h={40 * u} radius={14 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 4 * u, top: 6 * u }} />
      {/* the tail, a small square turned on its corner under the bubble */}
      <Outline w={14 * u} h={14 * u} radius={3 * u} stroke={2 * u} stripe={stripe} ground={ground}
        style={{ position: 'absolute', left: 16 * u, top: 38 * u, transform: [{ rotate: '45deg' }] }} />
      <View style={{
        position: 'absolute', left: 14 * u, top: 36 * u, width: 20 * u, height: 8 * u,
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
        * bubble is drawn in.
        */}
      <LinearGradient
        colors={stops(stripe)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute', left: 18 * u, top: 15 * u,
          width: 13 * u, height: 13 * u, borderRadius: 6.5 * u,
        }}
      />
      <LinearGradient
        colors={stops(stripe)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute', left: 27 * u, top: 15 * u,
          width: 13 * u, height: 13 * u, borderRadius: 6.5 * u,
        }}
      />
      <LinearGradient
        colors={stops(stripe)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute', left: 21.5 * u, top: 17 * u,
          width: 16 * u, height: 16 * u, borderRadius: 2 * u,
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
