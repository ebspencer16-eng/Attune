/**
 * The shape every results page sits in.
 *
 * ── WHAT CHANGED, AND WHY IT IS ONE COMPONENT NOW ─────────────────────────
 * Ellie, first: "Comms results at a glance page bg and contents fit in a
 * rounded-corner tile, whereas internal processing and detailed pages spill
 * the full width of the screen. Can we just make every 'results at a glance'
 * page like that? The others can be the full width of the screen."
 *
 * Ellie, now: "I decided I do want every insights page in a tile like the at a
 * glance pages are. I know that's a lift to tighten the detailed pages, but I
 * think it will be important for consistency."
 *
 * So the argument that used to live here, that a tile claims to be the whole
 * of something and a detail page is not, is overruled and rightly: it was an
 * argument about what a tile means and she is making one about what the
 * product looks like, which is hers. Consistency wins.
 *
 * The important half is that it is ONE shape, in one file. Thirty section
 * bodies each writing their own radius, inset and padding is thirty chances
 * for twenty-nine to agree and one to drift, which is the failure this
 * codebase keeps having.
 *
 * ── TWO TONES, ONE SHAPE ──────────────────────────────────────────────────
 * A page either has a gradient from the server or it does not.
 *
 *   ground   the five at-a-glance pages, the Communication domains, the
 *            expectations conversations. White type on a dark gradient, the
 *            same stops the website paints, from api/_lib/section-grounds.js.
 *
 *   surface  everything else, which is most of the detail pages, and which is
 *            cream on the website too. Ink on white.
 *
 * The tone is not a choice a caller makes: it follows from whether a ground
 * was passed. A page cannot end up light with white text on it.
 *
 * ── THE COHESION IS BEHIND THE TILE, NOT IN IT ────────────────────────────
 * Ellie: "What can we do to create some visual cohesion for each section?
 * Maybe a bg tint in the gradient?"
 *
 * The tint is the wash the tab paints behind this, tinted by the section's own
 * colour. It costs nothing in legibility, because nothing is read on it, and
 * it means the pages of a section share a light without any of them having to
 * change the colour their words are set in. See the `tint` the Insights tab
 * hands its TabScreen.
 */

import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ResultsScroll } from '@/components/results-scroll';
import {
  BottomTabInset, Colors, MaxContentWidth, Palette, Radius, Spacing,
} from '@/constants/attune-theme';

const c = Colors.light;

/**
 * Clear of the tab bar, so the last line of a page is not under it.
 *
 * The back and forward arrows float over the page rather than sitting under
 * it, so they do not add their own clearance; this is what keeps the last line
 * clear of both them and the tab bar.
 */
export const ResultsBottomInset = BottomTabInset + Spacing.xxl;

/**
 * Only for a payload written before the nav carried grounds.
 *
 * The brand ink, twice. Deliberately not any section's gradient: a page in the
 * wrong section's colour is exactly what this arrangement exists to stop, and
 * a flat dark that belongs to nothing is the honest version of not knowing
 * which page this is.
 */
export const NeutralGround = [Palette.ink, Palette.ink] as const;

export default function PageTile({
  ground, locations, children, padding = Spacing.xl,
}: {
  /**
   * The page's gradient, from the server, which is where the website paints
   * its own from. Absent means the page is a light one, which is most of them.
   */
  ground?: readonly string[] | null;
  /** Where each stop sits, 0 to 1. The website's middle stop is at 55%. */
  locations?: readonly number[] | null;
  /** A page whose contents draw their own edge-to-edge rows can turn it off. */
  padding?: number;
  children: React.ReactNode;
}) {
  const dark = !!ground?.length;

  return (
    <ResultsScroll style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: ResultsBottomInset }}>
      <View
        style={{
          paddingHorizontal: Spacing.lg,
          maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
        }}>
        {dark ? (
          <LinearGradient
            colors={[...(ground as readonly string[])] as [string, string, ...string[]]}
            locations={
              locations?.length === ground!.length
                ? [...locations] as [number, number, ...number[]]
                : undefined
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: Radius.xl, padding }}>
            {children}
          </LinearGradient>
        ) : (
          /* A hairline rather than a shadow, for the reason the theme gives:
             this product is read side by side about a relationship, and heavy
             elevation makes a page feel like an interface to operate. */
          <View
            style={{
              borderRadius: Radius.xl, padding,
              backgroundColor: c.surface,
              borderWidth: 1, borderColor: c.border,
              /* A page that fills the tile edge to edge, like the landing
                 menu's bands, has to be cut to the corner radius. */
              overflow: 'hidden',
            }}>
            {children}
          </View>
        )}
      </View>
    </ResultsScroll>
  );
}
