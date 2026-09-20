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
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
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
  authenticateAsync: (o: Record<string, unknown>) => Promise<{ success: boolean }>;
};

let localAuth: LocalAuth | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  localAuth = require('expo-local-authentication') as LocalAuth;
} catch {
  localAuth = null;
}

export const lockAvailable = !!localAuth;

/** An entry is a note anchored to the day it was written. */
export const JOURNAL_ANCHOR = 'journal';

/** Today, as the anchor key the server validates: four, two and two. */
export function journalDay(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
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
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
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
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
    const key = iso.slice(0, 10);
    const last = out[out.length - 1];
    if (last && last.key === key) last.rows.push(r);
    else out.push({ key, iso, rows: [r] });
  }
  return out;
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
    try {
      const hardware = await localAuth.hasHardwareAsync();
      const enrolled = await localAuth.isEnrolledAsync();
      /* A phone with no passcode set cannot be asked for one. Opening is the
         only behaviour that is not a dead end, and it is no less private than
         the rest of the app, which this phone is already signed in to. */
      if (!hardware && !enrolled) { setUnlocked(true); return; }
      const res = await localAuth.authenticateAsync({
        promptMessage: 'Open your relationship journal',
        /* Face ID first, the passcode as the fallback, which is what "apple
           can do the open with phone passcode" describes. */
        disableDeviceFallback: false,
        cancelLabel: 'Not now',
      });
      if (res.success) setUnlocked(true);
    } catch {
      /**
       * ── A MODULE THAT IS THERE AND NOT LINKED ──────────────────────────
       * expo-local-authentication resolves as JavaScript the moment it is in
       * package.json, and throws on the first native call in any binary built
       * before it was added, which is every build today and the dev client.
       * The require above cannot tell those apart; this can.
       *
       * Opening is the only behaviour that is not a dead end. A locked screen
       * whose unlock button can never succeed is worse than no lock: it is a
       * door with no key, and the journal is already behind an account this
       * phone is signed in to.
       */
      setUnlocked(true);
    } finally {
      setChecking(false);
    }
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
        {checking ? <ActivityIndicator color={c.accentQuiet} /> : (
          <Pressable
            accessibilityRole="button"
            onPress={unlock}
            style={{
              backgroundColor: c.accent, borderRadius: Radius.pill,
              paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl,
            }}>
            <Text style={{ ...Type.cardTitle, color: Palette.white }}>Unlock</Text>
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
                  <Text style={{ ...Type.body, color: c.text, marginTop: Spacing.sm, lineHeight: 25 }}>
                    {n.body}
                  </Text>
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
          there is more than one day to move between: a scrubber over a single
          day is a control that cannot do anything.

          It is not a scroll bar. It does not follow the scroll position,
          because a thing that both follows and leads fights the finger; it is
          a way to jump, and it appears only while it is being used. */}
      {days.length > 1 ? (
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
                  width: scrubbing === d.iso ? 14 : 8, height: 2, borderRadius: 1,
                  backgroundColor: scrubbing === d.iso ? c.accent : c.border,
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
