/**
 * Sign in.
 *
 * Email and password against Supabase. Deliberately plain: this screen exists
 * to be got through, not admired, and a person arriving here is usually
 * mid-task and mildly annoyed.
 *
 * autoComplete and textContentType are set on both fields because that is what
 * makes iOS offer a saved password and the strong-password suggestion. The web
 * app shipped for months without them and password managers could not fill it;
 * the app should not repeat that.
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isAuthConfigured, signIn } from '@/api/auth';
import { AttuneMark } from '@/components/screen-states';
import { Colors, MaxContentWidth, Radius, Spacing, Type, inputType } from '@/constants/attune-theme';

const c = Colors.light;

export default function SignIn({ onSignedIn, rejectedReason }: { onSignedIn: () => void; rejectedReason?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 3 && password.length > 0 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const res = await signIn(email, password);
    setBusy(false);
    if (res.ok) {
      // Reload whichever tab this was rendered in, then go to Home.
      //
      // Every tab renders this screen, so signing in from Notes used to leave
      // you looking at Notes. Signing in is the start of a session and Home is
      // where a session starts: it carries the one thing the priority engine
      // says matters next.
      onSignedIn();
      router.replace('/');
    } else {
      setError(res.message);
    }
  };

  const field = {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    // No lineHeight: it clips a focused input on iOS. See inputType.
    ...inputType(Type.body),
    color: c.text,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1, justifyContent: 'center', padding: Spacing.xl,
            maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
          }}>
          <View style={{ alignItems: 'center' }}>
            <AttuneMark />
          </View>

          <Text style={{ ...Type.title, color: c.textStrong, textAlign: 'center' }}>
            Sign in to Attune
          </Text>
          <Text
            style={{
              ...Type.small, color: c.textMuted, textAlign: 'center',
              marginTop: Spacing.sm, marginBottom: Spacing.xl,
            }}>
            Use the email you bought with.
          </Text>

          <TextInput
            style={field}
            value={email}
            onChangeText={(t) => { setEmail(t); setError(null); }}
            placeholder="Email"
            placeholderTextColor={c.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
          />

          <View style={{ height: Spacing.md }} />

          <TextInput
            style={field}
            value={password}
            onChangeText={(t) => { setPassword(t); setError(null); }}
            placeholder="Password"
            placeholderTextColor={c.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          {error ? (
            <Text style={{ ...Type.small, color: '#C2410C', marginTop: Spacing.md }}>{error}</Text>
          ) : null}

          {/* Signed in, but the next request was still refused. Naming the
              server's reason turns "it sent me back to sign-in" into something
              diagnosable without another round trip. */}
          {rejectedReason && rejectedReason !== 'no token stored' ? (
            <Text style={{ ...Type.small, color: '#C2410C', marginTop: Spacing.md }}>
              Signed in, but Attune refused the session: {rejectedReason}
            </Text>
          ) : null}

          {!isAuthConfigured() ? (
            <Text style={{ ...Type.small, color: '#C2410C', marginTop: Spacing.md }}>
              This build has no Supabase config. Check attune-app/.env, then restart
              with: npx expo start --ios --clear
            </Text>
          ) : (
            <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.md }}>
              Connected to Attune.
            </Text>
          )}

          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            style={{
              marginTop: Spacing.xl,
              backgroundColor: canSubmit ? c.accent : c.border,
              borderRadius: Radius.md,
              paddingVertical: Spacing.md + 2,
              alignItems: 'center',
            }}>
            {busy
              ? <ActivityIndicator color={c.onDark} />
              : <Text style={{ ...Type.cardTitle, color: canSubmit ? c.onDark : c.textMuted }}>Sign in</Text>}
          </Pressable>

          {/* No account creation here. Buying happens on the web, so an app
              sign-up form would be a dead end, and Apple treats an app that
              orchestrates external purchase as a storefront. */}
          <Text
            style={{
              ...Type.small, color: c.textMuted, textAlign: 'center', marginTop: Spacing.xl,
            }}>
            New to Attune? Get started at attune-relationships.com
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
