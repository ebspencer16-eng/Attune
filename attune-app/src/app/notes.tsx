/**
 * Notes.
 *
 * Three sections, in the order Ellie asked for them:
 *
 *   Pick up where you left off   the three most recent things you left
 *                                anywhere, notes and highlights alike
 *   From your partner            what they sent you, unread ones marked
 *   Tags                         every tag, with a sort
 *
 * ── WHY NOT ONE STREAM ────────────────────────────────────────────────────
 * It was one, and before that three lists behind a pill row. The pill row was
 * wrong because it asked you to know which of three places a note was in
 * before you could look for it, which is a question about storage.
 *
 * The single stream fixed that and lost something else: what you left
 * somewhere and what your partner sent you are different things to come back
 * to. Only one of them can be unread, only one is addressed to you, and mixing
 * them meant a note from your partner could scroll past between two of your
 * own highlights. Sorted by date, the most personal thing on the screen was
 * the easiest to miss.
 *
 * The three still arrive separately from /api/notes, because they are separate
 * questions server-side, and shared notes stay distinguishable: only the
 * author edits one, so the card has to know whose it is.
 *
 * ── WHAT IS STILL NOT BUILT ───────────────────────────────────────────────
 * Filtering the notes themselves by source or author. The tag list has its
 * sort, which is what was asked for; a general filter bar still cuts on things
 * the Results and In Practice screens have not defined.
 *
 * Nothing here decides what an anchor means. That resolution lives in
 * constants/anchors.ts and derives from the standard tags the server seeds, so
 * a renamed dimension relabels itself instead of going stale.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable,
  RefreshControl, ScrollView, Switch, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createNote, deleteNote, fetchHome, fetchNotes, fetchPosts, fetchResults, fetchTags,
  openSharedNote, shareNote, updateNote,
} from '@/api/client';
import type { ApiError, Note, Tag } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import SignIn from '@/components/sign-in';
import { resolveAnchor } from '@/constants/anchors';
import type { AnchorContext, ResolvedAnchor } from '@/constants/anchors';
import {
  Colors, MaxContentWidth, Palette, Radius, Spacing, Type, inputType,
} from '@/constants/attune-theme';

const c = Colors.light;

/** A note plus the two things the list has to know that the row itself does not. */
type Row = { note: Note; readOnly: boolean };

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [annotations, setAnnotations] = useState<Note[]>([]);
  const [shared, setShared] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [sectionLabels, setSectionLabels] = useState<Record<string, string>>({});
  const [postTitles, setPostTitles] = useState<Record<string, string>>({});
  const [resultsVersion, setResultsVersion] = useState<number | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [partnerLinked, setPartnerLinked] = useState(false);

  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Note | 'new' | null>(null);
  // Each section shows its most recent few and opens to the rest. Two flags
  // rather than one, because expanding what you wrote and expanding what your
  // partner sent are unrelated decisions.
  const [showAllMine, setShowAllMine] = useState(false);
  const [showAllShared, setShowAllShared] = useState(false);
  const [tagSort, setTagSort] = useState<TagSort>('az');

  const loadingRef = useRef(false);
  const load = useCallback(async () => {
    loadingRef.current = true;
    // Three calls that are always needed. Tags are fetched for their labels,
    // and fetching them is also what seeds them on a first open.
    const [n, t, h] = await Promise.all([fetchNotes(), fetchTags(), fetchHome()]);

    if (!n.ok) {
      setError(n.error);
      setLoading(false);
      setRefreshing(false);
      // Cleared here too. This path returns early, and leaving the flag set
      // would mean the focus reload below never runs again for this tab: one
      // failed load and Notes stays stale until the app restarts.
      loadingRef.current = false;
      return;
    }
    setError(null);
    setNotes(n.data.notes);
    setAnnotations(n.data.annotations);
    setShared(n.data.sharedWithMe);
    if (t.ok) { setTags(t.data.tags); setSectionLabels(t.data.sections ?? {}); }
    if (h.ok) {
      setPartnerName(h.data.partnerName ?? null);
      setPartnerLinked(!!h.data.state?.partnerLinked);
    }

    // The next two are only worth the round trip when something on screen needs
    // them. Most people have no annotations at all, and a tab that opens five
    // connections to render three cards is a tab that feels slow on a train.
    const anns = n.data.annotations;
    // post_block carries its post id too, so both kinds need the titles.
    if (anns.some((a) => a.anchor_type === 'post' || a.anchor_type === 'post_block')) {
      const p = await fetchPosts();
      if (p.ok) {
        setPostTitles(Object.fromEntries(p.data.posts.map((post) => [post.id, post.title])));
      }
    }
    if (anns.some((a) => a.anchor_type?.startsWith('results_') && a.anchor_version != null)) {
      const r = await fetchResults();
      setResultsVersion(r.ok && r.data.ready ? r.data.results.version : null);
    }

    setLoading(false);
    setRefreshing(false);
    loadingRef.current = false;
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reload when this tab comes into focus, not only when it mounts.
  //
  // All four tabs mount when the app starts, so all four load at once. Open the
  // app with an expired session and all four store an unauthorized error and
  // render sign-in. Signing in on one reloaded that one; the other three kept
  // showing their own stale sign-in screen forever, so every tab switch looked
  // like being asked to sign in again.
  //
  // Skipped while a load is already running, so switching tabs quickly does not
  // stack requests.
  useFocusEffect(
    useCallback(() => {
      if (!loadingRef.current) load();
    }, [load]),
  );


  const anchorCtx: AnchorContext = useMemo(() => {
    const byKey = new Map(tags.filter((t) => t.standard_key).map((t) => [t.standard_key as string, t]));
    return {
      tag: (key) => {
        const found = byKey.get(key);
        return found ? { name: found.name, color: found.color } : undefined;
      },
      postTitle: (id) => postTitles[id],
      sectionLabel: (id) => sectionLabels[id],
    };
  }, [tags, postTitles, sectionLabels]);

  /**
   * Everything, newest first.
   *
   * Sorted on updated_at rather than created_at: editing a note is the act of
   * still thinking about it, and a list that buries a note you just rewrote
   * under one you have not touched in a month is sorting by the wrong thing.
   *
   * Parsed as dates rather than compared as strings. The timestamps are ISO and
   * would usually sort lexicographically, but that quietly stops being true the
   * moment two rows come back with different timezone offsets.
   */
  /**
   * The reader's own, newest first.
   *
   * Notes and annotations arrive on separate keys because they are separate
   * questions server-side, and both are things this person left somewhere. A
   * highlight is not a lesser note; it is a note with a colour instead of
   * words.
   *
   * This used to be merged with the partner's shared notes into one stream.
   * Ellie asked for them apart: what you left and what was sent to you are
   * different things to come back to, and only one of them can be unread.
   */
  const mineRecent = useMemo(() => [...notes, ...annotations].sort(
    (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at),
  ), [notes, annotations]);

  const sharedRecent = useMemo(() => [...shared].sort(
    (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at),
  ), [shared]);

  /** How many of the partner's notes this reader has not opened. */
  const unopenedCount = useMemo(
    () => sharedRecent.filter((n) => !n.opened_at).length,
    [sharedRecent],
  );

  /**
   * Mark one of the partner's notes as opened.
   *
   * Optimistic, and deliberately not awaited: the receipt is bookkeeping and
   * must never stand between someone and the thing they tapped. A failed write
   * means it reads unread again on the next load, which is the harmless
   * direction to fail in.
   */
  const markOpened = useCallback((note: Note) => {
    if (note.opened_at) return;
    setShared((prev) => prev.map(
      (n) => (n.id === note.id ? { ...n, opened_at: new Date().toISOString() } : n),
    ));
    openSharedNote(note.id);
  }, []);

  if (loading) return <Shell><ScreenLoading label="Getting your notes" /></Shell>;

  if (error?.kind === 'unauthorized') {
    return (
      <Shell>
        <SignIn onSignedIn={() => { setLoading(true); load(); }} rejectedReason={error.detail} />
      </Shell>
    );
  }
  if (error) {
    return <Shell><ScreenError error={error} onRetry={() => { setLoading(true); load(); }} /></Shell>;
  }

  const partner = partnerName || 'your partner';

  return (
    <Shell>
      <ScrollView
        contentContainerStyle={{ paddingBottom: Spacing.xxxl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={c.accentQuiet}
          />
        }>
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...Type.hero, color: c.textStrong }}>Notes</Text>
            {/* Writing a note is the only thing this screen creates, so it gets
                one plain control rather than a floating button that covers the
                last card in the list. */}
            <Pressable
              onPress={() => setEditing('new')}
              hitSlop={10}
              accessibilityLabel="Write a note"
              style={{
                width: 36, height: 36, borderRadius: Radius.pill,
                backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center',
              }}>
              <Text style={{ color: Palette.white, fontSize: 22, lineHeight: 26, fontWeight: '400' }}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
          {/* ── 1. PICK UP WHERE YOU LEFT OFF ──────────────────────────────
              Ellie: "the top tile to be 'pick up where you left off' with 3
              rows each with a sneak peek of recent notes/highlights/tags,
              organized from most recent to least recent."

              Three, from everything of the reader's own: a note, a highlight
              and an underline are all things they left somewhere, and a stream
              that showed only one kind would be a stream about storage rather
              than about them. */}
          {mineRecent.length ? (
            <Section title="Pick up where you left off">
              {mineRecent.slice(0, 3).map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  tags={tags}
                  source={note.anchor_type ? resolveAnchor(note, anchorCtx) : null}
                  moved={hasMoved(note, resultsVersion)}
                  onPress={() => setEditing(note)}
                />
              ))}
              {mineRecent.length > 3 ? (
                <More
                  label={showAllMine ? 'Show fewer' : `All ${mineRecent.length}`}
                  onPress={() => setShowAllMine((v) => !v)}
                />
              ) : null}
              {showAllMine
                ? mineRecent.slice(3).map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    tags={tags}
                    source={note.anchor_type ? resolveAnchor(note, anchorCtx) : null}
                    moved={hasMoved(note, resultsVersion)}
                    onPress={() => setEditing(note)}
                  />
                ))
                : null}
            </Section>
          ) : (
            <Blank
              title="No notes yet"
              body="Anything you write here stays private until you choose to share it."
            />
          )}

          {/* ── 2. WHAT YOUR PARTNER SENT ──────────────────────────────────
              Ellie: "2 or 3 most recent show, but then there's an arrow to see
              all the ones your partner has sent you... Would like something
              designating which of these are unread or unopened."

              Unread is a real fact now rather than a guess: opened_at on the
              row, set the first time this reader opens one. Before migration
              057 that column does not exist and every note reads as unread,
              which is the safe direction: it draws attention to something that
              is there rather than hiding something that is. */}
          {sharedRecent.length ? (
            <Section
              title={partner ? `From ${partner}` : 'Shared with you'}
              badge={unopenedCount || undefined}>
              {(showAllShared ? sharedRecent : sharedRecent.slice(0, 3)).map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  tags={tags}
                  source={note.anchor_type ? resolveAnchor(note, anchorCtx) : null}
                  moved={hasMoved(note, resultsVersion)}
                  author={partner}
                  readOnly
                  unread={!note.opened_at}
                  // Opening marks it read. Fired without awaiting: the mark is
                  // bookkeeping and must never stand between someone and the
                  // thing they tapped.
                  onPress={() => { markOpened(note); }}
                />
              ))}
              {sharedRecent.length > 3 ? (
                <More
                  label={showAllShared ? 'Show fewer' : `All ${sharedRecent.length}`}
                  onPress={() => setShowAllShared((v) => !v)}
                />
              ) : null}
            </Section>
          ) : null}

          {/* ── 3. TAGS ────────────────────────────────────────────────────
              Every tag, in rows, with the sort Ellie asked for. */}
          {tags.length ? (
            <TagList
              tags={tags}
              notes={[...mineRecent, ...sharedRecent]}
              sort={tagSort}
              onChangeSort={setTagSort}
            />
          ) : null}
        </View>
      </ScrollView>

      {editing ? (
        <Editor
          note={editing === 'new' ? null : editing}
          tags={tags}
          canShare={partnerLinked}
          partner={partner}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      ) : null}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      {children}
    </SafeAreaView>
  );
}

