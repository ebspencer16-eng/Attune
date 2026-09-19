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

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { scrollIntoResultsView } from '@/components/results-scroll';

import Annotatable, { type Mark, type MarkAction } from '@/components/annotatable';
import { annotationColor } from '@/constants/annotations';
import { Palette } from '@/constants/attune-theme';
import AnnotationSheet from '@/components/annotation-sheet';
import MarkSheet from '@/components/mark-sheet';
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
  /**
   * Open a mark that already exists.
   *
   * Ellie: "I want the icons to be on the right hand side and for when I click
   * on it to see a pop up with the note, the date it was left, the toggle for
   * shared/private, the option to tag the note, and option to delete the note."
   *
   * So the margin marker stopped being a sign and became a control. See
   * components/mark-sheet.tsx for what it opens.
   */
  openMark: (id: string) => void;
  /** Whether anything can be marked at all. False outside the provider. */
  enabled: boolean;
  /**
   * The words this screen was opened to land on, when it was opened from a
   * note. The paragraph holding them scrolls itself into view once.
   */
  focus?: string | null;
};

/**
 * How much room a paragraph gives up so its marker has somewhere to sit.
 *
 * ── THIS HAS BEEN BOTH WAYS, AND THIS IS WHY IT IS BACK ───────────────────
 * Ellie once: "Icons in margin should be white to be visible and should be to
 * the right of the tile, so it shouldn't impact the tile or page spacing."
 * That is what the outside placement was for, and it cost the paragraph
 * nothing, which was the point.
 *
 * Ellie again, later: "I have a note called test that I can't find... there's
 * no icon on the page to point it out." Outside the block means inside
 * whatever the block is in, and not every tile in the results is a padded
 * panel. On the clipped ones the marker was simply gone.
 *
 * Of the two failures, a paragraph that is a few points narrower on the lines
 * that carry a mark is the one nobody will ever report. A note you cannot find
 * is the one she reported twice. So: inside, always, and it pays for itself in
 * width only on paragraphs that have something to announce.
 */
const MARKER_RESERVE = 30;

/** Whether a paragraph's own colour is a light one, so the marker matches. */
function textIsLight(style: StyleProp<TextStyle>): boolean {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const color = String(flat?.color ?? '').toLowerCase().replace(/\s/g, '');
  if (!color) return false;
  if (color === '#fff' || color === '#ffffff' || color === 'white') return true;
  // The results pages write their light prose as rgba white at some opacity.
  return color.startsWith('rgba(255,255,255');
}

const AnnotationCtx = createContext<Ctx>({
  marks: [], select: () => {}, remove: () => {}, openMark: () => {},
  enabled: false, focus: null,
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
  const { marks, select, remove, openMark, enabled, focus } = useAnnotations();
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
  /**
   * What the margin has to announce.
   *
   * A highlight and an underline are already visible in the words. A note and
   * a tag change nothing about them, which is the point of both and also the
   * problem: scroll past and there is no sign anything is there.
   *
   * This was notes only, so a highlight someone had filed under a tag left no
   * mark in the margin at all. Ellie asked for the margin to show "where notes
   * and tags are", so a tagged mark of any kind counts.
   */
  const silent = mine.filter((m) => m.kind === 'note' || m.tagged);
  const tone = annotationColor(mine.find((m) => m.color)?.color);

  /**
   * ── LANDING ON THE LINE ─────────────────────────────────────────────────
   * Ellie: "yes, on the line not just on the page." The paragraph that holds
   * the marked words asks the page to scroll to it, once, after it has been
   * laid out: its own position is not known until then.
   *
   * Matched on the text because that is how a mark finds its words everywhere
   * else here. A paragraph that does not hold them does nothing at all, which
   * is most of them.
   */
  const holdsFocus = !!focus && text.includes(focus);
  const scrolled = useRef(false);
  const block = useRef<View | null>(null);
  const onLaidOut = () => {
    if (!holdsFocus || scrolled.current) return;
    scrolled.current = true;
    scrollIntoResultsView(block.current);
  };

  /**
   * Where the marks sit inside this paragraph, once it has been laid out.
   *
   * Ellie: "Placement should be in line with the note itself (or the top of
   * the selected text)." The marker was pinned to the top of the paragraph,
   * which on a six line paragraph with a note on the last line points at the
   * wrong sentence.
   */
  const [markTops, setMarkTops] = useState<Map<string, number> | null>(null);
  const body = (
    <Annotatable
      text={text}
      style={style}
      marks={marks}
      onSelect={select}
      onRemove={remove}
      onMarkTops={setMarkTops}
    />
  );
  if (!silent.length) {
    return holdsFocus
      ? <View ref={block} onLayout={onLaidOut}>{body}</View>
      : body;
  }

  /**
   * ── WHICH SIDE, AND WHICH ICON ───────────────────────────────────────────
   * Ellie: "I want the icon to appear in the right margin of the page that
   * shows a note icon or a tag icon to show where notes and tags are."
   *
   * It was a coloured bar in the left gutter, which says something is here and
   * not what. A note and a tag are different things to come back to: one is
   * something you wrote, the other is somewhere you filed it. So the marker is
   * the icon of whichever it is, and a paragraph carrying both shows the tag,
   * because the tag is the thing you would be scanning for.
   *
   * Right margin, as asked. Absolutely positioned and not hit-testable: it is
   * a sign, not a control, and tapping it would be a second way to open
   * something the words already open.
   */
  const tagged = silent.some((m) => m.tagged);

  /**
   * ── WHY THE MARKER SITS INSIDE THE BLOCK ─────────────────────────────────
   * Ellie: "Just left a note on internal processing and see nothing in the
   * margin." It was drawn eighteen points outside the paragraph's own box,
   * which is fine on an article, where the paragraph is on the page, and
   * invisible on a results page, where most prose is inside a tile with a
   * radius and `overflow: hidden`. A child outside its parent's bounds is
   * clipped there, and the marker was the child.
   *
   * So the block reserves the margin instead: a paragraph carrying a note is
   * a little narrower, and the icon sits in the space that made. It costs a
   * few points of line width on the paragraphs that have one, and it cannot be
   * clipped by anything.
   */
  /**
   * The colour is the paragraph's own.
   *
   * White on the coloured grounds, where she could not see it at all, and the
   * mark's own ink on the cream pages, where white would be a blank space.
   * Taken from the style the paragraph was given rather than from a list of
   * which sections are dark, which would be a second copy of a fact the style
   * already carries.
   */
  const markerColor = textIsLight(style) ? Palette.white : tone.ink;

  /**
   * The line the marker sits on: the first line of the first mark that has
   * something to announce, and the top of the paragraph until the words have
   * measured themselves.
   */
  const markerTop = silent.reduce((top, m) => {
    const y = markTops?.get(m.id);
    return y == null ? top : Math.min(top, y);
  }, Number.POSITIVE_INFINITY);

  /**
   * ── WHY IT MOVED BACK INSIDE THE BLOCK ───────────────────────────────────
   * Ellie: "I have a note called test that I can't find. It says it's in
   * internal processing but there's no icon on the page to point it out."
   *
   * It was drawn twenty points outside the paragraph's own right edge, on the
   * argument that the tiles holding results prose are padded rather than
   * clipped. Some are. Not all of them are, and a marker that is visible on
   * most pages and absent on the rest is worse than one that is always a
   * little tighter in, because the absence reads as "there is no note here".
   *
   * Inside the block it cannot be clipped by anything, ever, on any page.
   * What it costs is the last few points of the longest line on a paragraph
   * that carries a mark, and a paragraph that carries a mark is one the reader
   * has already stopped at.
   */
  return (
    <View ref={block} onLayout={onLaidOut} style={{ paddingRight: MARKER_RESERVE }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tagged ? 'Open this tag' : 'Open this note'}
        hitSlop={10}
        onPress={() => openMark(silent[0].id)}
        style={{
          position: 'absolute', right: 0, zIndex: 2,
          top: Number.isFinite(markerTop) ? markerTop - 2 : 0,
        }}>
        {/* ── A DISC, NOT A GLYPH ──────────────────────────────────────────
            Thirteen points of hairline symbol against body copy is something
            you find once you know it is there. The disc is what makes it a
            thing on the page rather than a speck, and it is what says the
            icon can be tapped. Its wash is the mark's own colour on the cream
            pages and a white veil on the coloured ones. */}
        <View
          style={{
            width: 24, height: 24, borderRadius: 12,
            backgroundColor: textIsLight(style) ? 'rgba(255,255,255,0.18)' : tone.wash,
            alignItems: 'center', justifyContent: 'center',
          }}>
          <SymbolView
            name={(tagged ? 'tag.fill' : 'square.and.pencil') as never}
            size={13}
            tintColor={markerColor}
            fallback={<View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: markerColor }} />}
            style={{ width: 14, height: 14 }}
          />
        </View>
      </Pressable>
      {body}
    </View>
  );
}

