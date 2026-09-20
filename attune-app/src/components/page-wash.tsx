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

/** #RRGGBB to rgba, so a tint can be given an opacity without a second constant. */
export function withAlpha(hex: string, alpha: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** What the two corners fall away to. Neutral, not the app's warm cream. */
const CORNER_SETTLE = '#EFEFEF';

export default function PageWash({ tint, second, corners = false }: {
  /**
   * The colour in the corner. The brand orange by default.
   *
   * Ellie: "Exercise screens should have a hue gradient like the learn and
   * notes, but the hue gradient should be the exercise color." So an exercise
   * passes its own, which it already has: one colour per exercise, from
   * AccentFor, the same one its progress bar and its arrows use.
   */
  tint?: string;
  /**
   * A second colour, in the opposite corner.
   *
   * Ellie, of the Notes tab: "Give notes screen a colored bg. Something
   * branded." The brand's own gradient is the orange and the indigo, which is
   * what the website's rules and the storycards' top edge are made of. At a
   * tenth each over cream it is a coloured page rather than a coloured block,
   * and the notes on it stay black on near-white.
   */
  second?: string;
  /**
   * ── BOTH COLOURS FROM THE TOP ─────────────────────────────────────────
   * Ellie, of the Notes tab: "Can the gradient bg on the notes page have the
   * same format as the one on the exploring minds screenshot? With both colors
   * coming from the top corners of the screen?"
   *
   * The default wash puts one colour in the top right and the other coming up
   * from the bottom left, so the page is tinted at two opposite ends. The
   * reference does something different: both colours start at the top, one in
   * each corner, meet across the top edge and fall away to near-white by a
   * third of the way down. The page below that is quiet, which is what makes
   * the top read as a sky rather than as two stains.
   */
  corners?: boolean;
} = {}) {
  const hue = tint || Palette.orange;
  if (corners) {
    return (
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* The ground the two corners sit on. Warm at the very top so the
            colours have something to sit in, and the app's cream below. */}
        {/* Ellie: "Orange and blue should be brighter in the top corners, I
            want it to feel brighter and more crisp like the screenshot image."
            The corners are stronger, and the ground under them is white rather
            than warm cream, because a warm ground is what was taking the edge
            off them: a bright hue over a cream is a muted hue. */}
        {/* ── AND IT SETTLES TO GREY ─────────────────────────────────
            The reference's two corners fall away to a flat neutral grey about
            a third of the way down, and that grey is the rest of the page. It
            settled to the app's warm cream here, so the lower two thirds was a
            different colour from the picture: the corners were right and the
            page under them was not. */}
        <LinearGradient
          colors={[Palette.white, CORNER_SETTLE]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.38 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* Top left, falling to the right and down. */}
        <LinearGradient
          colors={[withAlpha(hue, 0.62), withAlpha(hue, 0.18), withAlpha(hue, 0)]}
          locations={[0, 0.3, 0.62]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.85, y: 0.55 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* Top right, falling to the left and down. The two meet across the
            top edge rather than at a seam, because each fades to nothing
            before it reaches the other's corner. */}
        {second ? (
          <LinearGradient
            colors={[withAlpha(second, 0.58), withAlpha(second, 0.16), withAlpha(second, 0)]}
            locations={[0, 0.3, 0.62]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.15, y: 0.55 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        ) : null}
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <LinearGradient
        colors={[Palette.warm, Palette.cream]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.45 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* The corner. A tenth of a colour over warm cream is a suggestion of
          colour rather than a colour, which is what keeps this a ground. */}
      {/* ── NO EDGES ───────────────────────────────────────────────────
          Ellie: "Insights bg feels segmented." Part of that was this: the tint
          was drawn into a box 380 points tall, so wherever it happened to still
          carry colour at its last row, the box's own bottom edge showed as a
          line across the page. It covers the whole screen now and fades to
          nothing a fifth of the way down, which leaves nothing to draw an edge
          with. */}
      {/* ── STRONG ENOUGH TO BE A SECTION'S COLOUR ────────────────────────
          Ellie, of the cover pages: "that exercise's color as a tinted
          gradient on cream, then that same bg persists through the exercise's
          section behind the tiles."

          At a tenth it was a suggestion of colour, which was right when the
          wash was decoration. It is doing a job now: it is the thing that says
          Expectations is blue on all seven of its pages, and a suggestion
          cannot say that. Two stops rather than one, so it still fades to
          nothing rather than ending on an edge. */}
      <LinearGradient
        colors={[withAlpha(hue, 0.26), withAlpha(hue, 0.08), withAlpha(hue, 0)]}
        locations={[0, 0.45, 1]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.1, y: 0.45 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {second ? (
        /* The other corner, coming up from the bottom left, so the page reads
           as one gradient rather than two stains. */
        <LinearGradient
          /* Raised with the top corner, for the same reason: this is a
             section's colour now, not decoration. */
          colors={[withAlpha(second, 0), withAlpha(second, 0.2)]}
          start={{ x: 0.9, y: 0.45 }}
          end={{ x: 0, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
    </View>
  );
}
