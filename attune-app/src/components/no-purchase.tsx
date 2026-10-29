/**
 * What a signed-in account with no purchase sees, on every tab.
 *
 * Ellie (A191): "you cannot sign in or create an account on the app without
 * first purchasing a package." Continue with Google and Continue with Apple
 * make an account for any address, which is how Mya was using the whole app
 * with no order behind it. The server now refuses such an account
 * (api/_lib/purchase-gate.js), and every tab draws this instead of itself.
 *
 * The words come from the server with the refusal, so there is one copy of
 * them. The way out is the website, which is the app's rule everywhere: the
 * app does not sell. And it names the address they are signed in with,
 * because buying under the same address is what opens this account.
 */
import { useState } from 'react';
import * as Linking from 'expo-linking';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Pressable } from '@/components/pressable';
import { signOut } from '@/api/auth';
import { SITE_URL } from '@/api/client';
import type { NoPurchaseCopy } from '@/api/client';
import { Colors, MaxContentWidth, Palette, Radius, Spacing, Type } from '@/constants/attune-theme';

export default function NoPurchase({ copy, email, onRetry, onSignedOut, children = null }: {
  copy: NoPurchaseCopy | null | undefined;
  email?: string | null;
  onRetry: () => void;
  onSignedOut: () => void;
  /** Profile setup puts its invite field here: an invited partner never pays. */
  children?: React.ReactNode;
}) {
  const c = Colors.light;
  const [busy, setBusy] = useState(false);
  if (!copy) return null;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl,
        maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
      }}>
      <Text style={{ ...Type.hero, color: c.textStrong }}>{copy.title}</Text>
      <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.md, lineHeight: 24 }}>{copy.body}</Text>
      {email ? (
        <Text style={{ ...Type.small, color: c.textStrong, marginTop: Spacing.md }}>{email}</Text>
      ) : null}

      <Pressable
        accessibilityRole="link"
        onPress={() => { Linking.openURL(`${SITE_URL}/offerings`).catch(() => {}); }}
        style={{
          marginTop: Spacing.xl, paddingVertical: Spacing.lg, borderRadius: Radius.md,
          backgroundColor: c.accent, alignItems: 'center',
        }}>
        <Text style={{ ...Type.small, fontWeight: '700', color: Palette.white }}>{copy.getStarted}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={{
          marginTop: Spacing.md, paddingVertical: Spacing.lg, borderRadius: Radius.md,
          backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, alignItems: 'center',
        }}>
        <Text style={{ ...Type.small, fontWeight: '700', color: c.textStrong }}>{copy.retry}</Text>
      </Pressable>

      {children ? (
        <View style={{ marginTop: Spacing.xxl }}>
          <Text style={{ ...Type.body, color: c.textMuted, lineHeight: 24 }}>{copy.invited}</Text>
          {children}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={async () => { setBusy(true); await signOut(); setBusy(false); onSignedOut(); }}
        style={{ marginTop: Spacing.xxl, alignItems: 'center', paddingVertical: Spacing.md }}>
        {busy ? <ActivityIndicator color={c.textMuted} /> : (
          <Text style={{ ...Type.small, color: c.textMuted, textDecorationLine: 'underline' }}>{copy.signOut}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
