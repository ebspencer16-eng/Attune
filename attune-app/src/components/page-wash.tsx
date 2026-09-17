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

export default function PageWash() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <LinearGradient
        colors={[Palette.warm, Palette.cream]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.45 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* The corner. Orange at four per cent over warm cream is a suggestion of
          colour rather than a colour, which is what keeps this a ground. */}
      <LinearGradient
        colors={['rgba(232,103,58,0.10)', 'rgba(232,103,58,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.1, y: 0.35 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 380 }}
      />
    </View>
  );
}
