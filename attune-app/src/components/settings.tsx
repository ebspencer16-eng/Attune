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
import Constants from 'expo-constants';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import * as Updates from 'expo-updates';
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { SAVE_FAILED } from '@/constants/save-copy';
import { Pressable } from '@/components/pressable';
import { openExternal } from '@/api/open-external';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deleteAccount, fetchHome, invitePartner, setDailyPush, SITE_URL } from '@/api/client';
import { signOut } from '@/api/auth';
import Admin from '@/components/admin';
import type { HomeResponse } from '@/api/client';
import { clearToken } from '@/api/session';
import { pushState, registerForPush, turnPushOff, type PushState } from '@/api/push';
import { Colors, MaxContentWidth, Palette, Radius, Spacing, Type, inputType } from '@/constants/attune-theme';
import ProfileEditor from '@/components/profile-editor';
import PartnerInvite from '@/components/partner-invite';
import { WAITING_SETTINGS } from '@/constants/waiting';

const c = Colors.light;
const SITE = SITE_URL;

/**
 * The way into the admin, for the two people who have one.
 *
 * ── WHY IT ASKS THE SERVER ────────────────────────────────────────────────
 * Ellie: "Can you adjust carolina's and my app view so that we can access admin
 * page through our portal?"
 *
 * Whether to draw this is the server's answer, from ADMIN_EMAILS, because a
 * list of who can reach the admin does not belong in an app anyone can
 * download. It is not a permission either: the admin asks for its own password
 * exactly as it does in a browser, so the worst this can do is show a door.
 *
 * It fetches for itself rather than taking a prop, which is how ExerciseStatus
 * below it works: Settings has no payload of its own and threading one through
 * for a row that nine people in ten never see would be the wrong shape.
 */
function AdminRow() {
  const [show, setShow] = useState(false);
  /**
   * The admin's own pages, from /api/home.
   *
   * Ellie, having used it: "the app doesn't need the nav menu. After typing your
   * 4 digit code, it should take you straight to the dashboard overview and we
   * can use the hamburger nav from there."
   *
   * So this is one row and a code. The list of pages it used to carry is gone,
   * along with the payload field that fed it: the admin's nav is on the admin.
   */
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchHome();
      if (cancelled || !res.ok) return;
      setShow(!!res.data.admin);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!show) return null;
  if (open) {
    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: c.background }}>
          <ScrollView>
            <Admin onClose={() => setOpen(false)} />
          </ScrollView>
        </View>
      </Modal>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open the admin"
      /* The code, and then the admin itself, full screen. The browser's Done
         comes back here. */
      onPress={() => setOpen(true)}
      style={{
        marginTop: Spacing.xxl, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', gap: Spacing.md,
        backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
        borderRadius: Radius.lg, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg,
      }}>
      <View style={{ flex: 1 }}>
        <Text style={{ ...Type.cardTitle, color: c.textStrong }}>Admin</Text>
        <Text style={{ ...Type.small, color: c.textMuted, marginTop: 2 }}>
          Orders, posts, engagement. Asks for your code.
        </Text>
      </View>
      <Text style={{ color: c.accent, fontSize: 16 }}>{'\u203A'}</Text>
    </Pressable>
  );
}

/**
 * Notifications, on or off.
 *
 * ── WHY A ROW AND NOT A SWITCH PER KIND ───────────────────────────────────
 * Six kinds can arrive and none of them is routine: a partner finishing, a
 * note shared, results opening, a workbook finishing, an unfinished exercise,
 * a new article. A screen of six switches invites a reader to reason about
 * which they want, and the honest answer for a product that sends at most four
 * a month is that it is one decision. If Ellie wants it split later, the
 * kinds are already named in api/_lib/notifications.js.
 *
 * ── THE THREE STATES ARE NOT TWO ──────────────────────────────────────────
 * Not asked, said yes, said no. iOS will not let the app ask twice, so a "no"
 * cannot be undone from here: the only way back is the Settings app, and this
 * row says so rather than offering a switch that would do nothing. That
 * sentence is the one piece of copy on this screen that needed writing, and it
 * is listed in TASKS.md for Ellie to correct.
 *
 * In a build with no notifications module in it, the row is not drawn at all.
 * Showing a control that cannot work is worse than showing nothing.
 */
