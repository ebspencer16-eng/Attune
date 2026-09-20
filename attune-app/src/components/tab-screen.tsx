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
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import BrandHeader from '@/components/brand-header';
import PageWash from '@/components/page-wash';
import { Colors } from '@/constants/attune-theme';

const c = Colors.light;

export default function TabScreen({
  children, ground = 'cream', tint, second, groundColors, corners,
}: {
  children: React.ReactNode;
  /** 'cream' takes the wash and the ink lockup; 'blue' takes neither. */
  ground?: 'cream' | 'blue';
  /** The wash's colour, when a tab wants its own. */
  tint?: string;
  /** A second colour in the opposite corner, for a page that wants both. */
  second?: string;
  /**
   * ── A SATURATED GROUND, NOT A WASH ──────────────────────────────────
   * Ellie: "The home page is the attune blue, please try making the landing
   * page for insights the attune orange. Similar gradient as the home page
   * has please."
   *
   * A wash is cream with a colour in the corner, which is what the Learn and
   * Notes tabs want and what the Insights landing had. It is not what the home
   * screen is: that is a two-shade gradient of one hue, edge to edge, with
   * everything on it in white. Given a pair here, this paints that instead,
   * takes the light lockup, and the page on it is read on colour.
   *
   * It is a prop rather than a third `ground` value because the colours belong
   * to the tab: OrangeGround for Insights, BlueGround for home, and nothing
   * here has to know which is which.
   */
  groundColors?: readonly [string, string];
  /** Both wash colours from the top corners. See PageWash. */
  corners?: boolean;
}) {
  const painted = !!groundColors;
  const blue = ground === 'blue' || painted;
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: painted ? groundColors[0] : blue ? 'transparent' : c.background }}
      edges={['top']}>
      {painted ? (
        <LinearGradient
          colors={[...groundColors]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      {blue ? null : <PageWash tint={tint} second={second} corners={corners} />}
      <BrandHeader tone={blue ? 'light' : 'ink'} />
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}