export function AnnotationProvider({
  children, section, notes, tags, partnerName, onCreated, onRemoved, onChanged, focus = null,
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
  /**
   * A mark was changed from the sheet: shared, un-shared, or re-tagged.
   *
   * Same argument as onRemoved. A screen that does not pass it keeps drawing
   * the old state until it next loads, and the margin icon is the visible half
   * of that: a note that has just been tagged should show a tag.
   */
  onChanged?: (note: Note) => void;
  /** Words to scroll to, once, when this screen is opened from a note. */
  focus?: string | null;
}) {
  const [selected, setSelected] = useState<{ text: string; action: MarkAction } | null>(null);
  /** Which existing mark the reader has opened from the margin, if any. */
  const [openId, setOpenId] = useState<string | null>(null);
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
      tagged: (n.tagIds?.length || 0) > 0,
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
    openMark: setOpenId,
    enabled: true,
    focus,
  }), [marks, onRemoved, focus]);

  /**
   * The row behind the mark the reader tapped.
   *
   * Looked up here rather than carried on the Mark, because a Mark is what a
   * paragraph needs to paint itself and the sheet needs the whole note: its
   * words, its date, who can see it. Two shapes for one row is how they drift.
   */
  const openNote = openId ? notes.find((n) => n.id === openId) : null;

  return (
    <AnnotationCtx.Provider value={value}>
      {children}
      {openNote ? (
        <MarkSheet
          note={openNote}
          tags={tags}
          partnerName={partnerName}
          onClose={() => setOpenId(null)}
          onChanged={(n) => onChanged?.(n)}
          onDeleted={(id) => onRemoved?.(id)}
        />
      ) : null}
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
              /**
               * ── WHY THESE ARE NOT LITERALS ──────────────────────────
               * They were: 'results_section' and the section id. An In
               * Practice article anchors to 'post_block' and a key of
               * slug#block, so a mark made in an article was added to the
               * screen under an anchor type the filter above does not match,
               * and it did not draw until the reader left and came back.
               *
               * Ellie: "Underline isn't working." It was working; it was
               * invisible until a reload, which is the same thing from the
               * outside. Highlights had it too.
               */
              anchor_type: anchorType,
              anchor_key: key,
              anchor_context: created.text,
              anchor_version: null,
              kind: created.kind,
              color: created.color,
              // The tags come with it, so the margin draws a tag icon for a
              // tag straight away rather than a pencil until the next load.
              tagIds: created.tagIds,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as Note);
          }}
        />
      ) : null}
    </AnnotationCtx.Provider>
  );
}
