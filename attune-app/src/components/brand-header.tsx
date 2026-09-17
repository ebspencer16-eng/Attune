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

export default function BrandHeader({ tone = 'ink' }: { tone?: 'ink' | 'light' }) {
  const color = tone === 'light' ? 'rgba(255,255,255,0.85)' : c.textStrong;
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.sm, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
      }}>
      <Image
        source={require('@/assets/images/attune-mark.png')}
        style={{ width: 22, height: 22 * (64 / 88) }}
        resizeMode="contain"
      />
      <Text style={{ ...Type.small, fontWeight: '700', letterSpacing: 0.2, color }}>
        {BRAND_NAME}
      </Text>
    </View>
  );
}
