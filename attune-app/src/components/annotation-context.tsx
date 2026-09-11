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

import Annotatable, { type Mark } from '@/components/annotatable';
import { annotationColor } from '@/constants/annotations';
import AnnotationSheet from '@/components/annotation-sheet';
import type { Note, Tag } from '@/api/client';

type Ctx = {
  /** Marks on the section currently on screen, by the text they sit on. */
  marks: Mark[];
  /** A sentence was long-pressed. Opens the sheet. */
  select: (sentence: string) => void;
  /** Whether anything can be marked at all. False outside the provider. */
  enabled: boolean;
};

const AnnotationCtx = createContext<Ctx>({ marks: [], select: () => {}, enabled: false });

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
  const { marks, select, enabled } = useAnnotations();
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

  const body = <Annotatable text={text} style={style} marks={marks} onSelect={select} />;
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
  children, section, notes, tags, partnerName, onCreated,
}: {
  children: ReactNode;
  /** The results section on screen. Becomes the anchor key. */
  section: string;
  /** The reader's own notes. Shared ones from the partner are not marks on
   *  this reader's text and are not passed in. */
  notes: Note[];
  tags: Tag[];
  partnerName: string;
  /** A new mark was made, so the screen can add it without refetching. */
  onCreated: (note: Note) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const marks = useMemo<Mark[]>(() => notes
    .filter((n) => n.anchor_type === 'results_section'
      && n.anchor_key === section
      && !!n.anchor_context)
    .map((n) => ({
      id: n.id,
      kind: n.kind || 'note',
      color: n.color ?? null,
      text: n.anchor_context as string,
    })), [notes, section]);

  const value = useMemo<Ctx>(() => ({
    marks,
    select: setSelected,
    enabled: true,
  }), [marks]);

  return (
    <AnnotationCtx.Provider value={value}>
      {children}
      {selected ? (
        <AnnotationSheet
          sentence={selected}
          anchorType="results_section"
          anchorKey={section}
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
