/**
 * Editing your own profile, in the app.
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────
 * "Finish setting up your profile" was a card on the home screen that opened
 * the website, because Settings could not edit a name or pronouns. Ellie:
 * "Everything should run in the app. Ideally, a user purchases online then
 * downloads the app and only uses the app from that point."
 *
 * ── WHAT IT EDITS ─────────────────────────────────────────────────────────
 * Exactly what api/update-profile.js allows: the two names, the two pronouns,
 * and the five questions from profile setup. The questions come from the
 * server with the values, so this screen and signup ask the same five and
 * cannot drift into asking different ones.
 *
 * A partner's email is not here. Changing it means re-inviting somebody and
 * unlinking a couple, which is not an edit to a profile.
 *
 * ── SAVING ────────────────────────────────────────────────────────────────
 * On the button, not on every keystroke: a save per character is a save that
 * fails halfway through a name. Only what changed is sent, so saving a name
 * cannot blank an answer this screen happens to be showing.
 */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import {
  fetchEditableProfile, updateProfile,
  type AboutYou, type ApiError, type EditableProfile,
} from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import { LOADING } from '@/constants/loading-copy';
import {
  Colors, Palette, Radius, Spacing, Type, inputType,
} from '@/constants/attune-theme';

const c = Colors.light;

const PRONOUNS = ['she/her', 'he/him', 'they/them'];

export default function ProfileEditor({ onSaved }: { onSaved?: () => void }) {
  const [loaded, setLoaded] = useState<EditableProfile | null>(null);
  const [about, setAbout] = useState<AboutYou | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchEditableProfile().then((r) => {
      if (!live) return;
      if (r.ok) { setLoaded(r.data.profile); setAbout(r.data.aboutYou); setError(null); }
      else setError(r.error);
    });
    return () => { live = false; };
  }, [attempt]);

  const value = (key: keyof EditableProfile) =>
    (key in draft ? draft[key] : (loaded?.[key] ?? '')) || '';

  const set = (key: string, v: string) => {
    setDraft((d) => ({ ...d, [key]: v }));
    setSaved(false);
    setFailed(null);
  };

  const save = useCallback(async () => {
    if (saving || !Object.keys(draft).length) return;
    setSaving(true);
    setFailed(null);
    const r = await updateProfile(draft);
    setSaving(false);
    if (!r.ok) {
      setFailed(
        r.error.kind === 'offline'
          ? 'No connection. Nothing was lost; try again in a moment.'
          : 'That did not save. Try again in a moment.',
      );
      return;
    }
    setLoaded((prev) => (prev ? { ...prev, ...draft } as EditableProfile : prev));
    setDraft({});
    setSaved(true);
    onSaved?.();
  }, [draft, saving, onSaved]);

  if (error) {
    return <ScreenError error={error} onRetry={() => { setError(null); setAttempt((n) => n + 1); }} />;
  }
  if (!loaded) return <ScreenLoading label={LOADING.profile} />;

  const field = (key: keyof EditableProfile, label: string, placeholder: string) => (
    <View style={{ marginTop: Spacing.lg }}>
      <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.xs }}>{label}</Text>
      <TextInput
        value={value(key)}
        onChangeText={(t) => set(key, t)}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        autoCapitalize="words"
        autoCorrect={false}
        style={{
          ...inputType(Type.body), color: c.textStrong, borderColor: c.border, borderWidth: 1,
          borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        }}
      />
    </View>
  );

  const chips = (key: string, label: string, options: [string, string][]) => (
    <View key={key} style={{ marginTop: Spacing.lg }}>
      <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.xs }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
        {options.filter(([v]) => v).map(([v, optLabel]) => {
          const on = value(key as keyof EditableProfile) === v;
          return (
            <Pressable
              key={v}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => set(key, on ? '' : v)}
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

  const dirty = Object.keys(draft).length > 0;

  return (
    <View>
      {field('name', 'Your name', 'Your first name')}
      {chips('pronouns', 'Your pronouns', PRONOUNS.map((p) => [p, p] as [string, string]))}
      {field('partnerName', "Partner's name", "Partner's first name")}
      {chips('partnerPronouns', "Partner's pronouns", PRONOUNS.map((p) => [p, p] as [string, string]))}

      {about ? (
        <View style={{ marginTop: Spacing.xl }}>
          <Text style={{ ...Type.title, color: c.textStrong }}>{about.title}</Text>
          <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xs, lineHeight: 20 }}>
            {about.why}
          </Text>
          {about.fields.map((f) => chips(f.key, f.label, f.options))}
        </View>
      ) : null}

      {failed ? (
        <Text style={{ ...Type.small, color: '#B4463A', marginTop: Spacing.lg }}>{failed}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={!dirty || saving}
        onPress={save}
        style={{
          marginTop: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.md,
          alignItems: 'center',
          backgroundColor: dirty && !saving ? c.accent : c.border,
        }}>
        <Text style={{ ...Type.small, fontWeight: '700', color: dirty && !saving ? Palette.white : c.textMuted }}>
          {saving ? 'Saving' : saved && !dirty ? 'Saved' : 'Save changes'}
        </Text>
      </Pressable>
    </View>
  );
}
