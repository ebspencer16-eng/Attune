/**
 * What a reader can do with a sentence they have chosen.
 *
 * ── ELLIE'S SPEC ──────────────────────────────────────────────────────────
 * "a small popup menu that has icons for highlight, underline, tag, note, or
 * share", and then:
 *
 *   highlight  a popup with the colour options
 *   underline  same thing
 *   tag        a list of their tags, plus a way to make a new one
 *   note       a little text box to write a note
 *   share      a textbox for optional commentary, then send to partner
 *              whether or not anything was written
 *
 * ── WHY ONE COMPONENT AND NOT FIVE ────────────────────────────────────────
 * All five produce the same row in the same table. They differ in what they
 * ask for first, and in nothing else. Five components would mean five copies
 * of "build the anchor, call createNote, tell the caller it worked", and the
 * last one would drift.
 *
 * So this is a small state machine over one screen: `step` is what is being
 * asked, and every path ends in the same save.
 *
 * ── THE SHARE STEP ────────────────────────────────────────────────────────
 * Sharing is deliberately its own step rather than a toggle on the note box.
 * Sending a thought about your relationship to your partner is not a checkbox,
 * and the button says who it is going to.
 */

import { useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { createNote, createTag, type Tag } from '@/api/client';
import {
  ANNOTATION_COLORS, DEFAULT_ANNOTATION_COLOR, annotationColor,
  type AnnotationKind,
} from '@/constants/annotations';
import { Colors, Radius, Spacing, Type, Palette } from '@/constants/attune-theme';

const c = Colors.light;

type Step = 'menu' | 'highlight' | 'underline' | 'tag' | 'note' | 'share' | 'saving';

/** The five things the menu offers, in the order Ellie listed them. */
const ACTIONS: { step: Step; icon: string; label: string }[] = [
  { step: 'highlight', icon: 'highlighter', label: 'Highlight' },
  { step: 'underline', icon: 'underline', label: 'Underline' },
  { step: 'tag', icon: 'tag', label: 'Tag' },
  { step: 'note', icon: 'square.and.pencil', label: 'Note' },
  { step: 'share', icon: 'paperplane', label: 'Share' },
];

export default function AnnotationSheet({
  sentence, anchorType, anchorKey, tags, partnerName, onClose, onSaved,
}: {
  /** The chosen text. Stored as the anchor context, so a mark can find its
   *  sentence again and a note can quote what it is about. */
  sentence: string;
  anchorType: string;
  anchorKey: string;
  /** The reader's tags, already loaded by the screen. Passed in rather than
   *  fetched here so opening this does not cost a request. */
  tags: Tag[];
  partnerName: string;
  onClose: () => void;
  /** Told what was created, so the page can paint the mark without refetching. */
  onSaved: (created: { id: string; kind: AnnotationKind; color: string | null; text: string }) => void;
}) {
  const [step, setStep] = useState<Step>('menu');
  const [body, setBody] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [localTags, setLocalTags] = useState<Tag[]>(tags);
  const [error, setError] = useState<string | null>(null);

  /**
   * One save for all five paths.
   *
   * Everything that differs is an argument. A highlight is a mark with a
   * colour and no words; a note is words with no colour; a share is a note
   * that is visible to the partner. The anchor and the quoted sentence are the
   * same in every case, which is the whole reason this is one function.
   */
  const save = async (opts: {
    kind: AnnotationKind;
    color?: string | null;
    shared?: boolean;
  }) => {
    setStep('saving');
    setError(null);
    const res = await createNote({
      body: opts.kind === 'note' || opts.shared ? body.trim() : '',
      kind: opts.kind,
      color: opts.color ?? null,
      visibility: opts.shared ? 'shared' : 'private',
      anchorType,
      anchorKey,
      anchorContext: sentence,
      tagIds: picked.length ? picked : undefined,
    });
    if (!res.ok) {
      setError(res.error.kind === 'unauthorized'
        ? 'Your session ended. Sign in and try again.'
        : 'That did not save. Try again.');
      setStep('menu');
      return;
    }
    onSaved({
      id: res.data.note.id,
      kind: opts.kind,
      color: opts.color ?? null,
      text: sentence,
    });
    onClose();
  };

  const addTag = async () => {
    const name = newTag.trim();
    if (!name) return;
    const res = await createTag(name);
    if (!res.ok) { setError('That tag did not save.'); return; }
    setLocalTags((prev) => [...prev, res.data.tag]);
    setPicked((prev) => [...prev, res.data.tag.id]);
    setNewTag('');
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.md,
          }}>
          <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>
            {step === 'menu' ? 'Selected' : ACTIONS.find((a) => a.step === step)?.label || 'Saving'}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Text style={{ ...Type.small, color: c.textMuted, fontWeight: '700' }}>Close</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl }}>
          {/* The sentence stays on screen through every step. Someone choosing
              a colour or writing a note should not have to remember what they
              picked. */}
          <View
            style={{
              backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
              borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg,
            }}>
            <Text style={{ ...Type.body, color: c.text, fontStyle: 'italic' }}>{sentence}</Text>
          </View>

          {error ? (
            <Text style={{ ...Type.small, color: '#B5546E', marginBottom: Spacing.md }}>{error}</Text>
          ) : null}

          {step === 'saving' ? <ActivityIndicator color={c.accent} /> : null}

          {step === 'menu' ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm }}>
              {ACTIONS.map((a) => (
                <Pressable
                  key={a.step}
                  onPress={() => setStep(a.step)}
                  accessibilityRole="button"
                  accessibilityLabel={a.label}
                  style={{
                    flex: 1, alignItems: 'center', gap: Spacing.xs,
                    paddingVertical: Spacing.lg, borderRadius: Radius.md,
                    backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
                  }}>
                  <SymbolView
                    name={a.icon as never}
                    size={22}
                    tintColor={c.accent}
                    fallback={<Text style={{ color: c.accent, fontSize: 18 }}>{a.label[0]}</Text>}
                  />
                  <Text style={{ ...Type.small, fontSize: 11, color: c.textMuted }}>{a.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {step === 'highlight' || step === 'underline' ? (
            <View>
              <Text style={{ ...Type.small, color: c.textMuted, marginBottom: Spacing.md }}>
                Pick a colour.
              </Text>
              {ANNOTATION_COLORS.map((col) => (
                <Pressable
                  key={col.key}
                  accessibilityRole="button"
                  onPress={() => save({ kind: step as AnnotationKind, color: col.key })}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
                    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
                    borderRadius: Radius.md, marginBottom: Spacing.sm,
                    backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
                  }}>
                  {/* The swatch is the mark itself, not an abstract dot: a
                      highlight shows its wash, an underline its line. Choosing
                      a colour from a preview of the wrong thing is a guess. */}
                  <View
                    style={{
                      width: 44, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: step === 'highlight' ? col.wash : 'transparent',
                      borderBottomWidth: step === 'underline' ? 2 : 0,
                      borderBottomColor: col.ink,
                    }}>
                    <Text style={{ ...Type.small, color: c.textStrong }}>Aa</Text>
                  </View>
                  <Text style={{ ...Type.body, color: c.text }}>{col.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {step === 'tag' ? (
            <View>
              <Text style={{ ...Type.small, color: c.textMuted, marginBottom: Spacing.md }}>
                Tap the tags this belongs in.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg }}>
                {localTags.map((t) => {
                  const on = picked.includes(t.id);
                  return (
                    <Pressable
                      key={t.id}
                      accessibilityRole="button"
                      onPress={() => setPicked((p) => (on ? p.filter((x) => x !== t.id) : [...p, t.id]))}
                      style={{
                        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
                        borderRadius: Radius.pill, borderWidth: 1,
                        backgroundColor: on ? c.textStrong : c.surface,
                        borderColor: on ? c.textStrong : c.border,
                      }}>
                      <Text style={{ ...Type.small, color: on ? Palette.white : c.text }}>{t.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg }}>
                <TextInput
                  value={newTag}
                  onChangeText={setNewTag}
                  placeholder="New tag"
                  placeholderTextColor={c.textMuted}
                  onSubmitEditing={addTag}
                  returnKeyType="done"
                  style={{
                    flex: 1, ...Type.body, color: c.text, paddingHorizontal: Spacing.md,
                    paddingVertical: Spacing.md, borderRadius: Radius.md,
                    backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
                  }}
                />
                <Pressable
                  onPress={addTag}
                  accessibilityRole="button"
                  style={{
                    paddingHorizontal: Spacing.lg, justifyContent: 'center',
                    borderRadius: Radius.md, backgroundColor: c.surface,
                    borderColor: c.border, borderWidth: 1,
                  }}>
                  <Text style={{ ...Type.small, fontWeight: '700', color: c.text }}>Add</Text>
                </Pressable>
              </View>
              <Primary
                label={picked.length ? `Save with ${picked.length} tag${picked.length === 1 ? '' : 's'}` : 'Save'}
                onPress={() => save({ kind: 'note' })}
              />
            </View>
          ) : null}

          {step === 'note' || step === 'share' ? (
            <View>
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder={step === 'share' ? 'Add a message (optional)' : 'Write a note'}
                placeholderTextColor={c.textMuted}
                multiline
                autoFocus
                style={{
                  ...Type.body, color: c.text, minHeight: 120, textAlignVertical: 'top',
                  padding: Spacing.lg, borderRadius: Radius.md, marginBottom: Spacing.lg,
                  backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
                }}
              />
              {/* Share sends whether or not anything was typed, which is what
                  Ellie asked for: the sentence is the message, and the box is
                  for saying something about it if you want to. */}
              <Primary
                label={step === 'share' ? `Send to ${partnerName}` : 'Save note'}
                disabled={step === 'note' && !body.trim()}
                onPress={() => save({ kind: 'note', shared: step === 'share' })}
              />
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Primary({
  label, onPress, disabled,
}: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={{
        paddingVertical: Spacing.lg, borderRadius: Radius.md, alignItems: 'center',
        backgroundColor: disabled ? c.border : c.textStrong,
      }}>
      <Text style={{ ...Type.small, fontWeight: '700', color: disabled ? c.textMuted : Palette.white }}>
        {label}
      </Text>
    </Pressable>
  );
}
