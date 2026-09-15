/**
 * The marking layer, available to any piece of prose inside the results.
 *
 * ── WHY A CONTEXT AND NOT PROPS ───────────────────────────────────────────
 * Annotating is a property of the reader, not of the paragraph. Every prose
 * block in the results is a candidate, they are spread across a dozen screens
 * and thirty sections, and threading "here are your marks, here is what to do
 * when one is chosen, here is which section we are on" through all of them
 * would be the same four props repeated everywhere, with the last screen
 * someone adds forgetting one.
 *
 * So a provider wraps the results once and `<Prose>` replaces `<Text>` at each
 * site. A Prose outside the provider is a Text: the fallback is the plain
 * string, never a broken screen.
 *
 * ── WHY MARKS ARE MATCHED BY TEXT ─────────────────────────────────────────
 * A note stores anchor_type, anchor_key and anchor_context. The first two say
 * which screen; the third is the exact sentence. There is no character offset,
 * and deliberately so: results copy is versioned and regenerated, and an offset
 * into a paragraph that has been rewritten points at the middle of a different
 * word. A sentence either still exists or it does not, and a mark whose
 * sentence is gone is simply not drawn rather than drawn in the wrong place.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Text, View, type StyleProp, type TextStyle } from 'react-native';

import Annotatable, { type Mark, type MarkAction } from '@/components/annotatable';
import { annotationColor } from '@/constants/annotations';
import AnnotationSheet from '@/components/annotation-sheet';
import { deleteNote, type Note, type Tag } from '@/api/client';

type Ctx = {
  /** Marks on the section currently on screen, by the text they sit on. */
  marks: Mark[];
  /**
   * A fragment was chosen, and what to do with it.
   *
   * The kind comes from the toolbar that appears over the selection, so the
   * sheet opens on that step rather than on a menu the reader has already
   * been through. Ellie asked for the toolbar to be the menu.
   */
  select: (sentence: string, action: MarkAction) => void;
  /**
   * Take a mark off. Ellie asked for a bin in the toolbar, greyed out unless
   * the selection is sitting on a mark, and this is what it calls.
   */
  remove: (mark: Mark) => void;
  /** Whether anything can be marked at all. False outside the provider. */
  enabled: boolean;
};

const AnnotationCtx = createContext<Ctx>({
  marks: [], select: () => {}, remove: () => {}, enabled: false,
});

export function useAnnotations() {
  return useContext(AnnotationCtx);
}

/**
 * Drop-in for a `<Text>` carrying results prose.
 *
 * Same props a Text takes, so converting a site is a one-word change and the
 * style stays where it was.
 */
export function Prose({
  children, style,
}: { children: string | null | undefined; style?: StyleProp<TextStyle> }) {
  const { marks, select, remove, enabled } = useAnnotations();
  const text = children || '';
  if (!enabled || !text) return <Text style={style}>{text}</Text>;

  /**
   * ── THE MARGIN MARKER ────────────────────────────────────────────────────
   * Ellie: "I would like for the pages to designate in the margins when there
   * are tags / notes so that it's easy to see when you scroll/click around."
   *
   * A highlight and an underline are already visible in the text, so they need
   * nothing. A note and a tag change nothing about the words, which is the
   * point of them and also the problem: scroll past and there is no sign
   * anything is there.
   *
   * So the marker is for the invisible ones. It sits in the page's own left
   * gutter, absolutely positioned so it cannot reflow the paragraph however
   * long the text is, and it is not hit-testable: it is a sign, not a control.
   * Tapping it would be a second way to open something the text already opens.
   */
  const mine = marks.filter((m) => text.includes(m.text));
  const silent = mine.filter((m) => m.kind === 'note');
  const tone = annotationColor(mine.find((m) => m.color)?.color);

  const body = <Annotatable text={text} style={style} marks={marks} onSelect={select} onRemove={remove} />;
  if (!silent.length) return body;

  return (
    <View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', left: -12, top: 5,
          width: 3, height: 16, borderRadius: 2,
          backgroundColor: tone.ink,
        }}
      />
      {body}
    </View>
  );
}

export function AnnotationProvider({
  children, section, notes, tags, partnerName, onCreated, onRemoved,
  anchorType = 'results_section', anchorKey,
}: {
  children: ReactNode;
  /** The results section on screen. Becomes the anchor key. */
  section: string;
  /**
   * What kind of thing is being marked.
   *
   * Results prose was the only kind for a long time, so this was assumed. An
   * In Practice article is the other kind: its anchor is `post_block`, and its
   * key is the post's slug and a block id. The validator in api/_lib/tags.js
   * has accepted both since notes existed; only one had ever been written.
   */
  anchorType?: string;
  /** What a new mark anchors to. Defaults to the section itself. */
  anchorKey?: string;
  /** The reader's own notes. Shared ones from the partner are not marks on
   *  this reader's text and are not passed in. */
  notes: Note[];
  tags: Tag[];
  partnerName: string;
  /** A new mark was made, so the screen can add it without refetching. */
  onCreated: (note: Note) => void;
  /**
   * A mark was taken off, so the screen can drop it without refetching.
   * Optional: a screen that does not pass it simply keeps drawing the mark
   * until its next load, which is wrong but not broken.
   */
  onRemoved?: (id: string) => void;
}) {
  const [selected, setSelected] = useState<{ text: string; action: MarkAction } | null>(null);
  const key = anchorKey || section;

  const marks = useMemo<Mark[]>(() => notes
    .filter((n) => n.anchor_type === anchorType
      // A post's marks are keyed `slug#block`, so a reader's marks on this
      // article are the ones whose key starts with its slug. A results
      // section's key is the section id and matches outright.
      && (n.anchor_key === section || (n.anchor_key || '').startsWith(`${section}#`))
      && !!n.anchor_context)
    .map((n) => ({
      id: n.id,
      kind: n.kind || 'note',
      color: n.color ?? null,
      text: n.anchor_context as string,
    })), [notes, section, anchorType]);

  const value = useMemo<Ctx>(() => ({
    marks,
    select: (text: string, action: MarkAction) => setSelected({ text, action }),
    /**
     * Off the screen first, then off the server.
     *
     * A mark that lingers while a request goes out reads as a tap that missed,
     * and this is the one action where the reader is looking straight at the
     * thing they asked to remove. If the delete fails the mark comes back on
     * the next load, which is the right way round: the words are never wrong,
     * only briefly out of date.
     */
    remove: (mark: Mark) => {
      onRemoved?.(mark.id);
      deleteNote(mark.id);
    },
    enabled: true,
  }), [marks, onRemoved]);

  return (
    <AnnotationCtx.Provider value={value}>
      {children}
      {selected ? (
        <AnnotationSheet
          sentence={selected.text}
          openOn={selected.action}
          anchorType={anchorType}
          anchorKey={key}
          tags={tags}
          partnerName={partnerName}
          onClose={() => setSelected(null)}
          onSaved={(created) => {
            // Enough of a Note for the list and for the mark to paint. The
            // next load replaces it with the server's row; nothing here
            // depends on the difference.
            onCreated({
              id: created.id,
              owner_id: '',
              title: null,
              body: '',
              visibility: 'private',
              anchor_type: 'results_section',
              anchor_key: section,
              anchor_context: created.text,
              anchor_version: null,
              kind: created.kind,
              color: created.color,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as Note);
          }}
        />
      ) : null}
    </AnnotationCtx.Provider>
  );
}
