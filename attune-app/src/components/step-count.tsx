/**
 * Which of its section's pages you are on.
 *
 * ── WHY IT IS ITS OWN FILE ────────────────────────────────────────────────
 * Ellie: "Add 1/3 page count on conflict pages just like other sections."
 * Conflict is the one section whose pages live in their own component file,
 * and this lived in results.tsx, so it was the one section without a count.
 * Copying it across would have been two of them, which is the failure this
 * codebase is organised against; one file is the answer, and both import it.
 */

import { Text, View } from 'react-native';

import { Colors, Type } from '@/constants/attune-theme';

const c = Colors.light;

export default function StepCount({ step, onDark }: {
  step: { index: number; total: number } | null; onDark?: boolean;
}) {
  return (
    // not markable: a position indicator, not a finding. A mark anchored to
    // "2/3" would follow the number rather than the page.
    /* Ellie: "Detailed page count (1/3) should be in the top right not top
       left. Make sure that's where it lives for all detailed pages across all
       exercises."

       ── IT TAKES NO HEIGHT ──────────────────────────────────────────────
       Ellie: "Too much space above the hero on comms detailed pages. Hero
       heading should be top-aligned with the page count text, and should be
       consistent across all insights pages."

       It was a full-width row of its own with a bottom margin, so it pushed
       every hero on every detailed page down by about thirty points, and the
       hero could not be level with it because it was above it.

       A zero-height row instead, with the number laid over the top right
       corner. Every hero now starts at the top of its tile, and because the
       row is always zero whether or not there is a step, they all start at the
       same place, which is the consistency the reserved height was for. */
    <View style={{ height: 0, zIndex: 2 }} pointerEvents="none">
      <Text
        style={{
          position: 'absolute', top: 0, right: 0,
          ...Type.eyebrow,
          color: onDark ? 'rgba(255,255,255,0.55)' : c.textMuted,
          textAlign: 'right',
        }}>
        {step ? `${step.index}/${step.total}` : ' '}
      </Text>
    </View>
  );
}
