/**
 * The admin, inside the app, behind a code you set on the phone.
 *
 * ── WHAT ELLIE ASKED FOR ──────────────────────────────────────────────────
 * "Build admin into Carolina's and my apps as a button in settings that asks
 * for our 4-digit pin (use our phone password). This makes for quick access for
 * us. Admin in the app should look like it does on the site's mobile view.
 * Build a home page that has the left nav (in an insights menu style list), and
 * every page should have a back button that brings you to that menu."
 *
 * So: a menu that looks like the Insights menu, listing the admin's own left
 * nav, and each row opening that page. The pages are the site's mobile view
 * because they ARE the site's mobile view, opened full screen inside the app;
 * the browser's Done is the back button to this menu. There is no second admin
 * to drift from the first, which is the thing this codebase keeps paying for.
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
import { Colors, Lift, Radius, Spacing, Type } from '@/constants/attune-theme';

const c = Colors.light;
const SITE = SITE_URL;

/** The keychain entry. Named so it is obvious what it is if anyone looks. */
const PIN_KEY = 'attune.admin.pin';

/** What a code has to be. Hers: "our 4-digit pin". */
const DIGITS = 4;

export type AdminSection = { key: string; label: string };

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

export default function Admin({ sections, onClose }: {
  /** The admin's own left nav, from /api/home. */
  sections: AdminSection[];
  onClose: () => void;
}) {
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
      if (entry === stored) { setUnlocked(true); setEntry(''); return; }
      setEntry('');
      setProblem('That is not the code.');
      return;
    }
    if (entry.length !== DIGITS) { setProblem(`The code is ${DIGITS} digits.`); return; }
    if (confirm !== entry) { setProblem('The two did not match.'); setConfirm(''); return; }
    const saved = await writePin(entry);
    if (!saved) { setProblem('This phone would not store the code. Nothing was saved.'); return; }
    setStored(entry); setUnlocked(true); setEntry(''); setConfirm('');
  }, [entry, confirm, stored]);

  const [opening, setOpening] = useState<string | null>(null);

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
  const open = async (key: string) => {
    if (opening) return;
    setOpening(key);
    let ticket: string | null = null;
    try {
      const r = await fetchAdminTicket();
      if (r.ok) ticket = r.data.ticket;
    } catch (e) {
      console.warn('[admin] no ticket, falling back to the password gate', e);
    }
    const frag = ticket ? `#${key}&t=${encodeURIComponent(ticket)}` : `#${key}`;
    try {
      await openBrowserAsync(`${SITE}/admin${frag}`, {
        presentationStyle: WebBrowserPresentationStyle.FULL_SCREEN,
        toolbarColor: c.background,
        controlsColor: c.accent,
      });
    } catch (e) {
      console.warn('[admin] would not open', key, e);
    } finally {
      setOpening(null);
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

        <Pressable accessibilityRole="button" onPress={onClose} style={{ marginTop: Spacing.lg, alignItems: 'center' }}>
          <Text style={{ ...Type.small, color: c.textMuted }}>Back to settings</Text>
        </Pressable>
      </View>
    );
  }

  // ── The menu ──────────────────────────────────────────────────────────────
  return (
    <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl }}>
      {/* The same shape as the Insights menu: one floating card, rows inside
          it, no heading over a list that names everything it leads to. */}
      <View
        style={{
          backgroundColor: c.surface, borderRadius: Radius.card,
          overflow: 'hidden', ...Lift,
        }}>
        {sections.map((s, i) => (
          <Pressable
            key={s.key}
            accessibilityRole="button"
            accessibilityLabel={s.label}
            onPress={() => { open(s.key); }}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg,
              borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.border,
            }}>
            <Text style={{ ...Type.cardTitle, color: c.textStrong, flex: 1 }}>{s.label}</Text>
            {opening === s.key
              ? <ActivityIndicator color={c.accentQuiet} />
              : <Text style={{ color: c.accent, fontSize: 16 }}>{'›'}</Text>}
          </Pressable>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={async () => { await clearPin(); setStored(null); setUnlocked(false); }}
        style={{ marginTop: Spacing.xl, alignItems: 'center' }}>
        <Text style={{ ...Type.small, color: c.textMuted }}>Forget this code</Text>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={onClose} style={{ marginTop: Spacing.md, alignItems: 'center' }}>
        <Text style={{ ...Type.small, color: c.textMuted }}>Back to settings</Text>
      </Pressable>
    </View>
  );
}
