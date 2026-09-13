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

import {
  createProfile, fetchProfileSetupCopy,
  type AboutYou, type ApiError, type ProfileSetupCopy,
} from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import {
  Colors, MaxContentWidth, Palette, Radius, Spacing, Type, inputType,
} from '@/constants/attune-theme';

const c = Colors.light;

export default function ProfileSetup({ onDone }: { onDone: () => void }) {
  const [copy, setCopy] = useState<ProfileSetupCopy | null>(null);
  const [about, setAbout] = useState<AboutYou | null>(null);
  // Answers to the five demographic questions, keyed the way the endpoint
  // wants them. Unanswered means "prefer not to say", which is a real answer
  // and is stored as null rather than pestering anyone for it.
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  // A failed read used to be dropped on the floor. `copy` stayed null, the
  // screen sat on "One moment" for as long as anyone was willing to wait, and
  // there was nothing to tap. This is the first screen of the app for someone
  // who bought on the website and came here to set up, so it is the worst
  // place in the product for a spinner that never ends.
  useEffect(() => {
    let live = true;
    fetchProfileSetupCopy().then((r) => {
      if (!live) return;
      if (r.ok) { setCopy(r.data.copy); setAbout(r.data.aboutYou ?? null); setCopyError(null); }
      else setCopyError(r.error);
    });
    return () => { live = false; };
  }, [attempt]);

  const submit = useCallback(async () => {
    if (!name.trim() || !partnerName.trim() || saving) return;
    setSaving(true);
    setFailed(null);
    const r = await createProfile({
      name: name.trim(),
      partnerName: partnerName.trim(),
      partnerEmail: partnerEmail.trim() || undefined,
      // Only what was actually chosen. An empty value is "prefer not to say"
      // and the column stays null, which is what the website does too.
      ...Object.fromEntries(Object.entries(answers).filter(([, v]) => v)),
    });
    setSaving(false);
    if (r.ok) { onDone(); return; }
    setFailed(
      r.error.kind === 'offline'
        ? 'No connection. Your answers are still here; try again in a moment.'
        : 'That did not save. Try again in a moment.',
    );
  }, [name, partnerName, partnerEmail, answers, saving, onDone]);

  if (copyError) {
    return (
      <ScreenError
        error={copyError}
        onRetry={() => { setCopyError(null); setAttempt((n) => n + 1); }}
      />
    );
  }
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

  /**
   * One question, as a label and a row of chips.
   *
   * A phone has no select. The exercises already ask this shape of question
   * with tappable options, so this reads as the rest of the app rather than as
   * a form. Tapping a chosen chip clears it, which is how someone takes an
   * answer back without a "prefer not to say" chip sitting in every row.
   */
  const question = (key: string, label: string, options: [string, string][]) => (
    <View key={key} style={{ marginTop: Spacing.lg }}>
      <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.xs }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
        {options.filter(([v]) => v).map(([value, optLabel]) => {
          const on = answers[key] === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setAnswers((a) => ({ ...a, [key]: on ? '' : value }))}
              style={{
                paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
                borderRadius: Radius.sm, borderWidth: 1,
                borderColor: on ? c.accent : c.border,
                backgroundColor: on ? c.accent : c.surface,
              }}>
              <Text style={{ ...Type.small, color: on ? Palette.white : c.textMuted }}>{optLabel}</Text>
            </Pressable>
          );
        })}
      </View>
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

      {about ? (
        <View style={{ marginTop: Spacing.xxl }}>
          <Text style={{ ...Type.title, color: c.textStrong }}>{about.title}</Text>
          <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xs, lineHeight: 20 }}>
            {about.why}
          </Text>
          {about.fields.map((f) => question(f.key, f.label, f.options))}
        </View>
      ) : null}

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
