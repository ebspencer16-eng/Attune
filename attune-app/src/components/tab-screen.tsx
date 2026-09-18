/**
 * The frame every tab sits in.
 *
 * ── WHY ONE COMPONENT ─────────────────────────────────────────────────────
 * Ellie: "I want the lockup in the top to be at the exact same position across
 * all screens."
 *
 * It could not be, the way it was: each tab drew its own lockup inside its own
 * scroll view, so it sat wherever that screen's padding put it and slid away as
 * soon as anyone scrolled. Four copies of a thing that is meant to be identical
 * is the failure this codebase is organised against, in pixels rather than in
 * rules.
 *
 * So the lockup is drawn here, once, above the scroll view, and every tab wraps
 * itself in this. It is in the same place on all four screens because it is the
 * same element.
 *
 * ── THE GROUND ────────────────────────────────────────────────────────────
 * Three tabs are cream and take the wash; the home screen paints its own blue
 * and takes neither, which is what `ground` says.
 */

import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BrandHeader from '@/components/brand-header';
import PageWash from '@/components/page-wash';
import { Colors } from '@/constants/attune-theme';

const c = Colors.light;

export default function TabScreen({
  children, ground = 'cream', tint, second,
}: {
  children: React.ReactNode;
  /** 'cream' takes the wash and the ink lockup; 'blue' takes neither. */
  ground?: 'cream' | 'blue';
  /** The wash's colour, when a tab wants its own. */
  tint?: string;
  /** A second colour in the opposite corner, for a page that wants both. */
  second?: string;
}) {
  const blue = ground === 'blue';
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: blue ? 'transparent' : c.background }}
      edges={['top']}>
      {blue ? null : <PageWash tint={tint} second={second} />}
      <BrandHeader tone={blue ? 'light' : 'ink'} />
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}
