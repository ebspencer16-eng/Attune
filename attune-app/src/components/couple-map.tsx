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

import { Text, View } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/attune-theme';
import type { PersonResults } from '@/api/client';

const c = Colors.light;

type Quadrant = { code: string; name: string; color: string; fill: string };

/** Fallback used only when an older cached payload carries no quadrants. */
const AXIS = { left: 'Open', right: 'Guarded', top: 'Engage', bottom: 'Withdraw' };

export default function CoupleMap({
  a, b, aName, bName, quadrants, size = 300,
}: {
  a: PersonResults | null;
  b: PersonResults | null;
  aName: string;
  bName: string;
  quadrants?: Quadrant[];
  size?: number;
}) {
  const qs = quadrants?.length === 4 ? quadrants : null;
  const pa = a?.coords;
  const pb = b?.coords;
  // Without both positions there is no map to draw, and half a map is worse
  // than none: it would read as one person being placed and the other not.
  if (!qs || pa?.open == null || pa?.engage == null || pb?.open == null || pb?.engage == null) {
    return null;
  }

  const dot = 16;
  // open 1 is Open, which is the LEFT of this map, so x is inverted.
  const xOf = (open: number) => (1 - open) * (size - dot) + dot / 2;
  const yOf = (engage: number) => (1 - engage) * (size - dot) + dot / 2;

  const colourOf = (p: PersonResults | null) =>
    qs.find((q) => q.code === p?.typeCode)?.color || c.textStrong;

  const A = { x: xOf(pa.open), y: yOf(pa.engage), color: colourOf(a), name: aName };
  const B = { x: xOf(pb.open), y: yOf(pb.engage), color: colourOf(b), name: bName };
  const upper = A.y <= B.y ? A : B;
  const lower = A.y <= B.y ? B : A;

  const label = { ...Type.small, fontSize: 10, letterSpacing: 0.6, fontWeight: '700' as const };

  return (
    <View style={{ alignItems: 'center', marginTop: Spacing.xl }}>
      <Text style={{ ...label, color: c.textMuted, marginBottom: Spacing.xs }}>
        {AXIS.top.toUpperCase()}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ ...label, color: c.textMuted, width: 62, textAlign: 'right', marginRight: Spacing.sm }}>
          {AXIS.left.toUpperCase()}
        </Text>

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

          {[A, B].map((p) => (
            <View
              key={p.name}
              style={{
                position: 'absolute', left: p.x - dot / 2, top: p.y - dot / 2,
                width: dot, height: dot, borderRadius: dot / 2,
                backgroundColor: p.color, borderColor: '#fff', borderWidth: 3,
              }}
            />
          ))}
        </View>

        <Text style={{ ...label, color: c.textMuted, width: 62, marginLeft: Spacing.sm }}>
          {AXIS.right.toUpperCase()}
        </Text>
      </View>

      <Text style={{ ...label, color: c.textMuted, marginTop: Spacing.xs }}>
        {AXIS.bottom.toUpperCase()}
      </Text>

      <View style={{ flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md }}>
        {[upper, lower].map((p) => (
          <View key={p.name} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.color }} />
            <Text style={{ ...Type.small, color: c.text }}>{p.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