/**
 * Have the results moved under this note?
 *
 * `anchor_version` is the results version the note was written against. When
 * results have since been recomputed under a different one, the wording the
 * note was answering may not be the wording on screen now, and saying so is
 * better than showing the note as though nothing happened.
 *
 * Both sides have to be known. A null version on either means we cannot tell,
 * and a flag we cannot stand behind is worse than no flag.
 */
function hasMoved(note: Note, resultsVersion: number | null): boolean {
  if (resultsVersion == null || note.anchor_version == null) return false;
  if (!note.anchor_type?.startsWith('results_')) return false;
  return note.anchor_version !== resultsVersion;
}

/** Days, then a date. Precision nobody wants beyond about a week. */
function when(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** The first line of a note, for when it has no title of its own. */
function leadLine(body: string): string {
  const line = body.split('\n').find((l) => l.trim().length) || '';
  return line.trim().slice(0, 80);
}

/**
 * A titled group on the Notes screen, with an optional count of what is unread.
 *
 * The screen is three of these now rather than one stream. Ellie asked for
 * that split, and it answers a question the stream could not: what you left
 * somewhere and what your partner sent you are different things to come back
 * to, and only one of them can be unread.
 */
function Section({
  title, badge, children,
}: { title: string; badge?: number; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: Spacing.xxl }}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
          marginBottom: Spacing.md,
        }}>
        <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>{title}</Text>
        {badge ? (
          <View
            style={{
              minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5,
              alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent,
            }}>
            <Text style={{ fontSize: 11, lineHeight: 14, fontWeight: '700', color: Palette.white }}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Open a section to everything it holds, or close it back to the few. */
function More({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{ paddingVertical: Spacing.md, alignItems: 'center' }}>
      <Text style={{ ...Type.small, fontWeight: '700', color: c.accent }}>{label}  {'\u2192'}</Text>
    </Pressable>
  );
}

/**
 * How the tag list is ordered.
 *
 * Ellie's four: "A-Z, Z-A, most recent - least recent (based on how recently
 * something has been added to that folder), most - least and vice versa in
 * terms of # of tags in that category."
 *
 * "Most recent" is about the tag's CONTENTS, not the tag itself. A tag made
 * last year that something was filed under this morning is the most recent
 * one, and sorting by the tag's own created_at would put it last. That is the
 * whole difference between a list of folders and a list of what is in them.
 */
export type TagSort = 'az' | 'za' | 'recent' | 'oldest' | 'most' | 'fewest';

const TAG_SORTS: { key: TagSort; label: string }[] = [
  { key: 'az', label: 'A to Z' },
  { key: 'za', label: 'Z to A' },
  { key: 'recent', label: 'Recently added to' },
  { key: 'oldest', label: 'Least recently added to' },
  { key: 'most', label: 'Most notes' },
  { key: 'fewest', label: 'Fewest notes' },
];

function TagList({
  tags, notes, sort, onChangeSort,
}: {
  tags: Tag[];
  notes: Note[];
  sort: TagSort;
  onChangeSort: (s: TagSort) => void;
}) {
  const [open, setOpen] = useState(false);

  // Count and freshness per tag, from the notes already on screen.
  const stats = useMemo(() => {
    const m = new Map<string, { count: number; latest: number }>();
    for (const t of tags) m.set(t.id, { count: 0, latest: 0 });
    for (const n of notes) {
      for (const id of n.tagIds || []) {
        const row = m.get(id);
        if (!row) continue;
        row.count += 1;
        row.latest = Math.max(row.latest, Date.parse(n.updated_at) || 0);
      }
    }
    return m;
  }, [tags, notes]);

  const ordered = useMemo(() => {
    const st = (t: Tag) => stats.get(t.id) || { count: 0, latest: 0 };
    const byName = (a: Tag, b: Tag) => a.name.localeCompare(b.name);
    const list = [...tags];
    switch (sort) {
      case 'za': return list.sort((a, b) => byName(b, a));
      // Ties fall back to A to Z rather than to whatever order the server
      // returned, so the list is stable between renders and between sorts.
      case 'recent': return list.sort((a, b) => (st(b).latest - st(a).latest) || byName(a, b));
      case 'oldest': return list.sort((a, b) => (st(a).latest - st(b).latest) || byName(a, b));
      case 'most': return list.sort((a, b) => (st(b).count - st(a).count) || byName(a, b));
      case 'fewest': return list.sort((a, b) => (st(a).count - st(b).count) || byName(a, b));
      default: return list.sort(byName);
    }
  }, [tags, stats, sort]);

  return (
    <View style={{ marginBottom: Spacing.xxl }}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: Spacing.md,
        }}>
        <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>Tags</Text>
        <Pressable
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Change how tags are sorted"
          style={{
            flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
            paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
            borderRadius: Radius.pill, borderWidth: 1, borderColor: c.border,
            backgroundColor: c.surface,
          }}>
          <Text style={{ ...Type.small, fontSize: 11, color: c.textMuted }}>
            {TAG_SORTS.find((x) => x.key === sort)?.label}
          </Text>
          <Text style={{ color: c.textMuted, fontSize: 10 }}>{open ? '\u25B4' : '\u25BE'}</Text>
        </Pressable>
      </View>

      {open ? (
        <View
          style={{
            backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
            borderRadius: Radius.md, marginBottom: Spacing.md, overflow: 'hidden',
          }}>
          {TAG_SORTS.map((o) => (
            <Pressable
              key={o.key}
              accessibilityRole="button"
              onPress={() => { onChangeSort(o.key); setOpen(false); }}
              style={{ paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg }}>
              <Text
                style={{
                  ...Type.small,
                  color: o.key === sort ? c.textStrong : c.textMuted,
                  fontWeight: o.key === sort ? '700' : '400',
                }}>
                {o.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View
        style={{
          backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
          borderRadius: Radius.lg, overflow: 'hidden',
        }}>
        {ordered.map((t, i) => {
          const st = stats.get(t.id) || { count: 0, latest: 0 };
          return (
            <View
              key={t.id}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
                paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
                borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.border,
              }}>
              <View
                style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: t.color || c.accentQuiet,
                }}
              />
              <Text style={{ ...Type.body, color: c.text, flex: 1 }} numberOfLines={1}>{t.name}</Text>
              {/* The count, and nothing when a tag is empty. A "0" on every
                  unused tag turns a list of places into a scorecard. */}
              {st.count ? (
                <Text style={{ ...Type.small, color: c.textMuted }}>{st.count}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Blank({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ paddingVertical: Spacing.xxl }}>
      <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{title}</Text>
      <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.xs }}>{body}</Text>
    </View>
  );
}

/**
 * One note, whatever kind it is.
 *
 * The same card carries a standalone note, an annotation and a note the partner
 * shared, because they are the same object with different things known about
 * them. Branching into three components would mean three places to change when
 * a note gains a field.
 *
 * The source line matters more now than it did. Grouping used to say which
 * section an annotation came from; in one flat list the card has to say it
 * itself, or the only thing left indicating where a note came from is a quote
 * with no name on it.
 */
function NoteCard({
  note, tags, source, moved, author, readOnly, unread, onPress,
}: {
  note: Note;
  tags: Tag[];
  source?: ResolvedAnchor | null;
  moved?: boolean;
  author?: string;
  readOnly?: boolean;
  /** A note the partner shared that this reader has not opened. */
  unread?: boolean;
  onPress?: () => void;
}) {
  const heading = note.title?.trim() || leadLine(note.body);
  const showBody = !!note.body.trim() && note.body.trim() !== heading;
  const accent = source?.color;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={!onPress}
      style={{
        backgroundColor: c.surface,
        // Unread is carried by the border rather than by a dot in a corner.
        // The whole card is the thing that is new, and a card that looks
        // different is findable while scrolling, which is when someone is
        // looking for it.
        borderColor: unread ? c.accent : c.border,
        borderWidth: unread ? 1.5 : 1,
        borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
      }}>
      {unread ? (
        <Text style={{ ...Type.eyebrow, fontSize: 9, color: c.accent, marginBottom: Spacing.sm }}>
          New
        </Text>
      ) : null}
      {source ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
          <View
            style={{
              width: 22, height: 3, borderRadius: Radius.pill,
              backgroundColor: accent || c.border,
            }}
          />
          <Text style={{ ...Type.eyebrow, color: c.textMuted }}>{source.label}</Text>
        </View>
      ) : null}

      {/* What the note was written against, quoted as it read at the time. The
          rule on the left is the section's colour, so a quote is visibly not
          the person's own words. */}
      {note.anchor_context ? (
        <View
          style={{
            borderLeftWidth: 2, borderLeftColor: accent || c.border,
            paddingLeft: Spacing.md, marginBottom: Spacing.md,
          }}>
          <Text numberOfLines={3} style={{ ...Type.small, color: c.textMuted }}>
            {note.anchor_context}
          </Text>
        </View>
      ) : null}

      {moved ? (
        <Text style={{ ...Type.small, color: c.accentQuiet, marginBottom: Spacing.sm }}>
          This has been updated since you wrote this.
        </Text>
      ) : null}

      {heading ? (
        <Text numberOfLines={2} style={{ ...Type.cardTitle, color: c.textStrong }}>
          {heading}
        </Text>
      ) : null}

      {showBody ? (
        <Text numberOfLines={4} style={{ ...Type.body, color: c.text, marginTop: Spacing.xs }}>
          {note.body}
        </Text>
      ) : null}

      {/* Tags, so a note's tags are visible without opening it. Resolved
          against the tag list rather than stored on the note, so a renamed tag
          shows its new name everywhere at once. */}
      {note.tagIds?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.md }}>
          {note.tagIds
            .map((id) => tags.find((t) => t.id === id))
            .filter((t): t is Tag => !!t)
            .map((t) => (
              <View
                key={t.id}
                style={{
                  paddingVertical: 2, paddingHorizontal: Spacing.sm, borderRadius: Radius.pill,
                  backgroundColor: (t.color || c.textMuted) + '1A',
                  borderColor: (t.color || c.border) + '55', borderWidth: 1,
                }}>
                <Text style={{ ...Type.small, fontSize: 11, color: t.color || c.textMuted, fontWeight: '600' }}>
                  {t.name}
                </Text>
              </View>
            ))}
        </View>
      ) : null}

      <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.md }}>
        {author ? `${author}  \u00b7  ` : ''}
        {when(note.updated_at)}
        {!readOnly && note.visibility === 'shared' ? '  \u00b7  Shared' : ''}
      </Text>
    </Pressable>
  );
}

