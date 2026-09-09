/**
 * A horizontal strip whose contents fade into the margins.
 *
 * ── WHY THE FADE ──────────────────────────────────────────────────────────
 * A hard edge looks like the row has ended. A fade says there is more
 * sideways. The results nav had neither: it ended flush at the screen edge,
 * mid-word, so "Expec" read as a rendering fault rather than an invitation to
 * swipe.
 *
 * Two things do the work together, and neither is enough alone:
 *
 *   1. The fade itself, which softens the edge.
 *   2. A right padding shorter than the left inset, so the last item is
 *      visibly cut rather than sitting complete against the margin. A row
 *      that ends tidily looks finished no matter how it is shaded.
 *
 * The gradients sit above the scroller and ignore touches, so they never eat
 * a swipe.
 *
 * ── WHY IT IS SHARED ──────────────────────────────────────────────────────
 * It was written for the Resources row and the results nav needed exactly the
 * same thing. Copying it would have made the fade width, the cut and the
 * gradient colour three separate decisions in two files, which is how they
 * end up different.
 */

import { forwardRef } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Spacing } from '@/constants/attune-theme';

const c = Colors.light;

/**
 * The ground colour, and the same colour at zero alpha.
 *
 * Fading to `transparent` is not the same thing: on iOS that interpolates
 * through transparent black and the fade goes visibly grey in the middle.
 * The end stop has to be this exact colour with the alpha taken off.
 */
function transparentGround(hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0)`;
}

type Props = {
  children: React.ReactNode;
  /** Extra content-container style. Padding is set here and should not be overridden. */
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** The ground the row sits on, when it is not the screen background. */
  ground?: string;
  gap?: number;
};

const EdgeFadedRow = forwardRef<ScrollView, Props>(function EdgeFadedRow(
  { children, contentContainerStyle, style, ground = c.background, gap = Spacing.md }, ref,
) {
  const { width } = useWindowDimensions();
  const fade = Math.min(28, width * 0.08);
  const clear = transparentGround(ground);

  return (
    <View style={style}>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={[
          // paddingRight is deliberately short of the left inset so the last
          // item sits partly under the fade.
          { paddingLeft: Spacing.xl, paddingRight: Spacing.xxxl, gap, alignItems: 'center' },
          contentContainerStyle,
        ]}>
        {children}
      </ScrollView>
      <LinearGradient
        pointerEvents="none"
        colors={[ground, clear]}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: fade }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[clear, ground]}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: fade }}
      />
    </View>
  );
});

export default EdgeFadedRow;
