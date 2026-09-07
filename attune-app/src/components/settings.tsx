/**
 * Settings, and the account deletion App Review requires.
 *
 * Guideline 5.1.1(v): an app with account creation must let someone start
 * deleting that account from inside the app. A link to an email address is
 * explicitly not enough, and it is the usual reason this rejection happens.
 *
 * Presented as a full-screen sheet from Home rather than a fifth tab. The tab
 * bar is four places a person goes; settings is somewhere you visit and leave.
 *
 * The screen says what deletion removes and what survives it, in the same words
 * as the privacy policy. Someone deleting an account about their relationship
 * deserves to know that a de-identified copy of their answers is kept, before
 * they press the button rather than after.
 */

import { useState } from 'react';
import {
  ActivityIndicator, Linking, Modal, Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deleteAccount } from '@/api/client';
import { clearToken } from '@/api/session';
import { Colors, MaxContentWidth, Palette, Radius, Spacing, Type } from '@/constants/attune-theme';

const c = Colors.light;
const SITE = 'https://www.attune-relationships.com';

export default function Settings({
  onClose, onSignedOut,
}: { onClose: () => void; onSignedOut: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const armed = typed.trim().toUpperCase() === 'DELETE' && !busy;

  const remove = async () => {
    setBusy(true);
    setError(null);
    const res = await deleteAccount();
    if (!res.ok) {
      setBusy(false);
      setError(
        res.error.kind === 'unauthorized'
          ? 'Your session has ended. Sign in again, then try once more.'
          : res.error.kind === 'offline'
            ? 'You are offline. This needs a connection.'
            : 'That did not go through. Try again, or email hello@attune-relationships.com.',
      );
      return;
    }
    // The account is gone on the server. Drop the token before anything else,
    // or the app keeps making authorised calls with a credential for an account
    // that no longer exists.
    await clearToken();
    setBusy(false);
    setDone(true);
  };

  if (done) {
    return (
      <Sheet onClose={onSignedOut}>
        <Text style={{ ...Type.title, color: c.textStrong }}>Your account is deleted</Text>
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm }}>
          Your name, email, login and answers are gone. If you asked us to keep nothing at all,
          nothing was kept.
        </Text>
        <Pressable
          onPress={onSignedOut}
          style={{
            marginTop: Spacing.xl, backgroundColor: c.textStrong, borderRadius: Radius.md,
            paddingVertical: Spacing.md, alignItems: 'center',
          }}>
          <Text style={{ ...Type.small, color: Palette.white, fontWeight: '700' }}>Done</Text>
        </Pressable>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose} closeLabel="Close">
      <Text style={{ ...Type.hero, color: c.textStrong }}>Settings</Text>

      <View style={{ ...card(), marginTop: Spacing.xl }}>
        <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.sm }}>Privacy</Text>
        <Row label="Privacy policy and terms" onPress={() => Linking.openURL(`${SITE}/legal`)} />
        <Row label="Your privacy choices" onPress={() => Linking.openURL(`${SITE}/privacy-choices`)} last />
      </View>

      {/* ── Delete account ────────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: c.surface, borderColor: '#F0C9C0', borderWidth: 1,
          borderRadius: Radius.lg, padding: Spacing.lg, marginTop: Spacing.md,
        }}>
        <Text style={{ ...Type.eyebrow, color: '#B4463A', marginBottom: Spacing.sm }}>
          Delete account
        </Text>

        {!confirming ? (
          <>
            <Text style={{ ...Type.body, color: c.text }}>This removes:</Text>
            <Bullet>Your name, email and login</Bullet>
            <Bullet>Your answers to every exercise</Bullet>
            <Bullet>Your orders and any workbooks</Bullet>
            <Bullet>Your name from your partner&apos;s session</Bullet>

            <Text style={{ ...Type.body, color: c.text, marginTop: Spacing.md }}>
              Your partner keeps their own answers and their own results.
            </Text>
            <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.md }}>
              Unless you have opted out, we keep a de-identified copy of your answers with no name
              or email attached. Opt out on Your privacy choices first if you want nothing kept.
            </Text>
            <Text style={{ ...Type.body, color: c.textStrong, fontWeight: '700', marginTop: Spacing.md }}>
              This cannot be undone.
            </Text>

            <Pressable
              onPress={() => { setConfirming(true); setTyped(''); setError(null); }}
              style={{
                marginTop: Spacing.lg, borderColor: '#F0C9C0', borderWidth: 1.5,
                borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center',
              }}>
              <Text style={{ ...Type.small, color: '#B4463A', fontWeight: '700' }}>
                Delete my account
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            {/* Typing the word, not a yes/no alert. This erases a person's
                answers about their relationship, and an alert dismissed by
                habit is not a decision. */}
            <Text style={{ ...Type.body, color: c.text }}>
              Type DELETE to confirm.
            </Text>
            <TextInput
              value={typed}
              onChangeText={(t) => { setTyped(t); setError(null); }}
              placeholder="DELETE"
              placeholderTextColor={c.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Type DELETE to confirm"
              style={{
                ...Type.body, color: c.textStrong, borderColor: c.border, borderWidth: 1,
                borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
                marginTop: Spacing.sm,
              }}
            />

            {error ? (
              <Text style={{ ...Type.small, color: '#B4463A', marginTop: Spacing.sm }}>{error}</Text>
            ) : null}

            <Pressable
              onPress={armed ? remove : undefined}
              disabled={!armed}
              style={{
                marginTop: Spacing.lg, borderRadius: Radius.md, paddingVertical: Spacing.md,
                alignItems: 'center',
                backgroundColor: armed ? '#B4463A' : '#D9C9C4',
              }}>
              {busy ? (
                <ActivityIndicator color={Palette.white} />
              ) : (
                <Text style={{ ...Type.small, color: Palette.white, fontWeight: '700' }}>
                  Delete permanently
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => { setConfirming(false); setTyped(''); setError(null); }}
              disabled={busy}
              style={{ marginTop: Spacing.sm, paddingVertical: Spacing.sm, alignItems: 'center' }}>
              <Text style={{ ...Type.small, color: c.textMuted, fontWeight: '600' }}>
                Keep my account
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </Sheet>
  );
}

const card = () => ({
  backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
  borderRadius: Radius.lg, padding: Spacing.lg,
});

function Sheet({
  children, onClose, closeLabel = 'Done',
}: { children: React.ReactNode; onClose: () => void; closeLabel?: string }) {
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg }}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={{ ...Type.body, color: c.textMuted }}>{closeLabel}</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl,
            maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
          }}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs }}>
      <Text style={{ ...Type.body, color: c.textMuted }}>{'•'}</Text>
      <Text style={{ ...Type.body, color: c.text, flex: 1 }}>{children}</Text>
    </View>
  );
}

function Row({ label, onPress, last }: { label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: Spacing.md,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
      <Text style={{ ...Type.body, color: c.text }}>{label}</Text>
      <Text style={{ ...Type.body, color: c.textMuted }}>{'›'}</Text>
    </Pressable>
  );
}
