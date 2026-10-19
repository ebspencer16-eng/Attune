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

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { Pressable } from '@/components/pressable';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';
/* The gesture callbacks are worklets, the same as the page's own. */
import { runOnJS } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { scrollIntoResultsView } from '@/components/results-scroll';

import Annotatable, { clearSelectionAt, type Mark, type MarkAction } from '@/components/annotatable';
import { annotationColor } from '@/constants/annotations';
import { Palette } from '@/constants/attune-theme';
import AnnotationSheet from '@/components/annotation-sheet';
import MarkSheet from '@/components/mark-sheet';
import { marksIn, unplacedMarks } from '@/constants/mark-reach';
import { deleteNote, type Note, type Tag } from '@/api/client';
import { DELETE_NOTE, REMOVE_MARK } from '@/constants/delete-copy';
import { copyText } from '@/lib/copy-text';

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
  /**
   * Show a mark's words as selected, without opening anything.
   *
   * Ellie: "If I tap a tag in the margin, the text that is tagged should
   * select so I can see it."
   */
  revealMark: (id: string) => void;
  /** Which mark is being shown that way, if any. */
  revealed: string | null;
  /** Whether anything can be marked at all. False outside the provider. */
  enabled: boolean;
  /**
   * A block reporting which marks it drew.
   *
   * See constants/mark-reach.ts. Every rendered block claims what it holds,
   * and what nothing claims is a mark the reader cannot see.
   */
  claim: (ids: string[]) => void;
  /**
   * Whether this page has a mark no block has claimed, once the page has had
   * a chance to render. False before that, so nothing reacts to the empty
   * moment before the first block reports.
   */
  unplaced: boolean;
  /**
   * The words this screen was opened to land on, when it was opened from a
   * note. The paragraph holding them scrolls itself into view once.
   */
  focus?: string | null;
  /**
   * ── THE RAIL ────────────────────────────────────────────────────────────
   * The page card registers itself here, and every paragraph with a mark
   * measures itself against it and reports the line its icon belongs on. The
   * card draws them all in its own margin. See useMarkRail.
   *
   * A page that is not a card leaves `railHost.current` null, and a paragraph
   * that cannot find a host draws its own marker where it always did.
   */
  railHost: React.RefObject<View | null>;
  reportMarker: (id: string, at: RailMark | null) => void;
  markers?: RailMark[];
  /**
   * The results page's own tap-and-swipe gesture, so a rail icon can block it.
   *
   * Ellie asked for a tap on a margin tag to show the words it is on. The
   * first version was a Pressable and the page turned instead, every time:
   * the rail sits in the card's right padding, which is inside the sixth of
   * the screen that pages forward, and a gesture-handler Tap on an ancestor
   * does not lose to a Pressable child the way a DOM listener loses to a
   * button. Measured on the simulator twice before changing anything.
   *
   * So the icon declares that it blocks that gesture. Null outside a results
   * page, where there is nothing to block.
   */
  pageGesture?: React.MutableRefObject<GestureType | undefined> | null;
};

/** One icon on the rail: which mark, how far down the card, and in what ink. */
export type RailMark = {
  id: string;
  y: number;
  color: string;
  tagged: boolean;
};

/**
 * How far into the tile's own padding the marker sits.
 *
 * ── THIS HAS BEEN THREE THINGS, AND THIS IS THE LAST ──────────────────────
 * First it was drawn outside the paragraph's box, on the argument that a note
 * should cost the text nothing. Ellie then could not find a note at all,
 * because outside the block means inside whatever the block is in, and not
 * every tile in the results is a padded one.
 *
 * So the paragraph reserved the width instead, and she caught that too: "I
 * think the icon in the right margin has adjusted the margin of that paragraph
 * - I don't want that... I don't want the note or tag icon to adjust the
 * margins of the text at all anywhere throughout the app. I want them to be
 * tight to the right side of the tile, there should be enough space there to
 * fit the icon."
 *
 * She is right, and the room she is pointing at is real: every results page is
 * a PageTile with 24 points of padding on each side. The marker sits in that,
 * hard against the tile's inner edge, and the paragraph gives up nothing. A
 * negative offset rather than a reserved width, and small enough that it
 * cannot reach past the tile's own edge and be clipped.
 */
