/**
 * The couple map: where each of you sits on two axes, together.
 *
 * ── WHY IT LOOKS LIKE THIS ────────────────────────────────────────────────
 * It is the same map as the website's, drawn the same way round. Open is left
 * and Guarded is right; Engage is top and Withdraw is bottom. So the four
 * quadrants read: Initiator top-left, Anchor top-right, Feeler bottom-left,
 * Protector bottom-right.
 *
 * Nothing here decides anything. The two positions arrive from the server as
 * `coords` (0..1 on each axis) and the quadrant names and colours arrive as
 * `mapQuadrants`, because the app never scores and never holds a second copy
 * of a colour table.
 *
 * ── WHY IT IS NOT AN SVG ──────────────────────────────────────────────────
 * The website draws it as one, and the obvious port would be react-native-svg.
 * This is a two by two grid with two dots on it, which plain views do exactly
 * as well, and it is not worth a dependency the app does not otherwise need.
 *
 * ── THE TWO NAME TAGS ─────────────────────────────────────────────────────
 * They are placed above and below by whichever dot is higher, which is what
 * the website does, and for the same reason: when two people sit close
 * together the tags would otherwise land on top of each other. Each name keeps
 * its own colour whichever slot it lands in.
 */

import { Text, View, useWindowDimensions } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/attune-theme';
import type { PersonResults } from '@/api/client';

const c = Colors.light;

type Quadrant = { code: string; name: string; color: string; fill: string };

/**
 * The margin each rotated axis label sits in.
 *
 * Open and Guarded belong at the left and right of this map, which is where
 * the website puts them, and a phone has no room for them lying flat: the
 * right hand one rendered as "GUARDE". Turned on their sides they need about
 * twenty points each and read as the edges of the field rather than as a third
 * row of labels under it.
 */
const SIDE = 22;

/** Fallback used only when an older cached payload carries no quadrants. */
const AXIS = { left: 'Open', right: 'Guarded', top: 'Engage', bottom: 'Withdraw' };

