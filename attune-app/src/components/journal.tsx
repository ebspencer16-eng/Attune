/**
 * The relationship journal.
 *
 * ── WHAT ELLIE ASKED FOR ──────────────────────────────────────────────────
 * "I want to build a 'relationship journal' into the notes section that is
 * kind of a running diary, make it super easy to add entries and the entries
 * populate with the date and time you wrote them, make the relationship
 * journal open with a passcode (apple can do the open with phone passcode)."
 *
 * ── WHY IT IS NOT A NEW TABLE ─────────────────────────────────────────────
 * An entry is a note. It has an owner, a body, a created_at and a visibility,
 * which is every field a diary entry has, and /api/notes already writes and
 * reads them with the right row-level policies. So an entry is a note anchored
 * to the day it was written: `anchor_type: 'journal'`, `anchor_key` the ISO
 * date. No migration, no second store, and a journal entry is private by
 * default for the same reason every note is.
 *
 * The one thing that had to change on the server is the anchor validator,
 * which rejects an anchor type it does not know. See isValidAnchor in
 * api/_lib/tags.js: an unrecognised anchor is refused on write and the entry
 * is simply never saved, which is how Conflict Patterns went a release without
 * being annotatable.
 *
 * ── THE DATE AND TIME COME FROM THE ROW ───────────────────────────────────
 * "the entries populate with the date and time you wrote them." From
 * `created_at`, not from anything typed and not from the anchor key: the
 * anchor is the day for grouping, and the stamp under an entry is the moment.
 * One is a bucket and the other is a fact, and using the bucket for both would
 * lose the time.
 *
 * ── THE LOCK ──────────────────────────────────────────────────────────────
 * expo-local-authentication is a native module, so it cannot arrive in an
 * over-the-air update: it starts working on the next TestFlight build. Until
 * then the require below throws and `lockAvailable` is false, and the journal
 * opens without asking. That is stated out loud rather than hidden, because a
 * lock that silently is not there is worse than no lock: it is a promise.
 *
 * ── AND THE WAY THE PROMISE WAS BROKEN ────────────────────────────────────
 * Ellie: "I put in an incorrect password into the simulator (journal asked for
 * expo password) and it still let me in."
 *
 * She did, and it did. The whole of unlock() sat inside one try, and the catch
 * opened the journal. That catch was written for one case, a build where the
 * module resolves as JavaScript but is not in the binary, where opening is the
 * only behaviour that is not a dead end. But it also caught a real, answered,
 * rejected authentication, and treated a wrong passcode exactly like a missing
 * module.
 *
 * So the two are now separated by when they happen rather than by what they
 * throw. The probe runs first, on its own: if asking the phone anything at all
 * fails, this build has no lock and the journal opens, which is the documented
 * state. Once the probe has answered, the phone is present and every later
 * outcome is the phone's answer. A throw is a refusal, a false is a refusal,
 * and a refusal keeps the screen locked.
 *
 * ── AND WHAT A SIMULATOR CAN AND CANNOT TELL YOU ──────────────────────────
 * Nothing here can be proved in a simulator. A simulator has no passcode and
 * no enrolled face, so the honest answer for it is "this device cannot be
 * asked", and the journal opens on it by design. Ellie's wrong password is
 * evidence about the old catch, not about a phone. The lock itself needs a
 * TestFlight build, because the module is native, and that is in TASKS.md.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { createNote, deleteNote, fetchNotes, type Note } from '@/api/client';
import {
  Colors, Fonts, inputType, Lift, MaxContentWidth, Palette, Radius, Spacing, Type,
} from '@/constants/attune-theme';

const c = Colors.light;

/**
 * Whether this build can ask for the phone's passcode.
 *
 * Required lazily and in a try, because a native module that is not in the
 * binary throws on import and would take the whole Notes tab with it.
 */
