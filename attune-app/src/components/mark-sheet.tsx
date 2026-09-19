/**
 * A mark you already made, opened from the margin.
 *
 * ── WHAT ELLIE ASKED FOR ──────────────────────────────────────────────────
 * "I have a note called test that I can't find. It says it's in internal
 * processing but there's no icon on the page to point it out. I want the icons
 * to be on the right hand side and for when I click on it to see a pop up with
 * the note, the date it was left, the toggle for shared/private, the option to
 * tag the note, and option to delete the note."
 *
 * ── WHY IT IS NOT AnnotationSheet ─────────────────────────────────────────
 * That one asks what to do with a sentence you have just chosen. This one
 * shows a mark that already exists. They share a table and nothing else: one
 * is a question with five answers, the other is a record with four controls.
 * Folding them together would mean a state machine whose first branch is
 * "does this exist yet", which is two components wearing one name.
 *
 * ── WHAT EACH CONTROL COSTS ───────────────────────────────────────────────
 * Sharing goes through shareNote rather than updateNote, because the server
 * treats it as its own decision and so should this: showing your partner
 * something you wrote about your relationship is not a field on a form.
 *
 * Tagging sends the whole set rather than a diff, for the same reason the
 * checklist does: a full set cannot half-apply.
 *
 * Deleting asks first. Ellie: "are you sure? This action cannot be undone."
 * Her words, and the reason is that the mark is the only copy of what she
 * wrote; the words underneath it belong to the product, but the note does not.
 */

import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { deleteNote, shareNote, updateNote, type Note, type Tag } from '@/api/client';
import { annotationColor } from '@/constants/annotations';
import { Colors, Palette, Radius, Spacing, Type } from '@/constants/attune-theme';

const c = Colors.light;

/**
 * The day it was left, in words.
 *
 * Long month rather than a slash-separated date, because this is read once and
 * not scanned in a column, and because 9/5 means two different days depending
 * on who is holding the phone.
 */
