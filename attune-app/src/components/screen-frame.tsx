/**
 * The frame every full-screen thing inside a tab sits in.
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────
 * Ellie: "in practice titles are still cut off", after the line-box fix that
 * was supposed to end clipped headings. It was not the type: the reader, the
 * budget and the checklist are returned from their tab's own component in
 * place of the tab's contents, and the tab's SafeAreaView was left behind with
 * them. So each one began at the physical top of the screen and its heading
 * sat under the status bar and the notch.
 *
 * That is a different bug wearing the same clothes, which is worth naming: a
 * heading with its top missing looks like clipping whether the type is clipped
 * or the phone is covering it, and the first fix was to the type because that
 * is what the words described.
 *
 * ── AND WHY IT CARRIES THE WAY BACK ───────────────────────────────────────
 * Ellie: "we need a 'back to resources' arrow in the top left when you open an
 * article." Every one of these screens is somewhere you arrive from a tab and
 * have to get out of, so the way out belongs in the frame rather than being
 * remembered separately on each one. The reader had a Done link at the far
 * right of its title row; the budget and the checklist had their own.
 */

import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing, Type } from '@/constants/attune-theme';

const c = Colors.light;

export default function ScreenFrame({
  onBack, backLabel, children,
}: {
  /** What the arrow does. Omitted only by a screen nobody can leave. */
  onBack?: () => void;
  /** Where it goes back to, named. "Back" alone says nothing on a phone. */
  backLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      {onBack ? (
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.xs }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={backLabel ? `Back to ${backLabel}` : 'Back'}
            onPress={onBack}
            hitSlop={12}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}>
            <Text style={{ ...Type.body, color: c.accent, lineHeight: 22 }}>{'‹'}</Text>
            <Text style={{ ...Type.small, fontWeight: '600', color: c.accent }}>
              {backLabel ? `Back to ${backLabel}` : 'Back'}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {children}
    </SafeAreaView>
  );
}
