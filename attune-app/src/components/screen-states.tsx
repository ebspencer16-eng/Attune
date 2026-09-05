/**
 * The states every screen has to handle, in one place.
 *
 * Every screen handles five: loading, empty, error, stale and
 * permission-denied. Written once so that rule is cheap to follow, because a
 * rule costing thirty lines per screen gets skipped on the screen where it
 * matters most.
 *
 * These are real screens, not debug output. A person who opens the app and
 * hits an error is having a bad moment with a product about their
 * relationship; a bare sentence and a button reads as broken software even
 * when the software is working exactly as designed.
 */

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { ApiError } from '@/api/client';
import { Colors, MaxContentWidth, Radius, Spacing, Type } from '@/constants/attune-theme';

const c = Colors.light;

function Centre({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flex: 1, alignItems: 'center', justifyContent: 'center',
        padding: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
      }}>
      {children}
    </View>
  );
}

export function ScreenLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <Centre>
      <ActivityIndicator color={c.accentQuiet} />
      <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.lg }}>{label}</Text>
    </Centre>
  );
}

/**
 * Error copy is written per failure kind, not from the raw message.
 *
 * "Something went wrong" tells someone nothing about whether to wait, retry or
 * sign in, and those are the only three things they can do. Each case gets a
 * title, an explanation, and a button that does the thing that case needs.
 */
export function ScreenError({
  error, onRetry, onSignIn,
}: { error: ApiError; onRetry?: () => void; onSignIn?: () => void }) {
  const copy =
    error.kind === 'offline'
      ? { title: 'No connection', body: "You're offline. This will load as soon as you're back.", action: 'Try again' }
    : error.kind === 'unauthorized'
      ? { title: 'Sign in to continue', body: 'Your session has ended. Signing in again picks up exactly where you left off.', action: 'Sign in' }
    : error.kind === 'not_found'
      ? { title: 'Not here', body: "That page has moved or is no longer available.", action: 'Go back' }
      : { title: 'Something went wrong', body: 'This is on our end, not yours. Your answers are saved.', action: 'Try again' };

  const press = error.kind === 'unauthorized' ? onSignIn || onRetry : onRetry;

  return (
    <Centre>
      {/* A quiet mark rather than a warning icon. This is a normal moment in
          the life of an app, not an alarm. */}
      <View
        style={{
          width: 44, height: 44, borderRadius: Radius.pill,
          borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
          alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
        }}>
        <Text style={{ ...Type.title, color: c.accentQuiet, lineHeight: 26 }}>
          {error.kind === 'offline' ? '\u2601' : error.kind === 'unauthorized' ? '\u2022' : '\u203D'}
        </Text>
      </View>

      <Text style={{ ...Type.title, color: c.textStrong, textAlign: 'center' }}>{copy.title}</Text>
      <Text
        style={{
          ...Type.body, color: c.textMuted, textAlign: 'center',
          marginTop: Spacing.sm, maxWidth: 320,
        }}>
        {copy.body}
      </Text>

      {press ? (
        <Pressable
          onPress={press}
          style={{
            marginTop: Spacing.xl, backgroundColor: c.accent, borderRadius: Radius.md,
            paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl,
          }}>
          <Text style={{ ...Type.small, color: c.onDark, fontWeight: '700' }}>{copy.action}</Text>
        </Pressable>
      ) : null}
    </Centre>
  );
}

export function ScreenEmpty({ title, body }: { title: string; body?: string }) {
  return (
    <Centre>
      <Text style={{ ...Type.title, color: c.textStrong, textAlign: 'center' }}>{title}</Text>
      {body ? (
        <Text
          style={{
            ...Type.body, color: c.textMuted, textAlign: 'center',
            marginTop: Spacing.sm, maxWidth: 320,
          }}>
          {body}
        </Text>
      ) : null}
    </Centre>
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
