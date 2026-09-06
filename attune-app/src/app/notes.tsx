/**
 * Notes.
 *
 * One list, newest first: notes you wrote, annotations you left on something,
 * and what your partner shared with you, in the order they last changed.
 *
 * It was three lists behind a pill row. That shape asked you to know which of
 * three places a note was in before you could look for it, which is a question
 * about how the data is stored rather than about the note. A single stream
 * answers "what did we write" without making anyone choose a lane first.
 *
 * The three still arrive separately from /api/notes, because they are separate
 * questions server-side, and shared notes have to stay distinguishable: only
 * the author edits one, so the card has to know whose it is.
 *
 * Filtering by tag, source, author, and highlight against commentary is
 * deliberately not built yet. Every one of those filters cuts on something the
 * Results and In Practice screens have not defined, so building the controls
 * now means guessing at anchors and reworking them. See HANDOFF.md.
 *
 * Nothing here decides what an anchor means. That resolution lives in
 * constants/anchors.ts and derives from the standard tags the server seeds, so
 * a renamed dimension relabels itself instead of going stale.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable,
  RefreshControl, ScrollView, Switch, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createNote, deleteNote, fetchHome, fetchNotes, fetchPosts, fetchResults, fetchTags,
  shareNote, updateNote,
} from '@/api/client';
import type { ApiError, Note, Tag } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import SignIn from '@/components/sign-in';
import { resolveAnchor } from '@/constants/anchors';
import type { AnchorContext, ResolvedAnchor } from '@/constants/anchors';
import {
  Colors, MaxContentWidth, Palette, Radius, Spacing, Type,
} from '@/constants/attune-theme';

const c = Colors.light;

/** A note plus the two things the list has to know that the row itself does not. */
type Row = { note: Note; readOnly: boolean };

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [annotations, setAnnotations] = useState<Note[]>([]);
  const [shared, setShared] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [postTitles, setPostTitles] = useState<Record<string, string>>({});
  const [resultsVersion, setResultsVersion] = useState<number | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [partnerLinked, setPartnerLinked] = useState(false);

  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Note | 'new' | null>(null);

  const load = useCallback(async () => {
    // Three calls that are always needed. Tags are fetched for their labels,
    // and fetching them is also what seeds them on a first open.
    const [n, t, h] = await Promise.all([fetchNotes(), fetchTags(), fetchHome()]);

    if (!n.ok) {
      setError(n.error);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setError(null);
    setNotes(n.data.notes);
    setAnnotations(n.data.annotations);
    setShared(n.data.sharedWithMe);
    if (t.ok) setTags(t.data.tags);
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
  }, []);

  useEffect(() => { load(); }, [load]);

  const anchorCtx: AnchorContext = useMemo(() => {
    const byKey = new Map(tags.filter((t) => t.standard_key).map((t) => [t.standard_key as string, t]));
    return {
      tag: (key) => {
        const found = byKey.get(key);
        return found ? { name: found.name, color: found.color } : undefined;
      },
      postTitle: (id) => postTitles[id],
    };
  }, [tags, postTitles]);

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
  const rows: Row[] = useMemo(() => {
    const mine = [...notes, ...annotations].map((note) => ({ note, readOnly: false }));
    const theirs = shared.map((note) => ({ note, readOnly: true }));
    return [...mine, ...theirs].sort(
      (a, b) => Date.parse(b.note.updated_at) - Date.parse(a.note.updated_at),
    );
  }, [notes, annotations, shared]);

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
          {rows.length ? (
            rows.map(({ note, readOnly }) => (
              <NoteCard
                key={note.id}
                note={note}
                source={note.anchor_type ? resolveAnchor(note, anchorCtx) : null}
                moved={hasMoved(note, resultsVersion)}
                author={readOnly ? partner : undefined}
                readOnly={readOnly}
                // A note the partner shared is theirs. The server refuses an
                // edit from anyone but the author, so the row does not open an
                // editor that could only ever fail to save.
                onPress={readOnly ? undefined : () => setEditing(note)}
              />
            ))
          ) : (
            <Blank
              title="No notes yet"
              body="Anything you write here stays private until you choose to share it."
            />
          )}
        </View>
      </ScrollView>

      {editing ? (
        <Editor
          note={editing === 'new' ? null : editing}
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
  note, source, moved, author, readOnly, onPress,
}: {
  note: Note;
  source?: ResolvedAnchor | null;
  moved?: boolean;
  author?: string;
  readOnly?: boolean;
  onPress?: () => void;
}) {
  const heading = note.title?.trim() || leadLine(note.body);
  const showBody = !!note.body.trim() && note.body.trim() !== heading;
  const accent = source?.color;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
        borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
      }}>
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
  note, canShare, partner, onClose, onSaved,
}: {
  note: Note | null;
  canShare: boolean;
  partner: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [isShared, setIsShared] = useState(note?.visibility === 'shared');
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
      });
      setBusy(false);
      if (!res.ok) return Alert.alert('Not saved', 'That did not save. Try again in a moment.');
      return onSaved();
    }

    const res = await updateNote({ id: note.id, title: cleanTitle, body: body.trim() });
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
            <Pressable onPress={onClose} hitSlop={10} disabled={busy}>
              <Text style={{ ...Type.body, color: c.textMuted }}>Close</Text>
            </Pressable>
            <Pressable onPress={save} hitSlop={10} disabled={!canSave}>
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
              style={{ ...Type.title, color: c.textStrong, paddingVertical: Spacing.sm }}
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Write it down."
              placeholderTextColor={c.textMuted}
              multiline
              autoFocus={!note}
              textAlignVertical="top"
              style={{ ...Type.body, color: c.text, minHeight: 180, paddingVertical: Spacing.sm }}
            />

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
              <Pressable onPress={remove} disabled={busy} style={{ marginTop: Spacing.xxl, alignSelf: 'flex-start' }}>
                <Text style={{ ...Type.small, color: c.accentQuiet, fontWeight: '700' }}>Delete note</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
