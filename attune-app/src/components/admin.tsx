/**
 * The admin, inside the app, behind a code you set on the phone.
 *
 * ── WHAT ELLIE ASKED FOR ──────────────────────────────────────────────────
 * "Build admin into Carolina's and my apps as a button in settings that asks
 * for our 4-digit pin (use our phone password). This makes for quick access for
 * us. Admin in the app should look like it does on the site's mobile view."
 *
 * Then, having used it: "the app doesn't need the nav menu. After typing your 4
 * digit code, it should take you straight to the dashboard overview and we can
 * use the hamburger nav from there."
 *
 * So the code, and then the admin. The page is the site's mobile view because
 * it IS the site's mobile view, opened full screen inside the app, and its own
 * hamburger is the nav. There is no second admin to drift from the first, which
 * is the thing this codebase keeps paying for, and there is no longer a second
 * copy of its nav either: the menu this used to draw was a list of seventeen
 * pages that had to stay in step with the real one.
 *
 * ── WHAT THE CODE IS AND IS NOT ───────────────────────────────────────────
 * It is a convenience lock on an unlocked phone, so a person holding it cannot
 * walk into customer data. It is NOT what protects anything:
 *
 *   - every admin endpoint is behind ADMIN_SECRET and asks for it regardless;
 *   - the row only appears for an account api/_lib/admins.js recognises;
 *   - four digits is ten thousand guesses, which is no barrier to anyone with
 *     the device and the patience.
 *
 * Saying that plainly matters more than the lock does. A gate described as
 * security that is not is how something real gets left out later.
 *
 * ── WHERE THE CODE LIVES ──────────────────────────────────────────────────
 * expo-secure-store, which is the iOS keychain: per app, encrypted at rest,
 * gone when the app is deleted. It is never sent anywhere, never logged, and
 * never in this repo. Ellie sets it on the device the first time she opens
 * this, and I have not been told what it is.
 *
 * It is stored as typed rather than hashed. A hash of four digits is ten
 * thousand candidates and falls in milliseconds to anyone who can read the
 * keychain, so hashing here would be a ritual that implies a protection it does
 * not provide. The keychain is the protection.
 */

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';

import { Pressable } from '@/components/pressable';
import { fetchAdminTicket, SITE_URL } from '@/api/client';
import { Colors, Radius, Spacing, Type } from '@/constants/attune-theme';

const c = Colors.light;
const SITE = SITE_URL;

/** The keychain entry. Named so it is obvious what it is if anyone looks. */
const PIN_KEY = 'attune.admin.pin';

/** What a code has to be. Hers: "our 4-digit pin". */
const DIGITS = 4;


/**
 * Read, set and clear the code.
 *
 * Every one of these can fail: the keychain is unavailable on a simulator
 * without one, and a write can be refused. A failure to READ has to read as
 * "no code set" rather than throwing, or the screen is a dead end with no way
 * forward.
 */
async function readPin(): Promise<string | null> {
  try { return await SecureStore.getItemAsync(PIN_KEY); } catch { return null; }
}
async function writePin(pin: string): Promise<boolean> {
  try { await SecureStore.setItemAsync(PIN_KEY, pin); return true; } catch { return false; }
}
async function clearPin(): Promise<void> {
  try { await SecureStore.deleteItemAsync(PIN_KEY); } catch { /* already gone */ }
}