function leftOn(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** What a mark of each kind is called, so the sheet can name what it is. */
const KIND_LABEL: Record<string, string> = {
  note: 'Note',
  highlight: 'Highlight',
  underline: 'Underline',
};

export default function MarkSheet({
  note, tags, partnerName, onClose, onChanged, onDeleted,
}: {
  note: Note;
  /** The reader's tags, already loaded by the screen. */
  tags: Tag[];
  partnerName: string;
  onClose: () => void;
  /** The row changed. The screen replaces its copy rather than refetching. */
  onChanged: (note: Note) => void;
  onDeleted: (id: string) => void;
}) {
  const [shared, setShared] = useState(note.visibility === 'shared');
  const [picked, setPicked] = useState<string[]>(note.tagIds || []);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  /** The chips, closed until the tag icon is tapped. The editor's rule. */
  const [showTags, setShowTags] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tone = annotationColor(note.color);
  const date = leftOn(note.created_at);
  const kind = KIND_LABEL[note.kind || 'note'] || 'Note';

  /**
   * Optimistic, then corrected.
   *
   * A toggle that waits for a round trip before it moves reads as a tap that
   * missed, and this one is two taps away from the thing it describes. If the
   * write fails the switch goes back and says so.
   */
  const toggleShare = async () => {
    const next = !shared;
    setShared(next);
    setError(null);
    const res = await shareNote(note.id, next ? 'shared' : 'private');
    if (!res.ok) {
      setShared(!next);
      setError('That did not save. Try again.');
      return;
    }
    onChanged({ ...note, visibility: next ? 'shared' : 'private' });
  };

  const toggleTag = async (id: string) => {
    const next = picked.includes(id) ? picked.filter((t) => t !== id) : [...picked, id];
    setPicked(next);
    setError(null);
    const res = await updateNote({ id: note.id, tagIds: next });
    if (!res.ok) {
      setPicked(picked);
      setError('That did not save. Try again.');
      return;
    }
    onChanged({ ...note, tagIds: next });
  };

  const remove = async () => {
    setBusy(true);
    const res = await deleteNote(note.id);
    setBusy(false);
    if (!res.ok) { setError('That did not delete. Try again.'); setConfirming(false); return; }
    onDeleted(note.id);
    onClose();
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessibilityLabel="Close"
        style={{ flex: 1, backgroundColor: 'rgba(14,11,7,0.42)', justifyContent: 'flex-end' }}>
        {/* The card stops the tap that closes the sheet. */}
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: Radius.xl + 10, borderTopRightRadius: Radius.xl + 10,
            paddingTop: Spacing.lg, paddingBottom: Spacing.xxxl,
            maxHeight: '86%',
          }}>
          {/* The grabber. It is the one thing that says this came up from the
              bottom and can go back down. */}
          <View
            style={{
              alignSelf: 'center', width: 38, height: 4, borderRadius: 2,
              backgroundColor: c.border, marginBottom: Spacing.lg,
            }}
          />

          <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.xl }}>
            {/* ── THE WORDS IT SITS ON, FIRST ────────────────────────────
                Ellie: "put the quote from the text above the note eyebrow and
                the date, that line should be above the note text itself."

                Which is the right order and worth saying why: the quote is the
                thing you recognise. It is what tells you which note this is
                before you have read a word of it, so it goes at the top and
                the label and the date sit between it and what you wrote. */}
            {note.anchor_context ? (
              <View style={{ paddingLeft: Spacing.lg, borderLeftWidth: 3, borderLeftColor: tone.ink }}>
                <Text style={{ ...Type.body, color: c.textMuted }}>{note.anchor_context}</Text>
              </View>
            ) : null}

            <View
              style={{
                flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                marginTop: note.anchor_context ? Spacing.xl : 0,
              }}>
              <View
                style={{
                  width: 26, height: 26, borderRadius: 13,
                  backgroundColor: tone.wash,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                <SymbolView
                  name={(picked.length ? 'tag' : 'square.and.pencil') as never}
                  size={13}
                  tintColor={tone.ink}
                  fallback={<Text style={{ ...Type.small, color: tone.ink }}>{'\u2022'}</Text>}
                  style={{ width: 14, height: 14 }}
                />
              </View>
              <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>{kind}</Text>
              {date ? (
                <Text style={{ ...Type.small, color: c.textMuted, marginLeft: 'auto' }}>{date}</Text>
              ) : null}
            </View>

            {/* What you wrote, in italics. Ellie: "The note text itself should
                be italicized." It sets the thing a person wrote apart from the
                product's own words above and below it. */}
            <Text
              style={{
                ...Type.body, color: note.body ? c.text : c.textMuted,
                fontStyle: 'italic', marginTop: Spacing.lg, lineHeight: 25,
              }}>
              {note.body || `A ${kind.toLowerCase()} with nothing written under it.`}
            </Text>

            {/* ── ONE ROW: FILE IT, AND WHO CAN SEE IT ───────────────────
                Ellie: "make the private/public the toggle like it exists on
                the writing a note page rather than a switch like it is here.
                Can also remove tags as its own section and put it in line with
                the privacy toggle as just a tag icon with the plus sign?"

                So it is the editor's own control, a Switch with the partner
                named beside it, rather than a second thing that does the same
                job in a different shape. Tagging is the icon at the other end
                of the same row, and the chips open under it when asked for,
                which is exactly how the editor does it. */}
            <View
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                marginTop: Spacing.xxl,
              }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showTags }}
                accessibilityLabel={picked.length ? `${picked.length} tags` : 'Add a tag'}
                onPress={() => setShowTags((v) => !v)}
                hitSlop={10}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <SymbolView
                  name="tag"
                  size={17}
                  tintColor={picked.length ? c.accent : c.accentQuiet}
                  fallback={<Text style={{ ...Type.small, color: c.accentQuiet }}>{'#'}</Text>}
                  style={{ width: 19, height: 19 }}
                />
                <SymbolView
                  name="plus"
                  size={10}
                  tintColor={picked.length ? c.accent : c.accentQuiet}
                  fallback={<Text style={{ ...Type.small, color: c.accentQuiet }}>{'+'}</Text>}
                  style={{ width: 11, height: 11 }}
                />
                {picked.length ? (
                  <Text style={{ ...Type.small, color: c.accent, fontWeight: '700', marginLeft: 4 }}>
                    {String(picked.length)}
                  </Text>
                ) : null}
              </Pressable>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <Text style={{ ...Type.body, color: c.text }}>{`Share with ${partnerName}`}</Text>
                <Switch
                  value={shared}
                  onValueChange={toggleShare}
                  trackColor={{ true: c.accent, false: c.border }}
                />
              </View>
            </View>

            {showTags ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md }}>
                {tags.length ? tags.map((t) => {
                  const on = picked.includes(t.id);
                  return (
                    <Pressable
                      key={t.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => toggleTag(t.id)}
                      style={{
                        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
                        borderRadius: Radius.pill, borderWidth: 1,
                        backgroundColor: on ? c.textStrong : c.surface,
                        borderColor: on ? c.textStrong : c.border,
                      }}>
                      <Text style={{ ...Type.small, color: on ? Palette.white : c.text }}>{t.name}</Text>
                    </Pressable>
                  );
                }) : (
                  <Text style={{ ...Type.small, color: c.textMuted }}>
                    No tags yet. Add one on the Notes tab.
                  </Text>
                )}
              </View>
            ) : null}

            {error ? (
              <Text style={{ ...Type.small, color: c.accent, marginTop: Spacing.lg }}>{error}</Text>
            ) : null}

            {/* ── DELETE ──────────────────────────────────────────────────
                Two taps, and the second one says what it means. Ellie's
                words: "are you sure? This action cannot be undone." */}
            <View style={{ marginTop: Spacing.xxl, borderTopWidth: 1, borderTopColor: c.border, paddingTop: Spacing.lg }}>
              {confirming ? (
                <View>
                  <Text style={{ ...Type.body, color: c.textStrong }}>
                    Are you sure? This action cannot be undone.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg }}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={remove}
                      disabled={busy}
                      style={{
                        flex: 1, alignItems: 'center', borderRadius: Radius.pill,
                        backgroundColor: c.accent, paddingVertical: Spacing.md,
                      }}>
                      {busy
                        ? <ActivityIndicator color={Palette.white} />
                        : <Text style={{ ...Type.cardTitle, color: Palette.white }}>Delete</Text>}
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setConfirming(false)}
                      style={{
                        flex: 1, alignItems: 'center', borderRadius: Radius.pill,
                        borderWidth: 1, borderColor: c.border, paddingVertical: Spacing.md,
                      }}>
                      <Text style={{ ...Type.cardTitle, color: c.textMuted }}>Keep it</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setConfirming(true)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm }}>
                  <SymbolView
                    name={'trash' as never}
                    size={15}
                    tintColor={c.accent}
                    fallback={<Text style={{ ...Type.small, color: c.accent }}>{'✕'}</Text>}
                    style={{ width: 16, height: 17 }}
                  />
                  <Text style={{ ...Type.cardTitle, color: c.accent }}>Delete this {kind.toLowerCase()}</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
