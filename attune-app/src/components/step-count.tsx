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

import { Text } from 'react-native';

import { Colors, Spacing, Type } from '@/constants/attune-theme';

const c = Colors.light;

export default function StepCount({ step, onDark }: {
  step: { index: number; total: number } | null; onDark?: boolean;
}) {
  return (
    // not markable: a position indicator, not a finding. A mark anchored to
    // "2/3" would follow the number rather than the page.
    /* Ellie: "Detailed page count (1/3) should be in the top right not top
       left. Make sure that's where it lives for all detailed pages across all
       exercises." Right-aligned in its own full-width row, so it sits in the
       tile's corner whatever the title under it does. */
    <Text
      style={{
        /* ── ONE PLACEMENT, EVERY PAGE ────────────────────────────────────
           Ellie: "Make sure the height of the hero and placement of page count
           is consistent across pages and across sections." The count reserves
           the same height whether or not the page under it has a step, so a
           page with one and a page without start their titles on the same
           line. That is what stops the expectations pages sitting lower than
           the rest. */
        minHeight: 18,
        ...Type.eyebrow,
        color: onDark ? 'rgba(255,255,255,0.55)' : c.textMuted,
        textAlign: 'right',
        marginBottom: Spacing.sm,
      }}>
      {step ? `${step.index}/${step.total}` : ' '}
    </Text>
  );
}