export default function Admin({ onClose }: { onClose: () => void }) {
  /** null while the keychain is being read, so neither screen flashes. */
  const [stored, setStored] = useState<string | null | undefined>(undefined);
  const [unlocked, setUnlocked] = useState(false);
  const [entry, setEntry] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    readPin().then((p) => { if (live) setStored(p); });
    return () => { live = false; };
  }, []);

  const digits = (v: string) => v.replace(/[^0-9]/g, '').slice(0, DIGITS);

  const submit = useCallback(async () => {
    setProblem(null);
    if (stored) {
      if (entry === stored) { setUnlocked(true); setEntry(''); open(); return; }
      setEntry('');
      setProblem('That is not the code.');
      return;
    }
    if (entry.length !== DIGITS) { setProblem(`The code is ${DIGITS} digits.`); return; }
    if (confirm !== entry) { setProblem('The two did not match.'); setConfirm(''); return; }
    const saved = await writePin(entry);
    if (!saved) { setProblem('This phone would not store the code. Nothing was saved.'); return; }
    setStored(entry); setUnlocked(true); setEntry(''); setConfirm(''); open();
  }, [entry, confirm, stored]);

  const [opening, setOpening] = useState(false);

  /**
   * ── A LOCK WITH NO WAY OUT IS A DEAD END ────────────────────────────────
   * Ellie: "Just tried the code in the simulator and it gave me 'that's not the
   * code' but didn't let me set one."
   *
   * That message only appears when the keychain already holds a code, and the
   * only way to clear one was behind the code itself. So a code she does not
   * have, for any reason, locked her out of her own admin with no way back
   * short of deleting the app. That is the worse bug of the two, whatever put
   * the value there.
   *
   * ── WHAT IT ASKS FOR INSTEAD ────────────────────────────────────────────
   * The server. /api/admin-session mints a ticket only for a live session on an
   * account api/_lib/admins.js recognises, so forgetting the code costs being
   * signed in as herself or as Carolina, which is a stronger thing to hold than
   * four digits.
   *
   * It does mean the code is a speed bump rather than a lock: whoever is
   * holding the unlocked phone IS that session. Saying so plainly is the point.
   * The code keeps the admin out of reach of a casual tap; ADMIN_SECRET on
   * every endpoint is what protects the data, and that has not moved.
   */
  const [forgetting, setForgetting] = useState(false);
  const forget = useCallback(async () => {
    if (forgetting) return;
    setForgetting(true);
    setProblem(null);
    try {
      const r = await fetchAdminTicket();
      if (!r.ok) {
        setProblem('That account is not an admin, so the code cannot be cleared here.');
        return;
      }
      await clearPin();
      setStored(null);
      setEntry('');
      setConfirm('');
    } catch {
      setProblem('No answer from the server. The code was not changed.');
    } finally {
      setForgetting(false);
    }
  }, [forgetting]);

  /**
   * ── NO PASSWORD ONCE YOU ARE IN THROUGH YOUR OWN ACCOUNT ────────────────
   * Ellie: "Carolina and I shouldn't have to enter the admin password if we are
   * entering through our accounts. We should have the 4-digit pin once when we
   * initially click admin from settings, but no passwords from that point."
   *
   * So the ticket is fetched here and travels in the URL's FRAGMENT, which is
   * never sent to a server and which the admin page strips from the address bar
   * before it does anything else. It is good for two minutes.
   *
   * What is NOT carried is the admin token. The exchange happens on the page,
   * because that is the only thing that should ever hold it.
   *
   * If the ticket cannot be fetched the page still opens: the password gate is
   * behind it and one sign-in is a worse morning than a dead end.
   */
  const open = async () => {
    if (opening) return;
    setOpening(true);
    let ticket: string | null = null;
    try {
      const r = await fetchAdminTicket();
      if (r.ok) ticket = r.data.ticket;
    } catch (e) {
      console.warn('[admin] no ticket, falling back to the password gate', e);
    }
    /* The overview is the admin's own default, so the fragment carries the
       ticket and nothing else. admin.html strips it on arrival and what is left
       is an empty hash, which is the overview. */
    const frag = ticket ? `#t=${encodeURIComponent(ticket)}` : '';
    try {
      await openBrowserAsync(`${SITE}/admin${frag}`, {
        presentationStyle: WebBrowserPresentationStyle.FULL_SCREEN,
        toolbarColor: c.background,
        controlsColor: c.accent,
      });
    } catch (e) {
      console.warn('[admin] would not open', e);
    } finally {
      setOpening(false);
    }
  };

  if (stored === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.accentQuiet} />
      </View>
    );
  }

  // ── The lock ──────────────────────────────────────────────────────────────
  if (!unlocked) {
    const setting = !stored;
    return (
      <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxxl }}>
        <Text style={{ ...Type.title, color: c.textStrong }}>
          {setting ? 'Choose a code' : 'Enter your code'}
        </Text>
        <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xs, lineHeight: 19 }}>
          {setting
            ? `${DIGITS} digits, kept in this phone's keychain and nowhere else. It keeps the admin out of reach on an unlocked phone; it is not what protects the data.`
            : 'The code you set on this phone.'}
        </Text>

        <TextInput
          value={entry}
          onChangeText={(v) => { setEntry(digits(v)); setProblem(null); }}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={DIGITS}
          autoFocus
          accessibilityLabel={setting ? 'Choose a code' : 'Your code'}
          style={{
            marginTop: Spacing.xl, backgroundColor: c.surface,
            borderColor: c.border, borderWidth: 1, borderRadius: Radius.md,
            paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg,
            ...Type.title, color: c.textStrong, letterSpacing: 8, textAlign: 'center',
          }}
        />
        {setting ? (
          <TextInput
            value={confirm}
            onChangeText={(v) => { setConfirm(digits(v)); setProblem(null); }}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={DIGITS}
            accessibilityLabel="The same code again"
            placeholder="Again"
            placeholderTextColor={c.textMuted}
            style={{
              marginTop: Spacing.md, backgroundColor: c.surface,
              borderColor: c.border, borderWidth: 1, borderRadius: Radius.md,
              paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg,
              ...Type.title, color: c.textStrong, letterSpacing: 8, textAlign: 'center',
            }}
          />
        ) : null}

        {problem ? (
          <Text style={{ ...Type.small, color: c.accent, marginTop: Spacing.md }}>{problem}</Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={submit}
          disabled={entry.length !== DIGITS || (setting && confirm.length !== DIGITS)}
          style={{
            marginTop: Spacing.xl, backgroundColor: c.accent, borderRadius: Radius.pill,
            paddingVertical: Spacing.lg, alignItems: 'center',
            opacity: entry.length !== DIGITS || (setting && confirm.length !== DIGITS) ? 0.4 : 1,
          }}>
          <Text style={{ ...Type.cardTitle, color: '#FFFFFF' }}>
            {setting ? 'Set the code' : 'Open the admin'}
          </Text>
        </Pressable>

        {setting ? null : (
          <Pressable
            accessibilityRole="button"
            onPress={forget}
            disabled={forgetting}
            style={{ marginTop: Spacing.lg, alignItems: 'center' }}>
            {forgetting
              ? <ActivityIndicator color={c.accentQuiet} />
              : <Text style={{ ...Type.small, color: c.accent }}>Forgot your code?</Text>}
          </Pressable>
        )}

        <Pressable accessibilityRole="button" onPress={onClose} style={{ marginTop: Spacing.lg, alignItems: 'center' }}>
          <Text style={{ ...Type.small, color: c.textMuted }}>Back to settings</Text>
        </Pressable>
      </View>
    );
  }

  /**
   * ── STRAIGHT THROUGH ────────────────────────────────────────────────────
   * Unlocking opens the admin, so this is only ever on screen while the browser
   * is coming up, or after it has been dismissed. A dead end either way without
   * something to press, which is what the first version of this screen was.
   */
  return (
    <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxxl, alignItems: 'center' }}>
      {opening
        ? <ActivityIndicator color={c.accentQuiet} />
        : (
          <Pressable
            accessibilityRole="button"
            onPress={open}
            style={{
              backgroundColor: c.accent, borderRadius: Radius.pill,
              paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl, alignItems: 'center',
            }}>
            <Text style={{ ...Type.cardTitle, color: '#FFFFFF' }}>Open the admin</Text>
          </Pressable>
        )}

      <Pressable
        accessibilityRole="button"
        onPress={async () => { await clearPin(); setStored(null); setUnlocked(false); }}
        style={{ marginTop: Spacing.xxl, alignItems: 'center' }}>
        <Text style={{ ...Type.small, color: c.textMuted }}>Forget this code</Text>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={onClose} style={{ marginTop: Spacing.md, alignItems: 'center' }}>
        <Text style={{ ...Type.small, color: c.textMuted }}>Back to settings</Text>
      </Pressable>
    </View>
  );
}
