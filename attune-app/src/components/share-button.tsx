/**
 * Send something to someone, through the phone's own sheet.
 *
 * ── WHY IT IS A COMPONENT ─────────────────────────────────────────────────
 * Ellie: "I want the share button to pull up apple's list like other platforms
 * do." That sheet is the system's, and every place we offer it should offer the
 * same thing: a line of text and the address it came from. Three screens want
 * one now, so the control is written once rather than three times with three
 * slightly different messages.
 */

import { Pressable, Share, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Colors, Radius, Spacing, Type } from '@/constants/attune-theme';

const c = Colors.light;

export default function ShareButton({
  message, title, label, tone = 'ink', accessibilityLabel,
}: {
  /** What lands in the message. The address goes on the end. */
  message: string;
  /** The sheet's own title, where the platform shows one. */
  title?: string;
  /** Shown beside the icon. Omitted for a bare icon. */
  label?: string;
  tone?: 'ink' | 'light';
  accessibilityLabel?: string;
}) {
  const tint = tone === 'light' ? 'rgba(255,255,255,0.9)' : c.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || 'Share'}
      hitSlop={12}
      onPress={() => {
        Share.share({ title, message }).catch(() => {
          /* dismissed, which is not a failure */
        });
      }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
        alignSelf: 'flex-start',
        ...(label ? {
          borderRadius: Radius.pill, borderWidth: 1, borderColor: tone === 'light' ? 'rgba(255,255,255,0.35)' : c.border,
          paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md,
        } : null),
      }}>
      <SymbolView
        name={'square.and.arrow.up' as never}
        size={15}
        tintColor={tint}
        fallback={<Text style={{ ...Type.small, color: tint }}>{'\u21E7'}</Text>}
        style={{ width: 17, height: 19 }}
      />
      {label ? (
        <Text style={{ ...Type.small, fontWeight: '700', color: tint }}>{label}</Text>
      ) : null}
    </Pressable>
  );
}
