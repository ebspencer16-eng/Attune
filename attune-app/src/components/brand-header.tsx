/**
 * The lockup at the top of every tab: the mark, then the name.
 *
 * ── WHY EVERY PAGE HAS ONE ────────────────────────────────────────────────
 * Ellie, with the Natural Cycles app beside ours: "I want the top of every page
 * to have a lockup with the mark and Attune Relationships." Theirs carries the
 * product's name on every screen, which is what makes a set of screens read as
 * one product rather than four.
 *
 * Centred, small, and quiet. It is a sign of where you are, not a heading: the
 * page's own title sits under it and stays the largest thing on the screen.
 */

import { Image, Text, View } from 'react-native';

import { Colors, Spacing, Type } from '@/constants/attune-theme';

const c = Colors.light;

/** The product's name, written once. */
export const BRAND_NAME = 'Attune Relationships';

export default function BrandHeader({
  tone = 'ink', right,
}: {
  tone?: 'ink' | 'light';
  /**
   * One control at the end of the row.
   *
   * The home screen's profile button was on a line of its own once the lockup
   * moved out of the scroll view, which is a row holding one small circle. It
   * belongs here, opposite the name.
   */
  right?: React.ReactNode;
}) {
  const color = tone === 'light' ? 'rgba(255,255,255,0.85)' : c.textStrong;
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.sm, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.xl,
      }}>
      {/* Ellie: "I want the mark and text for the lockup to be larger and in
          the font of the website top left 'Attune', not in the body text it
          currently uses." The website sets that in Playfair at 700, which is
          this app's display face: Type.title, one size down. */}
      <Image
        source={require('@/assets/images/attune-mark.png')}
        style={{ width: 34, height: 34 * (64 / 88) }}
        resizeMode="contain"
      />
      <Text style={{ ...Type.title, fontSize: 19, lineHeight: 26, color }}>
        {BRAND_NAME}
      </Text>
      {right ? <View style={{ position: 'absolute', right: Spacing.xl }}>{right}</View> : null}
    </View>
  );
}