/**
 * ── THREE STRINGS THAT NEED ELLIE'S EYE ───────────────────────────────────
 * Placeholders in her house style, listed in TASKS.md with the rest of this
 * screen's copy. The two labels name the things themselves, which are already
 * hers: "Insight of the day" and "Word of the day" come from api/_insights.js
 * and api/_words.js and are the words on the tiles.
 */
const DAILY_HEADING = 'Once a day';
const DAILY_INSIGHT_LABEL = 'Insight of the day';
const DAILY_WORD_LABEL = 'Word of the day';

function NotificationsRow() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { pushState().then(setState); }, []);
  if (!state || state === 'unavailable') return null;

  const label = state === 'granted' ? 'On' : state === 'denied' ? 'Off' : 'Not set up';
  const act = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (state === 'granted') {
        if (await turnPushOff()) setState('denied');
        else Alert.alert('Not saved', SAVE_FAILED);
        return;
      }
      if (state === 'not_asked') { setState(await registerForPush({ ask: true })); return; }
      /* Said no already. iOS owns that answer; the app can only point at it. */
      await Linking.openSettings().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={act}
        style={{
          paddingVertical: Spacing.md,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
        <Text style={{ ...Type.body, color: c.text }}>
          {state === 'granted' ? 'Turn notifications off' : state === 'denied'
            ? 'Turn them on in your phone settings' : 'Turn notifications on'}
        </Text>
        <Text style={{ ...Type.body, color: c.textMuted }}>{busy ? '' : label}</Text>
      </Pressable>
    </View>
  );
}

/**
 * ── THE TWO DAILY ONES ────────────────────────────────────────────────────
 * Ellie: "Notifications settings should offer a once-a-day notification that
 * sends you the insight of the day at a time you select (default should be
 * 7:30am), same for word of the day."
 *
 * ── WHY A LIST OF HALF HOURS AND NOT A CLOCK ──────────────────────────────
 * A native time picker is a native module, and a native module is an App Store
 * build rather than an over-the-air update: Ellie would have to build and
 * submit before anybody could set a time.
 *
 * It is also the honest control. The server sends these from a cron that runs
 * every thirty minutes, so a picker offering 7:37 would be offering something
 * the product cannot deliver and the reader would never know which way it had
 * rounded. The list is what can actually happen.
 *
 * ── WHAT IT DOES NOT DO ───────────────────────────────────────────────────
 * It does not turn notifications on. That is the row above, which owns the
 * system prompt; a time set with permission refused sends nothing, which is
 * why this is drawn under it rather than beside it.
 */

/** Every half hour of the day, which is the resolution the cron can send at. */
const DAILY_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 ? '30' : '00';
  return `${String(h).padStart(2, '0')}:${m}`;
});