const MARKER_INSET = 18;

/**
 * The strip the icons live in, at the right edge of the page card.
 *
 * The card pads itself by 24, so an icon 17 wide sits in that padding with a
 * couple of points either side and takes nothing from the words.
 */
const RAIL_WIDTH = 22;

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
  revealMark: () => {}, revealed: null,
  enabled: false, focus: null, claim: () => {}, unplaced: false,
  railHost: { current: null }, reportMarker: () => {}, pageGesture: null,
});

export function useAnnotations() {
  return useContext(AnnotationCtx);
}

/**
 * The rail: every mark's icon, in the page card's own margin.
 *
 * ── WHY IT IS NOT DRAWN BY THE PARAGRAPH ──────────────────────────────────
 * Ellie: "The tag icons should appear outside of the tile in the margin on the
 * edge of the background card, not in the tile with the content."
 *
 * A paragraph can only draw its own marker inside itself, or a few points
 * outside, and a few points outside is still inside whichever tile the
 * paragraph is in. Most results prose sits in a tile within the page's card:
 * an action row, a glance tile, a side-by-side panel. So the icon was in the
 * content with the words, which is what she is pointing at.
 *
 * It had been outside before and was pulled in because tiles with a radius
 * clip their children, and a marker that is visible on most pages and missing
 * on the rest reads as "there is no note here". Both of those are true at
 * once, so the answer is neither: the icons are not children of the paragraph
 * any more. Each paragraph reports where its mark sits and the page card draws
 * all of them, in its own margin, where nothing can clip them.
 *
 * `useMarkRail` is what the card calls. The ref it returns is what every
 * paragraph measures itself against, so the two agree about where a line is
 * even inside a scroll view: both are in the same coordinate space, which is
 * the card's own box.
 */
