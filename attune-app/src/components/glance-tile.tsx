/**
 * The ground a "results at a glance" page sits on.
 *
 * ── WHY IT IS A TILE ──────────────────────────────────────────────────────
 * Ellie: "Results page layout is inconsistent in the page size and shape.
 * Comms results at a glance page bg and contents fit in a rounded-corner tile,
 * whereas internal processing and detailed pages spill the full width of the
 * screen. Can we just make every 'results at a glance' page like that? The
 * others can be the full width of the screen."
 *
 * She asked for my view on whether every page should be a tile. It should not,
 * and the reason is what the tile says rather than how it looks. A tile is a
 * thing you can take in at once: it has edges, and the edges are a claim that
 * what is inside is the whole of something. That is true of an overview and
 * false of a detail page, which is a scroll two or three screens long, where
 * the rounded corner is off-screen for all but the first of them and the inset
 * costs a strip of width on every line of text. So: overviews in tiles, detail
 * pages full width, which is what she asked for.
 *
 * ── WHY IT IS ONE COMPONENT ───────────────────────────────────────────────
 * Five pages take it. Five copies of a corner radius, a padding and a gradient
 * is five chances for four of them to agree and one to drift, which is the
 * failure this codebase keeps having. The shape is defined once, here.
 */

import { ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  BottomTabInset, MaxContentWidth, Palette, Radius, Spacing,
} from '@/constants/attune-theme';

/** Clear of the tab bar, so the last line of a page is not under it. */
export const ResultsBottomInset = BottomTabInset + Spacing.lg;

/**
 * Only for a payload written before the nav carried grounds.
 *
 * The brand ink, twice. Deliberately not any section's gradient: a page in the
 * wrong section's colour is exactly what this arrangement exists to stop, and
 * a flat dark that belongs to nothing is the honest version of not knowing
 * which page this is.
 */
export const NeutralGround = [Palette.ink, Palette.ink] as const;

export default function GlanceTile({
  ground, locations, children,
}: {
  /**
   * The page's gradient, from the server, which is where the website paints
   * its own from. The fallback is only for a cached payload written before the
   * nav carried grounds.
   */
  ground?: readonly string[] | null;
  /** Where each stop sits, 0 to 1. The website's middle stop is at 55%. */
  locations?: readonly number[] | null;
  children: React.ReactNode;
}) {
  const stops = ground?.length ? ground : NeutralGround;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: ResultsBottomInset }}>
      <View
        style={{
          paddingHorizontal: Spacing.xl,
          maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
        }}>
        <LinearGradient
          colors={[...stops] as [string, string, ...string[]]}
          locations={locations?.length === stops.length ? [...locations] as [number, number, ...number[]] : undefined}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: Radius.xl, padding: Spacing.xl }}>
          {children}
        </LinearGradient>
      </View>
    </ScrollView>
  );
}