/** 'HH:MM' as a reader reads it. The list is long and has to scan quickly. */
function clockLabel(at: string) {
  const [h, m] = at.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

function DailyRow({ label, kind, at, onPick }: {
  label: string;
  kind: 'insight' | 'word';
  at: string | null;
  onPick: (kind: 'insight' | 'word', at: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${at ? clockLabel(at) : 'off'}`}
        onPress={() => setOpen(true)}
        style={{
          paddingVertical: Spacing.md,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
        <Text style={{ ...Type.body, color: c.text }}>{label}</Text>
        <Text style={{ ...Type.body, color: at ? c.accent : c.textMuted }}>
          {at ? clockLabel(at) : 'Off'}
        </Text>
      </Pressable>

      {open ? (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
          <View style={{ flex: 1, backgroundColor: c.background }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.md,
            }}>
              <Text style={{ ...Type.title, color: c.textStrong, flex: 1 }}>{label}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={() => setOpen(false)}>
                <Text style={{ ...Type.title, color: c.textMuted }}>{'\u2715'}</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl }}>
              {/* Off first, because it is the state everybody starts in and
                  the one somebody opening this sheet twice is looking for. */}
              {[null, ...DAILY_SLOTS].map((slot) => {
                const on = slot === at;
                return (
                  <Pressable
                    key={slot ?? 'off'}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => { onPick(kind, slot); setOpen(false); }}
                    style={{
                      paddingVertical: Spacing.md,
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                    <Text style={{ ...Type.body, color: on ? c.accent : c.text, fontWeight: on ? '700' : '400' }}>
                      {slot ? clockLabel(slot) : 'Off'}
                    </Text>
                    {on ? <Text style={{ ...Type.body, color: c.accent }}>{'\u2713'}</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

function DailyPushRows() {
  const [state, setState] = useState<HomeResponse['dailyPush'] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchHome();
      if (!cancelled && res.ok) setState(res.data.dailyPush ?? null);
    })();
    return () => { cancelled = true; };
  }, []);

  /* Nothing to draw until the payload answers, and nothing at all until
     migration 083 has run: a control that cannot save is worse than none. */
  if (!state || state.available === false) return null;

  const pick = (kind: 'insight' | 'word', at: string | null) => {
    /* The row moves at once and the write follows it. A list of 49 options is
       a sheet somebody closes expecting it to have taken. */
    const before = state[kind];
    setState((prev) => (prev ? { ...prev, [kind]: at } : prev));
    /* And back again if the server did not take it, which the row used to
       hide: it showed the new time while the old one went on arriving, or
       showed off while notifications kept coming (A202). */
    setDailyPush(kind, at).then((r) => {
      if (r.ok) return;
      setState((prev) => (prev && prev[kind] === at ? { ...prev, [kind]: before } : prev));
      Alert.alert('Not saved', SAVE_FAILED);
    });
  };

  return (
    <View style={{ marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: c.border, paddingTop: Spacing.md }}>
      <Text style={{ ...Type.small, fontWeight: '700', color: c.textMuted }}>{DAILY_HEADING}</Text>
      <DailyRow label={DAILY_INSIGHT_LABEL} kind="insight" at={state.insight} onPick={pick} />
      <DailyRow label={DAILY_WORD_LABEL} kind="word" at={state.word} onPick={pick} />
    </View>
  );
}

export default function Settings({
  onClose, onSignedOut, invite = false,
}: { onClose: () => void; onSignedOut: () => void; invite?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  // Empty for a Google or Apple account, which has no password. The server
  // asks for one only when the account has a password identity, so sending
  // nothing is the right thing there rather than an error here.
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [acct, setAcct] = useState<HomeResponse['account'] | null>(null);
  const [editing, setEditing] = useState(false);
  const [resent, setResent] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const load = () => {
    fetchHome().then((res) => { if (res.ok) setAcct(res.data.account ?? null); });
  };
  useEffect(load, []);
  const resend = async () => {
    if (!acct?.partnerEmail || resent === 'sending') return;
    setResent('sending');
    const r = await invitePartner(acct.partnerEmail, acct.partnerName || undefined);
    setResent(r.ok ? 'sent' : 'failed');
  };

  const armed = typed.trim().toUpperCase() === 'DELETE' && !busy;

  const remove = async () => {
    setBusy(true);
    setError(null);
    const res = await deleteAccount(password || undefined);
    if (!res.ok) {
      setBusy(false);
      setError(
        (res.error.kind === 'server' && res.error.status === 403)
          ? 'That password is not right.'
        : (res.error.kind === 'server' && res.error.status === 400)
          ? 'Enter your password to confirm.'
        : res.error.kind === 'unauthorized'
          ? 'Your session has ended. Sign in again, then try once more.'
          : res.error.kind === 'offline'
            ? 'You are offline. Deleting your account needs a connection.'
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
      {/* ── THE WEBSITE'S ACCOUNT PAGE, IN THE SAME ORDER (A231) ──────────
          Ellie: "make sure the settings page on app matches the account page
          on the web... and just add a notifications tile above the session
          tile." Personal info, the invitation while it is pending, the
          package, notifications, the session, then delete. The panel of
          what the server sees went with it, and the privacy links are quiet
          lines at the foot: App Review wants them reachable, not a tile. */}
      <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>Account</Text>
      <Text style={{ ...Type.hero, color: c.textStrong, marginTop: Spacing.xs }}>
        {`${acct?.name || 'Your'} & ${acct?.partnerName || 'Partner'}`}
      </Text>

      {/* The invitation, when the home card "Invite your partner" opened
          this (A206). Above the profile, because it is what they came for. */}
      {invite ? (
        <View style={{ ...card(), marginTop: Spacing.xl }}>
          <PartnerInvite />
        </View>
      ) : null}

      <View style={{ ...card(), marginTop: Spacing.xl }}>
        <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.sm }}>Personal info</Text>
        {editing ? (
          <ProfileEditor />
        ) : (
          <>
            <InfoRow label="Your name" value={acct?.name} />
            <InfoRow label="Your email" value={acct?.email} />
            <InfoRow label="Partner's name" value={acct?.partnerName} />
            <InfoRow label="Partner's email" value={acct?.partnerEmail} last />
          </>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => { if (editing) load(); setEditing(!editing); }}
          style={{ paddingTop: Spacing.md }}>
          <Text style={{ ...Type.small, fontWeight: '700', color: c.accent }}>
            {editing ? 'Done' : 'Edit details \u2192'}
          </Text>
        </Pressable>
      </View>

      {acct?.partnerEmail && !acct.partnerJoined ? (
        <View style={{ ...card(), marginTop: Spacing.lg }}>
          <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.sm }}>Partner invite</Text>
          <Text style={{ ...Type.small, color: c.text, lineHeight: 20 }}>
            {`We sent an invite to ${acct.partnerEmail}. ${acct.partnerName || 'Your partner'} hasn't joined yet. You can send it again.`}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={resend}
            disabled={resent === 'sending'}
            style={{
              marginTop: Spacing.md, alignSelf: 'flex-start', borderRadius: Radius.md,
              paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
              backgroundColor: resent === 'sent' ? '#059669' : c.accent,
            }}>
            <Text style={{ ...Type.small, color: Palette.white, fontWeight: '700' }}>
              {resent === 'sent' ? 'Invite sent \u2713' : 'Resend invite'}
            </Text>
          </Pressable>
          {resent === 'failed' ? (
            <Text style={{ ...Type.small, color: '#B4463A', marginTop: Spacing.sm }}>{SAVE_FAILED}</Text>
          ) : null}
        </View>
      ) : null}

      {acct ? (
        <View style={{ ...card(), marginTop: Spacing.lg }}>
          <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.sm }}>Your package</Text>
          <Text style={{ ...Type.cardTitle, color: c.textStrong, marginBottom: Spacing.sm }}>{acct.pkgName}</Text>
          {acct.includes.map((f) => (
            <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 3 }}>
              <Text style={{ color: c.accent, fontSize: 13, fontWeight: '700' }}>{'\u2713'}</Text>
              <Text style={{ ...Type.small, color: c.text }}>{f}</Text>
            </View>
          ))}
          {/* The website's shop, as every "add" in the app is: the app does
              not sell (check-app-does-not-sell). */}
          <Pressable
            accessibilityRole="link"
            onPress={() => openExternal(`${SITE}/offerings#add-ons`)}
            style={{ paddingTop: Spacing.md, marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: c.border }}>
            <Text style={{ ...Type.small, fontWeight: '700', color: c.accent }}>Explore other packages and add-ons {'\u2192'}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ ...card(), marginTop: Spacing.lg }}>
        <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.sm }}>Notifications</Text>
        <NotificationsRow />
        <DailyPushRows />
      </View>

      <View style={{ ...card(), marginTop: Spacing.lg }}>
        <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.sm }}>Session</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md }}>
          <Text style={{ ...Type.small, color: c.textMuted, flex: 1 }} numberOfLines={1}>
            {`Signed in as ${acct?.email || acct?.name || ''}`}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={async () => { await signOut(); onSignedOut(); }}
            hitSlop={8}>
            <Text style={{ ...Type.small, fontWeight: '700', color: '#ef4444' }}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      <AdminRow />

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
            onPress={() => { setConfirming(true); setTyped(''); setPassword(''); setError(null); }}
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
                onPress={() => openExternal(`${SITE}/legal#privacy`)}>
                What is deleted
              </Text>
              .
            </Text>
            <Text style={{ ...Type.small, color: c.text, marginTop: Spacing.sm }}>
              Enter your password, then type DELETE to confirm.
            </Text>
            <TextInput
              value={password}
              onChangeText={(t) => { setPassword(t); setError(null); }}
              placeholder="Your password"
              placeholderTextColor={c.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              accessibilityLabel="Your password"
              style={{
                ...inputType(Type.body), color: c.textStrong, borderColor: c.border, borderWidth: 1,
                borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
                marginTop: Spacing.sm,
              }}
            />
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
      <View style={{ marginTop: Spacing.xl, alignItems: 'center', gap: Spacing.xs }}>
        <Text style={{ ...Type.small, fontSize: 12, color: c.textMuted, textDecorationLine: 'underline' }}
          onPress={() => openExternal(`${SITE}/legal`)}>Privacy policy and terms</Text>
        <Text style={{ ...Type.small, fontSize: 12, color: c.textMuted, textDecorationLine: 'underline' }}
          onPress={() => openExternal(`${SITE}/privacy-choices`)}>Your privacy choices</Text>
      </View>

      <AppVersion />
    </Sheet>
  );
}