export function useMarkRail(padding = 0) {
  const { railHost, markers, openMark, revealMark, marks, remove, pageGesture } = useAnnotations();
  /**
   * ── WHY THESE ARE GESTURES AND NOT A PRESSABLE ──────────────────────────
   * The icons were a Pressable and a tap on one turned the page instead,
   * measured twice on the simulator. A Pressable answers to React Native's
   * own responder system; the page's tap-to-page is a gesture handler on an
   * ancestor, and the two do not compete, so both fired and the page change
   * is what you saw.
   *
   * Wrapping the Pressable in `Gesture.Native().blocksExternalGesture()` did
   * not help either, and that is the part worth writing down: a native
   * gesture blocks an external one only once it activates, and it activates
   * for a view that handles touches natively. A Pressable is a plain View
   * with JS handlers, so there was nothing to activate and nothing to block.
   *
   * A Tap gesture on the icon does both: it carries the press, and it names
   * the page gesture as the one it blocks. The accessibility role, label and
   * hint stay on the View, which is where a screen reader looks.
   */
  const handlers = (m: RailMark) => {
    /* Each half names the page gesture: a composed gesture takes no
       relations of its own, so the pair cannot declare this between them. */
    let tap = Gesture.Tap().onEnd((_e, ok) => {
      if (ok) runOnJS(m.tagged ? revealMark : openMark)(m.id);
    });
    let hold = Gesture.LongPress().minDuration(450).onStart(() => {
      runOnJS(holdMark)(m);
    });
    if (pageGesture) {
      tap = tap.blocksExternalGesture(pageGesture);
      hold = hold.blocksExternalGesture(pageGesture);
    }
    return Gesture.Exclusive(hold, tap);
  };
  /* What a long press offers. Off the UI thread, so it is a plain function. */
  const holdMark = (m: RailMark) => {
    const mark = marks.find((x) => x.id === m.id);
    if (!mark) return;
    if (!m.tagged) { openMark(m.id); return; }
    Alert.alert(REMOVE_MARK.tagTitle, REMOVE_MARK.tagBody, [
      { text: REMOVE_MARK.keep, style: 'cancel' },
      { text: REMOVE_MARK.confirm, style: 'destructive', onPress: () => remove(mark) },
    ]);
  };
  /* Out in the card's padding, which is the margin Ellie means: "outside of
     the tile in the margin on the edge of the background card". The card's
     own padding is the room, so the rail is pushed out by it, less two points
     so the icon is not against the edge. A card with no padding keeps the
     rail inside, where there is at least somewhere to draw. */
  const out = padding >= RAIL_WIDTH ? -(padding - 2) : 0;
  const rail = markers && markers.length ? (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, bottom: 0, right: out, width: RAIL_WIDTH }}>
      {markers.map((m) => (
        <GestureDetector key={m.id} gesture={handlers(m)}>
          <View
            accessible
            accessibilityRole="button"
            accessibilityLabel={m.tagged ? 'Show the tagged words' : 'Open this note'}
            accessibilityHint={m.tagged ? 'Press and hold to remove the tag' : undefined}
            /* ── A TAP SHOWS THE WORDS, A HOLD TAKES THE TAG OFF ──────────
               Ellie: "If I tap a tag in the margin, the text that is tagged
               should select so I can see it. Also, if I hold down on the tag,
               I should have an option to delete that tag."

               A tag paints nothing on the words, so the only way to know
               which sentence carried it was to open the sheet and read it
               back. A tap paints them now, the way a finger would. A note
               still opens: its words are already underlined and what a reader
               wants is what they wrote. */
            style={{
              position: 'absolute', top: m.y - 8, right: -4,
              /* The icon is 17 points. The box around it is a finger, which
                 hitSlop used to give a Pressable and a gesture does not. */
              width: 30, height: 32, alignItems: 'flex-end', justifyContent: 'center',
              paddingRight: 6,
            }}>
            {/* ── THE ICON, AND NOTHING ROUND IT ──────────────────────────
                Ellie: "I don't want the icon in a circle like it currently
                is, just the icon." */}
            <SymbolView
              name={(m.tagged ? 'tag' : 'square.and.pencil') as never}
              size={16}
              tintColor={m.color}
              fallback={<View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: m.color }} />}
              style={{ width: 17, height: 17 }}
            />
          </View>
        </GestureDetector>
      ))}
    </View>
  ) : null;
  return { railRef: railHost, rail };
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
  const {
    marks, select, remove, openMark, enabled, focus, claim, railHost, reportMarker, markers,
    revealed,
  } = useAnnotations();
  const text = children || '';
  /**
   * ── EVERY HOOK RUNS, EVEN WHEN THIS DRAWS A PLAIN TEXT ──────────────────
   * The early return used to be here, on the line above the first of five
   * hooks. So a Prose with no text, or one outside the provider, ran five
   * hooks fewer than one with text, and React counts hooks by call order:
   * anything that made a paragraph go from empty to filled, or the other way,
   * threw "Rendered more hooks than during the previous render" over the whole
   * screen.
   *
   * It had been survivable because nine paragraphs were Prose and most of them
   * always had words. Forty-one more sites were converted on 22 September,
   * including several whose text is a field that is often absent, which is the
   * shape that trips it.
   *
   * Found by check-hook-order.mjs, written after the same mistake was found by
   * hand in resources.tsx.
   *
   * The work below is cheap on an empty paragraph: marksIn finds nothing,
   * every list is empty, and the effect does nothing. So the plain branch is
   * taken at the end rather than at the start.
   */
  const plain = !enabled || !text;

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
  /* The rule lives in constants/mark-reach.ts so a gate can execute it. It
     was inline here, which meant nothing could check that a mark anchored to
     this page had been drawn anywhere on it. */
  const mine = marksIn(text, marks);
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
  /* Whether the icon is a tag or a note: a paragraph carrying both shows the
     tag, because the tag is the thing you would be scanning for. */
  const tagged = silent.some((m) => m.tagged);

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
  /* ── AND IT REPORTS WHAT IT DREW ──────────────────────────────────────
     So the page can tell the difference between "no marks here" and "a mark
     is here and nothing on screen is holding it". Ellie: "That keeps
     happening, we need to make sure the icons don't randomly vanish."

     Keyed on the ids rather than the array, because `mine` is a fresh array
     every render and this would otherwise loop. */
  const mineIds = mine.map((m) => m.id).join(',');
  useEffect(() => {
    if (mineIds) claim(mineIds.split(','));
  }, [mineIds, claim]);

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
   * ── THE ICON GOES TO THE CARD, NOT IN THE TILE ────────────────────────
   * B121. Ellie: "The tag icons should appear outside of the tile in the
   * margin on the edge of the background card, not in the tile with the
   * content."
   *
   * So this paragraph measures where its marker belongs, in the card's own
   * coordinates, and the card draws it. Measured rather than guessed, because
   * the paragraph may be several tiles deep and each one has its own padding.
   *
   * When there is no card to report to, which is an In Practice article, it
   * draws its own as it always has. The fallback is the whole reason this
   * reports rather than being moved: a mark with nowhere to be drawn is the
   * bug every change to this marker has been about.
   */
  /**
   * ── WHETHER THE RAIL HAS THIS ONE ──────────────────────────────────────
   * B128. Ellie, after the rail shipped: "Still seeing it by the paragraph."
   *
   * This read `railHost.current` during render, and a ref is null during the
   * render that fills it: React attaches refs when it commits, which is after
   * every child has already rendered. So the answer was false on the first
   * pass of every page and nothing re-rendered to change it, and each
   * paragraph went on drawing its own marker exactly as before.
   *
   * The rail's own list is state, so asking IT is a question that has an
   * answer and that updates when the answer changes. It also makes the
   * fallback honest rather than theoretical: a paragraph whose measurement
   * never lands keeps its marker, because the rail never reports having it.
   */
  /** The mark this paragraph announces, if any. One id, not the array. */
  const markId = silent[0]?.id ?? null;
  const railed = (markers || []).some((m) => m.id === markId);
  const markerY = Number.isFinite(markerTop) ? markerTop : 2;
  useEffect(() => {
    const host = railHost?.current;
    const node = block.current;
    if (!host || !node || !markId) return undefined;
    const id = markId;
    try {
      (node as unknown as {
        measureLayout: (h: unknown, ok: (x: number, y: number) => void, fail: () => void) => void;
      }).measureLayout(host, (_x: number, y: number) => {
        reportMarker(id, { id, y: y + markerY, color: markerColor, tagged });
      }, () => {});
    } catch { /* a view that has gone before the measurement lands */ }
    return () => reportMarker(id, null);
    /**
     * ── PRIMITIVES, NOT THE ARRAY ──────────────────────────────────────
     * `silent` is rebuilt on every render, so an effect depending on it ran
     * on every render, and its cleanup takes the icon off the rail. Add,
     * remove, add, remove: each one a state change, each state change
     * another render. The app said "Maximum update depth exceeded" the first
     * time this ran on a page with a mark on it.
     *
     * The id, the line, the colour and the kind are what this effect is
     * actually about, and all four are primitives.
     */
  }, [railHost, markId, markerY, markerColor, tagged, reportMarker]);


  /* Every hook above has run. Now the plain case, which is a Prose with no
     words or one outside the provider. See the note at the top of this
     function for why it is here rather than where it reads better. */
  if (plain) return <Text style={style}>{text}</Text>;

  const body = (
    <Annotatable
      text={text}
      style={style}
      marks={marks}
      onSelect={select}
      onRemove={remove}
      onMarkTops={setMarkTops}
      /* Which mark the margin was tapped on, if it is one of ours. */
      reveal={revealed && mine.some((m) => m.id === revealed) ? revealed : null}
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
    <View ref={block} onLayout={onLaidOut} collapsable={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tagged ? 'Open this tag' : 'Open this note'}
        hitSlop={10}
        onPress={() => openMark(silent[0].id)}
        /* Drawn here only when the rail does not have it: on an article,
           which is not a card, or before a measurement has landed. */
        disabled={railed}
        style={{
          position: 'absolute', right: -MARKER_INSET, zIndex: 2,
          opacity: railed ? 0 : 1,
          top: markerY,
        }}>
        {/* ── THE ICON, AND NOTHING ROUND IT ────────────────────────────
            Ellie: "I don't want the icon in a circle like it currently is,
            just the icon." The disc was there to make a thirteen point
            hairline symbol findable against body copy. Sixteen points in the
            mark's own ink, in the tile's margin with nothing else in it, is
            findable without a container. */}
        <SymbolView
          name={(tagged ? 'tag' : 'square.and.pencil') as never}
          size={16}
          tintColor={markerColor}
          fallback={<View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: markerColor }} />}
          style={{ width: 17, height: 17 }}
        />
      </Pressable>
      {body}
    </View>
  );
}

