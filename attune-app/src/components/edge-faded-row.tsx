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

import { forwardRef, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions, type ViewProps } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
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
  /**
   * Told how wide the row is, when it is laid out.
   *
   * The results section line centres whichever entry you are on, and centring
   * needs the width of the window as well as the position of the entry. The
   * row is the only thing that knows the first of those.
   */
  onLayout?: ViewProps['onLayout'];
};

const EdgeFadedRow = forwardRef<ScrollView, Props>(function EdgeFadedRow(
  { children, contentContainerStyle, style, ground = c.background, gap = Spacing.md, onLayout }, ref,
) {
  const { width } = useWindowDimensions();
  const fade = Math.min(28, width * 0.08);
  const clear = transparentGround(ground);

  // ── WHY EACH FADE IS CONDITIONAL ──────────────────────────────────────────
  // A fade means there is more that way. Drawn unconditionally it says so at
  // both ends of a row that fits on the screen, and again on the right when
  // the reader is already at the last tile, which is a promise the row cannot
  // keep. Each side is drawn only when something is actually past it.
  const [more, setMore] = useState({ left: false, right: false });
  // The three numbers the answer is made of, each arriving from a different
  // event: the row is laid out, the contents measure, and then it scrolls.
  const seen = useRef({ offset: 0, row: 0, content: 0 });
  const measure = (next: Partial<{ offset: number; row: number; content: number }>) => {
    const now = Object.assign(seen.current, next);
    // A point of slack either side: a scroll that has landed on the end can
    // report a fractional offset, and half a pixel is not more to see. Nothing
    // is faded until the row has been measured, or an unmeasured row claims
    // there is more to its left.
    const measured = now.row > 0 && now.content > 0;
    const left = measured && now.offset > 1;
    const right = measured && now.offset + now.row < now.content - 1;
    setMore((was) => (was.left === left && was.right === right ? was : { left, right }));
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    measure({ offset: contentOffset.x, content: contentSize.width, row: layoutMeasurement.width });
  };

  return (
    <View style={style} onLayout={onLayout}>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        // The row can be laid out before its contents measure, and the
        // contents can change without a scroll, so both are asked as well.
        onLayout={(e) => measure({ row: e.nativeEvent.layout.width })}
        onContentSizeChange={(w) => measure({ content: w })}
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={[
          // paddingRight is deliberately short of the left inset so the last
          // item sits partly under the fade.
          { paddingLeft: Spacing.xl, paddingRight: Spacing.xxxl, gap, alignItems: 'center' },
          contentContainerStyle,
        ]}>
        {children}
      </ScrollView>
      {more.left ? (
        <LinearGradient
          pointerEvents="none"
          colors={[ground, clear]}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: fade }}
        />
      ) : null}
      {more.right ? (
        <LinearGradient
          pointerEvents="none"
          colors={[clear, ground]}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: fade }}
        />
      ) : null}
    </View>
  );
});

export default EdgeFadedRow;
