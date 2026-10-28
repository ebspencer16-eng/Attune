import { createContext, useContext, useState } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
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
/**
 * ── THE GLOW SIZES WITH THE SCREEN ───────────────────────────────────────
 * Ellie: "Exercise cover pages should fit on one screen/window without having
 * to scroll. Size should adapt based on device and viewing window size."
 *
 * 196 points of glow and 86 of symbol are a fifth of an iPhone SE before a
 * word is drawn, and the Communication cover now carries two preview tiles as
 * well. The website's covers were measured and four of five scrolled; this is
 * the same furniture on the other surface, so it gets the same treatment: a
 * share of the window's height, with a floor that keeps the mark legible and
 * the full size on anything tall.
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

/** The smallest glow that still reads as the mark, and below that, the least. */
const GLOW_MIN = 96;
const GLOW_FLOOR = 56;

/**
 * True when a cover has given up all the room its own furniture can give and
 * still does not fit, so what it holds should tighten its spacing too. Read by
 * ExerciseOpening; a results chapter is a title and a button and never needs it.
 */
const CoverCompact = createContext(false);
export const useCoverCompact = () => useContext(CoverCompact);

export function CoverPage({
  accent, icon, bottomInset = Spacing.lg, scroll = false, children,
}: {
  accent: string;
  icon?: string | null;
  /** How much room the frame leaves under itself. Both callers clear the tab bar. */
  bottomInset?: number;
  /** An exercise's opening prose can be longer than a phone. A chapter's is not. */
  scroll?: boolean;
  children: React.ReactNode;
}) {
  /* The window, not the device: a phone in landscape and an iPad in split
     view are both short, and neither is what a device check would call
     small. */
  const { height: winH } = useWindowDimensions();
  /* Full size on anything tall, which is most phones and every tablet, so the
     cover a reader already knows is unchanged. Below 800 points the glow is
     the only furniture with room to give: measured on a 667 point screen, the
     cover ran 36 points past the fold and the Start button was clipped. */
  const guessGlow = winH >= 800 ? GLOW_SIZE : Math.round(Math.max(GLOW_MIN, winH * 0.19));
  const guessPad: number = winH >= 800 ? Spacing.xxl : winH >= 720 ? Spacing.lg : Spacing.sm;

  /* ── FITTED TO THE FRAME, NOT GUESSED FROM THE WINDOW ─────────────────
     Ellie (A163f): "please build appropriate height based on device type
     user is using." The guess above reads the window, and the window is not
     the room: a 13 mini is 812 points tall, so it got the full glow, and
     after the status bar and the tab bar its frame is about 600. Measured by
     check-app-cover-fits, Communication ran 135 points past the bottom and
     Start was off the screen on four of six iPhones.

     So the frame is measured, and so is everything in it that is not the
     glow or the padding. What is left over is the glow's, up to its full
     size; the padding gives way first, then the glow down to GLOW_MIN, then
     the contents tighten (CoverCompact) and the glow goes to its floor. Past
     that it scrolls, which is the right answer at the largest text sizes.
     The guess is only the first frame, before anything has been measured. */
  const [frameH, setFrameH] = useState(0);
  const [fixed, setFixed] = useState<{ normal: number; compact: number }>({ normal: 0, compact: 0 });
  const [compact, setCompact] = useState(false);
  let glow = guessGlow;
  let padV = guessPad;
  const known = compact ? (fixed.compact || fixed.normal) : fixed.normal;
  if (scroll && frameH && known) {
    const fits = [Spacing.xxl, Spacing.lg, Spacing.sm].find((p) => frameH - known - 2 * p >= GLOW_MIN);
    if (fits !== undefined) {
      padV = fits;
      glow = Math.min(GLOW_SIZE, Math.floor(frameH - known - 2 * fits));
    } else {
      padV = Spacing.sm;
      glow = Math.max(GLOW_FLOOR, Math.min(GLOW_MIN, Math.floor(frameH - known - 2 * Spacing.sm)));
      if (!compact) setCompact(true);
    }
  }
  const symbol = Math.round(glow * 0.44);
  /* The ScrollView stays. On a screen smaller than any phone this app
     supports, or with the largest accessibility text, a cover can still be
     taller than the glass, and a Start button nobody can reach is worse than
     one you scroll two points to. */

  const inner = (
    <>
      <View style={{ width: glow, height: glow, alignItems: 'center', justifyContent: 'center' }}>
        {Array.from({ length: GLOW_RINGS }, (_, i) => {
          const size = glow * (1 - i / GLOW_RINGS);
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
          size={Math.round(symbol * 0.9)}
          weight="light"
          tintColor={accent}
          fallback={<View style={{ width: symbol * 0.65, height: symbol * 0.65, borderRadius: symbol * 0.33, backgroundColor: accent }} />}
          style={{ width: symbol, height: symbol }}
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
            testID="cover-scroll"
            onLayout={(e) => {
              const h = Math.round(e.nativeEvent.layout.height);
              if (Math.abs(h - frameH) > 1) setFrameH(h);
            }}

            style={{ flex: 1, borderRadius: Radius.xl + 7, backgroundColor: Palette.cream }}
            contentContainerStyle={{
              flexGrow: 1, alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: Spacing.xxl, paddingVertical: padV,
            }}>
            <CoverCompact.Provider value={compact}>
              {/* The column at its own height. The scroll content is stretched
                  to the frame by flexGrow, so measuring that would read a short
                  cover as a tall one and shrink the glow for ever. */}
              <View
                style={{ alignSelf: 'stretch', alignItems: 'center' }}
                onLayout={(e) => {
                  /* Everything but the glow, at this render's sizes, filed
                     under the spacing it was measured at. */
                  const rest = Math.round(e.nativeEvent.layout.height - glow);
                  const slot = compact ? 'compact' : 'normal';
                  if (Math.abs(rest - fixed[slot]) > 1) setFixed((f) => ({ ...f, [slot]: rest }));
                }}>
                {inner}
              </View>
            </CoverCompact.Provider>
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