export default function CoupleMap({
  a, b, aName, bName, quadrants, size: fixedSize,
}: {
  a: PersonResults | null;
  b: PersonResults | null;
  aName: string;
  bName: string;
  quadrants?: Quadrant[];
  size?: number;
}) {
  const { width } = useWindowDimensions();
  // Full width inside the page's 24pt gutters, less the two side margins the
  // rotated axis labels sit in, capped so it does not become a huge square on
  // a tablet.
  const size = fixedSize ?? Math.min(320, width - Spacing.xl * 2 - SIDE * 2);
  const qs = quadrants?.length === 4 ? quadrants : null;
  const pa = a?.coords;
  const pb = b?.coords;
  // Without both positions there is no map to draw, and half a map is worse
  // than none: it would read as one person being placed and the other not.
  if (!qs || pa?.open == null || pa?.engage == null || pb?.open == null || pb?.engage == null) {
    return null;
  }

  // The website draws these at r=15 on a 460 viewBox, with a white ring and a
  // soft halo behind. Sized to the same proportion here, which is much larger
  // than the 16pt dot this started with: at that size two people sitting close
  // together were two indistinguishable specks.
  const dot = Math.round(size * 0.13);
  const halo = Math.round(dot * 1.5);
  // open 1 is Open, which is the LEFT of this map, so x is inverted.
  const xOf = (open: number) => (1 - open) * (size - dot) + dot / 2;
  const yOf = (engage: number) => (1 - engage) * (size - dot) + dot / 2;

  const colourOf = (p: PersonResults | null) =>
    qs.find((q) => q.code === p?.typeCode)?.color || c.textStrong;

  const A = { x: xOf(pa.open), y: yOf(pa.engage), color: colourOf(a), name: aName };
  const B = { x: xOf(pb.open), y: yOf(pb.engage), color: colourOf(b), name: bName };

  const label = { ...Type.small, fontSize: 10, letterSpacing: 0.6, fontWeight: '700' as const };

  return (
    <View style={{ alignItems: 'center', marginTop: Spacing.sm }}>
      <Text style={{ ...label, color: c.textMuted, marginBottom: Spacing.xs }}>
        {AXIS.top.toUpperCase()}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <SideLabel text={AXIS.left.toUpperCase()} side="left" height={size} />
      <View style={{ width: size, height: size, borderRadius: Radius.lg, overflow: 'hidden' }}>
        {/* Four quadrants, in the server's order: W X Y Z. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: size, height: size }}>
          {qs.map((q) => (
            <View
              key={q.code}
              style={{ width: size / 2, height: size / 2, backgroundColor: q.fill, padding: Spacing.sm }}>
              <Text style={{ ...label, fontSize: 9, color: q.color }} numberOfLines={1}>
                {q.name}
              </Text>
            </View>
          ))}
        </View>

        {/* The two axis lines, so the quadrants read as one field rather than
            four tiles. */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: size / 2 - 0.5, height: 1, backgroundColor: 'rgba(0,0,0,0.10)' }} />
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: size / 2 - 0.5, width: 1, backgroundColor: 'rgba(0,0,0,0.10)' }} />

        {/* ── THE GLOW ─────────────────────────────────────────────────
            The website draws each dot as a soft radial gradient at 2.4 times
            the dot's radius, then a faint ring at 1.47 times, then the dot.
            The app had the ring and not the glow, so the ring read as a
            circle floating at an odd distance from the dot rather than the
            outer edge of something.

            A native shadow with no offset is a radial glow, which is what a
            radial gradient would have been for. The ring stays, at the
            website's proportion, now that there is something filling the
            space between it and the dot. */}
        {[A, B].map((p) => (
          <View
            key={`halo-${p.name}`}
            pointerEvents="none"
            style={{
              position: 'absolute', left: p.x - halo / 2, top: p.y - halo / 2,
              width: halo, height: halo, borderRadius: halo / 2,
              borderColor: p.color, borderWidth: 1.5, opacity: 0.28,
            }}
          />
        ))}
        {[A, B].map((p) => (
          <View
            key={p.name}
            style={{
              position: 'absolute', left: p.x - dot / 2, top: p.y - dot / 2,
              width: dot, height: dot, borderRadius: dot / 2,
              backgroundColor: p.color, borderColor: '#fff', borderWidth: 3,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: p.color, shadowOpacity: 0.55,
              shadowRadius: dot * 0.5, shadowOffset: { width: 0, height: 0 },
            }}>
            {/* The initial, the same way the reader is identified everywhere
                else in results. Two dots on a map have to say which is which
                without the reader tracing back to a key. */}
            <Text
              style={{
                ...Type.small, color: '#fff', fontWeight: '800',
                fontSize: Math.round(dot * 0.42), lineHeight: Math.round(dot * 0.52),
              }}>
              {(p.name || '?').trim().charAt(0).toUpperCase()}
            </Text>
          </View>
        ))}
      </View>
        <SideLabel text={AXIS.right.toUpperCase()} side="right" height={size} />
      </View>

      {/* Withdraw alone under the map. Open and Guarded are on their sides in
          the margins, so the bottom row is the foot of the vertical axis
          rather than three labels that look like they belong to one axis. */}
      <Text style={{ ...label, color: c.textMuted, marginTop: Spacing.xs }}>
        {AXIS.bottom.toUpperCase()}
      </Text>

      {/* No name key. Each dot carries its own initial and each name sits in
          its own colour on the tiles below, so a key underneath was a third
          place to look up something already answered twice. */}
    </View>
  );
}

/**
 * One axis label, turned on its side in the margin.
 *
 * Left reads bottom to top and right reads top to bottom, which is the
 * convention for a chart's vertical margins and keeps both facing outward.
 */
function SideLabel({ text, side, height }: { text: string; side: 'left' | 'right'; height: number }) {
  return (
    <View style={{ width: SIDE, height, alignItems: 'center', justifyContent: 'center' }}>
      <Text
        numberOfLines={1}
        style={{
          ...Type.small, fontSize: 10, letterSpacing: 0.6, fontWeight: '700',
          color: Colors.light.textMuted,
          width: height,
          textAlign: 'center',
          transform: [{ rotate: side === 'left' ? '-90deg' : '90deg' }],
        }}>
        {text}
      </Text>
    </View>
  );
}
