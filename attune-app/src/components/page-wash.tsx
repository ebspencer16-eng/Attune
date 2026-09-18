/**
 * The ground under a cream page.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "How can we add some interest to the learn page and notes page? I
 * don't want plain cream pages."
 *
 * The answer is not more things on the page. It is that the page itself was one
 * flat colour from the status bar to the tab bar, so everything on it read as
 * floating on nothing. This is a wash: the warm end of the palette at the top
 * where the lockup is, fading to the cream the app already uses, with a breath
 * of the brand orange in the corner at a few per cent.
 *
 * Absolutely positioned and not hit-testable, so it changes nothing about how
 * the page behaves. It is one component rather than two copies because the
 * Notes tab wanted the same thing, and two washes that drift apart would be
 * worse than none.
 */

import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Palette } from '@/constants/attune-theme';

/** #RRGGBB to rgba, so a tint can be given an opacity without a second constant. */
function withAlpha(hex: string, alpha: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export default function PageWash({ tint, second }: {
  /**
   * The colour in the corner. The brand orange by default.
   *
   * Ellie: "Exercise screens should have a hue gradient like the learn and
   * notes, but the hue gradient should be the exercise color." So an exercise
   * passes its own, which it already has: one colour per exercise, from
   * AccentFor, the same one its progress bar and its arrows use.
   */
  tint?: string;
  /**
   * A second colour, in the opposite corner.
   *
   * Ellie, of the Notes tab: "Give notes screen a colored bg. Something
   * branded." The brand's own gradient is the orange and the indigo, which is
   * what the website's rules and the storycards' top edge are made of. At a
   * tenth each over cream it is a coloured page rather than a coloured block,
   * and the notes on it stay black on near-white.
   */
  second?: string;
} = {}) {
  const hue = tint || Palette.orange;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <LinearGradient
        colors={[Palette.warm, Palette.cream]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.45 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* The corner. A tenth of a colour over warm cream is a suggestion of
          colour rather than a colour, which is what keeps this a ground. */}
      {/* ── NO EDGES ───────────────────────────────────────────────────
          Ellie: "Insights bg feels segmented." Part of that was this: the tint
          was drawn into a box 380 points tall, so wherever it happened to still
          carry colour at its last row, the box's own bottom edge showed as a
          line across the page. It covers the whole screen now and fades to
          nothing a fifth of the way down, which leaves nothing to draw an edge
          with. */}
      <LinearGradient
        colors={[withAlpha(hue, 0.1), withAlpha(hue, 0)]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.1, y: 0.22 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {second ? (
        /* The other corner, coming up from the bottom left, so the page reads
           as one gradient rather than two stains. */
        <LinearGradient
          colors={[withAlpha(second, 0), withAlpha(second, 0.12)]}
          start={{ x: 0.9, y: 0.45 }}
          end={{ x: 0, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
    </View>
  );
}
