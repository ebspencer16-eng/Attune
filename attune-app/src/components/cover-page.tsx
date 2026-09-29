import { View, ScrollView } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';

import { Palette, Radius, Spacing } from '@/constants/attune-theme';
import { withAlpha } from '@/components/page-wash';

/**
 * The page that opens something: a results chapter, or an exercise.
 *
 * ── WHY IT IS ITS OWN FILE ────────────────────────────────────────────────
 * Ellie: "Mirror cover pages for exercises and results on both web and app."
 *
 * It was a component inside results.tsx called Cover, drawing the five results
 * chapters, and the exercises opened on a plain centred page with none of it.
 * Building a second one for exercises is the failure this repo is mostly made
 * of, so the frame, the glow and the mark moved here and both callers hand it
 * their own contents.
 *
 * Everything Ellie asked for on the results cover is therefore what an exercise
 * cover gets, without either surface deciding again:
 *
 *   "No gradient line under the title but maybe a gradient line running in a
 *   rounded rectangle around the edge of the page (but still with a buffer so
 *   not at the edge of the screen)."
 *
 *   "Maybe a large icon not in a circle but with a colored glow behind it?"
 *
 *   "can we make the icons a little larger but with thinner lines, and can we
 *   make the glow more subtle, like a tint that disperses gently? Right now it
 *   looks like a circle."
 *
 * ── THE TWO THINGS THAT ARE NOT SHARED ────────────────────────────────────
 * What sits inside, which is a title and a button for a chapter and an eyebrow,
 * a title, prose and a button for an exercise. And the bottom inset: a chapter
 * is read under the tab bar and has to clear it, an exercise is opened over the
 * whole screen and has nothing to clear. Passing that in rather than reading it
 * here is what stops an exercise cover carrying a gap to nothing.
 */

/**
 * A gradient border is not something React Native draws, so it is a gradient
 * rectangle with the page laid on top of it, inset by a point and a half. The
 * inner view has to carry the cream or the gradient shows through everything.
 */
const GLOW_SIZE = 196;
const GLOW_RINGS = 52;
const GLOW_PEAK = 0.34;
/**
 * Solved from the peak so the ring count can change without changing how strong
 * the glow looks. Twenty-two rings at five per cent each left a five per cent
 * step at every edge, and the outermost of those steps was a visible circle
 * against the cream, which is the thing she asked to get rid of.
 */
const GLOW_ALPHA = 1 - (1 - GLOW_PEAK) ** (1 / GLOW_RINGS);

export function CoverPage({
  accent, icon, bottomInset = Spacing.lg, scroll = false, children,
}: {
  accent: string;
  icon?: string | null;
  /** How much room the frame leaves under itself. A tab bar, or nothing. */
  bottomInset?: number;
  /** An exercise's opening prose can be longer than a phone. A chapter's is not. */
  scroll?: boolean;
  children: React.ReactNode;
}) {
  const inner = (
    <>
      <View style={{ width: GLOW_SIZE, height: GLOW_SIZE, alignItems: 'center', justifyContent: 'center' }}>
        {Array.from({ length: GLOW_RINGS }, (_, i) => {
          const size = GLOW_SIZE * (1 - i / GLOW_RINGS);
          return (
            <View
              key={i}
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: withAlpha(accent, GLOW_ALPHA),
              }}
            />
          );
        })}
        {/* `weight` is what thins an SF Symbol's strokes, and it is a different
            control from `size`. Asking for a bigger symbol alone makes the
            lines heavier, which is the opposite of what she asked for. */}
        <SymbolView
          name={(icon || 'sparkles') as never}
          size={78}
          weight="light"
          tintColor={accent}
          fallback={<View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: accent }} />}
          style={{ width: 86, height: 86 }}
        />
      </View>
      {children}
    </>
  );

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: bottomInset,
      }}>
      <LinearGradient
        colors={[Palette.orange, '#9B5DE5', Palette.indigo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, borderRadius: Radius.xl + 8, padding: 1.5 }}>
        {scroll ? (
          <ScrollView
            style={{ flex: 1, borderRadius: Radius.xl + 7, backgroundColor: Palette.cream }}
            contentContainerStyle={{
              flexGrow: 1, alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.xxl,
            }}>
            {inner}
          </ScrollView>
        ) : (
          <View
            style={{
              flex: 1, borderRadius: Radius.xl + 7,
              backgroundColor: Palette.cream,
              alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: Spacing.xxl,
            }}>
            {inner}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}
