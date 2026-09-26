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
  createProfile, fetchProfileSetupCopy, joinInvite, lookUpInvite,
  type AboutYou, type ApiError, type ProfileSetupCopy,
} from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import { LOADING } from '@/constants/loading-copy';
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

  /**
   * ── JOINING AN INVITE ───────────────────────────────────────────────────
   * Ellie: "Build the invite step into the app."
   *
   * There was no way to. Someone invited who installed the app first made an
   * account with nothing joining it to their partner's, and had to go to the
   * website to be linked. This is the same two calls the website makes: look
   * the code up, then link after the profile exists.
   *
   * It sits at the top of setup rather than behind a separate screen, because
   * an invitee has exactly one thing to say that a buyer does not, and a
   * screen asking "were you invited?" of everyone is a question most people
   * answer no to.
   *
   * The field takes the whole invite link as well as a bare code. The code is
   * in a URL in an email, and asking someone to find the eight characters
   * inside it is asking them to do a machine's job.
   */
  const [inviteInput, setInviteInput] = useState('');
  const [invite, setInvite] = useState<{ code: string; name: string | null } | null>(null);
  const [inviteState, setInviteState] = useState<'idle' | 'checking' | 'unknown' | 'taken'>('idle');

  const checkInvite = useCallback(async () => {
    const code = inviteCodeFrom(inviteInput);
    if (!code) return;
    setInviteState('checking');
    const r = await lookUpInvite(code);
    if (!r.ok || !r.data.found || !r.data.inviter) { setInviteState('unknown'); setInvite(null); return; }
    if (r.data.inviter.alreadyLinked) { setInviteState('taken'); setInvite(null); return; }
    setInviteState('idle');
    setInvite({ code, name: r.data.inviter.name });
    /* Their partner's name is the one thing this form was about to ask for
       that the server already knows. */
    if (r.data.inviter.name && !partnerName.trim()) setPartnerName(r.data.inviter.name);
  }, [inviteInput, partnerName]);

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
      ...(invite ? { inviteCode: invite.code, joinedViaInvite: true } : {}),
      // Only what was actually chosen. An empty value is "prefer not to say"
      // and the column stays null, which is what the website does too.
      ...Object.fromEntries(Object.entries(answers).filter(([, v]) => v)),
    });
    if (r.ok) {
      /**
       * The link, after the profile exists, because partner-sync checks that
       * the id it is linking has a row.
       *
       * A failure here does not stop setup. The account is real and every
       * exercise works; what is missing is the couple, and the honest thing is
       * to say so on a screen they can act on rather than to refuse an account
       * they have already made. The code is on the profile either way, so it
       * can be linked later without asking for it again.
       */
      if (invite && r.data.userId) {
        const linked = await joinInvite(invite.code, r.data.userId);
        if (!linked.ok) {
          setSaving(false);
          setFailed(LINK_FAILED);
          return;
        }
      }
      setSaving(false);
      onDone();
      return;
    }
    setSaving(false);
    setFailed(
      r.error.kind === 'offline'
        ? 'No connection. Your answers are still here; try again in a moment.'
        : 'That did not save. Try again in a moment.',
    );
  }, [name, partnerName, partnerEmail, answers, saving, onDone, invite]);

  if (copyError) {
    return (
      <ScreenError
        error={copyError}
        onRetry={() => { setCopyError(null); setAttempt((n) => n + 1); }}
      />
    );
  }
  if (!copy) return <ScreenLoading label={LOADING.moment} />;

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

      {/* ── WERE YOU INVITED ────────────────────────────────────────────
          Above the name, because it changes what the rest of the form has to
          ask: a confirmed invite fills in their partner's name.

          Paste the whole link or type the code. Both work, and the first is
          what someone with the email open will actually do. */}
      <View style={{ marginTop: Spacing.xl }}>
        <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.xs }}>{INVITE_LABEL}</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
          <TextInput
            value={inviteInput}
            onChangeText={(v) => { setInviteInput(v); setInviteState('idle'); setInvite(null); }}
            onBlur={checkInvite}
            placeholder={INVITE_PLACEHOLDER}
            placeholderTextColor={c.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={checkInvite}
            style={{
              ...inputType(Type.body), color: c.text, flex: 1,
              backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
              borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={INVITE_CHECK}
            disabled={!inviteCodeFrom(inviteInput) || inviteState === 'checking'}
            onPress={checkInvite}
            style={{
              paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
              borderRadius: Radius.md, backgroundColor: c.surface,
              borderColor: c.border, borderWidth: 1,
              opacity: inviteCodeFrom(inviteInput) ? 1 : 0.5,
            }}>
            <Text style={{ ...Type.small, fontWeight: '700', color: c.textStrong }}>{INVITE_CHECK}</Text>
          </Pressable>
        </View>
        {invite ? (
          <Text style={{ ...Type.small, color: c.accentQuiet, marginTop: Spacing.xs }}>
            {invite.name ? `${INVITE_FOUND} ${invite.name}.` : INVITE_FOUND_NONAME}
          </Text>
        ) : null}
        {inviteState === 'unknown' ? (
          <Text style={{ ...Type.small, color: c.accent, marginTop: Spacing.xs }}>{INVITE_UNKNOWN}</Text>
        ) : null}
        {inviteState === 'taken' ? (
          <Text style={{ ...Type.small, color: c.accent, marginTop: Spacing.xs }}>{INVITE_TAKEN}</Text>
        ) : null}
      </View>

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

/**
 * The invite code out of whatever was pasted.
 *
 * The code travels inside a URL in an email, so the field takes the whole link
 * as well as the eight characters. Asking someone to find those characters
 * inside a URL is asking them to do a machine's job, and they will get it
 * wrong on a phone keyboard.
 *
 * validateInviteCode on the server is the authority on what a code looks like;
 * this only has to find the candidate and hand it over. Anything that is not
 * one comes back empty and the button stays disabled.
 */
export function inviteCodeFrom(input: string): string {
  const raw = (input || '').trim();
  if (!raw) return '';
  const fromUrl = /[?&]invite=([^&\s]+)/i.exec(raw);
  const candidate = (fromUrl ? decodeURIComponent(fromUrl[1]) : raw).trim().toUpperCase();
  return /^[A-Z0-9-]{4,32}$/.test(candidate) ? candidate : '';
}

/**
 * ── THE SIX STRINGS ON THIS STEP ──────────────────────────────────────────
 * Named rather than written inline so they are findable, and flagged in
 * TASKS.md: every word a customer reads is Ellie's, and these are placeholders
 * in her house style until she replaces them.
 */
const INVITE_LABEL = 'Were you invited?';
const INVITE_PLACEHOLDER = 'Paste your invite link, or the code';
const INVITE_CHECK = 'Check';
const INVITE_FOUND = "You are joining";
const INVITE_FOUND_NONAME = 'Invite found.';
const INVITE_UNKNOWN = 'That code does not match an invite. Check it and try again.';
const INVITE_TAKEN = 'That invite has already been used.';
const LINK_FAILED = 'Your account is set up, but joining your partner did not work. Open Settings and try again, or ask them to resend the invite.';
