/**
 * A pane that lets the ground through.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie, on the home screen: "instead of the tile being cream, can it be a
 * little ghost bubble with a transluscent feel? White text and icons."
 *
 * The cream tile was an opaque rectangle laid over the one screen whose whole
 * point is the brand colour, so the blue stopped at its top edge and started
 * again below it. A pane you can see the blue through keeps the screen one
 * thing.
 *
 * ── WHAT DRAWS IT ─────────────────────────────────────────────────────────
 * iOS 26's own glass where the phone has it, through expo-glass-effect, which
 * is already a dependency. That is the platform's material: it samples what is
 * behind it and reacts to movement, which is the difference between translucent
 * and "a white rectangle at 12 per cent".
 *
 * Where it is not available the fallback is exactly that white rectangle at 12
 * per cent, with a hairline. It is not the same thing and it is not meant to
 * be; it is the same idea at the fidelity the phone can manage.
 *
 * `isLiquidGlassAvailable` is read once at module load rather than per render.
 * It cannot change while the app is running.
 */

import { View, type ViewStyle } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

import { Radius } from '@/constants/attune-theme';

const GLASS = isLiquidGlassAvailable();

/** What the fallback is made of, in one place so the two stay one idea. */
export const GhostFill = 'rgba(255,255,255,0.13)';
export const GhostEdge = 'rgba(255,255,255,0.22)';
/** The rule between rows inside a ghost pane, and the ink on it. */
export const GhostRule = 'rgba(255,255,255,0.16)';
export const GhostInk = '#FFFFFF';
export const GhostInkQuiet = 'rgba(255,255,255,0.8)';

export default function GhostTile({
  children, style, radius = Radius.xl + 10,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  radius?: number;
}) {
  const shape: ViewStyle = { borderRadius: radius, overflow: 'hidden', ...style };

  if (GLASS) {
    /**
     * `clear` rather than `regular`.
     *
     * Regular glass lightens what is behind it, which on the navy home screen
     * turned the pane paler than its own ground and left white text sitting on
     * near-white. Clear keeps the ground's value and only bends the light, so
     * the blue stays blue and the white on it stays legible. That is also the
     * closer reading of "ghost".
     */
    return (
      <GlassView glassEffectStyle="clear" style={shape}>
        {children}
      </GlassView>
    );
  }

  return (
    <View style={{ ...shape, backgroundColor: GhostFill, borderWidth: 1, borderColor: GhostEdge }}>
      {children}
    </View>
  );
}