function InfoRow({ label, value, last }: { label: string; value?: string | null; last?: boolean }) {
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md,
      paddingVertical: Spacing.sm, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border,
    }}>
      <Text style={{ ...Type.small, color: c.textMuted }}>{label}</Text>
      <Text style={{ ...Type.small, color: c.textStrong, fontWeight: '500', flexShrink: 1, textAlign: 'right' }} numberOfLines={1}>
        {value || '\u2014'}
      </Text>
    </View>
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

/**
 * What is running, in one quiet line.
 *
 * Nothing here is a setting. It is the line support asks for and the line that
 * answers "have I got the new one yet".
 */
function AppVersion() {
  const version = Constants.expoConfig?.version || '';
  const build = Constants.expoConfig?.ios?.buildNumber || '';
  /**
   * Updates.createdAt is when the running bundle was published. In Expo Go and
   * on a build made before updates existed it is null, which is the honest
   * answer rather than today's date.
   */
  const published = Updates.createdAt
    ? Updates.createdAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  /**
   * ── CHECK NOW, RATHER THAN WAITING TWO LAUNCHES ─────────────────────────
   * Ellie, three times across three days: "Not seeing any difference here on my
   * phone. I've cleared the app 4 times", "I ran this in terminal but am seeing
   * no change on my app", "That didn't reach my phone. What do I do to update
   * the app I'm seeing?"
   *
   * Every time, the update was published and correct. expo-updates downloads in
   * the background on one launch and runs it on the NEXT, so force-quitting and
   * reopening once shows the old bundle, which looks exactly like the update
   * never arriving. Clearing the app does not help and never could.
   *
   * This asks, downloads and reloads in one press, so there is nothing to time
   * and nothing to count. It also says when there is nothing to get, which is
   * the answer that was impossible to obtain before: "you are on the latest"
   * and "it did not work" looked identical.
   */
  const [checking, setChecking] = useState<null | 'checking' | 'none' | 'failed'>(null);

  const checkNow = async () => {
    setChecking('checking');
    try {
      const found = await Updates.checkForUpdateAsync();
      if (!found.isAvailable) { setChecking('none'); return; }
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch {
      /* Expo Go and a simulator dev build both throw here, and so does no
         connection. One message: this is a button, not a diagnostic. */
      setChecking('failed');
    }
  };

  return (
    <View style={{ marginTop: Spacing.xxl, alignItems: 'center' }}>
      <Text style={{ ...Type.small, fontSize: 11, color: c.textMuted }}>
        {`Attune ${version}${build ? ` (${build})` : ''}`}
      </Text>
      <Text style={{ ...Type.small, fontSize: 11, color: c.textMuted, marginTop: 2 }}>
        {published ? `Updated ${published}` : 'Development build'}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Check for an update now"
        onPress={checkNow}
        disabled={checking === 'checking'}
        hitSlop={8}
        style={{
          marginTop: Spacing.md,
          paddingVertical: Spacing.xs + 2, paddingHorizontal: Spacing.lg,
          borderRadius: Radius.pill, borderWidth: 1, borderColor: c.border,
        }}>
        <Text style={{ ...Type.small, fontSize: 12, fontWeight: '700', color: c.textStrong }}>
          {checking === 'checking' ? 'Checking...' : 'Check for update'}
        </Text>
      </Pressable>

      {checking === 'none' ? (
        <Text style={{ ...Type.small, fontSize: 11, color: c.textMuted, marginTop: Spacing.xs }}>
          You are on the latest version.
        </Text>
      ) : null}
      {checking === 'failed' ? (
        <Text style={{ ...Type.small, fontSize: 11, color: c.textMuted, marginTop: Spacing.xs }}>
          Could not check. This only works in the TestFlight app.
        </Text>
      ) : null}
    </View>
  );
}