/**
 * Writing and editing, in a sheet over the list.
 *
 * Sharing is a switch of its own rather than part of saving. It is a different
 * decision with a different consequence, and someone fixing a typo should not
 * be able to show the note to their partner by accident.
 *
 * Only ever opened on the person's own notes. The server refuses anyone else's,
 * and the shared list does not offer the press that opens this.
 */
function Editor({
  note, tags, canShare, partner, onClose, onSaved,
}: {
  note: Note | null;
  tags: Tag[];
  canShare: boolean;
  partner: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [isShared, setIsShared] = useState(note?.visibility === 'shared');
  const [picked, setPicked] = useState<string[]>(note?.tagIds ?? []);
  const [busy, setBusy] = useState(false);

  const wasShared = note?.visibility === 'shared';
  const canSave = body.trim().length > 0 && !busy;

  const save = async () => {
    setBusy(true);
    const cleanTitle = title.trim() || null;

    if (!note) {
      const res = await createNote({
        body: body.trim(),
        title: cleanTitle ?? undefined,
        visibility: isShared ? 'shared' : 'private',
        tagIds: picked,
      });
      setBusy(false);
      if (!res.ok) return Alert.alert('Not saved', 'That did not save. Try again in a moment.');
      return onSaved();
    }

    const res = await updateNote({ id: note.id, title: cleanTitle, body: body.trim(), tagIds: picked });
    if (!res.ok) {
      setBusy(false);
      return Alert.alert('Not saved', 'That did not save. Try again in a moment.');
    }
    // Visibility is a separate action on the server, so it is a separate call.
    // Only made when it actually changed.
    if (isShared !== wasShared) {
      const s = await shareNote(note.id, isShared ? 'shared' : 'private');
      if (!s.ok) {
        setBusy(false);
        return Alert.alert('Saved, not shared', 'The note saved. Sharing did not go through.');
      }
    }
    setBusy(false);
    onSaved();
  };

  const remove = () => {
    if (!note) return;
    Alert.alert('Delete this note?', 'This cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const res = await deleteNote(note.id);
          setBusy(false);
          if (!res.ok) return Alert.alert('Not deleted', 'That did not delete. Try again in a moment.');
          onSaved();
        },
      },
    ]);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: c.background }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
            }}>
            <Pressable
      accessibilityRole="button" onPress={onClose} hitSlop={10} disabled={busy}>
              <Text style={{ ...Type.body, color: c.textMuted }}>Close</Text>
            </Pressable>
            <Pressable
      accessibilityRole="button" onPress={save} hitSlop={10} disabled={!canSave}>
              {busy ? (
                <ActivityIndicator color={c.accentQuiet} />
              ) : (
                <Text style={{ ...Type.body, color: canSave ? c.accent : c.textMuted, fontWeight: '700' }}>
                  Save
                </Text>
              )}
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl,
              maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
            }}
            keyboardShouldPersistTaps="handled">
            {/* An annotation's anchor is not editable, so it is shown as the
                heading rather than a field: it says what this note is about
                without pretending it can be changed here. */}
            {note?.anchor_context ? (
              <View
                style={{
                  borderLeftWidth: 2, borderLeftColor: c.border,
                  paddingLeft: Spacing.md, marginBottom: Spacing.lg,
                }}>
                <Text style={{ ...Type.small, color: c.textMuted }}>{note.anchor_context}</Text>
              </View>
            ) : null}

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Title"
              placeholderTextColor={c.textMuted}
              style={{ ...inputType(Type.title), color: c.textStrong, paddingVertical: Spacing.sm }}
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Write it down."
              placeholderTextColor={c.textMuted}
              multiline
              autoFocus={!note}
              textAlignVertical="top"
              style={{ ...inputType(Type.body), color: c.text, minHeight: 180, paddingVertical: Spacing.sm }}
            />

            {/* Tags. The list is seeded server-side from the live dimension and
                category lists, so these are the same names a person sees on
                their results rather than free text that drifts from them. */}
            {tags.length ? (
              <View style={{ marginTop: Spacing.xl }}>
                <Text style={{ ...Type.eyebrow, color: c.textMuted, marginBottom: Spacing.sm }}>
                  Tags
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                  {tags.map((t) => {
                    const on = picked.includes(t.id);
                    return (
                      <Pressable
      accessibilityRole="button"
                        key={t.id}
                        onPress={() => setPicked((p) => (on ? p.filter((x) => x !== t.id) : [...p, t.id]))}
                        style={{
                          paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md,
                          borderRadius: Radius.pill, borderWidth: 1,
                          backgroundColor: on ? (t.color || c.textStrong) : c.surface,
                          borderColor: on ? (t.color || c.textStrong) : c.border,
                        }}>
                        <Text style={{ ...Type.small, fontSize: 12, fontWeight: '600', color: on ? Palette.white : c.textMuted }}>
                          {t.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {canShare ? (
              <View
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
                  borderRadius: Radius.lg, padding: Spacing.lg, marginTop: Spacing.xl,
                }}>
                <View style={{ flex: 1, paddingRight: Spacing.lg }}>
                  <Text style={{ ...Type.cardTitle, color: c.textStrong }}>Share with {partner}</Text>
                  <Text style={{ ...Type.small, color: c.textMuted, marginTop: 2 }}>
                    They can read it. Only you can change it.
                  </Text>
                </View>
                <Switch
                  value={isShared}
                  onValueChange={setIsShared}
                  trackColor={{ true: c.accent, false: c.border }}
                />
              </View>
            ) : null}

            {note ? (
              <Pressable
      accessibilityRole="button" onPress={remove} disabled={busy} style={{ marginTop: Spacing.xxl, alignSelf: 'flex-start' }}>
                <Text style={{ ...Type.small, color: c.accentQuiet, fontWeight: '700' }}>Delete note</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
