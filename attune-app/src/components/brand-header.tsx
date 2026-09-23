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
  tone = 'ink', right, lockup = true, markOutline = true,
}: {
  tone?: 'ink' | 'light';
  /**
   * Whether the dark mark's left bubble carries its white outline.
   *
   * Ellie asked for that outline on the Insights landing, where the bubble's
   * own orange end dissolves into the orange ground, and asked for it off on
   * Learn, where the blue already gives the fill an edge. Which ground wants
   * it is a judgement about a colour rather than a rule that can be derived,
   * so it is set where the ground is set and nowhere else.
   *
   * Only meaningful when `tone` is 'light': the cream mark has no outline to
   * turn off.
   */
  markOutline?: boolean;
  /**
   * ── ONE MARK PER SCREEN ───────────────────────────────────────────────
   * The home screen now opens on the lockup at headline size, because Ellie
   * asked for it where the reference she sent has its own name: "Instead of
   * luxury, have that be a large lockup with logo and attune relationships."
   *
   * Two lockups on one screen is the same thing said twice, so home draws the
   * row for its profile control alone and the lockup as the page's first
   * line. Every other screen is unchanged, which is what keeps it in the same
   * place everywhere it is furniture.
   */
  lockup?: boolean;
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
  if (!lockup) {
    /* The row still exists, and at the same height, so the page under it
       starts where every other page starts. */
    return (
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
          minHeight: 34,
          paddingTop: Spacing.sm, paddingBottom: Spacing.md,
          paddingHorizontal: Spacing.xl,
        }}>
        {right}
      </View>
    );
  }
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
      {/* ── TWO MARKS, ONE LOCKUP ───────────────────────────────────────
          Ellie: "Mark in lockup on home page should be inverse, so the bubble
          on the right should have a white bg not ghost", and "Mark in lockup
          on other pages should be ghost bg not white bg, so the heart in the
          left bubble should be transparent not white."

          Both are the same observation from two sides. The mark is drawn for a
          white page: a filled left bubble with a white heart, and an outlined
          right bubble with a white fill behind its heart. On the navy the
          right bubble's white fill is a solid box where a ghost should be; on
          cream the left bubble's white heart is the one pure white thing on
          the screen.

          Two files, both generated from public/favicon.svg by
          scripts/build-mark-variants.mjs, so neither can drift into a
          different logo. Two literal requires rather than one built path,
          because the bundler resolves these at build time and cannot follow a
          variable. */}
      <Image
        source={tone === 'light'
          ? (markOutline
            ? require('@/assets/images/attune-mark-dark.png')
            : require('@/assets/images/attune-mark-dark-plain.png'))
          : require('@/assets/images/attune-mark-light.png')}
        /* 103 by 76 is the mark's own viewBox in public/favicon.svg, so the
           box this draws into is the artwork's shape and `contain` has nothing
           to letterbox. It was 64 over 88, which was the old PNG's aspect, and
           the generated files are not that shape: the mark was drawn at two
           thirds of its height inside a box built for a wider picture. Ellie:
           "Mark in the lockup shrunk, please revert to the larger size." */
        style={{ width: 34, height: 34 * (76 / 103) }}
        resizeMode="contain"
      />
      <Text style={{ ...Type.title, fontSize: 19, lineHeight: 26, color }}>
        {BRAND_NAME}
      </Text>
      {right ? <View style={{ position: 'absolute', right: Spacing.xl }}>{right}</View> : null}
    </View>
  );
}