type LocalAuth = {
  hasHardwareAsync: () => Promise<boolean>;
  isEnrolledAsync: () => Promise<boolean>;
  /**
   * 0 none, 1 a passcode, 2 or 3 a biometric. The one call that answers the
   * question this screen is actually asking, which is not "does this phone
   * have Face ID" but "can this phone be asked for anything at all".
   */
  getEnrolledLevelAsync?: () => Promise<number>;
  authenticateAsync: (o: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
};

let localAuth: LocalAuth | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  localAuth = require('expo-local-authentication') as LocalAuth;
} catch {
  localAuth = null;
}

export const lockAvailable = !!localAuth;

/**
 * ── WHAT EACH OUTCOME MEANS, IN ONE FUNCTION ──────────────────────────────
 * The bug Ellie found was not in any of the calls. It was in which outcomes
 * were treated as the same outcome: a native module that is not in the binary
 * and a passcode typed wrongly both arrived as a throw, and one catch opened
 * the journal for both.
 *
 * So the mapping is a function rather than a shape spread through a callback,
 * and unlock() below calls it rather than deciding again. That is what lets
 * check-journal-lock.mjs run this exact code and assert that nothing except a
 * genuine success, or a device that cannot be asked at all, ever opens it.
 *
 * `probe` is 'failed' when asking the phone anything threw, and otherwise the
 * enrolled level: 0 for a device with no passcode and nothing enrolled, more
 * for one that can be asked. `auth` is the answer to the prompt, or 'threw'.
 */
export type LockOutcome = 'open' | 'open-unlockable' | 'locked';

export function lockDecision(
  { probe, auth }: { probe: 'failed' | number; auth?: { success: boolean } | 'threw' },
): LockOutcome {
  /* No module in this binary. A locked screen whose button can never succeed
     is a door with no key, and the journal is already behind an account this
     phone is signed in to. */
  if (probe === 'failed') return 'open';
  /* No passcode, nothing enrolled: a simulator, or a phone someone has chosen
     not to lock. Nothing to ask, and the screen says so. */
  if (!probe) return 'open-unlockable';
  /* From here the phone is present and answering, so every answer is its
     answer. A throw is a refusal and so is a false. */
  if (auth === 'threw' || !auth) return 'locked';
  return auth.success ? 'open' : 'locked';
}

/** An entry is a note anchored to the day it was written. */
export const JOURNAL_ANCHOR = 'journal';

/**
 * How many days in a row someone has written, counting back from today.
 *
 * Ellie: "Is there a little 7 in the 'write a journal entry' button? Let's
 * remove that and instead have a '0 day streak' that adjusts as people
 * consistently write."
 *
 * A streak survives the day it is on: someone who wrote every day last week
 * and has not written yet this morning has a streak of seven, not nought.
 * Breaking it at midnight would tell people their habit ended while they slept.
 *
 * The same function is `journalStreak` in api/_lib/journal-use.js, which an
 * Expo project cannot import. check-notes-parity.mjs runs both over the same
 * day patterns and fails the build on any disagreement.
 */
export function journalStreak(days: string[], today: string): number {
  const have = new Set(days || []);
  if (!have.size || !today) return 0;

  const at = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(at)) return 0;
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  let cursor = at;
  if (!have.has(iso(cursor))) {
    cursor -= 86400000;
    if (!have.has(iso(cursor))) return 0;
  }

  let n = 0;
  while (have.has(iso(cursor))) { n += 1; cursor -= 86400000; }
  return n;
}