export function AnnotationProvider({
  children, section, notes, tags, partnerName, onCreated, onRemoved, onChanged, focus = null,
  anchorType = 'results_section', anchorKey, pageGesture = null,
}: {
  children: ReactNode;
  /**
   * The page's own swipe-and-tap gesture, if it has one.
   *
   * Passed down so a rail icon can block it. See the note on `pageGesture` in
   * the context type: without it a tap on a margin tag turns the page.
   */
  pageGesture?: React.MutableRefObject<GestureType | undefined> | null;
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
  const [revealed, setRevealed] = useState<string | null>(null);
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

  /**
   * ── THE REGISTER ──────────────────────────────────────────────────────
   * Which marks a block on this page has drawn.
   *
   * A ref rather than state for the set itself, because a block claiming what
   * it already claimed must not cause a render. The counter is the state, and
   * it only moves when something new arrives.
   *
   * `settled` is what stops this reading as "everything is unplaced" during
   * the first paint: a child's effect runs before its parent's, so by the time
   * this provider's effect fires every block that rendered has already
   * reported. Anything still missing at that point really is missing.
   */
  const placed = useRef<Set<string>>(new Set());
  const [, bump] = useState(0);

  const claim = useCallback((ids: string[]) => {
    let added = false;
    for (const id of ids) {
      if (placed.current.has(id)) continue;
      placed.current.add(id);
      added = true;
    }
    if (added) bump((n) => n + 1);
  }, []);

  /**
   * A new set of marks is a new page's worth of questions, so the register is
   * emptied. At render rather than in an effect: a child's effect runs before
   * its parent's, so the blocks rendering with the new marks have already
   * claimed by the time a parent effect would fire, and emptying it there
   * would throw those claims away.
   */
  const markIds = marks.map((m) => m.id).join(',');
  const asked = useRef<string | null>(null);
  if (asked.current !== markIds && asked.current !== null) placed.current = new Set();

  /**
   * And `settled` is a ref compared against the current question rather than
   * state fed by its own effect. The effect only records which set of marks
   * has been asked about; the bump is what makes the value below recompute.
   */
  const settledFor = useRef<string | null>(null);
  useEffect(() => {
    asked.current = markIds;
    settledFor.current = markIds;
    bump((n) => n + 1);
  }, [markIds]);

  const settled = settledFor.current === markIds;
  const unplaced = settled && unplacedMarks(marks, placed.current).length > 0;

  /**
   * ── THE RAIL'S HOST, AND WHAT IS ON IT ────────────────────────────────
   * The card registers itself through useMarkRail; paragraphs report against
   * it. Kept in a ref beside the state so a report during layout does not
   * have to wait for a render to find the host.
   */
  const railHost = useRef<View | null>(null);
  const [markers, setMarkers] = useState<RailMark[]>([]);
  const reportMarker = useCallback((id: string, at: RailMark | null) => {
    setMarkers((prev) => {
      const without = prev.filter((m) => m.id !== id);
      if (!at) return without.length === prev.length ? prev : without;
      const old = prev.find((m) => m.id === id);
      /* A re-report of the same line is not a change. Without this every
         layout pass would set state and every state change would cause a
         layout pass, which is the loop this codebase has already paid for
         once on the website. */
      if (old && Math.abs(old.y - at.y) < 1 && old.color === at.color
        && old.tagged === at.tagged) return prev;
      return [...without, at];
    });
  }, []);
  /**
   * A new page's marks are a new rail, so a change of section empties it.
   *
   * Not on the first run. A parent's effect runs after its children's, so an
   * unconditional clear here would throw away the first page's reports: the
   * paragraphs report during their own effects, and this would fire after
   * them. Keyed on the section having actually changed.
   */
  const railFor = useRef<string | null>(null);
  useEffect(() => {
    if (railFor.current !== null && railFor.current !== section) setMarkers([]);
    railFor.current = section;
  }, [section]);

  const value = useMemo<Ctx>(() => ({
    marks,
    railHost,
    reportMarker,
    markers,
    pageGesture,
    claim,
    unplaced,
    /**
     * ── COPY OPENS NOTHING ────────────────────────────────────────────
     * Ellie: "Can we add the option to copy text when it's selected?"
     *
     * Every other action on the toolbar becomes a mark, so it opens the sheet
     * that asks for a colour or a tag or some words. A copy is finished the
     * moment it happens; opening a sheet to tell somebody so would be a
     * second screen saying nothing. The tick on the toolbar's own icon is the
     * confirmation, which is in annotatable.tsx where the toolbar is.
     */
    select: (text: string, action: MarkAction) => {
      if (action === 'copy') { copyText(text); return; }
      setSelected({ text, action });
    },
    /**
     * Off the screen first, then off the server.
     *
     * A mark that lingers while a request goes out reads as a tap that missed,
     * and this is the one action where the reader is looking straight at the
     * thing they asked to remove. If the delete fails the mark comes back on
     * the next load, which is the right way round: the words are never wrong,
     * only briefly out of date.
     */
    /**
     * ── A NOTE IS ASKED ABOUT, A HIGHLIGHT IS NOT ──────────────────────
     * The bin in the toolbar took any mark off with one tap. For a highlight
     * or an underline that is right: it is a mark on somebody else's words,
     * and a confirmation on every one would make the feature tiresome.
     *
     * A note is the reader's own writing, and the same deletion is asked
     * about in the two other places it is offered, the note sheet and the
     * journal. Here it was not, so the words went with one tap and nothing
     * said so. The wording is theirs, from the sheet that already asked.
     */
    remove: (mark: Mark) => {
      const go = () => {
        onRemoved?.(mark.id);
        deleteNote(mark.id);
      };
      if (mark.kind !== 'note') { go(); return; }
      Alert.alert(DELETE_NOTE.title, DELETE_NOTE.body, [
        { text: DELETE_NOTE.keep, style: 'cancel' },
        { text: DELETE_NOTE.confirm, style: 'destructive', onPress: go },
      ]);
    },
    openMark: setOpenId,
    revealMark: setRevealed,
    revealed,
    enabled: true,
    focus,
  }), [marks, onRemoved, focus, claim, unplaced, markers, reportMarker, revealed, pageGesture]);

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
      {/* ── A TAP ANYWHERE ENDS A SELECTION ─────────────────────────────
          Ellie: "if I have text selected but then I tap somewhere else on the
          screen, it should de-select."

          Capture rather than a Pressable, and it always returns false, so this
          takes nothing: it watches every touch that begins anywhere in the
          results and never becomes the responder. A Pressable wrapping the
          page would have swallowed every press underneath it, which is a worse
          bug than the one being fixed.

          Capture runs from the root down, so this sees the touch before the
          toolbar does and cannot ask the toolbar whether it was the target.
          That is why clearSelectionAt takes coordinates: the toolbar registers
          where it is and a touch inside it is left alone. */}
      <View
        style={{ flex: 1 }}
        onStartShouldSetResponderCapture={(e) => {
          clearSelectionAt(e.nativeEvent.pageX, e.nativeEvent.pageY);
          return false;
        }}>
        {children}
      </View>
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
