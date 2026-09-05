/**
 * The states every screen has to handle, in one place.
 *
 * The rule from the architecture notes is that every screen handles five
 * states: loading, empty, error, stale and permission-denied. Written once
 * here so that rule is cheap to follow, because a rule that costs thirty lines
 * per screen gets skipped on the screen where it matters.
 */

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { ApiError } from '@/api/client';
import { Colors, Radius, Spacing, Type } from '@/constants/attune-theme';

const c = Colors.light;

export function ScreenLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={{ padding: Spacing.xxl, alignItems: 'center' }}>
      <ActivityIndicator color={c.accentQuiet} />
      <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.md }}>{label}</Text>
    </View>
  );
}

/**
 * Error copy is written per failure kind rather than showing the raw message.
 *
 * "Something went wrong" tells someone nothing about whether to wait, retry,
 * or sign in again, and those are the only three things they can do.
 */
export function ScreenError({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const message =
    error.kind === 'offline' ? "You're offline. This will load when you're back."
    : error.kind === 'unauthorized' ? 'Please sign in again.'
    : error.kind === 'not_found' ? "That isn't here anymore."
    : 'Something went wrong on our end. Your answers are safe.';

  return (
    <View style={{ padding: Spacing.xl }}>
      <Text style={{ ...Type.body, color: c.text }}>{message}</Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={{
            marginTop: Spacing.lg, alignSelf: 'flex-start',
            backgroundColor: c.accent, borderRadius: Radius.sm,
            paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.lg,
          }}>
          <Text style={{ ...Type.small, color: c.onDark, fontWeight: '700' }}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

export function ScreenEmpty({ title, body }: { title: string; body?: string }) {
  return (
    <View style={{ padding: Spacing.xl }}>
      <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{title}</Text>
      {body ? (
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm }}>{body}</Text>
      ) : null}
    </View>
  );
}

/** Section label. Uppercase and tracked, matching the web. */
export function Eyebrow({ children, color }: { children: string; color?: string }) {
  return (
    <Text style={{ ...Type.eyebrow, color: color || c.accentQuiet, marginBottom: Spacing.sm }}>
      {children}
    </Text>
  );
}