/** Today, as the anchor key the server validates: four, two and two. */
export function journalDay(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * A day key, read back as that day in the reader's own timezone.
 *
 * `new Date('2026-09-22')` is UTC midnight, which west of UTC is the evening of
 * the 21st, so a heading built from it named the wrong day for every reader in
 * the Americas. Parsed into local parts instead, which is the inverse of
 * journalDay and the only reading that round-trips.
 */
function localDay(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '');
  if (!m) {
    const d = new Date(key);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * When an entry was written, as one line.
 *
 * Ellie asked for the date and the time, so both, in the phone's own locale
 * rather than a format this file invents.
 */
export function writtenAt(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} at ${time}`;
}

/**
 * The heading over a day's entries.
 *
 * Ellie: "Should be able to scroll up and read past 'posts' that are tagged
 * with their date." So the date is a heading over the day rather than a line
 * on every entry, which is how a diary reads and is also how the scrubber has
 * something to scroll to.
 */
export function dayHeading(iso: string) {
  const d = localDay(iso);
  if (!d) return '';
  const today = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const yesterday = new Date(today.getTime() - 86400000);
  if (same(d, today)) return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
    ...(d.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
  });
}

/** The short label the scrubber shows while it is being dragged. */
export function scrubLabel(iso: string) {
  const d = localDay(iso);
  if (!d) return '';
  /**
   * Ellie: "The user grabs the side bar on the right and when they do it shows
   * a tab with the month and year, then changes as you drag down so that you
   * can quickly see where you are in the timeline."
   *
   * Month and year, in her words. It said "Sep 21" before, which is the right
   * label for finding a day and the wrong one for finding a place in a
   * timeline: a diary two years old has three Septembers in it and the day
   * number does not say which.
   */
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/**
 * Entries in one day's bucket, newest day first.
 *
 * Its own function with no imports so it can be reasoned about and, if it ever
 * earns one, gated. The key is the day the entry was WRITTEN, from created_at,
 * not the anchor: the anchor is what the server validates and the timestamp is
 * the fact.
 */
export function byDay<T extends { created_at?: string | null }>(rows: T[]) {
  const out: { key: string; iso: string; rows: T[] }[] = [];
  for (const r of rows) {
    const iso = r.created_at || '';
    /**
     * ── THE READER'S DAY, NOT THE SERVER'S ────────────────────────────────
     * This was `iso.slice(0, 10)`, which is the UTC date inside the timestamp.
     * Every entry's own stamp under it is drawn with toLocaleDateString, which
     * is the reader's date. West of UTC those are different numbers for the
     * whole evening, so an entry written at 7:41pm in Mountain Time was filed
     * under tomorrow and shown as today, and the heading disagreed with every
     * line beneath it.
     *
     * Seen on screen: a heading reading TUESDAY, SEPTEMBER 22 with four
     * entries stamped September 21 under it.
     *
     * journalDay is the same function that writes an entry's anchor, so the
     * heading, the stamp, the anchor and the streak now all mean one thing by
     * "a day".
     */
    const when = iso ? new Date(iso) : null;
    const key = when && !Number.isNaN(when.getTime()) ? journalDay(when) : '';
    const last = out[out.length - 1];
    if (last && last.key === key) last.rows.push(r);
    else out.push({ key, iso, rows: [r] });
  }
  return out;
}

/**
 * ── KEEPING A QUOTE, WITH SOMETHING OF YOUR OWN UNDER IT ──────────────────
 * Ellie: "Though you shouldn't be able to add a note to an insight of the day,
 * there should be a button on the insight of the day page that allows users to
 * save this to relationship journal. It should save nicely in a tile with the
 * quote and the user can add commentary about it. That way, they can see that
 * quote in the future."
 *
 * An entry with a quote on it is still an entry: same table, same anchor, same
 * private write. What is new is where the quote goes, and it goes in
 * `anchor_context`, which is the column that already means "the words this was
 * made on". Putting it in the body instead would blur the two halves the tile
 * is meant to separate, and a search for a phrase would find the quote as
 * often as it found anything the reader wrote.
 *
 * The commentary is optional. Saving a quote with nothing under it is a
 * perfectly good thing to want, and an empty body is what a note with no words
 * already is everywhere else in this product.
 */
export function SaveToJournal({ quote, onClose }: { quote: string; onClose: (saved: boolean) => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = async () => {
    setBusy(true);
    const res = await createNote({
      body: note.trim(),
      anchorType: JOURNAL_ANCHOR,
      anchorKey: journalDay(),
      anchorContext: quote,
      visibility: 'private',
    });
    setBusy(false);
    if (!res.ok) { setFailed(true); return; }
    onClose(true);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => onClose(false)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={() => onClose(false)}
        style={{ flex: 1, backgroundColor: 'rgba(14,11,7,0.45)', justifyContent: 'flex-end' }}>
        {/* The sheet itself swallows the press that would close it. */}
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: Palette.cream,
            borderTopLeftRadius: Radius.card, borderTopRightRadius: Radius.card,
            padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.md,
          }}>
          <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>{SAVE_TITLE}</Text>
          {/* The quote as it will be kept, so nobody saves something they have
              not read. Italic, the same as an entry's own words. */}
          <Text
            style={{
              ...Type.body, fontFamily: Fonts.bodyItalic, color: c.text,
              borderLeftWidth: 2, borderLeftColor: c.accent,
              paddingLeft: Spacing.md, lineHeight: 24,
            }}>
            {quote}
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={SAVE_PLACEHOLDER}
            placeholderTextColor={c.textMuted}
            multiline
            style={{
              ...inputType(Type.body), color: c.text, minHeight: 84,
              backgroundColor: Palette.white, borderRadius: Radius.md,
              padding: Spacing.md, textAlignVertical: 'top',
            }}
          />
          {failed ? (
            <Text style={{ ...Type.small, color: c.accent }}>{SAVE_FAILED}</Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={save}
            style={{
              alignSelf: 'flex-end', backgroundColor: c.accent, borderRadius: Radius.pill,
              paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.xl,
              opacity: busy ? 0.6 : 1,
            }}>
            <Text style={{ ...Type.cardTitle, fontSize: 15, color: Palette.white }}>{SAVE_ACTION}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function Journal({ onClose }: { onClose: () => void }) {
  /**
   * Locked until the phone says otherwise, and only when it can be asked.
   *
   * The initial state is the honest one: locked if this build has the module,
   * open if it does not. A build with no lock must not sit on a screen that
   * says "unlock" with nothing behind the button.
   */
  const [unlocked, setUnlocked] = useState(!lockAvailable);
  const [checking, setChecking] = useState(false);
  /** The phone was asked and said no. The screen stays shut and says so. */
  const [refused, setRefused] = useState(false);
  /**
   * Whether this device can be asked at all. Only ever set to false, by the
   * probe, so the screen can be honest about a phone with no passcode rather
   * than claiming a lock it never applied.
   */
  const [lockable, setLockable] = useState(true);
  const [entries, setEntries] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const asked = useRef(false);

  /** Ellie: "should be able to search entries by word/phrase." */
  const [query, setQuery] = useState('');

  /**
   * ── THE SCRUBBER ──────────────────────────────────────────────────────
   * Ellie: "should be able to scroll to specific date like snapchat scroll
   * that shows month and date."
   *
   * A column down the right edge. Dragging it picks a day by position and
   * scrolls to that day's heading; the label beside the finger says which day
   * it has landed on. It needs three things: where each day's heading sits in
   * the scroll view, the scroll view itself, and how tall the column is.
   */
  const scroller = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const [scrubAt, setScrubAt] = useState<number | null>(null);
  const [scrubbing, setScrubbing] = useState<string | null>(null);
  const railHeight = useRef(1);

  const unlock = useCallback(async () => {
    if (!localAuth) { setUnlocked(true); return; }
    setChecking(true);
    setRefused(false);

    /**
     * ── STEP ONE: CAN THIS PHONE BE ASKED AT ALL ───────────────────────
     * Its own try, and the only one that opens the journal on a throw.
     *
     * expo-local-authentication resolves as JavaScript the moment it is in
     * package.json and throws on the first native call in any binary built
     * before it was added, which is the dev client and every build so far.
     * The require above cannot tell those apart; this can, and it can tell
     * them apart from a passcode being typed wrongly, which is the thing the
     * old single try could not.
     */
    let probe: 'failed' | number;
    try {
      probe = localAuth.getEnrolledLevelAsync
        ? await localAuth.getEnrolledLevelAsync()
        : ((await localAuth.hasHardwareAsync()) && (await localAuth.isEnrolledAsync()) ? 2 : 0);
    } catch {
      probe = 'failed';
    }

    /**
     * ── STEP TWO: THE PHONE'S ANSWER, WHATEVER IT IS ───────────────────
     * Only asked when there is something to ask. Face ID first and the
     * passcode as the fallback, which is what she asked for: "Can we do sign
     * in with phone passcode on the actual app?"
     */
    let auth: { success: boolean } | 'threw' | undefined;
    if (probe !== 'failed' && probe) {
      try {
        auth = await localAuth.authenticateAsync({
          promptMessage: 'Open your relationship journal',
          disableDeviceFallback: false,
          cancelLabel: 'Not now',
        });
      } catch {
        auth = 'threw';
      }
    }

    const outcome = lockDecision({ probe, auth });
    if (outcome === 'open-unlockable') setLockable(false);
    if (outcome === 'locked') setRefused(true);
    else setUnlocked(true);
    setChecking(false);
  }, []);

  // Asked once, on open, rather than behind a button nobody wants to press.
  useEffect(() => {
    if (asked.current || unlocked) return;
    asked.current = true;
    unlock();
  }, [unlocked, unlock]);

  const load = useCallback(async () => {
    const res = await fetchNotes();
    if (!res.ok) { setLoading(false); setFailed(true); return; }
    setFailed(false);
    /**
     * From the anchored list, not the loose one.
     *
     * /api/notes answers with `notes`, the rows with no anchor, and
     * `annotations`, every row that has one. A journal entry has an anchor, so
     * it is in the second. Reading the wrong one of those two is how every
     * mark on every results page went a release without drawing;
     * check-annotation-source.mjs exists because of it.
     */
    const rows = (res.data.annotations || [])
      .filter((n) => n.anchor_type === JOURNAL_ANCHOR)
      .slice()
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    setEntries(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (unlocked) load();
  }, [unlocked, load]);

  const add = async () => {
    const body = draft.trim();
    if (!body || saving) return;
    setSaving(true);
    const res = await createNote({
      body,
      anchorType: JOURNAL_ANCHOR,
      anchorKey: journalDay(),
      visibility: 'private',
    });
    setSaving(false);
    if (!res.ok) {
      Alert.alert('Not saved', 'That entry did not save. Try again in a moment.');
      return;
    }
    setDraft('');
    setEntries((prev) => [res.data.note, ...prev]);
  };

  /**
   * What the page shows: the entries that match, in days.
   *
   * The search is a plain case-insensitive substring over the entry's own
   * words. Not a ranked search: this is one person's diary, and the thing they
   * are looking for is a phrase they wrote.
   */
  const days = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q ? entries.filter((n) => (n.body || '').toLowerCase().includes(q)) : entries;
    return byDay(rows);
  }, [entries, query]);

  /** Drag the rail: pick the day at that height and go to it. */
  const goToDay = useCallback((fraction: number) => {
    if (!days.length) return;
    const i = Math.max(0, Math.min(days.length - 1, Math.round(fraction * (days.length - 1))));
    const day = days[i];
    setScrubbing(day.iso);
    const y = offsets.current[day.key];
    if (y != null) scroller.current?.scrollTo({ y: Math.max(0, y - 12), animated: false });
  }, [days]);

  const scrub = useMemo(() => Gesture.Pan()
    .onBegin((e) => {
      runOnJS(setScrubAt)(e.y);
      runOnJS(goToDay)(e.y / Math.max(1, railHeight.current));
    })
    .onUpdate((e) => {
      runOnJS(setScrubAt)(e.y);
      runOnJS(goToDay)(e.y / Math.max(1, railHeight.current));
    })
    .onFinalize(() => {
      runOnJS(setScrubAt)(null);
      runOnJS(setScrubbing)(null);
    }), [goToDay]);

  const remove = (note: Note) => {
    Alert.alert('Delete this entry?', 'This cannot be undone.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setEntries((prev) => prev.filter((n) => n.id !== note.id));
          deleteNote(note.id);
        },
      },
    ]);
  };

  if (!unlocked) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.xl }}>
        <SymbolView
          name={'lock' as never}
          size={34}
          tintColor={c.textMuted}
          fallback={<View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.textMuted }} />}
          style={{ width: 36, height: 36 }}
        />
        {/* ── THE REFUSAL IS SAID OUT LOUD ────────────────────────────
            A wrong passcode used to open the journal. It now does not, and a
            screen that simply sits there after a failed Face ID reads as a
            broken button rather than as a locked door. */}
        {refused ? (
          <Text style={{ ...Type.small, color: c.textMuted, textAlign: 'center' }}>{REFUSED}</Text>
        ) : null}
        {checking ? <ActivityIndicator color={c.accentQuiet} /> : (
          <Pressable
            accessibilityRole="button"
            onPress={unlock}
            style={{
              backgroundColor: c.accent, borderRadius: Radius.pill,
              paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl,
            }}>
            <Text style={{ ...Type.cardTitle, color: Palette.white }}>
              {refused ? TRY_AGAIN : UNLOCK}
            </Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}>
          <Text style={{ ...Type.small, color: c.textMuted }}>Back to Notes</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <ScrollView
        contentContainerStyle={{
          padding: Spacing.xl, paddingBottom: Spacing.xxxl,
          maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
        }}
        keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <Text style={{ ...Type.display, color: c.textStrong, flex: 1 }}>Journal</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close the journal" onPress={onClose} hitSlop={12}>
            <Text style={{ ...Type.title, color: c.textMuted }}>{'✕'}</Text>
          </Pressable>
        </View>

        {/* ── AND IF THERE IS NOTHING TO LOCK IT WITH, SAY SO ────────────
            The probe found no passcode and nothing enrolled, so the journal
            opened without asking. That is the right behaviour and the wrong
            thing to leave silent: a lock that is quietly absent is a promise,
            which is the note at the top of this file. */}
        {!lockable ? (
          <Text
            style={{
              ...Type.small, color: c.textMuted, marginTop: Spacing.sm,
              fontFamily: Fonts.bodyItalic,
            }}>
            {NO_LOCK}
          </Text>
        ) : null}

        {/* ── THE COMPOSER IS THE FIRST THING ────────────────────────────
            "make it super easy to add entries." So the field is open on the
            page rather than behind a plus: the fewest taps between thinking
            of something and having written it is none. */}
        <View
          style={{
            backgroundColor: Palette.white, borderRadius: Radius.card,
            padding: Spacing.lg, marginTop: Spacing.xl, ...Lift,
          }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={PLACEHOLDER}
            placeholderTextColor={c.textMuted}
            multiline
            style={{ ...inputType(Type.body), color: c.text, minHeight: 96, textAlignVertical: 'top' }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing.md }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !draft.trim() || saving }}
              disabled={!draft.trim() || saving}
              onPress={add}
              style={{
                backgroundColor: draft.trim() ? c.accent : c.border,
                borderRadius: Radius.pill,
                paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl,
              }}>
              <Text style={{ ...Type.small, fontWeight: '700', color: draft.trim() ? Palette.white : c.textMuted }}>
                {saving ? 'Saving' : 'Add entry'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── SEARCH ────────────────────────────────────────────────────
            Ellie: "should be able to search entries by word/phrase." Under the
            composer rather than over it, because writing is what this screen
            is for and finding is what it is for afterwards. Hidden until there
            is something to search. */}
        {entries.length ? (
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
              backgroundColor: Palette.warm, borderRadius: Radius.pill,
              paddingHorizontal: Spacing.md, marginTop: Spacing.xl,
            }}>
            <SymbolView
              name={'magnifyingglass' as never}
              size={14}
              tintColor={c.textMuted}
              fallback={<Text style={{ color: c.textMuted }}>{'⌕'}</Text>}
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={SEARCH}
              placeholderTextColor={c.textMuted}
              returnKeyType="search"
              clearButtonMode="while-editing"
              style={{ ...inputType(Type.small), color: c.text, flex: 1, paddingVertical: Spacing.sm + 2 }}
            />
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={c.accentQuiet} style={{ marginTop: Spacing.xxl }} />
        ) : failed ? (
          <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xxl }}>{FAILED}</Text>
        ) : days.length ? (
          /* ── A DAY AT A TIME ────────────────────────────────────────
             Ellie: "Should be able to scroll up and read past posts that are
             tagged with their date." The date is a heading over the day rather
             than a line on every entry, which is how a diary reads and is what
             gives the rail something to scroll to. Each heading's position is
             recorded on layout, because measuring it is the only way to know:
             guessing from a row height drifts the moment one entry is longer
             than another. */
          days.map((day) => (
            <View
              key={day.key}
              onLayout={(e) => { offsets.current[day.key] = e.nativeEvent.layout.y; }}>
              <Text
                style={{
                  ...Type.eyebrow, color: c.accentQuiet,
                  marginTop: Spacing.xxl, marginBottom: Spacing.sm,
                }}>
                {dayHeading(day.iso)}
              </Text>
              {day.rows.map((n) => (
                <View
                  key={n.id}
                  style={{
                    backgroundColor: Palette.white, borderRadius: Radius.card,
                    padding: Spacing.lg, marginTop: Spacing.md, ...Lift,
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                    <Text style={{ ...Type.eyebrow, fontSize: 9, color: c.textMuted, flex: 1 }}>
                      {writtenAt(n.created_at)}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Delete this entry"
                      onPress={() => remove(n)}
                      hitSlop={10}>
                      <SymbolView
                        name={'trash' as never}
                        size={14}
                        tintColor={c.textMuted}
                        fallback={<Text style={{ ...Type.small, color: c.textMuted }}>{'✕'}</Text>}
                        style={{ width: 16, height: 16 }}
                      />
                    </Pressable>
                  </View>
                  {/* ── AN ENTRY IS SET IN ITALIC ──────────────────────
                      Ellie: "Journal entries should save with italicized
                      text."

                      Fonts.bodyItalic, not fontStyle. iOS draws the upright
                      face for `fontStyle: 'italic'` on a registered family and
                      reports no error, which is how eighteen places in this app
                      asked for italic and every one of them was upright. Italic
                      is a family here.

                      The website sets the same entries the same way, and
                      check-notes-parity holds the two surfaces to each other. */}
                  {/* ── A QUOTE THIS ENTRY WAS MADE ON ────────────────
                      anchor_context is the words the entry was kept for: the
                      insight of the day, saved from its own page. Drawn above
                      the reader's own writing and set apart from it, because
                      the tile's whole job is to keep the two separable months
                      later. An entry written straight into the journal has
                      none and shows none. */}
                  {n.anchor_context ? (
                    <Text
                      style={{
                        ...Type.body, fontFamily: Fonts.bodyItalic, color: c.textMuted,
                        borderLeftWidth: 2, borderLeftColor: c.accent,
                        paddingLeft: Spacing.md, marginTop: Spacing.sm, lineHeight: 24,
                      }}>
                      {n.anchor_context}
                    </Text>
                  ) : null}
                  {n.body ? (
                    <Text
                      style={{
                        ...Type.body, fontFamily: Fonts.bodyItalic,
                        color: c.text, marginTop: Spacing.sm, lineHeight: 25,
                      }}>
                      {n.body}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ))
        ) : (
          <Text
            style={{
              ...Type.small, color: c.textMuted, marginTop: Spacing.xxl,
              fontFamily: Fonts.bodyItalic, textAlign: 'center', lineHeight: 22,
            }}>
            {query.trim() ? NO_MATCH : EMPTY}
          </Text>
        )}
      </ScrollView>

      {/* ── THE RAIL ───────────────────────────────────────────────────
          Ellie: "should be able to scroll to specific date like snapchat
          scroll that shows month and date."

          A column of ticks down the right edge, one per day, and a label that
          follows the finger saying which day it has landed on. Only drawn when
          there is at least one day in it.

          It was "more than one day", and that was wrong for the reason Ellie
          kept running into: she reported it missing three times, and each time
          the answer was that her journal held a single day, which is not an
          answer she can act on. The rail is a position indicator as much as a
          jump control, and on one day it still does the thing she asked for,
          which is to show the month and the year while a thumb is on it.

          Ellie, three times: "still not seeing this." Two reasons, and neither
          of them was something she could have known. Her journal held a single
          day, so the condition was hiding it; and the ticks were a hairline in
          the border colour, so even with two days there would have been nothing
          to see. Both are fixed rather than explained: a control that is
          invisible on the most common state of a new journal is a control that
          does not exist.

          It is not a scroll bar. It does not follow the scroll position,
          because a thing that both follows and leads fights the finger; it is
          a way to jump, and it appears only while it is being used. */}
      {days.length ? (
        <GestureDetector gesture={scrub}>
          <View
            onLayout={(e) => { railHeight.current = e.nativeEvent.layout.height; }}
            style={{
              position: 'absolute', right: 0, top: RAIL_INSET, bottom: RAIL_INSET,
              width: 34, alignItems: 'center', justifyContent: 'space-between',
              paddingVertical: Spacing.sm,
            }}>
            {days.map((d) => (
              <View
                key={d.key}
                style={{
                  /* ── IT HAS TO BE FINDABLE ──────────────────────────────
                     Ellie, twice: "Make the arrows... visible", and then of
                     this, "still not seeing this". The ticks were eight points
                     by two in the border colour, which on cream is a hairline
                     nobody would think to put a thumb on. A control you cannot
                     see is a control that does not exist.

                     Wider, taller, and in the quiet accent rather than the
                     border, so the column reads as a thing down the edge of
                     the page. The one under the finger is wider still and in
                     the full accent. */
                  width: scrubbing === d.iso ? 20 : 14,
                  height: 3, borderRadius: 1.5,
                  backgroundColor: scrubbing === d.iso ? c.accent : c.accentQuiet,
                  opacity: scrubbing === d.iso ? 1 : 0.55,
                }}
              />
            ))}
          </View>
        </GestureDetector>
      ) : null}

      {/* The label, beside the finger. */}
      {scrubAt != null && scrubbing ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', right: 40, top: RAIL_INSET + scrubAt - 16,
            backgroundColor: c.textStrong, borderRadius: Radius.pill,
            paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md,
          }}>
          <Text style={{ ...Type.small, fontWeight: '700', color: Palette.white }}>
            {scrubLabel(scrubbing)}
          </Text>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** How far the rail sits from the top and bottom of the screen. */
const RAIL_INSET = 120;

/**
 * ── THE THREE STRINGS ─────────────────────────────────────────────────────
 * Named rather than written inline so they are findable, and flagged in
 * TASKS.md for Ellie: every word a customer reads is hers, and these three are
 * placeholders in her house style until she replaces them.
 */
const PLACEHOLDER = 'Write about today';
const SEARCH = 'Search your entries';
const NO_MATCH = 'Nothing here matches that.';
const EMPTY = 'Nothing here yet. The first entry is usually the hardest one.';
const FAILED = 'Your journal could not be loaded. Pull down to try again.';
/**
 * The four strings on the save sheet. Placeholders in Ellie's house style,
 * named here so they are findable, and listed in TASKS.md as part of C4.
 */
const SAVE_TITLE = 'Keep this in your journal';
const SAVE_PLACEHOLDER = 'What it made you think';
const SAVE_ACTION = 'Save';
const SAVE_FAILED = 'That did not save. Try again in a moment.';
const UNLOCK = 'Unlock';
const TRY_AGAIN = 'Try again';
/** Shown when the phone was asked and said no. A placeholder, like the rest. */
const REFUSED = 'That did not unlock it.';
/**
 * Shown on the journal itself when the phone has no passcode and nothing
 * enrolled, so there is nothing to lock it with. A placeholder, like the rest:
 * it is the one sentence on this screen that makes a promise about privacy,
 * and Ellie writes those.
 */
const NO_LOCK = 'This phone has no passcode, so the journal opens without one.';
