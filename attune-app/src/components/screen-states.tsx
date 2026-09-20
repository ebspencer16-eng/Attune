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

import { ActivityIndicator, Image, Linking, Pressable, Text, View } from 'react-native';
import type { ApiError } from '@/api/client';
import { Colors, MaxContentWidth, Palette, Radius, Spacing, Type } from '@/constants/attune-theme';

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

export function ScreenLoading({ label = 'Loading', onDark }: { label?: string; onDark?: boolean }) {
  return (
    <Centre>
      {/* ── THE MARK, WHILE IT WAITS ──────────────────────────────────────
          Ellie: "Any other design things we could do to incorporate attune
          branding throughout?"

          A spinner on cream is the same spinner every app has. The mark above
          it, quietly, makes the wait the product's own without adding anything
          anyone has to read. */}
      {/* ── AND IT FOLLOWS THE GROUND ─────────────────────────────────
          Ellie: "Adjust text coloring when you change tile color so that text
          is visible." The Insights tab is the brand orange now rather than
          cream, and this screen is what someone looks at first on it: the
          muted clay spinner and the grey label were both close enough to the
          orange to be almost nothing. Two literal requires, because the
          bundler resolves these at build time and cannot follow a variable. */}
      <Image
        source={onDark
          ? require('@/assets/images/attune-mark-dark.png')
          : require('@/assets/images/attune-mark.png')}
        style={{ width: 44, height: 44 * (onDark ? 76 / 103 : 64 / 88), opacity: onDark ? 0.9 : 0.5, marginBottom: Spacing.xl }}
        resizeMode="contain"
      />
      <ActivityIndicator color={onDark ? Palette.white : c.accentQuiet} />
      <Text style={{ ...Type.small, color: onDark ? 'rgba(255,255,255,0.85)' : c.textMuted, marginTop: Spacing.lg }}>{label}</Text>
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
/**
 * A signed-in person with no profile row. Every endpoint answers 404 for them.
 *
 * Exported so a screen can render profile setup rather than this, which is
 * what the app does now. Ellie: "Users should be encouraged to set up their
 * account in the app."
 */
export function needsProfileSetup(error: ApiError | null): boolean {
  return !!error && error.kind === 'not_found' && /profile/i.test(error.detail || '');
}

export function ScreenError({
  error, onRetry, onSignIn,
}: { error: ApiError; onRetry?: () => void; onSignIn?: () => void }) {
  const copy =
    error.kind === 'offline'
      ? { title: 'No connection', body: "You're offline. This will load as soon as you're back.", action: 'Try again' }
    : error.kind === 'unauthorized'
      ? { title: 'Sign in to continue', body: 'Your session has ended. Signing in again picks up exactly where you left off.', action: 'Sign in' }
    : error.kind === 'not_found' && /profile/i.test(error.detail || '')
      // A signed-in person with no profile row. Every endpoint answers 404 for
      // this, and it used to render as "That page has moved", which describes
      // nothing that happened and offers nothing to do about it.
      // Kept as a fallback. The tabs render ProfileSetup for this case, so it
      // only shows where a screen has not been taught to, and the website is
      // still a real answer there.
      ? { title: 'Your account is not set up yet',
          body: 'Finish setting up on the website and this will fill in.',
          action: 'Open the website' }
    : error.kind === 'not_found'
      ? { title: 'Not here', body: 'That is no longer available.', action: 'Try again' }
      : { title: 'Something went wrong', body: 'This is on our end, not yours. Your answers are saved.', action: 'Try again' };

  // The button said "Go back" and called onRetry. Whatever it says, it should
  // do that thing.
  const needsWebsite = error.kind === 'not_found' && /profile/i.test(error.detail || '');
  const press = needsWebsite
    ? () => Linking.openURL('https://www.attune-relationships.com/app')
    : error.kind === 'unauthorized' ? onSignIn || onRetry : onRetry;

  return (
    <Centre>
      {/* The Attune mark, not an invented glyph. A dot in a circle reads as a
          rendering bug, and this is the moment someone is least sure anything
          is working. */}
      <AttuneMark />

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
      accessibilityRole="button"
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

/**
 * The product mark, used wherever a screen needs to identify itself.
 *
 * Rendered from a PNG rather than SVG so it needs no extra dependency, at 2x
 * and 3x so it stays crisp on every device.
 */
export function AttuneMark({ size = 52 }: { size?: number }) {
  return (
    <Image
      source={require('@/assets/images/attune-mark.png')}
      style={{ width: size, height: size * (64 / 88), marginBottom: Spacing.lg }}
      resizeMode="contain"
    />
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
