/**
 * Profile setup, in the app.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "Users should be encouraged to set up their account in the app."
 *
 * A signed-in person with no profile row used to be told "Finish setting up
 * on the website and this will fill in", which is a dead end inside an app
 * someone has just downloaded. Every endpoint answers 404 for them, so this is
 * the only screen they can reach.
 *
 * ── WHOSE ACCOUNT ─────────────────────────────────────────────────────────
 * No user id is sent. The request carries the session token and the server
 * takes the id from it, which is stricter than the website's path: that one
 * runs before a session exists, at sign-up, and has to be told who it is for.
 *
 * ── WHERE THE WORDS COME FROM ─────────────────────────────────────────────
 * api/_lib/profile-setup-copy.js, fetched rather than bundled, because this
 * screen exists precisely when nothing else will answer. The only strings
 * written here are the button and the two failure lines.
 */

import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { createProfile, fetchProfileSetupCopy, type ProfileSetupCopy } from '@/api/client';
import { ScreenLoading } from '@/components/screen-states';
import {
  Colors, MaxContentWidth, Palette, Radius, Spacing, Type, inputType,
} from '@/constants/attune-theme';

const c = Colors.light;

export default function ProfileSetup({ onDone }: { onDone: () => void }) {
  const [copy, setCopy] = useState<ProfileSetupCopy | null>(null);
  const [name, setName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    fetchProfileSetupCopy().then((r) => { if (r.ok) setCopy(r.data.copy); });
  }, []);

  const submit = useCallback(async () => {
    if (!name.trim() || !partnerName.trim() || saving) return;
    setSaving(true);
    setFailed(null);
    const r = await createProfile({
      name: name.trim(),
      partnerName: partnerName.trim(),
      partnerEmail: partnerEmail.trim() || undefined,
    });
    setSaving(false);
    if (r.ok) { onDone(); return; }
    setFailed(
      r.error.kind === 'offline'
        ? 'No connection. Your answers are still here; try again in a moment.'
        : 'That did not save. Try again in a moment.',
    );
  }, [name, partnerName, partnerEmail, saving, onDone]);

  if (!copy) return <ScreenLoading label="One moment" />;

  const ready = !!name.trim() && !!partnerName.trim();

  const field = (
    label: string | null, placeholder: string, value: string,
    onChange: (v: string) => void, keyboard?: 'email-address',
  ) => (
    <View style={{ marginTop: Spacing.lg }}>
      {label ? (
        <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.xs }}>{label}</Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        autoCapitalize={keyboard === 'email-address' ? 'none' : 'words'}
        keyboardType={keyboard}
        autoCorrect={false}
        style={{
          ...inputType, color: c.textStrong,
          paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
          backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
          borderRadius: Radius.md,
        }}
      />
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl,
        paddingBottom: Spacing.xxxl, maxWidth: MaxContentWidth,
        width: '100%', alignSelf: 'center',
      }}>
      <Text style={{ ...Type.hero, color: c.textStrong }}>{copy.title}</Text>
      <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm, lineHeight: 24 }}>
        {copy.why}
      </Text>

      {field(copy.yourName, copy.yourNamePlaceholder, name, setName)}
      {field(copy.partnerName, copy.partnerNamePlaceholder, partnerName, setPartnerName)}
      {field(null, copy.partnerEmailPlaceholder, partnerEmail, setPartnerEmail, 'email-address')}

      {failed ? (
        <Text style={{ ...Type.small, color: c.accentQuiet, marginTop: Spacing.lg }}>{failed}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={!ready || saving}
        onPress={submit}
        style={{
          marginTop: Spacing.xxl, paddingVertical: Spacing.lg, borderRadius: Radius.md,
          backgroundColor: ready ? c.accent : c.border, alignItems: 'center',
          opacity: saving ? 0.6 : 1,
        }}>
        <Text style={{ ...Type.small, fontWeight: '700', color: ready ? Palette.white : c.textMuted }}>
          {saving ? 'Saving' : 'Continue'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
