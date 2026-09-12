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

import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Linking, Modal, Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deleteAccount, fetchHome } from '@/api/client';
import type { HomeResponse } from '@/api/client';
import { clearToken } from '@/api/session';
import { Colors, MaxContentWidth, Palette, Radius, Spacing, Type, inputType } from '@/constants/attune-theme';
import { WAITING_SETTINGS } from '@/constants/waiting';

const c = Colors.light;
const SITE = 'https://www.attune-relationships.com';

/**
 * What the server says about each exercise.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * "Rel Relf - still no data on these pages." "Physical Intimacy is still
 * missing from the top nav. Am I viewing an old version of the simulator?"
 *
 * Both of those are one question: what does the server think we own, and what
 * does it think we have finished. The answer decides what the app draws, and
 * until now there was no way to see it. So a missing section could be an app
 * bug, a stale bundle, an ownership problem, or a partner who has not finished,
 * and telling them apart meant me reading code and guessing.
 *
 * Physical Intimacy turned out to be ownership: the website was granting it
 * from a localStorage key and the app was asking the server, so the two
 * disagreed and the app was right. That took a long time to establish and this
 * panel would have answered it immediately.
 *
 * It reads /api/home, which every screen already calls, and shows exactly what
 * that says. No interpretation: if this panel and a screen disagree, the screen
 * is wrong, and that is worth being able to see.
 */
function ExerciseStatus() {
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchHome();
      if (cancelled) return;
      if (res.ok) setHome(res.data); else setFailed(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const exercises = Object.values(home?.exercises ?? {})
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <View style={{ ...card(), marginTop: Spacing.lg }}>
      <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.sm }}>
        What the server sees
      </Text>

      {failed ? (
        <Text style={{ ...Type.small, color: c.textMuted }}>
          Could not reach the server just now.
        </Text>
      ) : !home ? (
        <ActivityIndicator color={c.accentQuiet} />
      ) : (
        <View>
          {exercises.map((ex) => (
            <View
              key={ex.key}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                paddingVertical: Spacing.xs,
              }}>
              <Text style={{ ...Type.small, color: c.text, flex: 1 }} numberOfLines={1}>
                {ex.label}
              </Text>
              {/* Owned first, because nothing else matters if the answer is no.
                  Then each person, because "waiting on my partner" and "waiting
                  on me" are different problems with different fixes. */}
              <Text style={{ ...Type.small, fontSize: 11, color: ex.owned ? c.text : c.textMuted }}>
                {ex.owned
                  ? `${ex.mine ? 'you' : '—'} / ${ex.theirs ? 'partner' : '—'}`
                  : 'not owned'}
              </Text>
            </View>
          ))}
          <Text style={{ ...Type.small, fontSize: 11, color: c.textMuted, marginTop: Spacing.sm }}>
            {home.resultsReady
              ? 'Results are open.'
              : WAITING_SETTINGS}
          </Text>
        </View>
      )}
    </View>
  );
}

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
      accessibilityRole="button"
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

      <ExerciseStatus />

      {/* ── Delete account ──────────────────────────────────────────────────
          Quiet, and last on the screen. The first version was a bordered card
          of warning text directly under the other settings, which put an
          irreversible action where a routine one belongs. What deletion removes
          is on /legal; a wall of text beside the button is something to scroll
          past, not informed consent. */}
      <View style={{ marginTop: Spacing.xxxl, paddingTop: Spacing.lg, borderTopWidth: 1, borderTopColor: c.border, alignItems: 'center' }}>
        {!confirming ? (
          <Pressable
      accessibilityRole="button"
            onPress={() => { setConfirming(true); setTyped(''); setError(null); }}
            hitSlop={8}
            style={{ paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md }}>
            <Text style={{ ...Type.small, color: c.textMuted, textDecorationLine: 'underline' }}>
              Delete account
            </Text>
          </Pressable>
        ) : (
          <View style={{ width: '100%' }}>
            <Text style={{ ...Type.small, color: c.text, lineHeight: 20 }}>
              This permanently deletes your account and your answers. It cannot be undone.{' '}
              <Text
                style={{ color: c.accentQuiet, textDecorationLine: 'underline' }}
                onPress={() => Linking.openURL(`${SITE}/legal#privacy`)}>
                What is deleted
              </Text>
              .
            </Text>
            <Text style={{ ...Type.small, color: c.text, marginTop: Spacing.sm }}>
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
                ...inputType(Type.body), color: c.textStrong, borderColor: c.border, borderWidth: 1,
                borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
                marginTop: Spacing.sm,
              }}
            />

            {error ? (
              <Text style={{ ...Type.small, color: '#B4463A', marginTop: Spacing.sm }}>{error}</Text>
            ) : null}

            <Pressable
      accessibilityRole="button"
              onPress={armed ? remove : undefined}
              disabled={!armed}
              style={{
                marginTop: Spacing.md, borderRadius: Radius.md, paddingVertical: Spacing.md,
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
      accessibilityRole="button"
              onPress={() => { setConfirming(false); setTyped(''); setError(null); }}
              disabled={busy}
              style={{ marginTop: Spacing.sm, paddingVertical: Spacing.sm, alignItems: 'center' }}>
              <Text style={{ ...Type.small, color: c.textMuted, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          </View>
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
          <Pressable
      accessibilityRole="button" onPress={onClose} hitSlop={10}>
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
      accessibilityRole="button"
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
